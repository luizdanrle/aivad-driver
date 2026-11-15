import React, { useState } from 'react';
import { Download, Lock, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { EXTERNAL_INTEGRATIONS } from '../../../adapters/platformAdapters';
import { exportToCsv, exportToXlsx } from '../../../core/exportUtils';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

const RBAC_MATRIX = [
  { role: 'Superadministrador', scope: 'Acesso total ao ecossistema, segurança, RBAC e recuperação (respeitando privacidade de ganhos do motorista sem consentimento).' },
  { role: 'Administrador', scope: 'Gestão operacional de utilizadores, plataformas, mercados, veículos e versões.' },
  { role: 'Comercial', scope: 'Planos, assinaturas, preços, promoções e relatórios comerciais.' },
  { role: 'Conteúdo', scope: 'Gestão visual, editor de páginas CMS, publicações e tutoriais.' },
  { role: 'Suporte', scope: 'Caixa de tickets, SLA, notificações individuais e apoio mediante consentimento.' },
  { role: 'Técnico', scope: 'Monitorização técnica, integrações, releases e configurações remotas.' },
  { role: 'Auditor', scope: 'Consulta imutável de auditoria, conformidade legal e relatórios administrativos.' },
];

export const AdminTechAndSecurity: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { state, toggleRemoteFlag, rollbackCms, resetDemoData } = useEcosystem();
  const [serverProbe, setServerProbe] = useState<{
    loading: boolean;
    health?: string;
    auditStatus?: string;
    auditDetails?: string;
  }>({ loading: false });

  const runServerRbacProbe = async () => {
    setServerProbe({ loading: true });
    try {
      const [hRes, aRes] = await Promise.all([
        fetch('/api/health', { credentials: 'include' }),
        fetch('/api/admin/audit-summary', { credentials: 'include' }),
      ]);
      const hJson = await hRes.json().catch(() => ({}));
      const aJson = await aRes.json().catch(() => ({}));
      setServerProbe({
        loading: false,
        health: `HTTP ${hRes.status} · Gemini Proxy: ${hJson.geminiConfigured ? 'Configurado (Server)' : 'Fallback Determinístico'}`,
        auditStatus: `HTTP ${aRes.status} ${aRes.ok ? 'Autorizado' : 'Bloqueado (RBAC)'}`,
        auditDetails: aRes.ok
          ? `Contas servidor: ${aJson.totalUsers ?? 0} · Observações zona: ${aJson.totalZoneObservations ?? 0} · Sessão: ${aJson.requestedBy ?? ''}`
          : aJson.error || 'Acesso administrativo negado pelo servidor Express.',
      });
    } catch {
      setServerProbe({
        loading: false,
        health: 'Erro de ligação ao servidor Express',
        auditStatus: 'Indisponível',
      });
    }
  };

  if (activeTab === 'config-remotas') {
    const rc = state.remoteConfig;
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Configurações Remotas & Ambientes Separados"
          description="Controlo centralizado de parâmetros de desenvolvimento, testes e produção."
        />
        <Card className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Ambiente Atual</span>
              <span className="font-mono-tabular font-bold text-sm">{rc.environment}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Sincronização Offline</span>
              <span className="font-semibold text-sm">{rc.offlineSyncEnabled ? 'Ativa' : 'Desativada'}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-slate-500 block">Modo RGPD Estrito</span>
              <span className="font-semibold text-sm">{rc.gdprStrictMode ? 'Ativo' : 'Padrão'}</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Object.entries(rc.featureFlags).map(([flag, val]) => (
              <div key={flag} className="py-2.5 flex items-center justify-between">
                <span className="font-mono-tabular">{flag}</span>
                <button
                  type="button"
                  onClick={() => toggleRemoteFlag(flag)}
                  className={`px-3 py-1 rounded text-white font-semibold ${val ? 'bg-emerald-600' : 'bg-slate-600'}`}
                >
                  {val ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (activeTab === 'integracoes') {
    return (
      <div className="space-y-4">
        <ContextualHelpBanner
          title="Registo de Integrações Externas & Adaptadores"
          description="Nenhuma integração externa é simulada como produção. Todas as APIs pendentes apresentam claramente o estado INTEGRAÇÃO A VALIDAR."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXTERNAL_INTEGRATIONS.map((intg) => (
            <Card key={intg.id} className="p-5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">{intg.category}</span>
                <StatusLabel tone="warning" text={intg.statusLabel} />
              </div>
              <h3 className="text-sm font-bold">{intg.name}</h3>
              <p className="text-slate-600 dark:text-slate-300">{intg.description}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'monitorizacao') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Monitorização Técnica & Barramento de Eventos Idempotentes"
          description="Acompanha processamento entre serviços centrais e prevenção de duplicações."
        />
        <Card className="overflow-x-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h3 className="text-sm font-bold">Eventos Internos Recentes ({state.events.length})</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Origem → Destino</th>
                <th className="p-3">Chave Idempotente</th>
                <th className="p-3">Resumo</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.events.map((ev) => (
                <tr key={ev.id}>
                  <td className="p-3 font-mono-tabular font-semibold">{ev.type}</td>
                  <td className="p-3">{ev.source} → {ev.target}</td>
                  <td className="p-3 font-mono-tabular text-[11px]">{ev.idempotencyKey}</td>
                  <td className="p-3">{ev.payloadSummary}</td>
                  <td className="p-3">
                    <StatusLabel tone={ev.status === 'Processado' ? 'success' : 'warning'} text={ev.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeTab === 'relatorios-admin') {
    const headers = ['Subscrição', 'Utilizador', 'Plano', 'Canal', 'Ciclo', 'Valor (€)', 'Estado'];
    const rows = state.subscriptions.map((s) => {
      const u = state.users.find((x) => x.id === s.userId);
      const p = state.plans.find((x) => x.id === s.planId);
      return [s.id, u?.name ?? s.userId, p?.name ?? s.planId, s.channel, s.billingCycle, s.priceEur.toFixed(2), s.status];
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">Relatórios Administrativos SaaS</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportToCsv('aivad-admin-assinaturas.csv', headers, rows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => exportToXlsx('aivad-admin-assinaturas.xlsx', 'Assinaturas', headers, rows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold"
            >
              Exportar XLSX
            </button>
          </div>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j} className="p-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeTab === 'seguranca') {
    return (
      <div className="space-y-4">
        <Card className="p-5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Verificação Real de RBAC &amp; Estado no Servidor Express
              </h2>
              <p className="text-slate-500">
                Testa em tempo real os endpoints protegidos <code>/api/health</code> e <code>/api/admin/audit-summary</code> com o cookie de sessão atual.
              </p>
            </div>
            <button
              type="button"
              onClick={runServerRbacProbe}
              disabled={serverProbe.loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${serverProbe.loading ? 'animate-spin' : ''}`} />
              Testar Endpoints Express
            </button>
          </div>
          {(serverProbe.health || serverProbe.auditStatus) && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 font-mono-tabular">
              <p><strong>Health:</strong> {serverProbe.health}</p>
              <p><strong>Admin RBAC:</strong> {serverProbe.auditStatus}</p>
              {serverProbe.auditDetails && <p className="text-slate-600 dark:text-slate-300">{serverProbe.auditDetails}</p>}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4 text-xs">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Matriz de Perfis &amp; Permissões RBAC (Enforced no Servidor Express)
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {RBAC_MATRIX.map((r) => (
              <div key={r.role} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">{r.role}</p>
                  <p className="text-slate-600 dark:text-slate-300">{r.scope}</p>
                </div>
                {state.activeAdminRole === r.role && (
                  <StatusLabel tone="info" text="Perfil Ativo na Sessão" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (activeTab === 'auditoria') {
    return (
      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h2 className="text-sm font-bold">Registo Imutável de Auditoria ({state.auditLogs.length})</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Data/Hora</th>
              <th className="p-3">Ator / Perfil</th>
              <th className="p-3">Ação</th>
              <th className="p-3">Entidade</th>
              <th className="p-3">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.auditLogs.map((a) => (
              <tr key={a.id}>
                <td className="p-3 font-mono-tabular">{a.timestamp.slice(0, 19).replace('T', ' ')}</td>
                <td className="p-3">{a.actor} ({a.actorRole})</td>
                <td className="p-3 font-semibold">{a.action}</td>
                <td className="p-3">{a.entity}</td>
                <td className="p-3">{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  // HISTÓRICO E RECUPERAÇÃO
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Histórico de Estado, Backups & Recuperação"
        description="Reverta publicações do Site Oficial (CMS) ou restaure o estado demonstrativo base."
      />
      <Card className="p-5 space-y-4 text-xs">
        <h3 className="text-sm font-bold">Pontos de Recuperação CMS</h3>
        {state.cms.revisionHistory.length === 0 ? (
          <p className="text-slate-500">Nenhuma alteração CMS registada nesta sessão ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {state.cms.revisionHistory.map((rev) => (
              <div key={rev.id} className="py-2 flex items-center justify-between">
                <span>{rev.summary} ({rev.savedAt.slice(0, 19).replace('T', ' ')})</span>
                <button
                  type="button"
                  onClick={() => rollbackCms(rev.id)}
                  className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700"
                >
                  Restaurar Revisão
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={resetDemoData}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            Restaurar Snapshot Base do Ecossistema
          </button>
        </div>
      </Card>
    </div>
  );
};
