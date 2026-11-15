import React, { useEffect } from 'react';
import { EcosystemProvider, useEcosystem } from './services/EcosystemContext';
import { PortalView } from './components/portal/PortalView';
import { DriverLayout } from './components/driver/DriverLayout';
import { AdminLayout } from './components/admin/AdminLayout';

const AivadShell: React.FC = () => {
  const { state, setMode, setDriverNav, setAdminNav } = useEcosystem();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const navParam = params.get('nav');
    if (modeParam === 'driver' || modeParam === 'admin' || modeParam === 'portal') {
      setMode(modeParam);
    }
    if (navParam) {
      if (modeParam === 'admin') setAdminNav(navParam);
      else setDriverNav(navParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.mode === 'driver') {
    return <DriverLayout />;
  }
  if (state.mode === 'admin') {
    return <AdminLayout />;
  }
  return <PortalView />;
};

export default function App() {
  return (
    <EcosystemProvider>
      <AivadShell />
    </EcosystemProvider>
  );
}
