import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cpu,
  Plus,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Radio,
  Trash2,
  Lightbulb,
  BellRing,
  RotateCcw,
  Sliders,
  Clock,
  X
} from 'lucide-react';

export default function Devices() {
  const {
    devices,
    addDevice,
    sendCommand,
    addToast,
    refreshAll
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ id: '', name: '', type: 'esp32', api_key: '' });
  const [visibleKeys, setVisibleKeys] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [loadingAction, setLoadingAction] = useState({});

  const toggleKeyVisibility = (id) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    addToast({ title: 'Copié !', message: 'Clé API copiée dans le presse-papier.', type: 'info' });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAction = async (deviceId, command) => {
    const key = `${deviceId}-${command}`;
    setLoadingAction(prev => ({ ...prev, [key]: true }));
    await sendCommand(deviceId, command);
    setTimeout(() => {
      setLoadingAction(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.id || !newDevice.name) return;

    try {
      await addDevice(newDevice);
      setModalOpen(false);
      setNewDevice({ id: '', name: '', type: 'esp32', api_key: '' });
    } catch (err) {
      addToast({ title: 'Erreur', message: err.message, type: 'error' });
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!confirm(`Supprimer l'appareil "${id}" ? Ses mesures seront également effacées.`)) return;

    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({ title: 'Appareil supprimé', message: `L'appareil ${id} a été retiré.`, type: 'info' });
        refreshAll();
      }
    } catch (e) {
      addToast({ title: 'Erreur', message: 'Échec de suppression', type: 'error' });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE ET BOUTON D'AJOUT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Appareils & Microcontrôleurs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestion des modules ESP32 connectés, clés de sécurité et télécommandes
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un appareil</span>
        </button>
      </div>

      {/* 2. GRILLE DES APPAREILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {devices.map((device) => {
          const isOnline = device.is_online;
          const isKeyVisible = visibleKeys[device.id];

          return (
            <div
              key={device.id}
              className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-5"
            >
              {/* Entête de carte : Nom, ID, Statut En ligne */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    isOnline
                      ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {device.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        ID: {device.id}
                      </span>
                      <span>&bull;</span>
                      <span className="capitalize">{device.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      isOnline
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {isOnline ? 'Connecté' : 'Hors ligne'}
                  </span>

                  {device.id !== 'esp32-01' && (
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                      title="Supprimer cet appareil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clé API sécurisée */}
              <div className="bg-slate-100/80 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-cyan-500" />
                    Clé API (x-api-key)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleKeyVisibility(device.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleCopyKey(device.api_key)}
                      className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                    >
                      {copiedKey === device.api_key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 select-all truncate">
                  {isKeyVisible ? device.api_key : '••••••••••••••••••••••••••••••'}
                </div>
              </div>

              {/* Statistiques et dernier heartbeat */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                  <span className="text-slate-400">Mesures transmises</span>
                  <p className="font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {device.readings_count || 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                  <span className="text-slate-400">Dernier signal</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {device.last_seen
                      ? `${device.seconds_since_last_seen || 0}s`
                      : 'Jamais'}
                  </p>
                </div>
              </div>

              {/* Télécommandes vers l'ESP32 */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleAction(device.id, 'test_led')}
                  disabled={loadingAction[`${device.id}-test_led`]}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{loadingAction[`${device.id}-test_led`] ? 'Envoi...' : 'Tester LED'}</span>
                </button>

                <button
                  onClick={() => handleAction(device.id, 'alarm_test')}
                  disabled={loadingAction[`${device.id}-alarm_test`]}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{loadingAction[`${device.id}-alarm_test`] ? 'Envoi...' : 'Alarme'}</span>
                </button>

                <button
                  onClick={() => handleAction(device.id, 'servo_close')}
                  disabled={loadingAction[`${device.id}-servo_close`]}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{loadingAction[`${device.id}-servo_close`] ? 'Envoi...' : 'Vanne 0°'}</span>
                </button>

                <button
                  onClick={() => handleAction(device.id, 'servo_open')}
                  disabled={loadingAction[`${device.id}-servo_open`]}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{loadingAction[`${device.id}-servo_open`] ? 'Envoi...' : 'Vanne 180°'}</span>
                </button>

                <button
                  onClick={() => handleAction(device.id, 'reboot')}
                  disabled={loadingAction[`${device.id}-reboot`]}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reboot</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MODAL D'AJOUT D'APPAREIL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-500" />
                Ajouter un appareil ESP32
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Identifiant technique (id unique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: esp32-cuisine"
                  value={newDevice.id}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom d'affichage *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: ESP32 Cuisine & Cave"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type d'appareil
                </label>
                <select
                  value={newDevice.type}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="esp32">ESP32 (Capteurs)</option>
                  <option value="esp32-cam">ESP32-CAM (Caméra)</option>
                  <option value="esp8266">ESP8266</option>
                  <option value="raspberry-pi">Raspberry Pi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clé API personnalisée (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Laissez vide pour auto-générer"
                  value={newDevice.api_key}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, api_key: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20"
                >
                  Enregistrer l'appareil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
