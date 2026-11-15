import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  Gauge,
  History,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  WifiOff,
  X,
} from 'lucide-react';
import {
  exportPrintablePdfReport,
  exportToCsv,
  exportToXlsx,
} from '../../../core/exportUtils';
import { formatDistance } from '../../../core/localization';
import {
  buildTachographQrPayload,
  canTransitionTachographState,
  consolidateMultiPlatformJornada,
  TACHOGRAPH_LEGAL_DISCLAIMER,
  TACHOGRAPH_STATES,
} from '../../../core/tachograph';
import type { TachographActivityRecord, TachographState } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  QrCodeVerifierCard,
  TACHO_STATE_COLOR,
  TachographTimelineStrip,
} from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  SegmentedFilter,
  StatusLabel,
} from '../../ui/DesignSystem';

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

export const DriverTachographView: React.FC = () => {
  const {
    state,
    activeDriver,
    activeVehicle,
    activeMarket,
    visibleDriverPlatforms,
    startTachograph,
    transitionTachograph,
    correctTachographActivity,
    enqueueOfflineTachograph,
    syncOfflineTachograph,
  } = useEcosystem();

  const tacho = state.tachograph;
  const activeSession = tacho.sessions.find(
    (s) => s.id === tacho.activeSessionId && s.status === 'Em curso'
  );
  const latestSession = activeSession ?? tacho.sessions[0];

  const [odoInput, setOdoInput] = useState<number>(
    () => (activeSession?.odometerCurrentKm ?? latestSession?.odometerEndKm ?? 48450) + 6
  );
  const [startOdoInput, setStartOdoInput] = useState<number>(
    () => (latestSession?.odometerEndKm ?? latestSession?.odometerCurrentKm ?? 48450)
  );
  const [operatorInput, setOperatorInput] = useState('Atlântico Mobilidade TVDE Lda');
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    visibleDriverPlatforms[0]?.id ?? 'uber'
  );
  const [movementKind, setMovementKind] =
    useState<NonNullable<TachographActivityRecord['movementKind']>>('Com passageiro');
  const [noteInput, setNoteInput] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(
    null
  );

  // Report Period Filters
  const [reportPeriod, setReportPeriod] = useState<'diario' | 'semanal' | 'mensal' | 'personalizado'>(
    'diario'
  );
  const [customStartDate, setCustomStartDate] = useState('2026-11-10');
  const [customEndDate, setCustomEndDate] = useState('2026-11-30');

  // Auditable Correction Modal State
  const [correctingRecord, setCorrectingRecord] = useState<TachographActivityRecord | null>(null);
  const [corrState, setCorrState] = useState<TachographState>('Condução em serviço');
  const [corrDuration, setCorrDuration] = useState<number>(15);
  const [corrOdoStart, setCorrOdoStart] = useState<number>(0);
  const [corrOdoEnd, setCorrOdoEnd] = useState<number>(0);
  const [corrNotes, setCorrNotes] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrError, setCorrError] = useState<string | null>(null);

  const filteredActivities = useMemo(() => {
    const today = '2026-11-14';
    return tacho.activities.filter((a) => {
      if (reportPeriod === 'diario') return a.date === today || a.date >= today;
      if (reportPeriod === 'semanal') return a.date >= '2026-11-08';
      if (reportPeriod === 'mensal') return a.date.startsWith('2026-11');
      return a.date >= customStartDate && a.date <= customEndDate;
    });
  }, [tacho.activities, reportPeriod, customStartDate, customEndDate]);

  const filteredIntervals = useMemo(() => {
    const today = '2026-11-14';
    return tacho.platformIntervals.filter((pi) => {
      if (reportPeriod === 'diario') return pi.date === today || pi.date >= today;
      if (reportPeriod === 'semanal') return pi.date >= '2026-11-08';
      if (reportPeriod === 'mensal') return pi.date.startsWith('2026-11');
      return pi.date >= customStartDate && pi.date <= customEndDate;
    });
  }, [tacho.platformIntervals, reportPeriod, customStartDate, customEndDate]);

  const periodSummary = useMemo(
    () => consolidateMultiPlatformJornada(filteredActivities, filteredIntervals, tacho.sessions),
    [filteredActivities, filteredIntervals, tacho.sessions]
  );

  const qrData = useMemo(
    () =>
      buildTachographQrPayload(
        activeSession ?? latestSession,
        periodSummary,
        activeDriver.name,
        `${activeVehicle.brand} ${activeVehicle.model}`
      ),
    [activeSession, latestSession, periodSummary, activeDriver.name, activeVehicle]
  );

  const pendingOfflineCount = tacho.offlineQueue.filter(
    (q) => q.syncState === 'Na fila offline'
  ).length;

  const openCorrection = (rec: TachographActivityRecord) => {
    setCorrectingRecord(rec);
    setCorrState(rec.state);
    setCorrDuration(rec.durationMinutes);
    setCorrOdoStart(rec.odometerStartKm);
    setCorrOdoEnd(rec.odometerEndKm ?? rec.odometerStartKm);
    setCorrNotes(rec.notes);
    setCorrReason('');
    setCorrError(null);
  };

  const handleApplyCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    const res = correctTachographActivity(
      correctingRecord.id,
      {
        state: corrState,
        durationMinutes: corrDuration,
        odometerStartKm: corrOdoStart,
        odometerEndKm: corrOdoEnd,
        notes: corrNotes,
      },
      corrReason
    );
    if (!res.ok) {
      setCorrError(res.error ?? 'Erro ao aplicar correção.');
      return;
    }
    setCorrectingRecord(null);
    setFeedback({
      tone: 'success',
      text: `Correção auditável gravada em ${correctingRecord.id}. O registo original foi preservado na trilha de revisões.`,
    });
  };

  const exportHeaders = [
    'ID',
    'Data',
    'Estado',
    'Início',
    'Fim',
    'Duração (min)',
    'Odo. Início',
    'Odo. Fim',
    'Plataforma',
    'Movimento',
    'Estado Registo',
  ];
  const exportRows = filteredActivities.map((a) => [
    a.id,
    a.date,
    a.state,
    a.startIso.slice(11, 16),
    a.endIso ? a.endIso.slice(11, 16) : 'Ativo',
    a.durationMinutes,
    a.odometerStartKm,
    a.odometerEndKm ?? a.odometerStartKm,
    a.platformId?.toUpperCase() ?? 'Consolidado',
    a.movementKind ?? 'N/D',
    `${a.status} (${a.revisions.length} rev.)`,
  ]);

  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="AIVAD TACÓGRAFO TVDE — Registo Digital Independente de Jornada"
        description="Módulo autónomo com 10 estados validados, verificação de odómetro, consolidação multi-plataforma sem dupla contagem, fila offline auditável e QR verificável."
        demoNotice="Módulo Independente (Agenda preservada separadamente)"
      />

      {/* Explicit Legal Disclaimer Banner */}
      <div
        role="note"
        className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-100"
      >
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Aviso Legal e Regulamentar de Homologação</p>
          <p>{TACHOGRAPH_LEGAL_DISCLAIMER}</p>
        </div>
      </div>

      {/* Live Tachograph Cockpit Hero */}
      <Card className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-blue-900 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono-tabular px-2.5 py-0.5 rounded-md bg-blue-600/30 border border-blue-400/40 text-blue-100">
                <Gauge className="w-3.5 h-3.5" />
                {activeSession ? 'TURNO ATIVO NO TACÓGRAFO' : 'FORA DE SERVIÇO / SEM TURNO ATIVO'}
              </span>
              <span className="font-mono-tabular text-slate-300">
                ID Condutor: {activeDriver.id} · {activeDriver.name}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    TACHO_STATE_COLOR[activeSession?.currentState ?? 'Fora de serviço'],
                }}
              />
              <span>Estado Atual: {activeSession?.currentState ?? 'Fora de serviço'}</span>
            </h2>
            <p className="text-xs text-slate-300">
              Viatura: <strong>{activeVehicle.brand} {activeVehicle.model}</strong> ({activeVehicle.year}) ·
              Operador: <strong>{activeSession?.operatorName ?? operatorInput}</strong> ·
              Mercado: <strong>{activeMarket.name} ({state.localization.currentLocation.city})</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
              <span className="text-slate-300 block">Odómetro Início</span>
              <span className="text-base font-bold font-mono-tabular">
                {activeSession ? `${activeSession.odometerStartKm} km` : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
              <span className="text-slate-300 block">Odómetro Atual</span>
              <span className="text-base font-bold font-mono-tabular">
                {activeSession
                  ? `${activeSession.odometerCurrentKm} km`
                  : `${latestSession?.odometerEndKm ?? latestSession?.odometerCurrentKm ?? 48450} km`}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
              <span className="text-slate-300 block">Online Consolidado</span>
              <span className="text-base font-bold font-mono-tabular text-emerald-300">
                {formatMins(periodSummary.consolidatedOnlineMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/10 border border-white/10">
              <span className="text-slate-300 block">Fila Offline</span>
              <span className="text-base font-bold font-mono-tabular text-amber-300">
                {pendingOfflineCount} pendente(s)
              </span>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
              feedback.tone === 'danger'
                ? 'bg-red-900/70 border border-red-500 text-red-100'
                : feedback.tone === 'success'
                ? 'bg-emerald-900/70 border border-emerald-500 text-emerald-100'
                : 'bg-blue-900/70 border border-blue-500 text-blue-100'
            }`}
          >
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Controls: Start Shift OR 10 Validated State Controls */}
        {!activeSession ? (
          <div className="p-4 rounded-xl bg-white/10 border border-white/15 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
            <div>
              <label htmlFor="tac-start-odo" className="block font-medium text-slate-200 mb-1">
                Odómetro Inicial (km)
              </label>
              <input
                id="tac-start-odo"
                type="number"
                value={startOdoInput}
                onChange={(e) => setStartOdoInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/20 text-white font-mono-tabular"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="tac-op-name" className="block font-medium text-slate-200 mb-1">
                Operador / Frota
              </label>
              <input
                id="tac-op-name"
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/20 text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const res = startTachograph(startOdoInput, operatorInput, 'Início manual de turno');
                if (!res.ok) {
                  setFeedback({ tone: 'danger', text: res.error ?? 'Falha ao iniciar turno.' });
                } else {
                  setOdoInput(startOdoInput + 5);
                  setFeedback({
                    tone: 'success',
                    text: `Turno iniciado no tacógrafo com odómetro ${startOdoInput} km.`,
                  });
                }
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Iniciar Turno no Tacógrafo</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label htmlFor="tac-odo" className="block font-medium text-slate-200 mb-1">
                  Odómetro na Transição (km)
                </label>
                <input
                  id="tac-odo"
                  type="number"
                  value={odoInput}
                  onChange={(e) => setOdoInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/20 text-white font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="tac-plat" className="block font-medium text-slate-200 mb-1">
                  Plataforma Associada
                </label>
                <select
                  id="tac-plat"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/20 text-white"
                >
                  <option value="consolidado">Consolidado Multi-App</option>
                  {visibleDriverPlatforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tac-mov" className="block font-medium text-slate-200 mb-1">
                  Natureza do Movimento
                </label>
                <select
                  id="tac-mov"
                  value={movementKind}
                  onChange={(e) =>
                    setMovementKind(
                      e.target.value as NonNullable<TachographActivityRecord['movementKind']>
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/20 text-white"
                >
                  <option value="Com passageiro">Com passageiro</option>
                  <option value="Deslocação em vazio">Deslocação em vazio</option>
                  <option value="Estacionado / Sem movimento">Estacionado / Sem movimento</option>
                </select>
              </div>
              <div>
                <label htmlFor="tac-note" className="block font-medium text-slate-200 mb-1">
                  Nota Operacional (opcional)
                </label>
                <input
                  id="tac-note"
                  type="text"
                  placeholder="Ex: Pausa para carregamento EV"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/20 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                10 Estados Oficiais do Tacógrafo TVDE (Transições Validadas)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TACHOGRAPH_STATES.map((st) => {
                  const isCurrent = activeSession.currentState === st;
                  const guard = canTransitionTachographState(
                    activeSession.currentState,
                    st,
                    true
                  );
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        const res = transitionTachograph(st, odoInput, {
                          platformId: selectedPlatform === 'consolidado' ? undefined : selectedPlatform,
                          movementKind:
                            st === 'Condução em serviço'
                              ? movementKind
                              : 'Estacionado / Sem movimento',
                          notes: noteInput.trim() || undefined,
                        });
                        if (!res.ok) {
                          setFeedback({
                            tone: 'danger',
                            text: res.error ?? 'Transição recusada pelo motor do tacógrafo.',
                          });
                        } else {
                          setOdoInput((v) => v + 4);
                          setNoteInput('');
                          setFeedback({
                            tone: 'success',
                            text: `Estado atualizado para "${st}" aos ${odoInput} km.`,
                          });
                        }
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold text-left border transition-all flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'bg-white text-slate-900 border-white shadow-md'
                          : guard.allowed
                          ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                          : 'bg-slate-900/50 text-slate-400 border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="truncate">{st}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: TACHO_STATE_COLOR[st] }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Alerts from Tachograph Consolidation Engine */}
      {periodSummary.complianceAlerts.length > 0 && (
        <Card className="p-4 border-red-300 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 space-y-1.5 text-xs">
          {periodSummary.complianceAlerts.map((al, i) => (
            <div key={i} className="flex items-center gap-2 text-red-800 dark:text-red-200 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{al}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Multi-Platform Consolidation + Chronological Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Linha Temporal de Atividades ({filteredActivities.length} registos)
            </h3>
            <SegmentedFilter
              value={reportPeriod}
              onChange={(v) => setReportPeriod(v as typeof reportPeriod)}
              options={[
                { id: 'diario', label: 'Diário' },
                { id: 'semanal', label: 'Semanal' },
                { id: 'mensal', label: 'Mensal' },
                { id: 'personalizado', label: 'Personalizado' },
              ]}
            />
          </div>

          {reportPeriod === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-3 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <label className="flex items-center gap-1.5">
                <span>De:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span>Até:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                />
              </label>
            </div>
          )}

          <TachographTimelineStrip activities={filteredActivities} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Condução (Passag. / Vazio)</span>
              <span className="font-mono-tabular font-bold text-sm">
                {formatMins(periodSummary.drivingMinutes)}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono-tabular">
                {periodSummary.passengerTripMinutes}m pass. · {periodSummary.emptyMovementMinutes}m vazio
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Trabalho / Disponib.</span>
              <span className="font-mono-tabular font-bold text-sm">
                {formatMins(
                  periodSummary.workWithoutDrivingMinutes + periodSummary.availabilityMinutes
                )}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono-tabular">
                Espera: {formatMins(periodSummary.waitMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Pausas &amp; Refeições</span>
              <span className="font-mono-tabular font-bold text-sm">
                {formatMins(periodSummary.breakMinutes + periodSummary.mealMinutes)}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono-tabular">
                Descanso: {formatMins(periodSummary.restMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Distância Consolidada</span>
              <span className="font-mono-tabular font-bold text-sm">
                {formatDistance(periodSummary.totalKmDriven, activeMarket.unitSystem)}
              </span>
              <span className="block text-[11px] text-slate-500">Sem dupla contagem</span>
            </div>
          </div>
        </Card>

        {/* Multi-Platform Interval Consolidation Box */}
        <Card className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Consolidação Multi-Plataforma
            </h3>
            <StatusLabel tone="success" text="Sem Dupla Contagem" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Estar online em Uber, Bolt ou outras plataformas ao mesmo tempo gera uma{' '}
            <strong>única jornada cronológica unificada</strong> através da união de intervalos.
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono-tabular">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block">Soma Bruta Apps</span>
              <span className="text-base font-bold">
                {formatMins(periodSummary.rawPlatformOnlineMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30">
              <span className="text-[11px] text-blue-700 dark:text-blue-300 block">
                Jornada Real Única
              </span>
              <span className="text-base font-bold text-blue-700 dark:text-blue-400">
                {formatMins(periodSummary.consolidatedOnlineMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">
                Sobreposição Removida
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                -{formatMins(periodSummary.overlapEliminatedMinutes)}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs max-h-40 overflow-y-auto pr-1">
            {filteredIntervals.map((iv) => (
              <div
                key={iv.id}
                className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800"
              >
                <span className="font-semibold">
                  {iv.platformId.toUpperCase()} · {iv.kind}
                </span>
                <span className="font-mono-tabular text-slate-500">
                  {iv.startIso.slice(11, 16)} – {iv.endIso.slice(11, 16)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Offline Queue & Conflict Resolution + Reports & Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              Fila Offline &amp; Resolução de Conflitos ({tacho.offlineQueue.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  enqueueOfflineTachograph({
                    idempotencyKey: `off-act-${Date.now()}`,
                    actionType: 'TRANSITION',
                    targetState: activeSession?.currentState === 'Pausa' ? 'Disponibilidade' : 'Pausa',
                    odometerKm: (activeSession?.odometerCurrentKm ?? 48450) + 1,
                    notes: 'Transição capturada sem cobertura de rede (fila local).',
                  })
                }
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                + Simular Ação Offline
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = syncOfflineTachograph();
                  setFeedback({
                    tone: 'info',
                    text: `Fila sincronizada: ${res.syncedCount} aplicados, ${res.duplicatesSkipped} duplicados ignorados, ${res.conflictsResolved} conflitos resolvidos.`,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar Fila ({pendingOfflineCount})</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs max-h-56 overflow-y-auto">
            {tacho.offlineQueue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">
                    {item.targetState ?? item.actionType} · {item.odometerKm} km
                  </p>
                  <p className="text-slate-500">{item.notes}</p>
                  {item.conflictReason && (
                    <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                      Resolução: {item.conflictReason}
                    </p>
                  )}
                </div>
                <StatusLabel
                  tone={
                    item.syncState === 'Sincronizado'
                      ? 'success'
                      : item.syncState === 'Na fila offline'
                      ? 'warning'
                      : 'info'
                  }
                  text={item.syncState}
                />
              </div>
            ))}
          </div>

          {tacho.discrepancies.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-200">
                Registo de Discrepâncias &amp; Conflitos ({tacho.discrepancies.length})
              </p>
              {tacho.discrepancies.slice(0, 3).map((d) => (
                <p key={d.id} className="text-[11px] text-amber-700 dark:text-amber-300">
                  • [{d.severity}] {d.message}
                </p>
              ))}
            </div>
          )}
        </Card>

        {/* Export & Reports */}
        <Card className="lg:col-span-6 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Exportação &amp; Relatórios do Tacógrafo ({reportPeriod})
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  exportToCsv(`aivad-tacografo-${reportPeriod}.csv`, exportHeaders, exportRows)
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  exportToXlsx(
                    `aivad-tacografo-${reportPeriod}.xlsx`,
                    'Tacógrafo TVDE',
                    exportHeaders,
                    exportRows
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
              </button>
              <button
                type="button"
                onClick={() =>
                  exportPrintablePdfReport(
                    `Relatório AIVAD TACÓGRAFO TVDE (${reportPeriod})`,
                    `Condutor: ${activeDriver.name} · Veículo: ${activeVehicle.brand} ${activeVehicle.model} · Assinatura QR: ${qrData.verificationCode}`,
                    exportHeaders,
                    exportRows
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                PDF / Imprimir
              </button>
            </div>
          </div>

          <QrCodeVerifierCard
            qrText={qrData.qrText}
            verificationCode={qrData.verificationCode}
            payloadObject={qrData.payloadObject}
          />
        </Card>
      </div>

      {/* Immutable Audited Activity Ledger */}
      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registo Auditável de Atividades (Correções Preservam Histórico Original)
          </h3>
          <span className="text-xs text-slate-500">{filteredActivities.length} registo(s)</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Data / Hora</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Duração</th>
              <th className="p-3">Odómetro</th>
              <th className="p-3">Origem / Plataforma</th>
              <th className="p-3">Estado / Revisões</th>
              <th className="p-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredActivities.map((act) => (
              <tr key={act.id}>
                <td className="p-3 font-mono-tabular">
                  {act.date} · {act.startIso.slice(11, 16)}
                  {act.endIso ? `–${act.endIso.slice(11, 16)}` : ' (Ativo)'}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: TACHO_STATE_COLOR[act.state] }}
                    />
                    {act.state}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{act.notes}</p>
                </td>
                <td className="p-3 font-mono-tabular font-semibold">{act.durationMinutes} min</td>
                <td className="p-3 font-mono-tabular">
                  {act.odometerStartKm} → {act.odometerEndKm ?? act.odometerStartKm} km
                </td>
                <td className="p-3">
                  {act.platformId ? act.platformId.toUpperCase() : 'Jornada'} · {act.source}
                </td>
                <td className="p-3">
                  <StatusLabel
                    tone={
                      act.status === 'Ativo'
                        ? 'info'
                        : act.status === 'Corrigido'
                        ? 'warning'
                        : 'success'
                    }
                    text={`${act.status}${
                      act.revisions.length > 0 ? ` (${act.revisions.length} rev.)` : ''
                    }`}
                  />
                  {act.revisions.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Última rev.: {act.revisions[act.revisions.length - 1].reason} (era{' '}
                      {act.revisions[act.revisions.length - 1].previousState})
                    </p>
                  )}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => openCorrection(act)}
                    aria-label={`Corrigir registo ${act.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Corrigir</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Auditable Correction Modal */}
      {correctingRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Correção Auditável de Registo de Tacógrafo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
        >
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold">Correção Auditável ({correctingRecord.id})</h3>
                <p className="text-xs text-slate-500">
                  O registo anterior permanece gravado na trilha de auditoria.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar correção"
                onClick={() => setCorrectingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {corrError && <StatusLabel tone="danger" text={corrError} />}

            <form onSubmit={handleApplyCorrection} className="space-y-3 text-xs">
              <div>
                <label htmlFor="corr-st" className="block font-medium mb-1">Estado Corrigido</label>
                <select
                  id="corr-st"
                  value={corrState}
                  onChange={(e) => setCorrState(e.target.value as TachographState)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {TACHOGRAPH_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="corr-dur" className="block font-medium mb-1">Duração (m)</label>
                  <input
                    id="corr-dur"
                    type="number"
                    min={1}
                    value={corrDuration}
                    onChange={(e) => setCorrDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="corr-os" className="block font-medium mb-1">Odo. Início</label>
                  <input
                    id="corr-os"
                    type="number"
                    value={corrOdoStart}
                    onChange={(e) => setCorrOdoStart(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="corr-oe" className="block font-medium mb-1">Odo. Fim</label>
                  <input
                    id="corr-oe"
                    type="number"
                    value={corrOdoEnd}
                    onChange={(e) => setCorrOdoEnd(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="corr-notes" className="block font-medium mb-1">Notas</label>
                <input
                  id="corr-notes"
                  type="text"
                  value={corrNotes}
                  onChange={(e) => setCorrNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="corr-reason" className="block font-medium mb-1">
                  Motivo Justificativo Obrigatório (Auditoria)
                </label>
                <textarea
                  id="corr-reason"
                  rows={2}
                  required
                  placeholder="Ex: Esqueci-me de mudar de Espera para Pausa ao parar para café"
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                >
                  Gravar Correção Auditada
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
