import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Camera,
  Video,
  Play,
  Pause,
  RotateCw,
  Maximize2,
  CameraOff,
  Download,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap
} from 'lucide-react';
import ServoControl from '../components/ServoControl';

export default function CameraPage() {
  const { addToast } = useApp();
  const [streamUrl, setStreamUrl] = useState(() => {
    return localStorage.getItem('sensorhub_camera_url') || 'http://192.168.1.50:81/stream';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const imgRef = useRef(null);

  const handleSaveUrl = (newUrl) => {
    setStreamUrl(newUrl);
    localStorage.setItem('sensorhub_camera_url', newUrl);
    setIsConnected(false);
    setErrorMessage(null);
  };

  const handleConnect = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsConnected(false);
    setIsLoading(false);
    setErrorMessage('Impossible d\'atteindre le flux vidéo. Vérifiez que l\'ESP32-CAM est allumée et sur le même réseau WiFi.');
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setErrorMessage(null);
  };

  // Capture d'une capture d'écran
  const handleSnapshot = () => {
    if (!imgRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth || 640;
      canvas.height = imgRef.current.naturalHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgRef.current, 0, 0);

      const link = document.createElement('a');
      link.download = `esp32cam_snapshot_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      addToast({ title: 'Capture enregistrée', message: 'L\'image a été téléchargée avec succès.', type: 'success' });
    } catch (e) {
      addToast({ title: 'Erreur', message: 'Capture directe indisponible (sécurité CORS du flux).', type: 'error' });
    }
  };

  // Contrôle de la lampe Flash intégrée
  const handleToggleFlash = async () => {
    try {
      const urlObj = new URL(streamUrl);
      const flashUrl = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port || 81}/flash`;
      const res = await fetch(flashUrl, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        const state = await res.text();
        addToast({ title: 'Flash ESP32-CAM', message: `Lampe flash : ${state === 'ON' ? 'ALLUMÉE' : 'ÉTEINTE'}`, type: 'info' });
      }
    } catch (e) {
      addToast({ title: 'Flash indisponible', message: 'Impossible de contacter /flash sur l\'ESP32-CAM.', type: 'error' });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-fade-in">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Vidéosurveillance ESP32-CAM
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-white/10'
            }`}>
              {isConnected ? 'En direct' : 'Déconnectée'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Module caméra MJPEG en temps réel compatible avec le firmware standard CameraWebServer
          </p>
        </div>

        {/* Barre de contrôle d'URL */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <button
                onClick={handleToggleFlash}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white shadow transition-all cursor-pointer"
                title="Allumer / Éteindre la LED Flash"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Flash</span>
              </button>
              <button
                onClick={handleSnapshot}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Capture</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow transition-all cursor-pointer"
              >
                <CameraOff className="w-4 h-4" />
                <span>Stopper</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Démarrer le flux</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CONFIGURATION DE L'URL DU FLUX */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            URL du flux vidéo MJPEG de l'ESP32-CAM (ex: http://192.168.1.50:81/stream)
          </label>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => handleSaveUrl(e.target.value)}
            placeholder="http://IP_DE_VOTRE_ESP32_CAM:81/stream"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* 3. LECTEUR VIDÉO ET ÉTATS */}
      <div className="glass-card rounded-3xl overflow-hidden aspect-video max-h-[560px] w-full relative flex items-center justify-center bg-slate-950 border border-slate-800 shadow-2xl">
        {isConnected ? (
          <>
            <img
              ref={imgRef}
              src={streamUrl}
              alt="Flux direct ESP32-CAM"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="w-full h-full object-contain"
            />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-3">
                <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs font-semibold">Connexion au flux vidéo MJPEG...</p>
              </div>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>LIVE MJPEG</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-md space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
              <CameraOff className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Caméra non connectée
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {errorMessage ||
                  'Saisissez l\'adresse IP de votre module ESP32-CAM puis cliquez sur "Démarrer le flux".'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleConnect}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
              >
                Tester la connexion
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTRÔLE DU SERVOMOTEUR (PAN-TILT / VANNE) SOUS LA CAMÉRA */}
      <ServoControl />

      {/* 4. GUIDE D'INTÉGRATION ESP32-CAM */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-500" />
          Comment brancher et programmer l'ESP32-CAM ?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">1. Exemple Arduino</span>
            <p>Ouvrez Arduino IDE &gt; Fichiers &gt; Exemples &gt; ESP32 &gt; Camera &gt; CameraWebServer.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">2. Sélection de modèle</span>
            <p>Décommentez <code className="text-cyan-500 font-mono">#define CAMERA_MODEL_AI_THINKER</code> et renseignez votre WiFi.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">3. Adresse IP</span>
            <p>Le moniteur série affichera l'IP (ex: 192.168.1.50). Le flux sera disponible sur le port :81/stream.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
