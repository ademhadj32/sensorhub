import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChartSkeleton } from '../components/Skeletons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Download,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  Equal,
  Sparkles,
  RotateCw
} from 'lucide-react';

export default function History() {
  const { sensorsConfig } = useApp();
  const [selectedSensor, setSelectedSensor] = useState('temperature');
  const [selectedRange, setSelectedRange] = useState('24h');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Charger l'historique quand le capteur ou la plage change
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/readings?sensor=${selectedSensor}&range=${selectedRange}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            // Formater les dates pour l'affichage XAxis
            const formatted = data.map(item => {
              const d = new Date(item.created_at);
              return {
                ...item,
                timeLabel: selectedRange === '1h'
                  ? d.toLocaleTimeString('fr-FR', { minute: '2-digit', second: '2-digit' })
                  : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                fullDate: d.toLocaleString('fr-FR')
              };
            });
            setHistoryData(formatted);
          }
        }
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedSensor, selectedRange]);

  // Trouver la configuration du capteur actif
  const currentSensorCfg = sensorsConfig.find(s => s.sensor === selectedSensor) || {
    label: selectedSensor,
    unit: ''
  };

  // Calculs statistiques : Min, Max, Moyenne
  const values = historyData.map(d => d.value).filter(v => typeof v === 'number');
  const minVal = values.length ? Math.min(...values) : null;
  const maxVal = values.length ? Math.max(...values) : null;
  const avgVal = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

  // Export CSV
  const handleExportCSV = () => {
    if (!historyData.length) return;

    const headers = ['Date_Heure', 'Capteur', 'Valeur', 'Unite', 'Appareil'];
    const csvRows = [headers.join(';')];

    for (const row of historyData) {
      csvRows.push([
        `"${row.fullDate}"`,
        `"${row.sensor}"`,
        row.value,
        `"${row.unit || ''}"`,
        `"${row.device_id}"`
      ].join(';'));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sensorhub_${selectedSensor}_${selectedRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Définir la palette de couleur du dégradé selon le capteur
  let strokeColor = '#06b6d4';
  let gradientId = 'cyanGrad';
  if (selectedSensor === 'gas') {
    strokeColor = '#f59e0b';
    gradientId = 'amberGrad';
  } else if (selectedSensor === 'water') {
    strokeColor = '#3b82f6';
    gradientId = 'blueGrad';
  } else if (selectedSensor.includes('solar')) {
    strokeColor = '#eab308';
    gradientId = 'yellowGrad';
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE ET COMMANDES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Historique & Analyses
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Graphiques haute précision et suivi des tendances
          </p>
        </div>

        {/* Bouton Export CSV */}
        <button
          onClick={handleExportCSV}
          disabled={!historyData.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exporter en CSV</span>
        </button>
      </div>

      {/* 2. BARRE DE FILTRES : SÉLECTION DU CAPTEUR ET DE LA PLAGE HORAIRE */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sélecteur de capteur */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {sensorsConfig.filter(s => s.enabled === 1).map((s) => (
            <button
              key={s.sensor}
              onClick={() => setSelectedSensor(s.sensor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSensor === s.sensor
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Sélecteur de plage temporelle (1h / 24h / 7j) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start md:self-auto border border-slate-200 dark:border-white/5">
          {[
            { id: '1h', label: '1 Heure' },
            { id: '24h', label: '24 Heures' },
            { id: '7d', label: '7 Jours' }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedRange === range.id
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CARTES STATISTIQUES (MIN / MAX / MOYENNE) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <ArrowDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Minimum</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {minVal !== null ? `${minVal} ${currentSensorCfg.unit || ''}` : '--'}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <Equal className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Moyenne</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {avgVal !== null ? `${avgVal} ${currentSensorCfg.unit || ''}` : '--'}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Maximum</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {maxVal !== null ? `${maxVal} ${currentSensorCfg.unit || ''}` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ZONE DU GRAPHIQUE INTERACTIF RECHARTS */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Évolution : {currentSensorCfg.label}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ({historyData.length} points)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <RotateCw className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : historyData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6">
            <Clock className="w-10 h-10 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Aucune donnée pour cet intervalle
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Les mesures s'accumuleront à mesure que l'ESP32 émet ses trames.
            </p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  dy={5}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="glass-card rounded-xl p-3 shadow-xl border border-cyan-500/30 text-xs">
                          <p className="text-slate-400 font-medium mb-1">{d.fullDate}</p>
                          <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-white">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: strokeColor }} />
                            <span>{d.value} {d.unit}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
