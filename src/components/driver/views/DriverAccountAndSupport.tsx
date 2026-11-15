import React, { useState } from 'react';
import {
  Bell,
  FileCheck2,
  Globe2,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageSquare,
  Navigation,
  RotateCcw,
  Settings,
  Shield,
  ThumbsUp,
} from 'lucide-react';
import { PLATFORM_ADAPTERS } from '../../../adapters/platformAdapters';
import { formatMoney } from '../../../core/localization';
import type { DriverDocument, TicketRecord } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ConfirmModal,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

export const DriverAccountAndSupport: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    activeDriver,
    activeDriverPlan,
    activeMarket,
    requestBrowserGeolocation,
    simulateOrSelectLocation,
    setProfessionalMarkets,
    addDocument,
    markNotificationRead,
    createTicket,
    replyToTicket,
    addSuggestion,
    voteSuggestion,
    updateDriverPrivacyConsent,
    toggleTheme,
    resetDemoData,
  } = useEcosystem();

  const [docForm, setDocForm] = useState({
    title: 'Registo Criminal TVDE Atualizado',
    category: 'Motorista' as DriverDocument['category'],
    expiryDate: '2027-06-30',
    referenceCode: 'RC-PT-2026',
  });

  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Técnico' as TicketRecord['category'],
    priority: 'Média' as TicketRecord['priority'],
    message: '',
  });
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const [sugForm, setSugForm] = useState({
    title: '',
    module: 'Calculadora de propostas',
    impact: 'Rentabilidade' as const,
    description: '',
  });

  const [resCountry, setResCountry] = useState(state.localization.residenceCountryCode);
  const [primMarket, setPrimMarket] = useState(state.localization.primaryProfessionalMarketCode);
  const [profSavedNotice, setProfSavedNotice] = useState(false);

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (activeTab === 'documentos') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Documentos do Motorista & Veículo"
          description="Ligado diretamente às obrigações da Central de Legislação e aos alertas do Dashboard."
        />

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Documento
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!docForm.title.trim()) return;
              addDocument({
                ...docForm,
                status: 'Válido',
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <input
              type="text"
              aria-label="Nome do documento"
              value={docForm.title}
              onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <select
              aria-label="Categoria do documento"
              value={docForm.category}
              onChange={(e) => setDocForm((f) => ({ ...f, category: e.target.value as DriverDocument['category'] }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Motorista">Motorista</option>
              <option value="Veículo">Veículo</option>
              <option value="Seguro">Seguro</option>
              <option value="Fiscal">Fiscal</option>
            </select>
            <input
              type="date"
              aria-label="Data de validade"
              value={docForm.expiryDate}
              onChange={(e) => setDocForm((f) => ({ ...f, expiryDate: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
              Registar Documento
            </button>
          </form>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.documents.map((doc) => (
            <Card key={doc.id} className="p-4 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-sm">{doc.title}</p>
                <p className="text-slate-500">
                  {doc.category} · Ref: {doc.referenceCode} · Validade: {doc.expiryDate}
                </p>
              </div>
              <StatusLabel
                tone={doc.status === 'Válido' ? 'success' : doc.status === 'A expirar' ? 'warning' : 'danger'}
                text={doc.status}
              />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'notificacoes') {
    const myNotifs = state.notifications.filter(
      (n) => n.targetUserId === 'ALL' || n.targetUserId === activeDriver.id
    );
    return (
      <div className="space-y-4">
        <ContextualHelpBanner
          title="Central de Notificações"
          description="Alertas de conformidade, comunicados administrativos e atualizações de campanhas entregues ao motorista."
        />
        {myNotifs.map((n) => (
          <Card key={n.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span className="font-bold text-sm">{n.title}</span>
                <span className="text-slate-400">· {n.category} · {n.sourceModule}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{n.body}</p>
            </div>
            {!n.read ? (
              <button
                type="button"
                onClick={() => markNotificationRead(n.id)}
                className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-medium shrink-0"
              >
                Marcar como lida
              </button>
            ) : (
              <StatusLabel tone="neutral" text="Lida" />
            )}
          </Card>
        ))}
      </div>
    );
  }

  if (activeTab === 'suporte') {
    const myTickets = state.tickets.filter((t) => t.userId === activeDriver.id);
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Comunicação e Suporte (Ligado à Caixa do Administrador)"
          description="Os tickets criados aqui aparecem imediatamente no painel Tickets do Modo Administrador para resposta bidirecional."
        />

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Abrir Novo Ticket de Suporte
          </h3>
          {ticketError && <StatusLabel tone="danger" text={ticketError} />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ticketForm.subject.trim().length < 4 || ticketForm.message.trim().length < 8) {
                setTicketError('Indique um assunto e descrição detalhada do pedido.');
                return;
              }
              setTicketError(null);
              createTicket(ticketForm);
              setTicketForm({ subject: '', category: 'Técnico', priority: 'Média', message: '' });
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                aria-label="Assunto do ticket"
                placeholder="Assunto do pedido"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <select
                aria-label="Categoria do ticket"
                value={ticketForm.category}
                onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value as TicketRecord['category'] }))}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Técnico">Técnico</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Conformidade">Conformidade</option>
                <option value="Plataformas">Plataformas</option>
                <option value="Assinatura">Assinatura</option>
              </select>
              <select
                aria-label="Prioridade"
                value={ticketForm.priority}
                onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value as TicketRecord['priority'] }))}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>
            <textarea
              rows={3}
              aria-label="Mensagem do ticket"
              placeholder="Descreva o contexto..."
              value={ticketForm.message}
              onChange={(e) => setTicketForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
              Enviar Ticket
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          {myTickets.map((t) => (
            <Card key={t.id} className="p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-sm">{t.id} · {t.subject}</span>
                <StatusLabel tone={t.status === 'Resolvido' ? 'success' : 'info'} text={`${t.status} · SLA ${t.slaHours}h`} />
              </div>
              <div className="space-y-2">
                {t.messages
                  .filter((m) => !m.internalNote)
                  .map((m) => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold">{m.senderName} ({m.sender}): </span>
                      <span>{m.text}</span>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Responder ao suporte..."
                  value={replyText[t.id] ?? ''}
                  onChange={(e) => setReplyText((r) => ({ ...r, [t.id]: e.target.value }))}
                  className="flex-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => {
                    const txt = replyText[t.id]?.trim();
                    if (!txt) return;
                    replyToTicket(t.id, 'Motorista', txt);
                    setReplyText((r) => ({ ...r, [t.id]: '' }));
                  }}
                  className="px-3 py-1.5 rounded bg-blue-700 text-white font-medium"
                >
                  Responder
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'sugestoes') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Sugestões de Melhorias do Produto"
          description="Envie ideias diretamente para a equipa de produto e vote nas propostas prioritárias."
        />
        <Card className="p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Submeter Sugestão
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!sugForm.title.trim()) return;
              addSuggestion(sugForm);
              setSugForm({ title: '', module: 'Calculadora de propostas', impact: 'Rentabilidade', description: '' });
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              placeholder="Título da melhoria"
              value={sugForm.title}
              onChange={(e) => setSugForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Módulo relacionado"
              value={sugForm.module}
              onChange={(e) => setSugForm((f) => ({ ...f, module: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
              Enviar Sugestão
            </button>
            <textarea
              rows={2}
              placeholder="Descreva o benefício prático..."
              value={sugForm.description}
              onChange={(e) => setSugForm((f) => ({ ...f, description: e.target.value }))}
              className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </form>
        </Card>

        <div className="space-y-3">
          {state.suggestions.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-sm">{s.title}</p>
                <p className="text-slate-500">{s.module} · {s.impact} · Estado: {s.status}</p>
                <p className="text-slate-600 dark:text-slate-300 mt-1">{s.description}</p>
              </div>
              <button
                type="button"
                onClick={() => voteSuggestion(s.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono-tabular font-semibold hover:border-blue-600"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{s.votes}</span>
              </button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // PERFIL, INTERNACIONALIZAÇÃO, CONFIGURAÇÕES, ADAPTADORES, PRIVACIDADE & GLOSSÁRIO
  const loc = state.localization;
  return (
    <div className="space-y-6">
      {/* Separated International Profile & Location Card */}
      <Card className="p-5 space-y-4 text-xs border-blue-200 dark:border-blue-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold">
                Perfil Internacional &amp; Separação Residência / Mercado / Localização Atual
              </h2>
              <p className="text-[11px] text-slate-500">
                Viajar ou detetar novo país nunca destrói a sua residência fiscal nem converte receitas passadas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => requestBrowserGeolocation()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Atualizar Localização GPS</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Localização Atual
            </span>
            <p className="font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              {loc.currentLocation.city}, {loc.currentLocation.countryCode}
            </p>
            <p className="text-[11px] text-slate-500">{loc.currentLocation.detectedBy}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              País de Residência
            </span>
            <p className="font-bold">{loc.residenceCountryCode}</p>
            <p className="text-[11px] text-slate-500">Intacto em deslocações</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Mercado Profissional Principal
            </span>
            <p className="font-bold">{loc.primaryProfessionalMarketCode}</p>
            <p className="text-[11px] text-slate-500">
              Adicionais: {loc.additionalProfessionalMarketCodes.join(', ') || 'Nenhum'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Adaptação Ativa na UI
            </span>
            <p className="font-bold font-mono-tabular">
              {activeMarket.name} · {activeMarket.currency} ({activeMarket.currencySymbol})
            </p>
            <p className="text-[11px] text-slate-500">
              {loc.languageCode} · {loc.unitSystem === 'imperial' ? 'Milhas (imperial)' : 'Quilómetros (métrico)'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <p className="font-semibold">Simular / Mudar Localização Atual (Preserva Residência &amp; Histórico)</p>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'PT', city: 'Lisboa', region: 'Área Metropolitana de Lisboa' },
                { code: 'BR', city: 'São Paulo', region: 'São Paulo' },
                { code: 'ES', city: 'Madrid', region: 'Comunidad de Madrid' },
                { code: 'UK', city: 'Londres', region: 'Greater London' },
              ].map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => simulateOrSelectLocation(preset.code, preset.city, preset.region)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-blue-600 font-medium"
                >
                  {preset.city}, {preset.code}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setProfessionalMarkets(resCountry, primMarket, loc.additionalProfessionalMarketCodes);
              setProfSavedNotice(true);
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
          >
            <div>
              <label htmlFor="prof-res" className="block mb-1 font-medium">Residência</label>
              <select
                id="prof-res"
                value={resCountry}
                onChange={(e) => {
                  setResCountry(e.target.value);
                  setProfSavedNotice(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {state.countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prof-mkt" className="block mb-1 font-medium">Mercado Principal</label>
              <select
                id="prof-mkt"
                value={primMarket}
                onChange={(e) => {
                  setPrimMarket(e.target.value);
                  setProfSavedNotice(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {state.countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold"
            >
              {profSavedNotice ? 'Guardado ✓' : 'Guardar Perfil'}
            </button>
          </form>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Conta, Plano &amp; Privacidade RGPD
          </h3>
          <div className="space-y-1.5">
            <p><strong>Motorista:</strong> {activeDriver.name} ({activeDriver.email})</p>
            <p><strong>Mercado de Operação Selecionado:</strong> {activeMarket.name} ({activeMarket.code})</p>
            <p><strong>Assinatura Ativa:</strong> {activeDriverPlan.name} ({formatMoney(activeDriverPlan.monthlyPriceEur, activeMarket.currency)}/mês)</p>
            <p><strong>AutoPilot Permitido no Plano:</strong> {activeDriverPlan.autoPilotAllowed ? 'Sim' : 'Não'}</p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeDriver.privacyConsentForSupport}
                onChange={(e) => updateDriverPrivacyConsent(e.target.checked)}
              />
              <span>
                <strong>Autorização Explícita de Suporte:</strong> Permitir que administradores autorizados consultem métricas operacionais deste perfil durante resolução de tickets (caso contrário permanecem ocultas por privacidade).
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-medium"
            >
              Alternar Tema ({state.theme === 'light' ? 'Claro → Escuro' : 'Escuro → Claro'})
            </button>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Repor Dados Demonstrativos
            </button>
          </div>
        </Card>

        <Card className="p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Estado dos Adaptadores Multi-Plataforma (Web, Android, iOS)
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {PLATFORM_ADAPTERS.map((ad, idx) => (
              <div key={idx} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{ad.os}</span>
                  <StatusLabel tone={ad.supportedNow ? 'success' : 'warning'} text={ad.integrationState} />
                </div>
                <p className="font-medium">{ad.capability}</p>
                <p className="text-slate-500">{ad.notes}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Glossary */}
      <Card className="p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Glossário &amp; Ajuda Contextual AIVAD
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="font-bold">Valor/Distância Comprometida</p>
            <p className="text-slate-600 dark:text-slate-300">Valor total da proposta dividido pela soma da recolha com a distância até ao destino.</p>
          </div>
          <div>
            <p className="font-bold">Idempotência</p>
            <p className="text-slate-600 dark:text-slate-300">Mecanismo que impede duplicação de viagens, gorjetas ou registos do tacógrafo quando sincronizados mais do que uma vez.</p>
          </div>
          <div>
            <p className="font-bold">Legal Local vs Comercial</p>
            <p className="text-slate-600 dark:text-slate-300">Um veículo pode cumprir a lei local (ex. TVDE 7 anos em PT) mas não cumprir o critério de bagageira para categorias superiores.</p>
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={confirmResetOpen}
        title="Repor Dados Demonstrativos?"
        message="Esta ação restaura todas as viagens, tacógrafo, propostas, localização e registos para os valores iniciais."
        confirmLabel="Repor Tudo"
        danger
        onConfirm={() => {
          resetDemoData();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
};
