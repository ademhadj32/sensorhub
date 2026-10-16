import express from 'express';
import db from '../db.js';
import { requireApiKey } from '../middleware/auth.js';
import {
  ingestSensorData,
  getLatestReadings,
  getReadingsHistory,
  broadcastSSE
} from '../services/ingestion.js';
import { publishMQTTCommand } from '../services/mqttBroker.js';

const router = express.Router();

/**
 * Récupère le seuil hors-ligne configuré en secondes (défaut 30s)
 */
function getOfflineThresholdSeconds() {
  const setting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('offline_threshold_seconds');
  return setting ? parseInt(setting.value, 10) : 30;
}

// ==========================================
// 1. INGESTION DES MESURES DE L'ESP32
// ==========================================

// POST /api/data : reçoit {"device":"esp32-01","temperature":28.5,"humidity":67,"gas":420,"water":0,"alert":false}
router.post('/data', requireApiKey, (req, res) => {
  const payload = req.body;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Payload JSON invalide ou manquant' });
  }

  try {
    const result = ingestSensorData(payload);
    res.status(201).json(result);
  } catch (err) {
    console.error('Erreur ingestion /api/data:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement des données', details: err.message });
  }
});

// ==========================================
// 2. GESTION DES APPAREILS (DEVICES)
// ==========================================

// GET /api/devices : liste des appareils et leur état en ligne/hors-ligne
router.get('/devices', (req, res) => {
  const thresholdSeconds = getOfflineThresholdSeconds();
  const devices = db.prepare('SELECT * FROM devices ORDER BY name ASC').all();

  const enriched = devices.map(d => {
    let isOnline = false;
    let secondsSinceLastSeen = null;

    if (d.last_seen) {
      // sqlite CURRENT_TIMESTAMP est en UTC
      const lastSeenDate = new Date(d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z');
      const diffMs = Date.now() - lastSeenDate.getTime();
      secondsSinceLastSeen = Math.floor(diffMs / 1000);
      isOnline = secondsSinceLastSeen <= thresholdSeconds && secondsSinceLastSeen >= 0;
    }

    const readingsCount = db.prepare('SELECT COUNT(*) as count FROM readings WHERE device_id = ?').get(d.id).count;
    const activeAlertsCount = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE device_id = ? AND acknowledged = 0').get(d.id).count;

    return {
      ...d,
      is_online: isOnline,
      seconds_since_last_seen: secondsSinceLastSeen,
      readings_count: readingsCount,
      active_alerts_count: activeAlertsCount
    };
  });

  res.json(enriched);
});

// POST /api/devices : ajout d'un nouvel appareil
router.post('/devices', (req, res) => {
  const { id, name, type, api_key } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'Identifiant (id) et Nom (name) obligatoires' });
  }

  const generatedKey = api_key || `key-${Math.random().toString(36).substring(2, 12)}`;

  try {
    db.prepare(`
      INSERT INTO devices (id, name, type, api_key, last_seen)
      VALUES (?, ?, ?, ?, NULL)
    `).run(id.trim(), name.trim(), type || 'esp32', generatedKey);

    const created = db.prepare('SELECT * FROM devices WHERE id = ?').get(id.trim());
    broadcastSSE('device_updated', created);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: `L'appareil avec l'identifiant "${id}" existe déjà.` });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'appareil', details: err.message });
  }
});

// DELETE /api/devices/:id : suppression d'un appareil
router.delete('/devices/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Appareil introuvable' });
  }
  broadcastSSE('device_deleted', { id });
  res.json({ message: 'Appareil supprimé avec succès' });
});

// ==========================================
// 3. RELEVÉS (READINGS)
// ==========================================

// GET /api/readings/latest : dernière valeur de chaque capteur
router.get('/readings/latest', (req, res) => {
  try {
    const latest = getLatestReadings();
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des relevés récents' });
  }
});

// GET /api/readings : historique pour les graphiques (paramètres: sensor, range=1h|24h|7d)
router.get('/readings', (req, res) => {
  const { sensor, range } = req.query;

  if (!sensor) {
    return res.status(400).json({ error: 'Le paramètre query ?sensor= est requis' });
  }

  try {
    const history = getReadingsHistory(sensor, range || '24h');
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique', details: err.message });
  }
});

// ==========================================
// 4. ALERTES
// ==========================================

// GET /api/alerts : liste des alertes (paramètres: acknowledged=0|1)
router.get('/alerts', (req, res) => {
  const { acknowledged, limit } = req.query;
  const maxLimit = limit ? Math.min(parseInt(limit, 10), 200) : 100;

  let query = 'SELECT * FROM alerts';
  const params = [];

  if (acknowledged !== undefined) {
    query += ' WHERE acknowledged = ?';
    params.push(parseInt(acknowledged, 10));
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(maxLimit);

  const alerts = db.prepare(query).all(...params);
  const activeCount = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0').get().count;

  res.json({
    active_count: activeCount,
    alerts
  });
});

// PATCH /api/alerts/:id : acquittement d'une alerte
router.patch('/alerts/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Alerte introuvable' });
  }

  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  broadcastSSE('alert_acknowledged', updated);
  res.json(updated);
});

// PATCH /api/alerts/acknowledge-all : tout acquitter
router.post('/alerts/acknowledge-all', (req, res) => {
  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0').run();
  broadcastSSE('all_alerts_acknowledged', { timestamp: new Date().toISOString() });
  res.json({ message: 'Toutes les alertes ont été acquittées' });
});

// ==========================================
// 5. CONFIGURATION DES CAPTEURS & SYSTÈME
// ==========================================

// GET /api/config : liste des capteurs et réglages globaux
router.get('/config', (req, res) => {
  const sensors = db.prepare('SELECT * FROM sensors_config ORDER BY sensor ASC').all();
  const settingsRows = db.prepare('SELECT * FROM system_settings').all();
  const settings = {};
  for (const s of settingsRows) {
    settings[s.key] = s.value;
  }

  res.json({
    sensors,
    settings
  });
});

// PUT /api/config : mise à jour des seuils d'un capteur ou paramètres
router.put('/config', (req, res) => {
  const { sensors, settings } = req.body;

  if (Array.isArray(sensors)) {
    const updateSensorStmt = db.prepare(`
      UPDATE sensors_config
      SET label = ?, unit = ?, icon = ?, min_threshold = ?, max_threshold = ?, enabled = ?
      WHERE sensor = ?
    `);

    for (const s of sensors) {
      updateSensorStmt.run(
        s.label,
        s.unit,
        s.icon,
        s.min_threshold === '' || s.min_threshold === undefined ? null : s.min_threshold,
        s.max_threshold === '' || s.max_threshold === undefined ? null : s.max_threshold,
        s.enabled ? 1 : 0,
        s.sensor
      );
    }
  }

  if (settings && typeof settings === 'object') {
    const upsertSettingStmt = db.prepare(`
      INSERT INTO system_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(settings)) {
      upsertSettingStmt.run(key, String(value));
    }
  }

  broadcastSSE('config_updated', { timestamp: new Date().toISOString() });
  res.json({ message: 'Configuration enregistrée avec succès' });
});

// ==========================================
// 6. COMMANDES POUR L'ESP32
// ==========================================

// POST /api/commands : envoi d'une commande (ex: tester la LED, clignoter alerte, etc.)
router.post('/commands', (req, res) => {
  const { device_id, command, params } = req.body;

  if (!device_id || !command) {
    return res.status(400).json({ error: 'device_id et command sont obligatoires' });
  }

  const paramsStr = params ? (typeof params === 'string' ? params : JSON.stringify(params)) : null;

  const result = db.prepare(`
    INSERT INTO commands (device_id, command, params, status)
    VALUES (?, ?, ?, 'pending')
  `).run(device_id, command, paramsStr);

  const created = db.prepare('SELECT * FROM commands WHERE id = ?').get(result.lastInsertRowid);
  broadcastSSE('command_created', created);
  // Diffusion instantanée via MQTT (< 20ms) vers l'ESP32 abonné
  publishMQTTCommand(device_id, command, params);
  res.status(201).json(created);
});

// GET /api/commands/pending : récupéré par l'ESP32
router.get('/commands/pending', (req, res) => {
  const deviceId = req.query.device || 'esp32-01';

  // Récupérer toutes les commandes en attente pour cet appareil
  const pending = db.prepare(`
    SELECT id, command, params, created_at
    FROM commands
    WHERE device_id = ? AND status = 'pending'
    ORDER BY created_at ASC
  `).all(deviceId);

  if (pending.length > 0) {
    // Marquer les commandes comme délivrées/exécutées
    const ids = pending.map(c => c.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`
      UPDATE commands
      SET status = 'executed', executed_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).run(...ids);
  }

  res.json({
    device: deviceId,
    count: pending.length,
    commands: pending.map(c => ({
      id: c.id,
      command: c.command,
      params: c.params ? JSON.parse(c.params) : null,
      created_at: c.created_at
    }))
  });
});

export default router;
