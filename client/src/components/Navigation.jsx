import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  LineChart,
  Bell,
  Cpu,
  Settings,
  Camera,
  SunMedium,
  Menu,
  X,
  Radio,
  Download
} from 'lucide-react';

export default function Navigation({ currentPage, setCurrentPage }) {
  const { activeAlertsCount, activeDevice } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'history', label: 'Historique', icon: LineChart },
    { id: 'alerts', label: 'Alertes', icon: Bell, badge: activeAlertsCount },
    { id: 'devices', label: 'Appareils', icon: Cpu },
    { id: 'camera', label: 'Caméra', icon: Camera },
    { id: 'solar', label: 'Énergie Solaire', icon: SunMedium },
    { id: 'settings', label: 'Réglages', icon: Settings },
  ];

  // Onglets pour la barre du bas mobile (5 boutons principaux)
  const mobilePrimaryTabs = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'history', label: 'Historique', icon: LineChart },
    { id: 'alerts', label: 'Alertes', icon: Bell, badge: activeAlertsCount },
    { id: 'devices', label: 'Appareils', icon: Cpu },
  ];

  const handlePageSelect = (pageId) => {
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. SIDEBAR DESKTOP (VISIBLE >= 768px)                   */}
      {/* ======================================================== */}
      <aside className="hidden md:flex flex-col w-64 glass-nav flex-shrink-0 sticky top-0 h-screen p-4 justify-between">
        <div className="flex flex-col gap-6">
          {/* Logo & Sous-titre */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                SensorHub
              </h2>
              <span className="text-[11px] font-medium text-slate-400">ESP32 IoT Hub</span>
            </div>
          </div>

          {/* Liens de navigation */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageSelect(item.id)}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-500' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pied de sidebar : état matériel */}
        <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Microcontrôleur
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                activeDevice?.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
            {activeDevice?.name || 'Aucun appareil'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {activeDevice?.is_online ? 'Envoi toutes les 5s' : 'En attente de trame'}
          </p>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. BARRE INFÉRIEURE MOBILE (PRIORITÉ TÉLÉPHONE)           */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav px-2 py-1.5 pb-safe flex items-center justify-around shadow-2xl">
        {mobilePrimaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handlePageSelect(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400 font-semibold scale-105'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-0.5"></span>
              )}
            </button>
          );
        })}

        {/* Bouton "Plus" pour les pages secondaires sur mobile */}
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            ['camera', 'solar', 'settings'].includes(currentPage)
              ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Plus</span>
        </button>
      </nav>

      {/* Menu modal déroulant / tiroir pour le bouton "Plus" sur mobile */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-4 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="glass-card rounded-3xl p-5 mb-16 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Menu & Modules complémentaires
              </h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handlePageSelect('camera')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  currentPage === 'camera'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-medium'
                    : 'border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-800/40 text-slate-300'
                }`}
              >
                <Camera className="w-6 h-6 mb-1 text-cyan-400" />
                <span className="text-xs">Caméra</span>
              </button>

              <button
                onClick={() => handlePageSelect('solar')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  currentPage === 'solar'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-medium'
                    : 'border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-800/40 text-slate-300'
                }`}
              >
                <SunMedium className="w-6 h-6 mb-1 text-amber-400" />
                <span className="text-xs">Solaire</span>
              </button>

              <button
                onClick={() => handlePageSelect('settings')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  currentPage === 'settings'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-medium'
                    : 'border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-800/40 text-slate-300'
                }`}
              >
                <Settings className="w-6 h-6 mb-1 text-slate-300" />
                <span className="text-xs">Réglages</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
