import { Aedes } from 'aedes';
import net from 'net';
import db from '../db.js';
import { ingestSensorData } from './ingestion.js';

let aedesInstance = null;
let netServerInstance = null;

/**
 * Démarre le broker MQTT interne Aedes sur le port spécifié (défaut: 1883)
 */
export async function startMQTTBroker(port = process.env.MQTT_PORT || 1883) {
  try {
    // Initialisation complète du broker Aedes avec son système de persistance en mémoire
    const aedes = await Aedes.createBroker();
    aedesInstance = aedes;

    // Authentification permissive par défaut pour faciliter le prototypage ESP32
    aedes.authenticate = (client, username, password, callback) => {
      if (password) {
        const passStr = password.toString();
        const defaultKey = process.env.DEFAULT_API_KEY || 'esp32-secret-key-123456';
        if (passStr === defaultKey) {
          return callback(null, true);
        }
        const device = db.prepare('SELECT id FROM devices WHERE api_key = ?').get(passStr);
        if (device) {
          return callback(null, true);
        }
      }
      return callback(null, true);
    };

    // Événement : Nouveau client connecté
    aedes.on('client', (client) => {
      console.log(`[MQTT] 🟢 Client connecté : ID = ${client.id}`);
    });

    // Événement : Client déconnecté
    aedes.on('clientDisconnect', (client) => {
      console.log(`[MQTT] 🔴 Client déconnecté : ID = ${client.id}`);
    });

    // Événement : Message publié sur le broker
    aedes.on('publish', async (packet, client) => {
      if (!packet.topic || packet.topic.startsWith('$SYS')) return;

      const topic = packet.topic;
      const rawPayload = packet.payload ? packet.payload.toString('utf-8') : '';

      // 1. Télémétrie capteurs : "sensorhub/data" ou "sensorhub/<deviceId>/data"
      if (topic === 'sensorhub/data' || topic.endsWith('/data')) {
        try {
          const payload = JSON.parse(rawPayload);
          if (!payload.device && topic.startsWith('sensorhub/') && topic.endsWith('/data')) {
            const parts = topic.split('/');
            if (parts.length === 3) {
              payload.device = parts[1];
            }
          }
          ingestSensorData(payload);
          console.log(`[MQTT] 📥 Mesures reçues de [${payload.device || 'inconnu'}] via ${topic}`);
        } catch (err) {
          console.error(`[MQTT] Erreur parsing JSON reçu sur ${topic}:`, err.message);
        }
      }

      // 2. Statut en ligne / hors-ligne (LWT - Last Will & Testament) : "sensorhub/<deviceId>/status"
      if (topic.startsWith('sensorhub/') && topic.endsWith('/status')) {
        const parts = topic.split('/');
        if (parts.length === 3) {
          const deviceId = parts[1];
          const status = rawPayload.trim().toLowerCase();
          console.log(`[MQTT] 📡 Statut de [${deviceId}] : ${status}`);
          if (status === 'online') {
            db.prepare('UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(deviceId);
          }
        }
      }
    });

    const server = net.createServer(aedes.handle);
    netServerInstance = server;

    server.listen(port, '0.0.0.0', () => {
      console.log(`📡 Broker MQTT actif sur : mqtt://0.0.0.0:${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ [MQTT] Le port ${port} est déjà utilisé par un autre service. Le serveur HTTP continue normalement.`);
      } else {
        console.error(`❌ [MQTT] Erreur serveur MQTT:`, err.message);
      }
    });

    return aedes;
  } catch (e) {
    console.error('❌ [MQTT] Échec de création du broker MQTT:', e);
    return null;
  }
}

/**
 * Publie une commande en temps réel vers un appareil ESP32 via MQTT
 * Topic cible : "sensorhub/<deviceId>/commands"
 */
export function publishMQTTCommand(deviceId, command, params = null) {
  if (!aedesInstance || aedesInstance.closed) return false;

  try {
    const topic = `sensorhub/${deviceId}/commands`;
    const message = {
      command,
      params,
      timestamp: new Date().toISOString()
    };

    const payload = Buffer.from(JSON.stringify(message));

    // Publication non-bloquante avec qos: 0 (instantané et léger)
    aedesInstance.publish({
      topic,
      payload,
      qos: 0,
      retain: false
    }, (err) => {
      if (err) {
        console.error(`[MQTT] ❌ Erreur lors de l'envoi de la commande sur ${topic}:`, err.message);
      } else {
        console.log(`[MQTT] ⚡ Commande envoyée instantanément sur ${topic} -> ${command}`);
      }
    });

    return true;
  } catch (err) {
    console.error(`[MQTT] Exception publishMQTTCommand:`, err.message);
    return false;
  }
}

/**
 * Récupère le broker Aedes pour d'éventuelles extensions
 */
export function getAedes() {
  return aedesInstance;
}
