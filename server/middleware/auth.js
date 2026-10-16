import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sensorhub_jwt_super_secret_key_change_in_production_2026';

/**
 * Vérifie l'en-tête x-api-key pour les requêtes émises par les microcontrôleurs ESP32
 */
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Clé API manquante dans l\'en-tête x-api-key'
    });
  }

  // Vérifier si la clé correspond à un appareil enregistré ou à la clé par défaut
  const defaultKey = process.env.DEFAULT_API_KEY || 'esp32-secret-key-123456';
  if (apiKey === defaultKey) {
    return next();
  }

  const device = db.prepare('SELECT id FROM devices WHERE api_key = ?').get(apiKey);
  if (!device) {
    return res.status(403).json({
      error: 'Clé API invalide ou non reconnue'
    });
  }

  req.device = device;
  next();
}

/**
 * Vérifie le jeton JWT pour les actions administratives
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Accès non autorisé : jeton JWT manquant'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Jeton de session invalide ou expiré'
    });
  }
}
