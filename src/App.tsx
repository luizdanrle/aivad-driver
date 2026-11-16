import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { canAccessMode } from './core/rbac';
import { EcosystemProvider, useEcosystem } from './services/EcosystemContext';
import { PortalView } from './components/portal/PortalView';
import { DriverLayout } from './components/driver/DriverLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { LocalizationPromptOverlay } from './components/ui/LocalizationModal';

const AivadShell: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { state, setMode, setDriverNav, setAdminNav, setPortalPage, enterDemoSandbox } = useEcosystem();
  const [portalLocOpen, setPortalLocOpen] = useState(false);
  const autostartHandled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const navParam = params.get('nav');
    const autostart = params.get('autostart') === '1';

    if (autostart && !autostartHandled.current) {
      autostartHandled.current = true;
      const targetMode = modeParam === 'admin' ? 'admin' : 'driver';
      if (canAccessMode(state.session, targetMode)) {
        setMode(targetMode);
        if (navParam) {
          if (targetMode === 'admin') setAdminNav(navParam);
          else setDriverNav(navParam);
        }
      } else {
        void enterDemoSandbox(targetMode).then((res) => {
          if (res.ok && navParam) {
            if (targetMode === 'admin') setAdminNav(navParam);
            else setDriverNav(navParam);
          }
        });
      }
      return;
    }

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
    const title =
      state.cms.seoTitle ||
      `${state.cms.brandTitle ?? 'AIVAD'} — Driver Intelligence & Management Ecosystem`;
    if (document.title !== title) {
      document.title = title;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && state.cms.seoDescription) {
      metaDesc.setAttribute('content', state.cms.seoDescription);
    }
  }, [state.cms.seoTitle, state.cms.seoDescription, state.cms.brandTitle]);

  const activeShellKey =
    state.mode === 'driver' && canAccessMode(state.session, 'driver')
      ? 'driver'
      : state.mode === 'admin' && canAccessMode(state.session, 'admin')
      ? 'admin'
      : 'portal';

  return (
    <AnimatePresence mode="wait">
      {activeShellKey === 'driver' ? (
        <motion.div
          key="shell-driver"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <DriverLayout />
        </motion.div>
      ) : activeShellKey === 'admin' ? (
        <motion.div
          key="shell-admin"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <AdminLayout />
        </motion.div>
      ) : (
        <motion.div
          key="shell-portal"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <PortalView onOpenLocationModal={() => setPortalLocOpen(true)} />
          <LocalizationPromptOverlay
            manualOpen={portalLocOpen}
            onCloseManual={() => setPortalLocOpen(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <EcosystemProvider>
      <AivadShell />
    </EcosystemProvider>
  );
}
