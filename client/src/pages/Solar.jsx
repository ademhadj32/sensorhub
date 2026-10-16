import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  SunMedium,
  Zap,
  BatteryCharging,
  Gauge,
  TrendingUp,
  Info,
  Sparkles,
  RotateCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function Solar() {
  const { latestReadings } = useApp();

  const [solarHistory, setSolarHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Vérifier si des mesures solaires sont présentes
  const solarVolt = latestReadings['solar_voltage'];
  const solarCurr = latestReadings['solar_current'];
  const solarPow = latestReadings['solar_power'];

  const hasSolarData =
    (solarVolt && solarVolt.value !== null) ||
    (solarCurr && solarCurr.value !== null) ||
    (solarPow && solarPow.value !== null);

  // Charger la courbe de puissance solaire
  useEffect(() => {
    if (!hasSolarData) return;

    let isMounted = true;
    const fetchSolarHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch('/api/readings?sensor=solar_power&range=24h');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const formatted = data.map(item => {
              const d = new Date(item.created_at);
              return {
                ...item,
                timeLabel: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                fullDate: d.toLocaleString('fr-FR')
              };
            });
            setSolarHistory(formatted);
          }
        }
      } catch (e) {
        console.error('Erreur chargement puissance solaire:', e);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchSolarHistory();
    return () => {
      isMounted = false;
    };
  }, [hasSolarData, solarPow?.value]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Énergie & Panneau Solaire
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              hasSolarData
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-white/10'
            }`}>
              {hasSolarData ? 'Actif' : 'En attente de capteur'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Surveillance de production photovoltaïque (Tension, Courant, Puissance)
          </p>
        </div>
      </div>

      {!hasSolarData ? (
        /* ÉTAT VIDE LORSQU'AUCUN CAPTEUR SOLAIRE N'EST CONNECTÉ */
        <div className="glass-card rounded-3xl p-10 sm:p-16 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <SunMedium className="w-10 h-10 animate-spin-slow" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Aucun capteur solaire connecté
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Cette page s'activera et se remplira automatiquement dès que votre ESP32 transmettra les champs numériques <code className="text-amber-500 font-mono">solar_voltage</code>, <code className="text-amber-500 font-mono">solar_current</code> et <code className="text-amber-500 font-mono">solar_power</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 text-left w-full space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Exemple de JSON compatible :</p>
            <pre className="font-mono text-cyan-500 dark:text-cyan-400 text-[11px] overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`{
  "device": "esp32-01",
  "solar_voltage": 18.4,
  "solar_current": 520,
  "solar_power": 9.57
}`}
            </pre>
          </div>
        </div>
      ) : (
        /* ÉTAT ACTIF AVEC LES CARTES ET LA COURBE DE PRODUCTION */
        <div className="space-y-6">
          {/* GRILLE DES 3 MÉTRIQUES CLEFS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* TENSION */}
            <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tension Solaire
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {solarVolt?.value !== undefined && solarVolt?.value !== null ? solarVolt.value.toFixed(1) : '--'}
                    </span>
                    <span className="text-lg font-bold text-amber-500">V</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <SunMedium className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
                Plage nominale : 12V - 24V
              </div>
            </div>

            {/* COURANT */}
            <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Courant Solaire
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {solarCurr?.value !== undefined && solarCurr?.value !== null ? Math.round(solarCurr.value) : '--'}
                    </span>
                    <span className="text-lg font-bold text-cyan-500">mA</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
                Capteur de courant INA219 / Shunt
              </div>
            </div>

            {/* PUISSANCE INSTANTANÉE */}
            <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Puissance Instantanée
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {solarPow?.value !== undefined && solarPow?.value !== null ? solarPow.value.toFixed(1) : '--'}
                    </span>
                    <span className="text-lg font-bold text-emerald-500">W</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <BatteryCharging className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
                Calcul P = U &times; I
              </div>
            </div>
          </div>

          {/* GRAPHIQUE DE PRODUCTION SUR LES DERNIÈRES 24H */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Courbe de Puissance Solaire (W) sur 24h
              </h3>
            </div>

            {loadingHistory ? (
              <div className="h-64 flex items-center justify-center">
                <RotateCw className="w-7 h-7 text-amber-500 animate-spin" />
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={solarHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} tickLine={false} dy={5} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="glass-card rounded-xl p-3 text-xs shadow-xl border border-amber-500/30">
                              <p className="text-slate-400 font-medium mb-1">{d.fullDate}</p>
                              <p className="font-mono font-bold text-amber-400">{d.value} W</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fill="url(#solarGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
