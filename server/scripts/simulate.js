import http from 'http';

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = process.env.PORT || 3001;
const API_KEY = process.env.DEFAULT_API_KEY || 'esp32-secret-key-123456';
const DEVICE_NAME = 'esp32-01';

console.log('=====================================================');
console.log('🤖 Simulateur Matériel ESP32 SensorHub');
console.log(`📡 Cible API : http://${SERVER_HOST}:${SERVER_PORT}`);
console.log(`🔑 Clé API   : ${API_KEY}`);
console.log(`⏱️  Fréquence : 1 envoi toutes les 5 secondes`);
console.log('=====================================================\n');

// État courant des capteurs (démarre sur des valeurs moyennes réalistes)
let currentTemp = 24.2;
let currentHumidity = 58;
let currentGas = 410;
let currentWater = 0;
let currentServoAngle = 0; // 0° = fermé, 90° = mi-ouvert, 180° = ouvert
let ledState = 'OFF';
let cycleCount = 0;

/**
 * Effectue une requête HTTP JSON
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', err => reject(err));
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error('Timeout requête'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Envoie un cycle de mesures
 */
async function sendCycle() {
  cycleCount++;

  // 1. Simulation physique (Random Walk réaliste)
  currentTemp += (Math.random() - 0.48) * 0.2;
  currentTemp = Math.round(Math.max(15, Math.min(38, currentTemp)) * 10) / 10;

  currentHumidity += (Math.random() - 0.5) * 1.0;
  currentHumidity = Math.round(Math.max(30, Math.min(85, currentHumidity)));

  // Simulation gaz (fluctuation normale 380 - 520)
  currentGas += (Math.random() - 0.5) * 25;
  currentGas = Math.round(Math.max(300, Math.min(650, currentGas)));

  // Eau normale = 0
  currentWater = 0;

  // Déclencher ponctuellement un pic d'alerte pour tester le temps réel (tous les 18 cycles ~ 1m30)
  let isAlertSpike = false;
  if (cycleCount % 18 === 0) {
    isAlertSpike = true;
    currentGas = 2350; // Dépasse le seuil de 2000 !
    console.log('\n⚠️  [SIMULATION] Déclenchement d\'un pic d\'alerte Gaz : 2350 ppm !');
  } else if (cycleCount % 35 === 0) {
    isAlertSpike = true;
    currentWater = 1420; // Dépasse le seuil de 1000 !
    console.log('\n⚠️  [SIMULATION] Déclenchement d\'un pic d\'alerte Eau : 1420 (Fuite détectée) !');
  }

  const alertFlag = isAlertSpike || currentGas > 2000 || currentWater > 1000;

  // Si alerte matérielle, fermeture automatique de la vanne (sécurité)
  if (alertFlag && currentServoAngle !== 0) {
    currentServoAngle = 0;
    console.log('🚨 [SÉCURITÉ MATÉRIELLE ESP32] Fuite/Alerte détectée : Vanne hydraulique fermée d\'urgence (0°) !');
  }

  // Si alerte matérielle, la LED physique clignote
  if (alertFlag) {
    ledState = 'BLINKING';
  } else if (ledState === 'BLINKING') {
    ledState = 'OFF';
  }

  // 2. Construction du payload conforme aux specs
  const payload = {
    device: DEVICE_NAME,
    temperature: currentTemp,
    humidity: currentHumidity,
    gas: currentGas,
    water: currentWater,
    servo_angle: currentServoAngle,
    alert: alertFlag
  };

  const postData = JSON.stringify(payload);

  const postOptions = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/data',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': API_KEY
    }
  };

  const timeStr = new Date().toLocaleTimeString('fr-FR');

  try {
    const postRes = await makeRequest(postOptions, postData);
    const alertTag = alertFlag ? '🚨 [ALERTE ACTIVE]' : '🟢 [NORMAL]';
    console.log(`[${timeStr}] Cycle #${cycleCount} | ${alertTag} T: ${currentTemp}°C | H: ${currentHumidity}% | Gaz: ${currentGas} | Eau: ${currentWater} | Servo: ${currentServoAngle}° | LED: ${ledState}`);

    // 3. Récupération des commandes en attente (comme le vrai ESP32)
    const getOptions = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: `/api/commands/pending?device=${DEVICE_NAME}`,
      method: 'GET'
    };

    const cmdRes = await makeRequest(getOptions);
    if (cmdRes.data && cmdRes.data.commands && cmdRes.data.commands.length > 0) {
      for (const cmd of cmdRes.data.commands) {
        console.log(`\n📥 [COMMANDE REÇUE PAR ESP32] ID: ${cmd.id} | Action: "${cmd.command}" | Paramètres:`, cmd.params);
        if (cmd.command === 'test_led' || cmd.command === 'toggle_led') {
          ledState = ledState === 'ON' ? 'OFF' : 'ON';
          console.log(`💡 [ACTION ESP32] État LED changé -> ${ledState}`);
        } else if (cmd.command === 'alarm_test') {
          console.log(`🔔 [ACTION ESP32] Test de l'alarme sonore & clignotement LED exécuté !`);
        } else if (cmd.command === 'servo_set' || cmd.command === 'set_servo') {
          const angle = cmd.params && typeof cmd.params.angle === 'number' ? cmd.params.angle : (typeof cmd.params === 'number' ? cmd.params : 90);
          currentServoAngle = Math.max(0, Math.min(180, angle));
          console.log(`⚙️  [ACTION ESP32] Servomoteur positionné à : ${currentServoAngle}°`);
        } else if (cmd.command === 'servo_open' || cmd.command === 'open_valve') {
          currentServoAngle = 180;
          console.log(`⚙️  [ACTION ESP32] Servomoteur / Vanne : OUVERT (180°)`);
        } else if (cmd.command === 'servo_close' || cmd.command === 'close_valve') {
          currentServoAngle = 0;
          console.log(`⚙️  [ACTION ESP32] Servomoteur / Vanne : FERMÉ (0°)`);
        }
      }
    }
  } catch (err) {
    console.error(`[${timeStr}] ❌ Erreur communication : ${err.message}. Le serveur SensorHub est-il démarré ?`);
  }
}

// Premier envoi immédiat
sendCycle();

// Envoi toutes les 5 secondes
setInterval(sendCycle, 5000);
