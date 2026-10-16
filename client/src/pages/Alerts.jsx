import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Flame,
  Waves,
  ShieldAlert,
  Clock,
  CheckCheck,
  Filter,
  Check
} from 'lucide-react';

export default function Alerts() {
  const {
    alerts,
    activeAlertsCount,
    acknowledgeAlert,
    acknowledgeAllAlerts
  } = useApp();

  const [filter, setFilter] = useState('active'); // 'all' | 'active' | 'acknowledged'
  const [ackingId, setAckingId] = useState(null);

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'active') return a.acknowledged === 0;
    if (filter === 'acknowledged') return a.acknowledged === 1;
    return true;
  });

  const handleAcknowledge = async (id) => {
    setAckingId(id);
    await acknowledgeAlert(id);
    setAckingId(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE AVEC BOUTON D'ACQUITTEMENT GLOBAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Journal des Alertes
            </h2>
            {activeAlertsCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                {activeAlertsCount} active{activeAlertsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Historique chronologique des dépassements de seuils et anomalies matérielles
          </p>
        </div>

        {activeAlertsCount > 0 && (
          <button
            onClick={acknowledgeAllAlerts}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Tout acquitter</span>
          </button>
        )}
      </div>

      {/* 2. ONGLETS DE FILTRAGE */}
      <div className="glass-card rounded-2xl p-2 flex items-center gap-2 self-start max-w-md">
        {[
          { id: 'active', label: 'Non traitées', count: activeAlertsCount },
          { id: 'all', label: 'Toutes', count: alerts.length },
          { id: 'acknowledged', label: 'Résolues', count: alerts.length - activeAlertsCount }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              filter === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. LISTE DES ALERTES */}
      {filteredAlerts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Aucune alerte à afficher
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {filter === 'active'
              ? 'Toutes les alertes ont été traitées ou aucun seuil n\'a été dépassé.'
              : 'Aucun enregistrement d\'alerte ne correspond à ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            const isAck = alert.acknowledged === 1;
            const isWater = alert.sensor === 'water';
            const isGas = alert.sensor === 'gas';

            let Icon = ShieldAlert;
            if (isWater) Icon = Waves;
            else if (isGas) Icon = Flame;

            const dateStr = new Date(alert.created_at).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <div
                key={alert.id}
                className={`glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  !isAck
                    ? 'border-rose-500/40 bg-rose-500/5 glow-red'
                    : 'border-slate-200 dark:border-white/5 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
                    !isAck
                      ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                        {alert.sensor}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        (Valeur : {alert.value})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        !isAck
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {!isAck ? 'Action requise' : 'Acquittée'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {alert.message}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {dateStr}
                      </span>
                      <span>&bull;</span>
                      <span>Appareil: {alert.device_id}</span>
                    </div>
                  </div>
                </div>

                {!isAck && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={ackingId === alert.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 hover:border-emerald-500 hover:text-emerald-500 text-slate-700 dark:text-slate-200 shadow-sm transition-all self-end sm:self-auto cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{ackingId === alert.id ? 'Traitement...' : 'Acquitter'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
