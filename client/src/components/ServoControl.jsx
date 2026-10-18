import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  RotateCw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Power,
  Check,
  Disc,
  ArrowUpRight,
  Lock
} from 'lucide-react';

export default function ServoControl({ compact = false }) {
  const {
    latestReadings,
    activeDevice,
    sendCommand,
    addToast,
    openSecurityModal,
    isSecurityUnlocked
  } = useApp();

  // Angle lu depuis l'ESP32 en temps réel (si disponible)
  const serverAngle = latestReadings['servo_angle']?.value;
  const [sliderAngle, setSliderAngle] = useState(serverAngle !== undefined ? serverAngle : 0);
  const [isSending, setIsSending] = useState(false);
  const [lastSentAngle, setLastSentAngle] = useState(serverAngle !== undefined ? serverAngle : 0);

  // Synchroniser le slider si une nouvelle valeur arrive du réseau
  useEffect(() => {
    if (serverAngle !== undefined && !isSending) {
      setSliderAngle(serverAngle);
      setLastSentAngle(serverAngle);
    }
  }, [serverAngle, isSending]);

  const executeApplyAngle = async (targetAngle) => {
    if (!activeDevice?.id) {
      addToast({
        title: 'Aucun appareil sélectionné',
        message: 'Sélectionnez un ESP32 dans la liste.',
        type: 'error'
      });
      return;
    }

    const angle = Math.max(0, Math.min(180, Math.round(targetAngle)));
    setIsSending(true);
    setSliderAngle(angle);

    let command = 'servo_set';
    if (angle === 0) command = 'servo_close';
    else if (angle === 180) command = 'servo_open';

    const success = await sendCommand(activeDevice.id, command, { angle });
    if (success) {
      setLastSentAngle(angle);
      addToast({
        title: 'Ordre Servo transmis',
        message: `Servomoteur orienté à ${angle}° (${getStatusLabel(angle)})`,
        type: 'success'
      });
    }
    setTimeout(() => setIsSending(false), 800);
  };

  const handleApplyAngle = (targetAngle) => {
    openSecurityModal('Manoeuvre de la Vanne Hydraulique', () => executeApplyAngle(targetAngle));
  };

  const getStatusLabel = (deg) => {
    if (deg === 0) return 'Vanne Fermée';
    if (deg === 180) return 'Vanne Ouverte';
    if (deg === 90) return 'Mi-ouverte (90°)';
    return `${deg}°`;
  };

  const getStatusColor = (deg) => {
    if (deg === 0) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (deg === 180) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className={`glass-card rounded-2xl ${compact ? 'p-4' : 'p-6'} space-y-5 border border-slate-200/80 dark:border-white/10 shadow-lg relative overflow-hidden`}>
      {/* Halo décoratif subtil */}
      <div
        className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"
      />

      {/* 1. EN-TÊTE DU CONTRÔLEUR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-500 border border-cyan-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Actionneur Servomoteur / Vanne
              {isSending && (
                <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilotage PWM sur broche GPIO 18 (Course 0° à 180°)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSecurityUnlocked && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Lock className="w-3 h-3" />
              Protégé
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${getStatusColor(sliderAngle)}`}>
            {getStatusLabel(sliderAngle)}
          </span>
        </div>
      </div>

      {/* 2. VISUALISATION DU DIAL / VANNE ET SLIDER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Cadran visuel interactif */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-100/60 dark:bg-slate-950/40 border border-slate-200/50 dark:border-white/5">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Anneau gradué */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-cyan-500 transition-all duration-500"
                strokeWidth="7"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * (sliderAngle / 180))}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Aiguille centrale rotative */}
            <div
              className="absolute w-20 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-cyan-500 rounded-full transition-transform duration-300 origin-center pointer-events-none shadow-md shadow-cyan-500/50"
              style={{ transform: `rotate(${sliderAngle - 90}deg)` }}
            />

            {/* Centreur digital */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {sliderAngle}°
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Angle
              </span>
            </div>
          </div>
        </div>

        {/* Contrôle par Curseur (Slider) */}
        <div className="md:col-span-8 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>0° (Fermé)</span>
              <span>90° (Milieu)</span>
              <span>180° (Ouvert)</span>
            </div>

            <input
              type="range"
              min="0"
              max="180"
              step="5"
              value={sliderAngle}
              onChange={(e) => setSliderAngle(Number(e.target.value))}
              onMouseUp={() => handleApplyAngle(sliderAngle)}
              onTouchEnd={() => handleApplyAngle(sliderAngle)}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none transition-all"
            />
          </div>

          {/* 3. BOUTONS D'ACTION RAPIDE */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleApplyAngle(0)}
              disabled={isSending}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                sliderAngle === 0
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Fermer (0°)</span>
            </button>

            <button
              onClick={() => handleApplyAngle(90)}
              disabled={isSending}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                sliderAngle === 90
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Mi-ouvert (90°)</span>
            </button>

            <button
              onClick={() => handleApplyAngle(180)}
              disabled={isSending}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                sliderAngle === 180
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Ouvrir (180°)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. NOTE DE SÉCURITÉ HYDRAULIQUE AUTOMATIQUE */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          <strong>Sécurité anti-fuite active</strong> : en cas de pic d'eau ou de gaz, l'ESP32 ramène automatiquement le servomoteur à 0° pour couper la vanne.
        </span>
      </div>
    </div>
  );
}
