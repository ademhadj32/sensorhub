import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Camera,
  Video,
  Play,
  RotateCw,
  CameraOff,
  Download,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import ServoControl from '../components/ServoControl';

export default function CameraPage() {
  const { addToast, isSecurityUnlocked, openSecurityModal, lockSecurity, unlockSecurity } = useApp();
  const [streamUrl, setStreamUrl] = useState(() => {
    return localStorage.getItem('sensorhub_camera_url') || 'http://192.168.1.50:81/stream';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const imgRef = useRef(null);

  // Auto-démarrage si déjà déverrouillé
  useEffect(() => {
    if (isSecurityUnlocked && !isConnected && !errorMessage) {
      setIsConnected(true);
    }
  }, [isSecurityUnlocked]);

  const handleSaveUrl = (newUrl) => {
    setStreamUrl(newUrl);
    localStorage.setItem('sensorhub_camera_url', newUrl);
    setIsConnected(false);
    setErrorMessage(null);
  };

  const handleConnectWithAuth = () => {
    if (!isSecurityUnlocked) {
      openSecurityModal('Visionnage Flux Vidéo ESP32-CAM', () => {
        setIsLoading(true);
        setErrorMessage(null);
        setIsConnected(true);
      });
    } else {
      setIsLoading(true);
      setErrorMessage(null);
      setIsConnected(true);
    }
  };

  const handleInlineUnlock = (e) => {
    e.preventDefault();
    if (inlinePassword === 'ademadem') {
      setInlineError('');
      setInlinePassword('');
      unlockSecurity();
      setIsLoading(true);
      setIsConnected(true);
    } else {
      setInlineError('Mot de passe incorrect (ademadem requis)');
      setInlinePassword('');
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsConnected(false);
    setIsLoading(false);
    setErrorMessage('Impossible d\'atteindre le flux vidéo. Vérifiez que l\'ESP32-CAM est bien sous tension, connectée au même réseau WiFi, et que l\'IP est exacte.');
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Vidéosurveillance ESP32-CAM
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                isSecurityUnlocked
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
              }`}>
                {isSecurityUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {isSecurityUnlocked ? 'Déverrouillée' : 'Accès Protégé'}
              </span>
            </h2>
            <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-white/10'
            }`}>
              {isConnected ? 'Flux actif' : 'Hors ligne'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Surveillance vidéo temps réel MJPEG (Port 81) avec sécurité par mot de passe
          </p>
        </div>

        {/* Barre de contrôle d'actions */}
        <div className="flex items-center gap-2">
          {isSecurityUnlocked && (
            <button
              onClick={lockSecurity}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold glass-card text-slate-600 dark:text-slate-300 hover:border-amber-500/40 hover:text-amber-500 transition-all cursor-pointer"
              title="Verrouiller à nouveau"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Verrouiller</span>
            </button>
          )}

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
              onClick={handleConnectWithAuth}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Démarrer le flux</span>
              {!isSecurityUnlocked && <Lock className="w-3 h-3 text-white/80" />}
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

      {/* 3. LECTEUR VIDÉO ET ÉTATS (PROTÉGÉ PAR MOT DE PASSE) */}
      <div className="glass-card rounded-3xl overflow-hidden aspect-video max-h-[560px] w-full relative flex items-center justify-center bg-slate-950 border border-slate-800 shadow-2xl">
        {!isSecurityUnlocked ? (
          /* ÉCRAN VERROUILLÉ QUAND MOT DE PASSE NON FOURNI */
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-md space-y-4 animate-fade-in z-10">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Vidéosurveillance Protégée
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Le flux vidéo de votre ESP32-CAM est sécurisé. Saisissez le mot de passe de contrôle pour visionner la caméra en direct.
              </p>
            </div>

            {/* Formulaire direct de déverrouillage */}
            <form onSubmit={handleInlineUnlock} className="w-full space-y-3 pt-1">
              <div className="relative">
                <input
                  type={showInlinePassword ? 'text' : 'password'}
                  value={inlinePassword}
                  onChange={(e) => {
                    setInlinePassword(e.target.value);
                    if (inlineError) setInlineError('');
                  }}
                  placeholder="Mot de passe..."
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition-all ${
                    inlineError
                      ? 'border-rose-500 ring-2 ring-rose-500/20'
                      : 'border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowInlinePassword(!showInlinePassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {inlineError && (
                <p className="text-xs text-rose-400 font-semibold flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {inlineError}
                </p>
              )}

              <button
                type="submit"
                disabled={!inlinePassword}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Déverrouiller le flux</span>
              </button>
            </form>
          </div>
        ) : isConnected ? (
          /* ÉCRAN DU FLUX VIDÉO EN DIRECT */
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
          /* ÉCRAN QUAND DÉCONNECTÉ OU ERREUR */
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
                  'Saisissez l\'adresse IP de votre ESP32-CAM puis cliquez sur "Démarrer le flux".'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleConnectWithAuth}
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

      {/* 4. GUIDE DE BRANCHEMENT ET PROGRAMMATION ESP32-CAM */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-500" />
          Comment brancher le câble et programmer votre ESP32-CAM ?
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
          {/* Option A : Socle MB */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-xs">A</span>
              Cas 1 : Avec adaptateur socle USB (ESP32-CAM-MB)
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Si votre ESP32-CAM est clipsée sur la petite carte d'extension noire avec port micro-USB :
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>Branchez simplement le câble micro-USB à votre PC.</li>
              <li>Aucun fil supplémentaire n'est requis ! Le circuit gère automatiquement le mode flash.</li>
              <li>Sélectionnez la carte <strong>"AI Thinker ESP32-CAM"</strong> dans l'Arduino IDE.</li>
            </ul>
          </div>

          {/* Option B : Câble Série FTDI */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">B</span>
              Cas 2 : Avec câble USB-Série FTDI (4 ou 6 fils)
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Branchement des broches entre le câble FTDI et l'ESP32-CAM :
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              <li>FTDI 5V (Rouge) &rarr; ESP32-CAM 5V</li>
              <li>FTDI GND (Noir) &rarr; ESP32-CAM GND</li>
              <li>FTDI TX (Vert/Orange) &rarr; ESP32-CAM U0R (RX)</li>
              <li>FTDI RX (Blanc/Jaune) &rarr; ESP32-CAM U0T (TX)</li>
              <li className="text-amber-500 font-sans font-semibold">⚠️ Relier GPIO 0 à GND pendant le téléversement, puis retirer et faire RESET.</li>
            </ul>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300 flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>
            Le code Arduino prêt à téléverser se trouve dans le fichier <strong className="font-mono">esp32/esp32_cam.ino</strong> de ce projet. Il configure la caméra et diffuse sur le port 81.
          </span>
        </div>
      </div>
    </div>
  );
}
