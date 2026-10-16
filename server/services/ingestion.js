import db from '../db.js';

// Liste des clients connectés au flux SSE
const sseClients = new Set();

/**
 * Enregistre un client SSE
 */
export function addSSEClient(res) {
  sseClients.add(res);
}

/**
 * Retire un client SSE
 */
export function removeSSEClient(res) {
  sseClients.delete(res);
}

/**
 * Diffuse un événement SSE à tous les clients connectés
 */
export function broadcastSSE(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      console.error('Erreur d\'envoi SSE:', err.message);
      sseClients.delete(client);
    }
  }
}

/**
 * Formate un nom de capteur technique en étiquette lisible
 * ex: "solar_voltage" -> "Solar Voltage"
 */
function formatSensorLabel(sensorKey) {
  return sensorKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Devine l'unité par défaut pour un nouveau capteur
 */
function guessSensorUnit(sensorKey) {
  const lower = sensorKey.toLowerCase();
  if (lower.includes('temp')) return '°C';
  if (lower.includes('hum')) return '%';
  if (lower.includes('volt')) return 'V';
  if (lower.includes('curr') || lower.includes('amp')) return 'mA';
  if (lower.includes('pow') || lower.includes('watt')) return 'W';
  if (lower.includes('press')) return 'hPa';
  if (lower.includes('lux') || lower.includes('light')) return 'lux';
  return '';
}

/**
 * Devine l'icône Lucide pour un nouveau capteur
 */
function guessSensorIcon(sensorKey) {
  const lower = sensorKey.toLowerCase();
  if (lower.includes('temp')) return 'Thermometer';
  if (lower.includes('hum')) return 'Droplets';
  if (lower.includes('gas') || lower.includes('smoke')) return 'Flame';
  if (lower.includes('water')) return 'Waves';
  if (lower.includes('volt') || lower.includes('sun') || lower.includes('solar')) return 'Sun';
  if (lower.includes('curr') || lower.includes('pow') || lower.includes('zap')) return 'Zap';
  if (lower.includes('press')) return 'Gauge';
  return 'Activity';
}

/**
 * Ingestion automatique d'un payload JSON venant d'un ESP32
 */
export function ingestSensorData(payload) {
  const deviceId = payload.device || 'esp32-01';
  const now = new Date().toISOString();

  // 1. Mettre à jour le dernier signal de vie (heartbeat) de l'appareil
  db.prepare(`
    UPDATE devices 
    SET last_seen = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(deviceId);

  const insertedReadings = [];
  const generatedAlerts = [];

  // Récupérer la configuration existante de tous les capteurs
  const existingConfigs = db.prepare('SELECT * FROM sensors_config').all();
  const configMap = new Map(existingConfigs.map(c => [c.sensor, c]));

  const insertReadingStmt = db.prepare(`
    INSERT INTO readings (device_id, sensor, value, unit, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const insertConfigStmt = db.prepare(`
    INSERT INTO sensors_config (sensor, label, unit, icon, min_threshold, max_threshold, enabled)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const insertAlertStmt = db.prepare(`
    INSERT INTO alerts (device_id, sensor, value, message, created_at, acknowledged)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
  `);

  // Vérifier chaque champ numérique du JSON
  for (const [key, rawValue] of Object.entries(payload)) {
    if (key === 'device' || key === 'alert' || typeof rawValue !== 'number') {
      continue;
    }

    const value = Number(rawValue);

    // Si le capteur n'existe pas encore dans la configuration, l'ajouter dynamiquement !
    if (!configMap.has(key)) {
      const label = formatSensorLabel(key);
      const unit = guessSensorUnit(key);
      const icon = guessSensorIcon(key);
      
      insertConfigStmt.run(key, label, unit, icon, null, null);
      
      const newConfig = { sensor: key, label, unit, icon, min_threshold: null, max_threshold: null, enabled: 1 };
      configMap.set(key, newConfig);
      
      console.log(`✨ Nouveau capteur découvert et configuré automatiquement : ${key} (${label})`);
      broadcastSSE('sensor_discovered', newConfig);
    }

    const sensorConfig = configMap.get(key);

    // Ne pas enregistrer si désactivé par l'utilisateur
    if (sensorConfig.enabled === 0) {
      continue;
    }

    // Enregistrer la mesure
    const unit = sensorConfig.unit || '';
    insertReadingStmt.run(deviceId, key, value, unit);

    insertedReadings.push({
      device_id: deviceId,
      sensor: key,
      value,
      unit,
      created_at: now
    });

    // Évaluation des seuils d'alerte
    let isAlert = false;
    let alertMsg = '';

    if (sensorConfig.max_threshold !== null && value > sensorConfig.max_threshold) {
      isAlert = true;
      alertMsg = `Seuil MAX dépassé pour ${sensorConfig.label} : ${value} ${unit} (seuil : ${sensorConfig.max_threshold} ${unit})`;
    } else if (sensorConfig.min_threshold !== null && value < sensorConfig.min_threshold) {
      isAlert = true;
      alertMsg = `Seuil MIN non atteint pour ${sensorConfig.label} : ${value} ${unit} (seuil : ${sensorConfig.min_threshold} ${unit})`;
    }

    // Alerte explicite pour capteur d'eau si eau > 1000
    if (key === 'water' && value > 1000) {
      isAlert = true;
      alertMsg = `Fuite ou présence d'eau critique détectée (${value}) !`;
    }

    // Alerte explicite pour gaz si gaz > 2000
    if (key === 'gas' && value > 2000) {
      isAlert = true;
      alertMsg = `Niveau de gaz ou fumée anormalement élevé (${value}) !`;
    }

    if (isAlert) {
      // Éviter le spam : vérifier si une alerte identique non acquittée a été créée il y a moins de 60s
      const recentAlert = db.prepare(`
        SELECT id FROM alerts 
        WHERE device_id = ? AND sensor = ? AND acknowledged = 0 
          AND created_at >= datetime('now', '-60 seconds')
      `).get(deviceId, key);

      if (!recentAlert) {
        const result = insertAlertStmt.run(deviceId, key, value, alertMsg);
        const alertRecord = {
          id: result.lastInsertRowid,
          device_id: deviceId,
          sensor: key,
          value,
          message: alertMsg,
          created_at: now,
          acknowledged: 0
        };
        generatedAlerts.push(alertRecord);
        console.warn(`🚨 ALERTE CRÉÉE [${key}] :`, alertMsg);
      }
    }
  }

  // Si le payload a un champ booléen "alert: true" général
  const hasHardwareAlert = Boolean(payload.alert) || generatedAlerts.length > 0;

  // Diffusion temps réel SSE
  const streamPayload = {
    device_id: deviceId,
    timestamp: now,
    readings: insertedReadings,
    has_alert: hasHardwareAlert,
    raw_payload: payload
  };

  broadcastSSE('readings', streamPayload);

  for (const alert of generatedAlerts) {
    broadcastSSE('alert', alert);
  }

  return {
    success: true,
    readings_count: insertedReadings.length,
    alerts_generated: generatedAlerts.length,
    alerts: generatedAlerts
  };
}

/**
 * Récupère le dernier relevé pour chaque capteur
 */
export function getLatestReadings() {
  const configs = db.prepare('SELECT * FROM sensors_config WHERE enabled = 1').all();
  const latest = [];

  const stmt = db.prepare(`
    SELECT r.id, r.device_id, r.sensor, r.value, r.unit, r.created_at
    FROM readings r
    WHERE r.sensor = ?
    ORDER BY r.created_at DESC
    LIMIT 1
  `);

  for (const c of configs) {
    const reading = stmt.get(c.sensor);
    if (reading) {
      latest.push({
        ...reading,
        label: c.label,
        icon: c.icon,
        min_threshold: c.min_threshold,
        max_threshold: c.max_threshold
      });
    } else {
      // Capteur configuré mais sans relevé
      latest.push({
        device_id: null,
        sensor: c.sensor,
        value: null,
        unit: c.unit,
        created_at: null,
        label: c.label,
        icon: c.icon,
        min_threshold: c.min_threshold,
        max_threshold: c.max_threshold
      });
    }
  }

  return latest;
}

/**
 * Récupère l'historique d'un capteur pour un intervalle donné
 * (1h, 24h, 7d)
 */
export function getReadingsHistory(sensor, range = '24h') {
  let timeModifier = "-24 hours";
  let maxPoints = 120; // Limite raisonnable pour fluidité Recharts

  if (range === '1h') {
    timeModifier = "-1 hour";
    maxPoints = 60;
  } else if (range === '7d') {
    timeModifier = "-7 days";
    maxPoints = 200;
  }

  const query = `
    SELECT id, device_id, sensor, value, unit, created_at
    FROM readings
    WHERE sensor = ? AND created_at >= datetime('now', '${timeModifier}')
    ORDER BY created_at ASC
  `;

  const rows = db.prepare(query).all(sensor);

  // Sous-échantillonnage simple si trop de points
  if (rows.length <= maxPoints) {
    return rows;
  }

  const step = Math.ceil(rows.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < rows.length; i += step) {
    sampled.push(rows[i]);
  }
  // S'assurer d'inclure le dernier point
  if (sampled[sampled.length - 1].id !== rows[rows.length - 1].id) {
    sampled.push(rows[rows.length - 1]);
  }

  return sampled;
}
