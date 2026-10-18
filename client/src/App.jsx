import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Toasts from './components/Toasts';
import SecurityModal from './components/SecurityModal';

// Pages
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Devices from './pages/Devices';
import Settings from './pages/Settings';
import CameraPage from './pages/Camera';
import Solar from './pages/Solar';

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { securityModalState, closeSecurityModal, handleSecuritySuccess } = useApp();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0a0f1d] text-slate-800 dark:text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Système global de Toasts */}
      <Toasts />

      {/* Modal de protection par mot de passe (ademadem) */}
      <SecurityModal
        isOpen={securityModalState.isOpen}
        actionTitle={securityModalState.actionTitle}
        onClose={closeSecurityModal}
        onSuccess={handleSecuritySuccess}
      />

      {/* Navigation latérale Desktop / Barre basse Mobile */}
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Conteneur principal de l'application */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Bandeau d'état supérieur et barre d'outils */}
        <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />

        {/* Corps de la page sélectionnée */}
        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} />}
          {currentPage === 'history' && <History />}
          {currentPage === 'alerts' && <Alerts />}
          {currentPage === 'devices' && <Devices />}
          {currentPage === 'camera' && <CameraPage />}
          {currentPage === 'solar' && <Solar />}
          {currentPage === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
