import React, { useEffect, useState } from 'react';
import { canAccessMode } from './core/rbac';
import { EcosystemProvider, useEcosystem } from './services/EcosystemContext';
import { PortalView } from './components/portal/PortalView';
import { DriverLayout } from './components/driver/DriverLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { LocalizationPromptOverlay } from './components/ui/LocalizationModal';

const AivadShell: React.FC = () => {
  const { state, setMode, setDriverNav, setAdminNav, setPortalPage } = useEcosystem();
  const [portalLocOpen, setPortalLocOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const navParam = params.get('nav');
    if (modeParam === 'driver' || modeParam === 'admin' || modeParam === 'portal') {
      setMode(modeParam);
    }
    if (navParam) {
      if (modeParam === 'admin' && canAccessMode(state.session, 'admin')) {
        setAdminNav(navParam);
      } else if (modeParam === 'portal') {
        setPortalPage(navParam);
      } else if (modeParam === 'driver' && canAccessMode(state.session, 'driver')) {
        setDriverNav(navParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const title = state.cms.seoTitle || `${state.cms.brandTitle ?? 'AIVAD'} — Driver Intelligence & Management Ecosystem`;
    if (document.title !== title) {
      document.title = title;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && state.cms.seoDescription) {
      metaDesc.setAttribute('content', state.cms.seoDescription);
    }
  }, [state.cms.seoTitle, state.cms.seoDescription, state.cms.brandTitle]);

  if (state.mode === 'driver' && canAccessMode(state.session, 'driver')) {
    return <DriverLayout />;
  }
  if (state.mode === 'admin' && canAccessMode(state.session, 'admin')) {
    return <AdminLayout />;
  }
  return (
    <>
      <PortalView onOpenLocationModal={() => setPortalLocOpen(true)} />
      <LocalizationPromptOverlay
        manualOpen={portalLocOpen}
        onCloseManual={() => setPortalLocOpen(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <EcosystemProvider>
      <AivadShell />
    </EcosystemProvider>
  );
}
