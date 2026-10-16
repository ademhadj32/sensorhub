import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'sensorhub.sqlite');
const db = new Database(dbPath);

// Configuration WAL pour meilleures performances de lecture/écriture concurrentes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Table des appareils enregistrés
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'esp32',
      api_key TEXT NOT NULL,
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des mesures de capteurs
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      sensor TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_readings_sensor_created ON readings(sensor, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_readings_device_created ON readings(device_id, created_at DESC);

    -- Table de configuration dynamique des capteurs (extensible)
    CREATE TABLE IF NOT EXISTS sensors_config (
      sensor TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      unit TEXT,
      icon TEXT,
      min_threshold REAL,
      max_threshold REAL,
      enabled INTEGER DEFAULT 1
    );

    -- Table des alertes générées
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      sensor TEXT NOT NULL,
      value REAL NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged INTEGER DEFAULT 0,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged, created_at DESC);

    -- Table des commandes à exécuter par l'ESP32
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      command TEXT NOT NULL,
      params TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      executed_at DATETIME,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_commands_pending ON commands(device_id, status);

    -- Table des utilisateurs (Admin)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des paramètres système globaux
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insertion de l'appareil par défaut si inexistant
  const defaultApiKey = process.env.DEFAULT_API_KEY || 'esp32-secret-key-123456';
  const existingDevice = db.prepare('SELECT id FROM devices WHERE id = ?').get('esp32-01');
  if (!existingDevice) {
    db.prepare(`
      INSERT INTO devices (id, name, type, api_key, last_seen)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run('esp32-01', 'ESP32 Principal Salon', 'esp32', defaultApiKey);
  }

  // Insertion des capteurs initiaux connus
  const initialSensors = [
    { sensor: 'temperature', label: 'Température', unit: '°C', icon: 'Thermometer', min: 15, max: 35, enabled: 1 },
    { sensor: 'humidity', label: 'Humidité', unit: '%', icon: 'Droplets', min: 30, max: 75, enabled: 1 },
    { sensor: 'gas', label: 'Gaz & Fumée', unit: 'raw', icon: 'Flame', min: null, max: 2000, enabled: 1 },
    { sensor: 'water', label: 'Niveau Eau', unit: 'raw', icon: 'Waves', min: null, max: 1000, enabled: 1 },
    { sensor: 'solar_voltage', label: 'Tension Solaire', unit: 'V', icon: 'Sun', min: null, max: 24, enabled: 1 },
    { sensor: 'solar_current', label: 'Courant Solaire', unit: 'mA', icon: 'Zap', min: null, max: 2000, enabled: 1 },
    { sensor: 'solar_power', label: 'Puissance Solaire', unit: 'W', icon: 'BatteryCharging', min: null, max: 50, enabled: 1 }
  ];

  const insertSensor = db.prepare(`
    INSERT OR IGNORE INTO sensors_config (sensor, label, unit, icon, min_threshold, max_threshold, enabled)
    VALUES (@sensor, @label, @unit, @icon, @min, @max, @enabled)
  `);

  for (const s of initialSensors) {
    insertSensor.run(s);
  }

  // Insertion de l'utilisateur admin par défaut si inexistant
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPassword, salt);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(adminUsername, hash, 'admin');
  }

  // Paramètres système initiaux
  const insertSetting = db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)');
  insertSetting.run('offline_threshold_seconds', '30');
  insertSetting.run('camera_stream_url', 'http://192.168.1.50/stream');

  console.log('✅ Base de données SQLite SensorHub initialisée avec succès.');
}

export default db;
