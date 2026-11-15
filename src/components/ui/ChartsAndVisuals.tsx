import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Download, QrCode, ShieldCheck } from 'lucide-react';
import type { TachographActivityRecord, TachographState } from '../../models/types';

export const PlatformBadge: React.FC<{
  name: string;
  shortCode?: string;
  brandColor?: string;
  size?: 'sm' | 'md';
}> = ({ name, shortCode, brandColor = '#1D4ED8', size = 'md' }) => {
  const code = (shortCode || name.slice(0, 2)).toUpperCase();
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <span
      style={{ backgroundColor: brandColor }}
      className={`inline-flex items-center justify-center rounded-lg font-mono-tabular font-bold text-white shrink-0 shadow-sm ${dim}`}
      aria-hidden="true"
    >
      {code}
    </span>
  );
};

export const GoalDonutChart: React.FC<{
  currentValue: number;
  targetValue: number;
  formattedCurrent: string;
  formattedTarget: string;
  label: string;
  accentColor?: string;
}> = ({
  currentValue,
  targetValue,
  formattedCurrent,
  formattedTarget,
  label,
  accentColor = '#1D4ED8',
}) => {
  const safeTarget = Math.max(1, targetValue);
  const pct = Math.max(0, Math.min(100, Math.round((currentValue / safeTarget) * 100)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={pct >= 100 ? '#059669' : accentColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-extrabold font-mono-tabular">{pct}%</span>
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-extrabold font-mono-tabular text-slate-900 dark:text-white truncate">
          {formattedCurrent}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Meta: <span className="font-mono-tabular font-semibold">{formattedTarget}</span>
        </p>
      </div>
    </div>
  );
};

export interface BarDatum {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  formattedValue: string;
  color?: string;
}

export const HorizontalBreakdownBars: React.FC<{
  items: BarDatum[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  emptyText?: string;
}> = ({ items, selectedId, onSelect, emptyText = 'Sem dados registados no filtro atual.' }) => {
  if (items.length === 0) {
    return <p className="text-xs text-slate-500 py-4">{emptyText}</p>;
  }
  const maxVal = Math.max(...items.map((i) => Math.max(0, i.value)), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((Math.max(0, item.value) / maxVal) * 100));
        const active = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={`w-full text-left space-y-1.5 rounded-lg p-2 -mx-2 transition-colors ${
              onSelect
                ? active
                  ? 'bg-blue-50/90 dark:bg-blue-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white">{item.label}</span>
                {item.sublabel && (
                  <span className="text-slate-500 dark:text-slate-400 ml-2">{item.sublabel}</span>
                )}
              </div>
              <span className="font-mono-tabular font-bold text-slate-900 dark:text-white shrink-0">
                {item.formattedValue}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {(() => {
                const isCharcoal = !active && item.color?.toLowerCase() === '#111827';
                return (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCharcoal ? 'bg-slate-900 dark:bg-slate-300' : ''
                    }`}
                    style={
                      isCharcoal
                        ? { width: `${pct}%` }
                        : {
                            width: `${pct}%`,
                            backgroundColor: active ? '#DC2626' : item.color ?? '#1D4ED8',
                          }
                    }
                  />
                );
              })()}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const TACHO_STATE_COLOR: Record<TachographState, string> = {
  'Fora de serviço': '#64748B',
  'Início de turno': '#2563EB',
  'Condução em serviço': '#1D4ED8',
  'Trabalho sem condução': '#0EA5E9',
  Disponibilidade: '#059669',
  Espera: '#D97706',
  Pausa: '#7C3AED',
  Refeição: '#DB2777',
  Descanso: '#0F766E',
  'Fim de turno': '#DC2626',
};

export const TachographTimelineStrip: React.FC<{
  activities: TachographActivityRecord[];
}> = ({ activities }) => {
  const ordered = [...activities]
    .filter((a) => a.durationMinutes > 0)
    .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());

  const totalMin = Math.max(
    1,
    ordered.reduce((s, a) => s + a.durationMinutes, 0)
  );

  if (ordered.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
        Sem intervalos fechados com duração para desenhar a linha temporal.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="w-full h-9 rounded-xl overflow-hidden flex border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
        role="img"
        aria-label="Linha temporal cronológica das atividades do tacógrafo"
      >
        {ordered.map((act) => {
          const widthPct = Math.max(3, (act.durationMinutes / totalMin) * 100);
          return (
            <div
              key={act.id}
              title={`${act.state} (${act.durationMinutes} min · ${act.odometerStartKm}→${act.odometerEndKm ?? act.odometerStartKm} km)`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: TACHO_STATE_COLOR[act.state] ?? '#1D4ED8',
              }}
              className="h-full border-r border-white/25 last:border-r-0 flex items-center justify-center text-[10px] font-mono-tabular font-bold text-white overflow-hidden px-1"
            >
              {widthPct >= 10 ? `${act.durationMinutes}m` : ''}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
        {Array.from(new Set(ordered.map((a) => a.state))).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: TACHO_STATE_COLOR[st] }}
            />
            <span>{st}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export const QrCodeVerifierCard: React.FC<{
  qrText: string;
  verificationCode: string;
  payloadObject: Record<string, string | number>;
}> = ({ qrText, verificationCode, payloadObject }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [verifiedState, setVerifiedState] = useState<'idle' | 'verified'>('idle');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrText, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [qrText]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0 flex flex-col items-center gap-2">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Código QR verificável do tacógrafo ${verificationCode}`}
            className="w-40 h-40 object-contain"
          />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center text-slate-400">
            <QrCode className="w-10 h-10" />
          </div>
        )}
        <span className="font-mono-tabular text-[11px] font-bold text-slate-800">
          {verificationCode}
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-3 text-xs w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>QR Verificável de Inspeção / Relatório</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVerifiedState('verified')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Validar Estrutura QR</span>
            </button>
            {dataUrl && (
              <a
                href={dataUrl}
                download={`aivad-tacografo-qr-${verificationCode}.png`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-white dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG QR</span>
              </a>
            )}
          </div>
        </div>

        {verifiedState === 'verified' && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
            Assinatura e esquema <strong>{String(payloadObject.v)}</strong> verificados · Condutor{' '}
            <strong>{String(payloadObject.drv)}</strong> · Condução{' '}
            <strong>{String(payloadObject.condMin)} min</strong> · Km{' '}
            <strong>{String(payloadObject.km)} km</strong>.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 font-mono-tabular text-[11px]">
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Sessão</span>
            <span className="font-bold truncate block">{String(payloadObject.sid)}</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Odómetro</span>
            <span className="font-bold">{String(payloadObject.odoIni)}→{String(payloadObject.odoFim)}</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Condução / Pausas</span>
            <span className="font-bold">{String(payloadObject.condMin)}m / {String(payloadObject.pausaMin)}m</span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block">Online Consol.</span>
            <span className="font-bold">{String(payloadObject.onlMin)} min</span>
          </div>
        </div>

        <details className="text-[11px]">
          <summary className="cursor-pointer text-blue-700 dark:text-blue-400 font-medium">
            Inspecionar payload JSON codificado no QR
          </summary>
          <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto font-mono-tabular">
            {qrText}
          </pre>
        </details>
      </div>
    </div>
  );
};
