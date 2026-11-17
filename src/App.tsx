import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, QrCode, ShieldAlert, ShieldCheck, ArrowLeft } from 'lucide-react';
import { canAccessMode } from './core/rbac';
import { isRtlLanguage, translateUi } from './core/localization';
import { EcosystemProvider, useEcosystem } from './services/EcosystemContext';
import { PortalView } from './components/portal/PortalView';
import { DriverLayout } from './components/driver/DriverLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { LocalizationPromptOverlay } from './components/ui/LocalizationModal';

interface TachographPublicAuditResponse {
  ok: boolean;
  integrityStatus: 'VALID' | 'TAMPERED' | 'NOT_FOUND';
  error?: string;
  summary?: {
    sessionId: string;
    verificationCode: string;
    driverAlias: string;
    vehicleLabel: string;
    operatorName: string;
    date: string;
    startIso: string;
    endIso?: string | null;
    odometerStartKm: number;
    odometerEndKm: number;
    distanceKm: number;
    drivingMinutes: number;
    effectiveWorkMinutes: number;
    breakMinutes: number;
    currentState: string;
    status: string;
    countryCode: string;
    city: string;
    updatedAtIso: string;
  } | null;
}

const TachographAuditPublicView: React.FC<{ sid: string; code: string; onExit: () => void }> = ({
  sid,
  code,
  onExit,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TachographPublicAuditResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tachograph/audit/${encodeURIComponent(sid)}?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((json: TachographPublicAuditResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            ok: false,
            integrityStatus: 'NOT_FOUND',
            error: 'Não foi possível contactar o servidor de verificação AIVAD.',
          });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sid, code]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                AIVAD · Verificação Pública TACÓGRAFO
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auditoria criptográfica HMAC de jornada operacional TVDE (sem exposição de dados sensíveis)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" /> Voltar ao Portal
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            A validar assinatura criptográfica no servidor AIVAD...
          </div>
        ) : data?.integrityStatus === 'VALID' && data.summary ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 p-4 flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Registo Autêntico e Verificado (HMAC Válido)
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Sessão <span className="font-mono font-semibold">{data.summary.sessionId}</span> · Código{' '}
                  <span className="font-mono font-semibold">{data.summary.verificationCode}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500 dark:text-slate-400">Motorista / Veículo</div>
                <div className="font-bold text-sm mt-0.5">{data.summary.driverAlias}</div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">{data.summary.vehicleLabel}</div>
                <div className="text-slate-500 mt-0.5">{data.summary.operatorName}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500 dark:text-slate-400">Turno &amp; Estado</div>
                <div className="font-bold text-sm mt-0.5">
                  {data.summary.status} ({data.summary.currentState})
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Início: {new Date(data.summary.startIso).toLocaleString()}
                </div>
                {data.summary.endIso && (
                  <div className="text-slate-500 mt-0.5">
                    Fim: {new Date(data.summary.endIso).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500 dark:text-slate-400">Tempos Consolidados</div>
                <div className="font-bold text-sm mt-0.5">
                  Trabalho efetivo: {data.summary.effectiveWorkMinutes} min
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Condução: {data.summary.drivingMinutes} min · Pausas: {data.summary.breakMinutes} min
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500 dark:text-slate-400">Odómetro &amp; Mercado</div>
                <div className="font-bold text-sm mt-0.5">
                  {data.summary.odometerStartKm} → {data.summary.odometerEndKm} km ({data.summary.distanceKm} km)
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {data.summary.city} ({data.summary.countryCode})
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Registo operacional auditável AIVAD TACÓGRAFO. Não substitui tacógrafo físico homologado quando exigido por entidade competente.
              </span>
            </div>
          </div>
        ) : data?.integrityStatus === 'TAMPERED' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 p-4 flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-rose-800 dark:text-rose-300">
                Alerta de Integridade: Verificação Falhou (TAMPERED)
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                {data.error ?? 'Assinatura HMAC ou código de verificação inválido.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4 flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Sessão não encontrada neste servidor
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {data?.error ??
                  'Registo inexistente para este identificador. Em ambiente local (localhost), apenas o dispositivo/rede local alcança este servidor.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AivadShell: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { state, setMode, setDriverNav, setAdminNav, setPortalPage, enterDemoSandbox } = useEcosystem();
  const [portalLocOpen, setPortalLocOpen] = useState(false);
  const [auditQuery, setAuditQuery] = useState<{ sid: string; code: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'tacho-audit' && params.get('sid')) {
      return {
        sid: params.get('sid') || '',
        code: params.get('code') || '',
      };
    }
    return null;
  });
  const autostartHandled = useRef(false);

  // Sincronização global real de idioma e direção RTL/LTR no elemento <html>
  useEffect(() => {
    const lang = state.localization.languageCode || 'pt-PT';
    const rtl = isRtlLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [state.localization.languageCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const navParam = params.get('nav');
    const autostart = params.get('autostart') === '1';

    if (modeParam === 'tacho-audit' && params.get('sid')) {
      setAuditQuery({ sid: params.get('sid') || '', code: params.get('code') || '' });
      return;
    }

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
      `${state.cms.brandTitle ?? 'AIVAD'} — ${translateUi(state.localization.languageCode, 'app_brand_tagline')}`;
    if (document.title !== title) {
      document.title = title;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && state.cms.seoDescription) {
      metaDesc.setAttribute('content', state.cms.seoDescription);
    }
  }, [state.cms.seoTitle, state.cms.seoDescription, state.cms.brandTitle, state.localization.languageCode]);

  if (auditQuery) {
    return (
      <TachographAuditPublicView
        sid={auditQuery.sid}
        code={auditQuery.code}
        onExit={() => {
          setAuditQuery(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
          }
        }}
      />
    );
  }

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
