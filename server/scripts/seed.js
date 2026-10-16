import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialiser les tables si nécessaire
initDatabase();

const dbPath = path.join(__dirname, '..', 'sensorhub.sqlite');
const db = new Database(dbPath);

console.log('🌱 Génération de 24 heures de données réalistes pour SensorHub...');

// Nettoyer les anciennes données pour avoir un historique propre
db.exec(`
  DELETE FROM readings;
  DELETE FROM alerts;
  DELETE FROM commands;
`);

const insertReadingStmt = db.prepare(`
  INSERT INTO readings (device_id, sensor, value, unit, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const insertAlertStmt = db.prepare(`
  INSERT INTO alerts (device_id, sensor, value, message, created_at, acknowledged)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;
const intervalMs = 5 * 60 * 1000; // Un point toutes les 5 minutes sur 24h = 288 points
const totalPoints = oneDayMs / intervalMs;

const deviceId = 'esp32-01';

const insertMany = db.transaction(() => {
  for (let i = totalPoints; i >= 0; i--) {
    const timestamp = new Date(now - i * intervalMs);
    const isoDate = timestamp.toISOString();
    const hour = timestamp.getHours() + timestamp.getMinutes() / 60;

    // 1. Température (°C) : cycle circadien sinusoïdal (min ~18°C à 5h du matin, max ~26°C à 15h)
    const tempBase = 22 + 4 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
    const tempNoise = (Math.random() - 0.5) * 0.6;
    const temp = Math.round((tempBase + tempNoise) * 10) / 10;
    insertReadingStmt.run(deviceId, 'temperature', temp, '°C', isoDate);

    // 2. Humidité (%) : inversement proportionnelle à la température
    const humBase = 60 - 15 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
    const humNoise = (Math.random() - 0.5) * 2;
    const hum = Math.round(humBase + humNoise);
    insertReadingStmt.run(deviceId, 'humidity', hum, '%', isoDate);

    // 3. Gaz (raw MQ 0-4095) : fond normal 320 - 450, avec pics ponctuels
    let gas = Math.round(380 + (Math.random() - 0.5) * 60);
    // Simulation d'un pic il y a 2h30 (cuisine / fumée)
    if (i >= 28 && i <= 32) {
      gas = Math.round(1800 + Math.random() * 450); // Pic au-dessus de 2000
    }
    insertReadingStmt.run(deviceId, 'gas', gas, 'raw', isoDate);

    // 4. Eau (raw 0-4095) : 0 en temps normal, pic d'inondation de test il y a 6h
    let water = 0;
    if (i >= 70 && i <= 73) {
      water = Math.round(1150 + Math.random() * 200);
    }
    insertReadingStmt.run(deviceId, 'water', water, 'raw', isoDate);

    // 5. Capteurs solaires (actif entre 7h et 19h)
    let solarVolt = 0;
    let solarCurr = 0;
    let solarPow = 0;
    if (hour >= 7 && hour <= 19) {
      const sunFactor = Math.sin(((hour - 7) / 12) * Math.PI);
      solarVolt = Math.round((18.5 * sunFactor + (Math.random() - 0.5) * 0.4) * 10) / 10;
      solarCurr = Math.round(1200 * sunFactor + (Math.random() - 0.5) * 50);
      solarPow = Math.round(((solarVolt * solarCurr) / 1000) * 10) / 10;
    }
    insertReadingStmt.run(deviceId, 'solar_voltage', Math.max(0, solarVolt), 'V', isoDate);
    insertReadingStmt.run(deviceId, 'solar_current', Math.max(0, solarCurr), 'mA', isoDate);
    insertReadingStmt.run(deviceId, 'solar_power', Math.max(0, solarPow), 'W', isoDate);
  }

  // Insertion de quelques alertes d'exemple
  const alertDate1 = new Date(now - 2.5 * 60 * 60 * 1000).toISOString();
  insertAlertStmt.run(
    deviceId,
    'gas',
    2150,
    'Niveau de gaz ou fumée anormalement élevé (2150) !',
    alertDate1,
    0 // Non acquittée (active pour l'interface !)
  );

  const alertDate2 = new Date(now - 6 * 60 * 60 * 1000).toISOString();
  insertAlertStmt.run(
    deviceId,
    'water',
    1280,
    'Fuite ou présence d\'eau critique détectée (1280) !',
    alertDate2,
    1 // Acquittée
  );
});

insertMany();

// Mettre à jour last_seen de l'appareil
db.prepare('UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(deviceId);

console.log('✅ Base de données alimentée avec succès avec 24h de relevés réalistes.');
