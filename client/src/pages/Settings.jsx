import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings as SettingsIcon,
  Save,
  Sliders,
  Bell,
  Sun,
  Moon,
  Smartphone,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  RotateCw
} from 'lucide-react';

export default function Settings() {
  const {
    sensorsConfig,
    systemSettings,
    updateConfig,
    theme,
    toggleTheme,
    requestNotificationPermission
  } = useApp();

  const [localSensors, setLocalSensors] = useState([]);
  const [offlineThreshold, setOfflineThreshold] = useState(30);
  const [saving, setSaving] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setLocalSensors(JSON.parse(JSON.stringify(sensorsConfig)));
  }, [sensorsConfig]);

  useEffect(() => {
    if (systemSettings.offline_threshold_seconds) {
      setOfflineThreshold(parseInt(systemSettings.offline_threshold_seconds, 10));
    }
  }, [systemSettings]);

  // Écoute de l'événement PWA d'installation
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleSensorChange = (index, field, value) => {
    setLocalSensors(prev => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfig({
        sensors: localSensors,
        settings: {
          offline_threshold_seconds: offlineThreshold
        }
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE AVEC BOUTON D'ENREGISTREMENT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Réglages & Configuration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Personnalisation des seuils d'alertes, délais hors-ligne et préférences
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Enregistrement...' : 'Sauvegarder les réglages'}</span>
        </button>
      </div>

      {/* 2. SECTION SEUILS D'ALERTE PAR CAPTEUR */}
      <div className="glass-card rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Seuils d'Alerte & Capteurs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Déclenchent les alertes automatiques et le clignotement de la LED de l'ESP32
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localSensors.map((sensor, idx) => (
            <div
              key={sensor.sensor}
              className={`p-4 rounded-2xl border transition-all ${
                sensor.enabled
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5'
                  : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {sensor.label}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({sensor.sensor})
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensor.enabled === 1}
                    onChange={(e) => handleSensorChange(idx, 'enabled', e.target.checked ? 1 : 0)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Seuil Min ({sensor.unit || 'val'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Désactivé"
                    value={sensor.min_threshold ?? ''}
                    onChange={(e) => handleSensorChange(idx, 'min_threshold', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Seuil Max ({sensor.unit || 'val'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Désactivé"
                    value={sensor.max_threshold ?? ''}
                    onChange={(e) => handleSensorChange(idx, 'max_threshold', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SECTION PARAMÈTRES SYSTÈME, NOTIFICATIONS ET THÈME */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paramètre hors-ligne */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Délai de passage Hors-Ligne
              </h4>
              <p className="text-xs text-slate-500">
                Temps sans mesure avant d'alerter sur la perte de l'ESP32
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Seuil de tolérance :</span>
              <span className="font-bold text-cyan-500">{offlineThreshold} secondes</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={offlineThreshold}
              onChange={(e) => setOfflineThreshold(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10s (Strict)</span>
              <span>30s (Recommandé)</span>
              <span>120s (Tolérant)</span>
            </div>
          </div>
        </div>

        {/* Notifications & Thème */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Alertes Web & Apparence
              </h4>
              <p className="text-xs text-slate-500">
                Notifications push système et confort visuel
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={requestNotificationPermission}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <span>Activer les Notifications Navigateur</span>
              <Bell className="w-4 h-4 text-cyan-500" />
            </button>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <span>Thème actuel : {theme === 'dark' ? 'Mode Sombre' : 'Mode Clair'}</span>
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>
          </div>
        </div>

        {/* Installation PWA (Progressive Web App) */}
        <div className="glass-card rounded-3xl p-6 space-y-4 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Application Progressive Web (PWA)
              </h4>
              <p className="text-xs text-slate-500">
                Installez SensorHub comme une application native sur votre smartphone Android / iOS
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {isInstalled
                  ? 'SensorHub est déjà installé sur cet appareil.'
                  : 'Installez SensorHub sur votre écran d\'accueil pour un accès en 1 clic sans barre d\'adresse.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sur iPhone / Safari : appuyez sur le bouton Partager puis "Sur l'écran d'accueil".
              </p>
            </div>

            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-white shadow-md shadow-cyan-500/20 whitespace-nowrap cursor-pointer"
              >
                Installer l'application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
