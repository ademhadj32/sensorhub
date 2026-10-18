import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SensorCardSkeleton } from '../components/Skeletons';
import ServoControl from '../components/ServoControl';
import {
  Thermometer,
  Droplets,
  Flame,
  Waves,
  Sun,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BellRing,
  RotateCw,
  Gauge,
  TrendingUp,
  TrendingDown,
  Camera,
  Lock,
  WifiOff
} from 'lucide-react';

// Résolution dynamique des icônes Lucide selon le nom enregistré en base
const ICON_COMPONENTS = {
  Thermometer,
  Droplets,
  Flame,
  Waves,
  Sun,
  Zap,
  Gauge,
  Activity
};

export default function Dashboard({ setCurrentPage }) {
  const {
    latestReadings,
    sensorsConfig,
    activeDevice,
    loading,
    sendCommand,
    activeAlertsCount,
    openSecurityModal,
    isSecurityUnlocked
  } = useApp();

  const [testingLed, setTestingLed] = useState(false);
  const [testingAlarm, setTestingAlarm] = useState(false);

  const isOnline = Boolean(activeDevice?.is_online);

  // Déclenche le test de la LED de l'ESP32 avec protection mot de passe
  const executeTestLed = async () => {
    if (!activeDevice?.id) return;
    setTestingLed(true);
    await sendCommand(activeDevice.id, 'test_led', { action: 'toggle' });
    setTimeout(() => setTestingLed(false), 2000);
  };

  const handleTestLed = () => {
    openSecurityModal('Test de la LED d\'Alerte (GPIO 5)', executeTestLed);
  };

  const executeTestAlarm = async () => {
    if (!activeDevice?.id) return;
    setTestingAlarm(true);
    await sendCommand(activeDevice.id, 'alarm_test', { duration_sec: 5 });
    setTimeout(() => setTestingAlarm(false), 2000);
  };

  const handleTestAlarm = () => {
    openSecurityModal('Test de l\'Alarme Sonore/Lumineuse', executeTestAlarm);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCardSkeleton />
          <SensorCardSkeleton />
          <SensorCardSkeleton />
          <SensorCardSkeleton />
        </div>
      </div>
    );
  }

  // Filtrer les capteurs activés
  const enabledSensors = sensorsConfig.filter(s => s.enabled === 1);

  // Valeurs actuelles spécifiques
  const tempReading = latestReadings['temperature'];
  const humReading = latestReadings['humidity'];
  const gasReading = latestReadings['gas'];
  const waterReading = latestReadings['water'];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE DU DASHBOARD AVEC ACTIONS RAPIDES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Tableau de Bord
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Temps Réel
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Surveillance continue des capteurs physiques de l'ESP32
          </p>
        </div>

        {/* Boutons d'action rapide sur l'ESP32 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestLed}
            disabled={testingLed}
            title="Tester la LED d'alerte (Broche GPIO 5) - Mot de passe requis"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              testingLed
                ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                : 'glass-card text-slate-700 dark:text-slate-200 hover:border-amber-500/50 hover:bg-amber-500/10'
            }`}
          >
            <Lightbulb className={`w-4 h-4 ${testingLed ? 'text-white' : 'text-amber-500'}`} />
            <span>{testingLed ? 'Ordre envoyé...' : 'Tester la LED'}</span>
            {!isSecurityUnlocked && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>

          <button
            onClick={handleTestAlarm}
            disabled={testingAlarm}
            title="Tester l'alarme sonore/visuelle de l'ESP32 - Mot de passe requis"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              testingAlarm
                ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                : 'glass-card text-slate-700 dark:text-slate-200 hover:border-rose-500/50 hover:bg-rose-500/10'
            }`}
          >
            <BellRing className={`w-4 h-4 ${testingAlarm ? 'text-white' : 'text-rose-500'}`} />
            <span>{testingAlarm ? 'Ordre transmis...' : 'Tester Alarme'}</span>
            {!isSecurityUnlocked && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* BANNIÈRE HORS LIGNE QUAND L'ESP32 EST DÉCONNECTÉ */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 text-amber-700 dark:text-amber-300 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">ESP32 Principal Hors Ligne</h4>
              <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                Le microcontrôleur principal n'émet pas de mesures. Les données en direct sont masquées. Dès reconnexion au réseau, les valeurs physiques changeront en temps réel.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Hors-ligne
          </span>
        </div>
      )}

      {/* 2. GRILLE PRINCIPALE DES 4 CAPTEURS CLEFS (DHT22, GAZ MQ, EAU) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARTE 1 : TEMPÉRATURE (DHT22) */}
        <div className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ${
          !isOnline ? 'opacity-80' : ''
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Température
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                {isOnline ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {tempReading?.value !== undefined && tempReading?.value !== null
                        ? tempReading.value.toFixed(1)
                        : '--'}
                    </span>
                    <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">°C</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 font-mono">
                    --
                  </span>
                )}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isOnline ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              <Thermometer className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Capteur DHT22 (GPIO 4)</span>
            <span className={`font-medium ${
              !isOnline
                ? 'text-slate-400'
                : tempReading?.value > 30 ? 'text-rose-400' : tempReading?.value < 18 ? 'text-cyan-400' : 'text-emerald-400'
            }`}>
              {!isOnline
                ? 'Hors ligne'
                : tempReading?.value > 30 ? 'Chaud' : tempReading?.value < 18 ? 'Frais' : 'Optimal'}
            </span>
          </div>
        </div>

        {/* CARTE 2 : HUMIDITÉ (DHT22) */}
        <div className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ${
          !isOnline ? 'opacity-80' : ''
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Humidité
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                {isOnline ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {humReading?.value !== undefined && humReading?.value !== null
                        ? humReading.value
                        : '--'}
                    </span>
                    <span className="text-lg font-bold text-blue-500">%</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 font-mono">
                    --
                  </span>
                )}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isOnline ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Ambiance intérieure</span>
            <span className={`font-medium ${!isOnline ? 'text-slate-400' : 'text-emerald-400'}`}>
              {!isOnline
                ? 'Hors ligne'
                : humReading?.value >= 40 && humReading?.value <= 65 ? 'Confort idéal' : 'Humide'}
            </span>
          </div>
        </div>

        {/* CARTE 3 : GAZ & FUMÉE (JAUGE CIRCULAIRE MQ) */}
        <div className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ${
          !isOnline ? 'opacity-80' : ''
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gaz & Fumée
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                {isOnline ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {gasReading?.value !== undefined && gasReading?.value !== null
                        ? gasReading.value
                        : '--'}
                    </span>
                    <span className="text-xs text-slate-400">/ 4095</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 font-mono">
                    --
                  </span>
                )}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              !isOnline
                ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                : gasReading?.value > 2000
                ? 'bg-rose-500/20 text-rose-500 border-rose-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
          </div>

          {/* Jauge de progression horizontale */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] mb-1 font-medium">
              <span className="text-slate-500 dark:text-slate-400">Seuil alerte: 2000</span>
              <span className={
                !isOnline
                  ? 'text-slate-400'
                  : gasReading?.value > 2000 ? 'text-rose-500 font-bold' : 'text-emerald-500'
              }>
                {!isOnline ? 'Hors ligne' : gasReading?.value > 2000 ? 'DANGER !' : 'Normal'}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  !isOnline
                    ? 'bg-slate-400/30'
                    : gasReading?.value > 2000
                    ? 'bg-rose-500'
                    : gasReading?.value > 1200
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${isOnline ? Math.min(100, Math.round(((gasReading?.value || 0) / 4095) * 100)) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* CARTE 4 : DÉTECTION EAU & FUITE */}
        <div className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ${
          !isOnline
            ? 'opacity-80'
            : waterReading?.value > 1000
            ? 'border-rose-500/60 bg-rose-500/5 glow-red'
            : ''
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Présence d'eau
              </span>
              <div className="mt-1">
                {!isOnline ? (
                  <span className="text-xl font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <WifiOff className="w-5 h-5 text-slate-400" />
                    Hors ligne
                  </span>
                ) : waterReading?.value > 1000 ? (
                  <span className="text-2xl font-extrabold text-rose-500 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                    Mouillé / Fuite !
                  </span>
                ) : (
                  <span className="text-2xl font-extrabold text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle className="w-6 h-6" />
                    Sec (Normal)
                  </span>
                )}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              !isOnline
                ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                : waterReading?.value > 1000
                ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 animate-ping-slow'
                : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
            }`}>
              <Waves className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Capteur niveau eau (GPIO 35)</span>
            <span className="font-mono text-slate-400">
              {isOnline ? `Val: ${waterReading?.value !== undefined ? waterReading.value : 0}` : 'En attente signal'}
            </span>
          </div>
        </div>

      </div>

      {/* 2.5 CONTRÔLE DU SERVOMOTEUR / VANNE HYDRAULIQUE */}
      <ServoControl />

      {/* 3. CAPTEURS SUPPLÉMENTAIRES DÉCOUVERTS DYNAMIQUEMENT */}
      {enabledSensors.filter(s => !['temperature', 'humidity', 'gas', 'water'].includes(s.sensor)).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            Capteurs Détectés Automatiquement
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enabledSensors
              .filter(s => !['temperature', 'humidity', 'gas', 'water'].includes(s.sensor))
              .map((sensorCfg) => {
                const reading = latestReadings[sensorCfg.sensor];
                const IconComponent = ICON_COMPONENTS[sensorCfg.icon] || Activity;

                return (
                  <div
                    key={sensorCfg.sensor}
                    className={`glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between ${
                      !isOnline ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {sensorCfg.label}
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          {isOnline ? (
                            <>
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                                {reading?.value !== undefined && reading?.value !== null
                                  ? reading.value
                                  : '--'}
                              </span>
                              <span className="text-sm font-semibold text-cyan-500">
                                {sensorCfg.unit || ''}
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-slate-400 font-mono">
                              --
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        isOnline ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Clé JSON: {sensorCfg.sensor}</span>
                      <button
                        onClick={() => setCurrentPage('history')}
                        className="text-cyan-500 hover:underline cursor-pointer"
                      >
                        Voir courbe &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 4. BANNIÈRE RÉSUMÉ RAPIDE POUR L'HISTORIQUE & LES ALERTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accès rapide Graphiques */}
        <div
          onClick={() => setCurrentPage('history')}
          className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Historique & Courbes Comparatives
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualiser les tendances 1h, 24h ou 7j avec export CSV
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-cyan-500">&rarr;</span>
        </div>

        {/* Accès rapide Caméra ESP32-CAM */}
        <div
          onClick={() => setCurrentPage('camera')}
          className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Flux Vidéo ESP32-CAM
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Module de surveillance vidéo prêt à connecter
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-500">&rarr;</span>
        </div>
      </div>
    </div>
  );
}
