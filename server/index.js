import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { addSSEClient, removeSSEClient } from './services/ingestion.js';
import { startMQTTBroker } from './services/mqttBroker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialiser la base SQLite et les schémas
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration CORS permissive pour développement et déploiement
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Journalisation légère en mode dev
app.use((req, res, next) => {
  if (req.path !== '/api/stream') {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    // Ne pas encombrer les logs pour les polling fréquents sauf si debug
    if (!req.path.includes('/commands/pending')) {
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
    }
  }
  next();
});

// ==========================================
// ROUTE SERVER-SENT EVENTS (SSE) TEMPS RÉEL
// ==========================================
app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Message initial de bienvenue et statut
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connecté au flux SSE SensorHub', timestamp: new Date().toISOString() })}\n\n`);

  addSSEClient(res);

  // Heartbeat ping toutes les 15 secondes pour maintenir la connexion active contre les timeouts proxy
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(res);
  });
});

// Routes API
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Servir le frontend en mode production (si le dossier client/dist existe)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).json({
        app: 'SensorHub IoT API Server',
        status: 'running',
        frontend: 'Lancez "npm run dev" pour ouvrir le tableau de bord React Vite'
      });
    }
  });
});

// Gestionnaire global d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur non interceptée:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: err.message
  });
});

app.listen(PORT, '0.0.0.0', async () => {
  const mqttPort = process.env.MQTT_PORT || 1883;
  await startMQTTBroker(mqttPort);

  console.log(`\n======================================================`);
  console.log(`🚀 Serveur SensorHub démarré avec succès !`);
  console.log(`📡 URL API locale    : http://localhost:${PORT}`);
  console.log(`⚡ Flux SSE          : http://localhost:${PORT}/api/stream`);
  console.log(`🔌 Ingestion HTTP    : POST http://localhost:${PORT}/api/data`);
  console.log(`📡 Broker MQTT       : mqtt://localhost:${mqttPort}`);
  console.log(`======================================================\n`);
});
