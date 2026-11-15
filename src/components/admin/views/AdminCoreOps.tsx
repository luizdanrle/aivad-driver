import React, { useState } from 'react';
import { Banknote, Lock, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { formatMoney } from '../../../core/localization';
import type { OrganizationType, PaymentTransactionRecord } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { HorizontalBreakdownBars } from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  MetricCard,
  StatusLabel,
} from '../../ui/DesignSystem';

const ORG_TYPES: OrganizationType[] = [
  'Frota TVDE',
  'Operador Independente',
  'Cooperativa / Equipa',
  'Empresa Corporativa',
];

export const AdminCoreOps: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    availableMarketsForPortal,
    updateUserStatus,
    changeUserSubscriptionPlan,
    createOrganization,
    assignUserOrganization,
    addPaymentTransaction,
    toggleRemoteFlag,
    setAdminNav,
  } = useEcosystem();

  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState<{
    name: string;
    type: OrganizationType;
    countryCode: string;
    taxId: string;
    driversCount: number;
    vehiclesCount: number;
  }>({
    name: '',
    type: 'Frota TVDE',
    countryCode: 'PT',
    taxId: '',
    driversCount: 1,
    vehiclesCount: 1,
  });
  const [orgFeedback, setOrgFeedback] = useState<string | null>(null);

  const [payForm, setPayForm] = useState<{
    userId: string;
    amount: number;
    currency: string;
    channel: PaymentTransactionRecord['channel'];
    status: PaymentTransactionRecord['status'];
  }>({
    userId: state.users[0]?.id ?? 'usr-driver-1',
    amount: 14.9,
    currency: 'EUR',
    channel: 'Web Stripe (A Validar)',
    status: 'Liquidado (Demo)',
  });

  if (activeTab === 'overview') {
    const activeUsers = state.users.filter((u) => u.status === 'Ativo').length;
    const activeSubs = state.subscriptions.filter((s) => s.status === 'Ativa');
    const mrr = activeSubs.reduce(
      (sum, s) => sum + (s.billingCycle === 'Anual' ? s.priceEur / 12 : s.priceEur),
      0
    );
    const openTickets = state.tickets.filter((t) => t.status !== 'Resolvido').length;

    const osBars = (['Android', 'iOS', 'Web'] as const).map((os) => {
      const count = state.users.filter((u) => u.osPlatform === os).length;
      return {
        id: os,
        label: os,
        sublabel: 'Dispositivos ativos',
        value: count,
        formattedValue: `${count} conta(s)`,
        color: os === 'Android' ? '#1D4ED8' : os === 'iOS' ? '#0F172A' : '#059669',
      };
    });

    const marketStatusCounts = state.countries.reduce<Record<string, number>>((acc, c) => {
      acc[c.marketStatus] = (acc[c.marketStatus] ?? 0) + 1;
      return acc;
    }, {});

    const marketBars = Object.entries(marketStatusCounts).map(([status, count]) => ({
      id: status,
      label: status,
      value: count,
      formattedValue: `${count} país(es)`,
      color: status === 'Disponível' ? '#059669' : status === 'Em validação' ? '#D97706' : '#1D4ED8',
    }));

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD Management — Visão Executiva do Ecossistema"
          description="Monitorização comercial, pagamentos SaaS, expansão internacional, plataformas, versões e suporte num painel unificado com isolamento de privacidade dos motoristas."
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
            subtext={`${activeSubs.length} assinaturas ativas · ${state.payments.length} transações`}
            explanation="Receita mensal recorrente normalizada das assinaturas ativas."
            formula="Σ (Mensal + Anual÷12)"
            onDrillDown={() => setAdminNav('pagamentos')}
            drillDownLabel="Abrir módulo Pagamentos"
          />
          <MetricCard
            label="Mercados Disponíveis / Total"
            value={`${availableMarketsForPortal.length} / ${state.countries.length}`}
            subtext={`${state.platforms.filter((p) => p.status === 'Ativa').length} plataformas ativas`}
            explanation="Apenas mercados com estado 'Disponível' aparecem no Portal Público."
            formula="Países Disponíveis ÷ Catálogo Global"
            onDrillDown={() => setAdminNav('paises')}
            drillDownLabel="Gerir mercados globais"
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
            <h2 className="text-sm font-bold">Distribuição por Sistema Operativo</h2>
            <HorizontalBreakdownBars items={osBars} />
          </Card>

          <Card className="p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold">Estado dos Mercados Internacionais</h2>
            <HorizontalBreakdownBars items={marketBars} />
          </Card>
        </div>

        <Card className="p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold">Últimas Ações de Auditoria</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {state.auditLogs.slice(0, 5).map((a) => (
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
                  <th className="p-3">Organização / Vínculo</th>
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
                      <td className="p-3">
                        <p>{u.role} ({u.countryCode})</p>
                        <p className="font-mono-tabular text-[11px] text-slate-400">{u.osPlatform} v{u.appVersion}</p>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Organização de ${u.name}`}
                          value={u.organizationId ?? ''}
                          onChange={(e) => assignUserOrganization(u.id, e.target.value || null)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px]"
                        >
                          <option value="">Independente (Sem Frota)</option>
                          {state.organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name} ({org.type ?? 'Frota TVDE'})
                            </option>
                          ))}
                        </select>
                      </td>
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
              Inspeção, Isolamento &amp; Privacidade RGPD
            </h3>
            {inspected ? (
              <div className="space-y-3">
                <p><strong>Nome:</strong> {inspected.name}</p>
                <p><strong>Cidade / País:</strong> {inspected.city}, {inspected.countryCode}</p>
                <p>
                  <strong>Vínculo Organizacional:</strong>{' '}
                  {inspected.organizationId
                    ? state.organizations.find((o) => o.id === inspected.organizationId)?.name ?? inspected.organizationId
                    : 'Motorista Independente (sem obrigação de frota)'}
                </p>
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
    const independentDriversCount = state.users.filter(
      (u) => u.role === 'Motorista' && !u.organizationId
    ).length;

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Multi-Organização & Isolamento Estrito de Dados (Tenant Isolation)"
          description="Suporta Frotas TVDE, Operadores Independentes, Cooperativas/Equipas e Empresas Corporativas sem obrigar motoristas independentes a pertencer a uma frota. Acessos cruzados entre organizações são bloqueados no backend com HTTP 403 e auditoria."
        />

        {orgFeedback && <StatusLabel tone="info" text={orgFeedback} />}

        <Card className="p-5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Registar Nova Organização (Isolamento strict_tenant)
            </h3>
            <span className="text-slate-500">
              Motoristas independentes ativos sem frota: <strong className="font-mono-tabular">{independentDriversCount}</strong>
            </span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!orgForm.name.trim() || !orgForm.taxId.trim()) return;
              const res = await createOrganization({
                name: orgForm.name.trim(),
                type: orgForm.type,
                countryCode: orgForm.countryCode,
                taxId: orgForm.taxId.trim(),
                driversCount: orgForm.driversCount,
                vehiclesCount: orgForm.vehiclesCount,
              });
              if (res.ok) {
                setOrgFeedback(`Organização "${orgForm.name.trim()}" criada com política de isolamento strict_tenant.`);
                setOrgForm((f) => ({ ...f, name: '', taxId: '' }));
              } else {
                setOrgFeedback(res.error ?? 'Não foi possível registar a organização.');
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label htmlFor="org-name" className="block mb-1 font-medium">Designação</label>
              <input
                id="org-name"
                type="text"
                placeholder="Ex: Atlântico Mobilidade"
                value={orgForm.name}
                onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="org-type" className="block mb-1 font-medium">Tipologia</label>
              <select
                id="org-type"
                value={orgForm.type}
                onChange={(e) => setOrgForm((f) => ({ ...f, type: e.target.value as OrganizationType }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="org-tax" className="block mb-1 font-medium">NIF / VAT</label>
              <input
                id="org-tax"
                type="text"
                placeholder="PT516000999"
                value={orgForm.taxId}
                onChange={(e) => setOrgForm((f) => ({ ...f, taxId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="org-country" className="block mb-1 font-medium">País</label>
              <select
                id="org-country"
                value={orgForm.countryCode}
                onChange={(e) => setOrgForm((f) => ({ ...f, countryCode: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {state.countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="org-veh" className="block mb-1 font-medium">Viaturas</label>
              <input
                id="org-veh"
                type="number"
                min={0}
                value={orgForm.vehiclesCount}
                onChange={(e) => setOrgForm((f) => ({ ...f, vehiclesCount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold">
              Criar Organização
            </button>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold">Organizações, Operadores &amp; Cooperativas ({state.organizations.length})</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Organização</th>
                <th className="p-3">Tipologia</th>
                <th className="p-3">NIF / VAT</th>
                <th className="p-3">País</th>
                <th className="p-3">Motoristas / Veículos</th>
                <th className="p-3">Política de Isolamento</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.organizations.map((org) => (
                <tr key={org.id}>
                  <td className="p-3 font-semibold">{org.name}</td>
                  <td className="p-3">{org.type ?? 'Frota TVDE'}</td>
                  <td className="p-3 font-mono-tabular">{org.taxId}</td>
                  <td className="p-3 font-mono-tabular">{org.countryCode}</td>
                  <td className="p-3 font-mono-tabular">{org.driversCount} / {org.vehiclesCount}</td>
                  <td className="p-3 font-mono-tabular text-[11px]">{org.isolationPolicy ?? 'strict_tenant'}</td>
                  <td className="p-3">
                    <StatusLabel tone={org.status === 'Ativa' ? 'success' : 'warning'} text={org.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
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

  // ==========================================================
  // PAGAMENTOS SAAS MULTI-MOEDA E CANAIS
  // ==========================================================
  if (activeTab === 'pagamentos') {
    const settledTotal = state.payments
      .filter((p) => p.status === 'Liquidado (Demo)')
      .reduce((s, p) => s + p.amount, 0);

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Pagamentos SaaS Multi-Moeda & Canais de Cobrança"
          description="Controlo de faturas, pagamentos, reembolsos e canais de liquidação Web Stripe (A Validar), Google Play Billing e Apple App Store."
          demoNotice="Gateway de cobrança real (Stripe/App Store/Play): INTEGRAÇÃO A VALIDAR em ambiente de produção."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Movimentos Registados"
            value={`${state.payments.length}`}
            subtext="Inclui faturas pagas, pendentes e reembolsos"
            explanation="Total de transações registadas no livro SaaS."
            formula="Contagem de movimentos"
            accent="blue"
          />
          <MetricCard
            label="Volume Liquidado (Demo)"
            value={formatMoney(settledTotal, 'EUR')}
            subtext="Base de faturação demonstrativa"
            explanation="Soma dos lançamentos com estado Liquidado."
            formula="Σ Montantes liquidados"
          />
          <MetricCard
            label="Canais Integrados"
            value="3 Canais"
            subtext="Web Stripe (A Validar) · Google Play · Apple"
            explanation="Infraestrutura preparada para cobrança multi-plataforma."
            formula="Catálogo de adaptadores SaaS"
          />
        </div>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Cobrança / Reembolso (Auditoria Automática)
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const usr = state.users.find((u) => u.id === payForm.userId);
              if (!usr) return;
              addPaymentTransaction({
                subscriptionId:
                  state.subscriptions.find((s) => s.userId === usr.id)?.id ?? 'sub-manual',
                userId: usr.id,
                userName: usr.name,
                countryCode: usr.countryCode,
                currency: payForm.currency,
                amount: payForm.amount,
                channel: payForm.channel,
                status: payForm.status,
                invoiceRef: `INV-2026-${String(Date.now()).slice(-4)}`,
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
          >
            <div>
              <label htmlFor="pay-user" className="block mb-1 font-medium">Cliente</label>
              <select
                id="pay-user"
                value={payForm.userId}
                onChange={(e) => setPayForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.countryCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pay-amt" className="block mb-1 font-medium">Valor</label>
              <input
                id="pay-amt"
                type="number"
                step="0.1"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="pay-curr" className="block mb-1 font-medium">Moeda</label>
              <select
                id="pay-curr"
                value={payForm.currency}
                onChange={(e) => setPayForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              >
                {Array.from(new Set(state.countries.map((c) => c.currency))).map((cur) => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pay-status" className="block mb-1 font-medium">Estado</label>
              <select
                id="pay-status"
                value={payForm.status}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, status: e.target.value as PaymentTransactionRecord['status'] }))
                }
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Liquidado (Demo)">Liquidado (Demo)</option>
                <option value="Pendente">Pendente</option>
                <option value="Reembolsado">Reembolsado</option>
                <option value="Falhado">Falhado</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Lançar Fatura</span>
            </button>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Fatura</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">País</th>
                <th className="p-3">Montante</th>
                <th className="p-3">Canal</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.payments.map((pay) => (
                <tr key={pay.id}>
                  <td className="p-3 font-mono-tabular font-semibold">{pay.invoiceRef}</td>
                  <td className="p-3">{pay.userName}</td>
                  <td className="p-3 font-mono-tabular">{pay.countryCode}</td>
                  <td className="p-3 font-mono-tabular font-bold">
                    {formatMoney(pay.amount, pay.currency)}
                  </td>
                  <td className="p-3">{pay.channel}</td>
                  <td className="p-3">
                    <StatusLabel
                      tone={
                        pay.status === 'Liquidado (Demo)'
                          ? 'success'
                          : pay.status === 'Pendente'
                          ? 'warning'
                          : 'danger'
                      }
                      text={pay.status}
                    />
                  </td>
                </tr>
              ))}
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
