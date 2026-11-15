import React, { useState } from 'react';
import { Lock, Search, ShieldCheck, Users } from 'lucide-react';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  MetricCard,
  StatusLabel,
} from '../../ui/DesignSystem';

export const AdminCoreOps: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    updateUserStatus,
    changeUserSubscriptionPlan,
    toggleRemoteFlag,
    setAdminNav,
  } = useEcosystem();

  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (activeTab === 'overview') {
    const activeUsers = state.users.filter((u) => u.status === 'Ativo').length;
    const activeSubs = state.subscriptions.filter((s) => s.status === 'Ativa');
    const mrr = activeSubs.reduce(
      (sum, s) => sum + (s.billingCycle === 'Anual' ? s.priceEur / 12 : s.priceEur),
      0
    );
    const openTickets = state.tickets.filter((t) => t.status !== 'Resolvido').length;

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD Management — Visão Geral do Ecossistema"
          description="Monitorização comercial, assinaturas, plataformas, países, versões e suporte num painel unificado com isolamento de privacidade dos motoristas."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Utilizadores Ativos / Totais"
            value={`${activeUsers} / ${state.users.length}`}
            subtext={`${state.users.filter((u) => u.status !== 'Ativo').length} suspensos/inativos`}
            explanation="Total de contas ativas no ecossistema (motoristas, operadores e equipa admin)."
            formula="Contagem de utilizadores por estado"
            accent="blue"
            onDrillDown={() => setAdminNav('utilizadores')}
            drillDownLabel="Gerir utilizadores"
          />
          <MetricCard
            label="Receita Recorrente Mensal (MRR Demo)"
            value={`€${mrr.toFixed(2)}`}
            subtext={`${activeSubs.length} assinaturas ativas · ${state.plans.length} planos`}
            explanation="Receita mensal recorrente normalizada das assinaturas ativas."
            formula="Σ (Mensal + Anual÷12)"
            onDrillDown={() => setAdminNav('assinaturas')}
            drillDownLabel="Ver assinaturas"
          />
          <MetricCard
            label="Plataformas / Países Ativos"
            value={`${state.platforms.filter((p) => p.status === 'Ativa').length} / ${state.countries.length}`}
            subtext={`${state.versions.length} versões catalogadas`}
            explanation="Plataformas de mobilidade visíveis nos menus e mercados configurados."
            formula="Contagem de plataformas ativas e mercados"
            onDrillDown={() => setAdminNav('plataformas')}
            drillDownLabel="Gerir plataformas"
          />
          <MetricCard
            label="Tickets em Aberto"
            value={`${openTickets}`}
            subtext="Ligados ao suporte do Modo Motorista"
            explanation="Pedidos de suporte aguardando análise ou conclusão."
            formula="Tickets com estado ≠ Resolvido"
            accent={openTickets > 0 ? 'red' : 'neutral'}
            onDrillDown={() => setAdminNav('tickets')}
            drillDownLabel="Abrir caixa de tickets"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold">Distribuição por Sistema Operativo &amp; Versões</h2>
            <div className="space-y-2">
              {(['Android', 'iOS', 'Web'] as const).map((os) => {
                const count = state.users.filter((u) => u.osPlatform === os).length;
                return (
                  <div key={os} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium">{os}</span>
                    <span className="font-mono-tabular font-semibold">{count} utilizador(es)</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold">Últimas Ações de Auditoria</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {state.auditLogs.slice(0, 4).map((a) => (
                <div key={a.id} className="py-2 flex justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.action} · {a.entity}</p>
                    <p className="text-slate-500">{a.details}</p>
                  </div>
                  <span className="text-slate-400 whitespace-nowrap">{a.actorRole}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'utilizadores') {
    const filtered = state.users.filter(
      (u) =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
    const inspected = state.users.find((u) => u.id === selectedUserId);

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Gestão de Utilizadores & Barreira de Privacidade"
          description="Permite consultar planos, dispositivos e estados. Os dados financeiros privados do motorista permanecem bloqueados salvo autorização explícita em Perfil e Configurações."
        />

        <Card className="p-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            aria-label="Pesquisar utilizadores"
            placeholder="Pesquisar por nome ou email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none"
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Utilizador</th>
                  <th className="p-3">Perfil</th>
                  <th className="p-3">SO / Versão</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((u) => {
                  const plan = state.plans.find((p) => p.id === u.planId);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-3">
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-slate-500">{u.email}</p>
                      </td>
                      <td className="p-3">{u.role} ({u.countryCode})</td>
                      <td className="p-3 font-mono-tabular">{u.osPlatform} v{u.appVersion}</td>
                      <td className="p-3">{plan?.name ?? u.planId}</td>
                      <td className="p-3">
                        <StatusLabel
                          tone={u.status === 'Ativo' ? 'success' : 'danger'}
                          text={u.status}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateUserStatus(u.id, u.status === 'Ativo' ? 'Suspenso' : 'Ativo');
                          }}
                          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {u.status === 'Ativo' ? 'Suspender' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="lg:col-span-4 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Inspeção &amp; Privacidade RGPD
            </h3>
            {inspected ? (
              <div className="space-y-3">
                <p><strong>Nome:</strong> {inspected.name}</p>
                <p><strong>Cidade / País:</strong> {inspected.city}, {inspected.countryCode}</p>
                <p><strong>Criado em:</strong> {inspected.createdAt}</p>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {inspected.privacyConsentForSupport ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-red-600" />
                    )}
                    <span>Dados Privados de Viagens e Financeiro</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    {inspected.privacyConsentForSupport
                      ? 'Autorização de suporte ativa pelo utilizador: acesso limitado apenas a métricas operacionais auditadas.'
                      : 'BLOQUEADO POR PRIVACIDADE: O motorista não autorizou visualização administrativa dos seus ganhos e viagens privadas.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Selecione um utilizador na tabela para consultar detalhes e permissões.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'organizacoes') {
    return (
      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold">Organizações &amp; Frotas TVDE</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Organização</th>
              <th className="p-3">NIF / VAT</th>
              <th className="p-3">País</th>
              <th className="p-3">Motoristas / Veículos</th>
              <th className="p-3">Plano</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.organizations.map((org) => (
              <tr key={org.id}>
                <td className="p-3 font-semibold">{org.name}</td>
                <td className="p-3 font-mono-tabular">{org.taxId}</td>
                <td className="p-3">{org.countryCode}</td>
                <td className="p-3 font-mono-tabular">{org.driversCount} / {org.vehiclesCount}</td>
                <td className="p-3">{org.planId}</td>
                <td className="p-3">
                  <StatusLabel tone={org.status === 'Ativa' ? 'success' : 'warning'} text={org.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  if (activeTab === 'planos' || activeTab === 'assinaturas') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="SaaS Core — Planos, Assinaturas & Sincronização de Permissões"
          description="Alterar o plano de uma assinatura atualiza imediatamente os direitos de acesso do utilizador (ex: AutoPilot, limite de veículos e exportações) e grava auditoria."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.plans.map((p) => (
            <Card key={p.id} className="p-5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold">{p.name}</h3>
                <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                  €{p.monthlyPriceEur.toFixed(2)}/mês
                </span>
              </div>
              <p className="text-slate-500">{p.audience}</p>
              <p><strong>Veículos:</strong> até {p.maxVehicles} · <strong>AutoPilot:</strong> {p.autoPilotAllowed ? 'Sim' : 'Não'}</p>
              <p className="text-slate-500">Canais: {p.billingChannels.join(' · ')}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-x-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold">Assinaturas Ativas (Alteração Propaga para Modo Motorista)</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Subscrição</th>
                <th className="p-3">Utilizador</th>
                <th className="p-3">Canal Faturação</th>
                <th className="p-3">Renovação</th>
                <th className="p-3">Plano Associado</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.subscriptions.map((sub) => {
                const usr = state.users.find((u) => u.id === sub.userId);
                return (
                  <tr key={sub.id}>
                    <td className="p-3 font-mono-tabular font-semibold">{sub.id}</td>
                    <td className="p-3">{usr?.name ?? sub.userId}</td>
                    <td className="p-3">{sub.channel} ({sub.billingCycle})</td>
                    <td className="p-3 font-mono-tabular">{sub.renewsAt}</td>
                    <td className="p-3">
                      <select
                        aria-label={`Alterar plano de ${usr?.name ?? sub.userId}`}
                        value={sub.planId}
                        onChange={(e) => changeUserSubscriptionPlan(sub.userId, e.target.value)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        {state.plans.map((pl) => (
                          <option key={pl.id} value={pl.id}>{pl.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <StatusLabel tone={sub.status === 'Ativa' ? 'success' : 'info'} text={sub.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // FUNCIONALIDADES (Feature Flags)
  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-bold">Gestão de Funcionalidades &amp; Feature Flags</h2>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {Object.entries(state.remoteConfig.featureFlags).map(([flag, enabled]) => (
          <div key={flag} className="py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono-tabular font-semibold">{flag}</p>
              <p className="text-slate-500">Controla disponibilidade remota nos clientes Web, Android e iOS.</p>
            </div>
            <button
              type="button"
              onClick={() => toggleRemoteFlag(flag)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-white ${
                enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'
              }`}
            >
              {enabled ? 'Ativa' : 'Desativada'}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};
