import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Lock,
  Unlock
} from 'lucide-react';

export default function Header({ currentPage, setCurrentPage }) {
  const {
    theme,
    toggleTheme,
    activeDevice,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    activeAlertsCount,
    sseConnected,
    requestNotificationPermission,
    isSecurityUnlocked,
    lockSecurity,
    openSecurityModal
  } = useApp();

  const isOnline = activeDevice?.is_online;

  return (
    <header className="sticky top-0 z-30 flex flex-col w-full">
      {/* 1. BANDEAU D'ÉTAT SUPÉRIEUR (NORMAL ou ALERTE CRITIQUE) */}
      {activeAlertsCount > 0 ? (
        <div
          onClick={() => setCurrentPage('alerts')}
          className="cursor-pointer bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-2.5 shadow-lg flex items-center justify-between animate-alert-banner transition-all"
        >
          <div className="flex items-center gap-2.5 max-w-xl">
            <span className="p-1 rounded-full bg-white/20 animate-ping-slow">
              <AlertTriangle className="w-4 h-4 text-white" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wide">
              ALERTE CRITIQUE : {activeAlertsCount} anomalie(s) détectée(s) (Gaz / Eau) !
            </span>
          </div>
          <button className="text-xs bg-white text-rose-700 font-bold px-3 py-1 rounded-full shadow hover:bg-rose-50 transition-colors">
            Examiner &rarr;
          </button>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tous les paramètres sont dans les seuils normaux</span>
          </div>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
            Surveillance continue active
          </span>
        </div>
      )}

      {/* 2. BARRE DE NAVIGATION SUPÉRIEURE */}
      <div className="glass-card !border-x-0 !border-t-0 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo et titre (visible mobile et desktop) */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                SensorHub
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 hidden sm:block">
                ESP32 IoT Suite
              </p>
            </div>
          </div>

          {/* Sélecteur de microcontrôleur actif */}
          {devices.length > 0 && (
            <div className="relative ml-2 sm:ml-4">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="appearance-none text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.is_online ? '(En ligne)' : '(Hors ligne)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Côté droit : Statut connexion ESP32, SSE, Thème, Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge statut ESP32 */}
          <div
            title={isOnline ? 'Appareil connecté et actif' : 'Aucun signal reçu depuis plus de 30 secondes'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="hidden xs:inline">
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>

          {/* Indicateur SSE Live */}
          <div
            title={sseConnected ? 'Flux SSE actif en temps réel' : 'Connexion SSE interrompue'}
            className={`hidden md:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md ${
              sseConnected
                ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 bg-slate-500/10'
            }`}
          >
            <Radio className="w-3 h-3 animate-spin" />
            <span>LIVE</span>
          </div>

          {/* Bouton cloche alertes */}
          <button
            onClick={() => setCurrentPage('alerts')}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Consulter les alertes"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Verrouillage / Déverrouillage Sécurité */}
          {isSecurityUnlocked ? (
            <button
              onClick={lockSecurity}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
              title="Contrôle déverrouillé (mot de passe actif) - Cliquer pour verrouiller"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Déverrouillé</span>
            </button>
          ) : (
            <button
              onClick={() => openSecurityModal('Déverrouillage Mode Contrôle')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-amber-500/50 hover:text-amber-500 transition-all cursor-pointer"
              title="Commandes et caméra verrouillées - Cliquer pour déverrouiller"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Verrouillé</span>
            </button>
          )}

          {/* Bouton Bascule Thème Sombre / Clair */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
