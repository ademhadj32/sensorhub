import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';

export default function SecurityModal({ isOpen, onClose, onSuccess, actionTitle = 'Accès Protégé' }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setIsSuccess(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (password === 'ademadem') {
      setIsSuccess(true);
      setError('');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } else {
      setError('Mot de passe incorrect. Accès refusé.');
      setPassword('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-cyan-500/30 relative overflow-hidden bg-slate-900/95 text-white">
        {/* Halo lumineux */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Bouton fermeture */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Autorisation Requise
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {actionTitle}
            </p>
          </div>
        </div>

        {/* Message d'explication */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 mb-5 text-xs text-slate-300 flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Cette opération est sécurisée pour empêcher toute manipulation non autorisée. Veuillez saisir le mot de passe de contrôle.
          </span>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Mot de passe de sécurité
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Entrez le mot de passe..."
                className={`w-full px-4 py-3 rounded-xl bg-slate-950/80 border text-sm font-mono text-white placeholder-slate-500 focus:outline-none transition-all ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-400 font-semibold mt-1.5 flex items-center gap-1.5 animate-shake">
                <ShieldAlert className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            {isSuccess && (
              <p className="text-xs text-emerald-400 font-semibold mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mot de passe validé ! Déverrouillage...
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSuccess || !password}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Valider</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
