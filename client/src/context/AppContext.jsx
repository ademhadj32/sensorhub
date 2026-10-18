import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Thème Sombre / Clair (sombre par défaut)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sensorhub_theme') || 'dark';
  });

  // Authentification Admin
  const [token, setToken] = useState(() => localStorage.getItem('sensorhub_token') || null);
  const [user, setUser] = useState(null);

  // Données
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('esp32-01');
  const [latestReadings, setLatestReadings] = useState({});
  const [readingsHistoryMap, setReadingsHistoryMap] = useState({}); // Pour sparklines légères
  const [sensorsConfig, setSensorsConfig] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // État SSE et connexion
  const [sseConnected, setSseConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Système de notifications Toast
  const [toasts, setToasts] = useState([]);
  const eventSourceRef = useRef(null);

  // Ajout de toast (déclaré en premier pour être accessible par les handlers)
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, type: 'info', ...toast };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sécurité & Protection mot de passe (ademadem)
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(() => {
    return sessionStorage.getItem('sensorhub_sec_unlocked') === 'true';
  });
  const [securityModalState, setSecurityModalState] = useState({
    isOpen: false,
    actionTitle: 'Accès Protégé',
    onConfirm: null
  });

  const unlockSecurity = useCallback(() => {
    setIsSecurityUnlocked(true);
    sessionStorage.setItem('sensorhub_sec_unlocked', 'true');
    addToast({
      title: '🔓 Contrôle Déverrouillé',
      message: 'Accès autorisé aux commandes matérielles et à la caméra.',
      type: 'success'
    });
  }, [addToast]);

  const lockSecurity = useCallback(() => {
    setIsSecurityUnlocked(false);
    sessionStorage.removeItem('sensorhub_sec_unlocked');
    addToast({
      title: '🔒 Sécurité Verrouillée',
      message: 'Les commandes et la caméra sont de nouveau protégées.',
      type: 'info'
    });
  }, [addToast]);

  const openSecurityModal = useCallback((actionTitle, onConfirm) => {
    if (isSecurityUnlocked) {
      if (typeof onConfirm === 'function') onConfirm();
      return;
    }
    setSecurityModalState({
      isOpen: true,
      actionTitle: actionTitle || 'Accès Protégé',
      onConfirm: typeof onConfirm === 'function' ? onConfirm : null
    });
  }, [isSecurityUnlocked]);

  const closeSecurityModal = useCallback(() => {
    setSecurityModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleSecuritySuccess = useCallback(() => {
    unlockSecurity();
    if (typeof securityModalState.onConfirm === 'function') {
      securityModalState.onConfirm();
    }
  }, [unlockSecurity, securityModalState]);

  // Gestion de la classe Dark sur HTML
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sensorhub_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Web Notifications du navigateur
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        addToast({ title: 'Notifications activées', message: 'Vous recevrez les alertes en direct.', type: 'success' });
      }
    }
  }, [addToast]);

  const sendBrowserNotification = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'sensorhub-alert'
        });
      } catch (e) {
        console.error('Erreur notification navigateur:', e);
      }
    }
  }, []);

  // ==========================================
  // APPELS API
  // ==========================================

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (e) {
      console.error('Erreur fetch devices:', e);
    }
  }, []);

  const fetchLatestReadings = useCallback(async () => {
    try {
      const res = await fetch('/api/readings/latest');
      if (res.ok) {
        const data = await res.json();
        const map = {};
        for (const item of data) {
          map[item.sensor] = item;
        }
        setLatestReadings(map);
      }
    } catch (e) {
      console.error('Erreur fetch latest:', e);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?limit=50');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setActiveAlertsCount(data.active_count || 0);
      }
    } catch (e) {
      console.error('Erreur fetch alerts:', e);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setSensorsConfig(data.sensors || []);
        setSystemSettings(data.settings || {});
      }
    } catch (e) {
      console.error('Erreur fetch config:', e);
    }
  }, []);

  // Chargement initial global
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDevices(),
        fetchLatestReadings(),
        fetchAlerts(),
        fetchConfig()
      ]);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchDevices, fetchLatestReadings, fetchAlerts, fetchConfig]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ==========================================
  // FLUX SSE (SERVER-SENT EVENTS)
  // ==========================================
  useEffect(() => {
    let es;
    try {
      es = new EventSource('/api/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.addEventListener('connected', () => {
        setSseConnected(true);
      });

      // Événement : Nouveau relevé reçu
      es.addEventListener('readings', (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Mettre à jour les derniers relevés
          setLatestReadings(prev => {
            const next = { ...prev };
            for (const r of payload.readings) {
              const currentCfg = next[r.sensor] || {};
              next[r.sensor] = {
                ...currentCfg,
                id: r.id,
                device_id: r.device_id,
                sensor: r.sensor,
                value: r.value,
                unit: r.unit,
                created_at: r.created_at
              };
            }
            return next;
          });

          // Mettre à jour le statut du device (last_seen)
          setDevices(prev =>
            prev.map(d =>
              d.id === payload.device_id
                ? { ...d, is_online: true, seconds_since_last_seen: 0, last_seen: payload.timestamp }
                : d
            )
          );
        } catch (e) {
          console.error('Erreur parsing SSE readings:', e);
        }
      });

      // Événement : Alerte déclenchée
      es.addEventListener('alert', (event) => {
        try {
          const newAlert = JSON.parse(event.data);
          setAlerts(prev => [newAlert, ...prev]);
          setActiveAlertsCount(count => count + 1);

          addToast({
            title: `🚨 Alerte ${newAlert.sensor.toUpperCase()}`,
            message: newAlert.message,
            type: 'error'
          });

          sendBrowserNotification(`🚨 Alerte ${newAlert.sensor.toUpperCase()}`, newAlert.message);
        } catch (e) {
          console.error('Erreur parsing SSE alert:', e);
        }
      });

      // Événement : Alerte acquittée
      es.addEventListener('alert_acknowledged', (event) => {
        try {
          const acked = JSON.parse(event.data);
          setAlerts(prev => prev.map(a => a.id === acked.id ? { ...a, acknowledged: 1 } : a));
          setActiveAlertsCount(count => Math.max(0, count - 1));
        } catch (e) {}
      });

      // Événement : Tout acquitté
      es.addEventListener('all_alerts_acknowledged', () => {
        setAlerts(prev => prev.map(a => ({ ...a, acknowledged: 1 })));
        setActiveAlertsCount(0);
      });

      // Événement : Nouveau capteur découvert dynamiquement
      es.addEventListener('sensor_discovered', (event) => {
        try {
          const newSensor = JSON.parse(event.data);
          setSensorsConfig(prev => {
            if (prev.some(s => s.sensor === newSensor.sensor)) return prev;
            return [...prev, newSensor];
          });
          addToast({
            title: '✨ Nouveau capteur détecté !',
            message: `Le capteur "${newSensor.label}" a été ajouté dynamiquement au tableau de bord.`,
            type: 'info'
          });
        } catch (e) {}
      });

      // Événement : Commande créée
      es.addEventListener('command_created', (event) => {
        try {
          const cmd = JSON.parse(event.data);
          addToast({
            title: 'Commande transmise',
            message: `Ordre "${cmd.command}" envoyé à l'ESP32 (${cmd.device_id}).`,
            type: 'success'
          });
        } catch (e) {}
      });

      es.onerror = () => {
        setSseConnected(false);
      };
    } catch (err) {
      console.error('Erreur initialisation SSE:', err);
    }

    // Polling de secours léger toutes les 15s si déconnexion
    const interval = setInterval(() => {
      fetchDevices();
      fetchAlerts();
    }, 15000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
    };
  }, [addToast, sendBrowserNotification, fetchDevices, fetchAlerts]);

  // Actions
  const acknowledgeAlert = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'PATCH' });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: 1 } : a));
        setActiveAlertsCount(count => Math.max(0, count - 1));
        addToast({ title: 'Alerte acquittée', message: 'L\'alerte a été marquée comme traitée.', type: 'success' });
      }
    } catch (e) {
      addToast({ title: 'Erreur', message: 'Impossible d\'acquitter l\'alerte.', type: 'error' });
    }
  };

  const acknowledgeAllAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/acknowledge-all', { method: 'POST' });
      if (res.ok) {
        setAlerts(prev => prev.map(a => ({ ...a, acknowledged: 1 })));
        setActiveAlertsCount(0);
        addToast({ title: 'Succès', message: 'Toutes les alertes ont été acquittées.', type: 'success' });
      }
    } catch (e) {
      addToast({ title: 'Erreur', message: 'Échec de l\'opération.', type: 'error' });
    }
  };

  // Vérification continue de l'état En Ligne / Hors Ligne (détection rapide en 3-5 secondes)
  useEffect(() => {
    const offlineChecker = setInterval(() => {
      setDevices(prev =>
        prev.map(d => {
          if (!d.last_seen) {
            return d.is_online ? { ...d, is_online: false } : d;
          }
          const lastSeenDate = new Date(d.last_seen.endsWith('Z') ? d.last_seen : d.last_seen + 'Z');
          const diffSeconds = Math.max(0, Math.floor((Date.now() - lastSeenDate.getTime()) / 1000));
          const threshold = parseInt(systemSettings?.offline_threshold_seconds, 10) || 20;
          const isNowOnline = diffSeconds <= threshold;
          if (d.is_online !== isNowOnline || d.seconds_since_last_seen !== diffSeconds) {
            return { ...d, is_online: isNowOnline, seconds_since_last_seen: diffSeconds };
          }
          return d;
        })
      );
    }, 2000);

    return () => clearInterval(offlineChecker);
  }, [systemSettings]);

  const sendCommand = async (deviceId, command, params = null) => {
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, command, params, password: 'ademadem' })
      });
      if (res.ok) {
        return true;
      }
      throw new Error('Erreur HTTP ' + res.status);
    } catch (e) {
      addToast({ title: 'Erreur commande', message: e.message, type: 'error' });
      return false;
    }
  };

  const addDevice = async (deviceData) => {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur lors de l\'ajout de l\'appareil');
    }
    const created = await res.json();
    setDevices(prev => [...prev, created]);
    addToast({ title: 'Appareil ajouté', message: `L'appareil ${created.name} est enregistré.`, type: 'success' });
    return created;
  };

  const updateConfig = async (configData) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    if (!res.ok) {
      throw new Error('Erreur lors de la mise à jour des réglages');
    }
    await fetchConfig();
    addToast({ title: 'Réglages enregistrés', message: 'Les seuils et configurations ont été mis à jour.', type: 'success' });
  };

  // Récupérer le device sélectionné actif
  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0] || null;

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        token,
        setToken,
        user,
        setUser,
        devices,
        selectedDeviceId,
        setSelectedDeviceId,
        activeDevice,
        latestReadings,
        sensorsConfig,
        systemSettings,
        alerts,
        activeAlertsCount,
        sseConnected,
        loading,
        error,
        toasts,
        addToast,
        removeToast,
        requestNotificationPermission,
        refreshAll,
        acknowledgeAlert,
        acknowledgeAllAlerts,
        sendCommand,
        addDevice,
        updateConfig,
        // Sécurité & Protection mot de passe (ademadem)
        isSecurityUnlocked,
        unlockSecurity,
        lockSecurity,
        securityModalState,
        openSecurityModal,
        closeSecurityModal,
        handleSecuritySuccess
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp doit être utilisé dans un AppProvider');
  }
  return context;
}
