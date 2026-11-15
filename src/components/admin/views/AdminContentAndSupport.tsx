import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Inbox,
  Newspaper,
  PackageCheck,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { getTodayIso } from '../../../core/localization';
import type { AppVersionRecord, PortalSectionId, TicketRecord } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

const SECTION_LABELS: Record<PortalSectionId, string> = {
  hero: 'Secção Hero & CTAs',
  modules: 'Benefícios & Pilares AIVAD',
  platforms: 'Catálogo de Plataformas',
  plans: 'Planos SaaS Core',
  markets: 'Indicadores de Mercados & Conformidade',
  faq: 'Perguntas Frequentes (FAQ)',
  updates: 'Comunicados Publicados',
};

const DEFAULT_ORDER: PortalSectionId[] = [
  'hero',
  'modules',
  'platforms',
  'plans',
  'markets',
  'faq',
  'updates',
];

const DEFAULT_VISIBILITY: Record<PortalSectionId, boolean> = {
  hero: true,
  modules: true,
  platforms: true,
  plans: true,
  markets: true,
  faq: true,
  updates: true,
};

export const AdminContentAndSupport: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    replyToTicket,
    updateTicketStatus,
    saveCmsDraft,
    discardCmsDraft,
    updateCmsAndPublish,
    rollbackCms,
    addVersionRelease,
    addReferralCoupon,
    toggleReferralCouponActive,
  } = useEcosystem();

  const [couponCode, setCouponCode] = useState('');
  const [couponReferrer, setCouponReferrer] = useState('Parceiro TVDE');
  const [couponDiscount, setCouponDiscount] = useState(20);

  const [selectedTicketId, setSelectedTicketId] = useState(state.tickets[0]?.id ?? '');
  const [adminReply, setAdminReply] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const initialMerged = { ...state.cms, ...(state.cms.draftSnapshot ?? {}) };
  const [cmsDraft, setCmsDraft] = useState({
    brandTitle: initialMerged.brandTitle ?? 'AIVAD',
    brandTagline: initialMerged.brandTagline ?? 'O Cérebro Inteligente do Motorista',
    primaryColor: initialMerged.primaryColor ?? '#1D4ED8',
    accentColor: initialMerged.accentColor ?? '#DC2626',
    heroTitle: initialMerged.heroTitle,
    heroSubtitle: initialMerged.heroSubtitle,
    heroCtaDriverLabel: initialMerged.heroCtaDriverLabel ?? 'Entrar como Motorista',
    heroCtaPlansLabel: initialMerged.heroCtaPlansLabel ?? 'Explorar Planos',
    announcementBanner: initialMerged.announcementBanner,
    showAnnouncement: initialMerged.showAnnouncement,
    contactEmail: initialMerged.contactEmail ?? 'suporte@aivad-ecosystem.local',
    supportHours: initialMerged.supportHours ?? 'Seg–Sex · 09:00–19:00',
    seoTitle: initialMerged.seoTitle ?? 'AIVAD — O Cérebro Inteligente do Motorista',
    seoDescription: initialMerged.seoDescription ?? '',
    sectionOrder: initialMerged.sectionOrder ?? DEFAULT_ORDER,
    visibleSections: initialMerged.visibleSections ?? DEFAULT_VISIBILITY,
    benefits: initialMerged.benefits ?? [],
    faqs: initialMerged.faqs ?? [],
    navigationMenus: initialMerged.navigationMenus ?? [],
    pagesContent: initialMerged.pagesContent ?? {},
    mediaAssets: initialMerged.mediaAssets ?? [],
    supportedLanguages: initialMerged.supportedLanguages ?? ['pt-PT', 'en-GB', 'es-ES'],
    localizedContent: initialMerged.localizedContent ?? {},
  });
  const [localUnsavedDirty, setLocalUnsavedDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [cmsNotice, setCmsNotice] = useState<string | null>(null);
  const [editingPageSlug, setEditingPageSlug] = useState<string>('mercados');
  const [editingLangCode, setEditingLangCode] = useState<string>('en-GB');

  const [newBenefit, setNewBenefit] = useState({ title: '', description: '' });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  // Publication Add State
  const [pubTitle, setPubTitle] = useState('');
  const [pubSummary, setPubSummary] = useState('');

  // Version / Release Form
  const [verForm, setVerForm] = useState<{
    channel: AppVersionRecord['channel'];
    version: string;
    rolloutPct: number;
    mandatoryUpdate: boolean;
    notes: string;
  }>({
    channel: 'Android',
    version: '2.4.1',
    rolloutPct: 50,
    mandatoryUpdate: false,
    notes: 'Melhoria de estabilidade no adaptador de notificações.',
  });

  if (activeTab === 'tickets') {
    const activeTicket = state.tickets.find((t) => t.id === selectedTicketId) ?? state.tickets[0];
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Caixa de Entrada Completa de Tickets (Sincronizada com Modo Motorista)"
          description="Permite conversação, notas internas, transferência, prioridades, SLA e alteração de estado."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 divide-y divide-slate-100 dark:divide-slate-800">
            {state.tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTicketId(t.id)}
                className={`w-full text-left p-4 space-y-1 transition-colors ${
                  activeTicket?.id === t.id ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-tabular font-bold">{t.id}</span>
                  <StatusLabel tone={t.status === 'Resolvido' ? 'success' : 'warning'} text={t.status} />
                </div>
                <p className="text-sm font-semibold">{t.subject}</p>
                <p className="text-xs text-slate-500">
                  {t.userName} · {t.category} · Prioridade {t.priority} · SLA {t.slaHours}h
                </p>
              </button>
            ))}
          </Card>

          <Card className="lg:col-span-7 p-5 space-y-4 text-xs">
            {activeTicket ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      {activeTicket.subject}
                    </h3>
                    <p className="text-slate-500">Atribuído a: {activeTicket.assignee}</p>
                  </div>
                  <select
                    aria-label="Estado do ticket"
                    value={activeTicket.status}
                    onChange={(e) =>
                      updateTicketStatus(activeTicket.id, e.target.value as TicketRecord['status'])
                    }
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Aberto">Aberto</option>
                    <option value="Em análise">Em análise</option>
                    <option value="Aguardar utilizador">Aguardar utilizador</option>
                    <option value="Resolvido">Resolvido</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {activeTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg border ${
                        m.internalNote
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <p className="font-semibold">
                        {m.senderName} {m.internalNote ? '(Nota Interna Privada)' : `(${m.sender})`}
                      </p>
                      <p className="mt-0.5">{m.text}</p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!adminReply.trim()) return;
                    replyToTicket(activeTicket.id, 'Suporte', adminReply, isInternalNote);
                    setAdminReply('');
                  }}
                  className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                >
                  <textarea
                    rows={2}
                    placeholder="Escrever resposta ao motorista ou nota interna..."
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                      />
                      <span>Nota interna (invisível ao motorista)</span>
                    </label>
                    <button type="submit" className="px-4 py-1.5 rounded-lg bg-blue-700 text-white font-semibold">
                      Enviar
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <p className="text-slate-500">Sem tickets selecionados.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'publicacoes' || activeTab === 'gestao-visual' || activeTab === 'editor-paginas') {
    const moveSection = (index: number, dir: -1 | 1) => {
      const target = index + dir;
      if (target < 0 || target >= cmsDraft.sectionOrder.length) return;
      const nextOrder = [...cmsDraft.sectionOrder];
      const [item] = nextOrder.splice(index, 1);
      nextOrder.splice(target, 0, item);
      setCmsDraft((d) => ({ ...d, sectionOrder: nextOrder }));
    };

    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="CMS do Portal Integrado — Gestão Visual, Páginas & Publicações"
          description="Edite identidade visual, ordem e visibilidade de secções, textos, benefícios, FAQs e comunicados com Rascunho, Pré-visualização, Publicação imediata e Rollback."
        />

        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>Fluxo CMS em 4 Estados Separados (v{state.cms.versionNumber ?? 1}):</strong>{' '}
              Alterações locais e rascunhos guardados em <code className="font-mono-tabular">/api/cms/draft</code> não afetam os visitantes públicos até clicar em <strong>Publicar no Site Oficial</strong> (<code className="font-mono-tabular">/api/cms/publish</code>).
            </div>
            <StatusLabel
              tone={state.session.isDemoSession ? 'warning' : 'success'}
              text={
                state.session.isDemoSession
                  ? 'Isolado em Sandbox Demo'
                  : `Servidor: ${state.cmsPersistenceInfo.lastServerScope}`
              }
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded bg-white/80 dark:bg-slate-900/70 border border-blue-200/70 dark:border-blue-800">
              <span className="font-bold block">1. Edição Local</span>
              <span>{localUnsavedDirty ? 'Com alterações por guardar' : 'Sincronizada com formulário'}</span>
            </div>
            <div className="p-2 rounded bg-white/80 dark:bg-slate-900/70 border border-blue-200/70 dark:border-blue-800">
              <span className="font-bold block">2. Rascunho Servidor</span>
              <span>{state.cms.draftSnapshot ? 'Rascunho guardado ativo' : 'Sem rascunho pendente'}</span>
            </div>
            <div className="p-2 rounded bg-white/80 dark:bg-slate-900/70 border border-blue-200/70 dark:border-blue-800">
              <span className="font-bold block">3. Pré-visualização</span>
              <span>{showPreview ? 'Painel isolado aberto' : 'Oculta'}</span>
            </div>
            <div className="p-2 rounded bg-white/80 dark:bg-slate-900/70 border border-blue-200/70 dark:border-blue-800">
              <span className="font-bold block">4. Portal Público</span>
              <span className="font-mono-tabular">Publicado v{state.cms.versionNumber ?? 1}</span>
            </div>
          </div>
        </div>

        {cmsNotice && (
          <StatusLabel tone="info" text={cmsNotice} />
        )}

        <Card className="p-5 space-y-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Editor Completo do Site Oficial (Identidade, Hero, Secções &amp; SEO)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {state.cms.draftSnapshot && (
                <StatusLabel tone="warning" text="Rascunho não publicado ativo" />
              )}
              <button
                type="button"
                onClick={() => setShowPreview((s) => !s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Ocultar Pré-visualização' : 'Pré-visualizar'}</span>
              </button>
            </div>
          </div>

          {/* Identity & Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="cms-brand" className="block font-medium mb-1">Nome da Marca</label>
              <input
                id="cms-brand"
                type="text"
                value={cmsDraft.brandTitle}
                onChange={(e) => setCmsDraft((d) => ({ ...d, brandTitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cms-tag" className="block font-medium mb-1">Subtítulo / Tagline</label>
              <input
                id="cms-tag"
                type="text"
                value={cmsDraft.brandTagline}
                onChange={(e) => setCmsDraft((d) => ({ ...d, brandTagline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cms-pcolor" className="block font-medium mb-1">Cor Primária</label>
              <div className="flex items-center gap-2">
                <input
                  id="cms-pcolor"
                  type="color"
                  value={cmsDraft.primaryColor}
                  onChange={(e) => setCmsDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <span className="font-mono-tabular">{cmsDraft.primaryColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="cms-acolor" className="block font-medium mb-1">Cor Secundária / Destaque</label>
              <div className="flex items-center gap-2">
                <input
                  id="cms-acolor"
                  type="color"
                  value={cmsDraft.accentColor}
                  onChange={(e) => setCmsDraft((d) => ({ ...d, accentColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <span className="font-mono-tabular">{cmsDraft.accentColor}</span>
              </div>
            </div>
          </div>

          {/* Hero & CTAs */}
          <div className="space-y-3">
            <div>
              <label htmlFor="cms-hero" className="block font-medium mb-1">Título Hero do Site Oficial</label>
              <input
                id="cms-hero"
                type="text"
                value={cmsDraft.heroTitle}
                onChange={(e) => setCmsDraft((d) => ({ ...d, heroTitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cms-sub" className="block font-medium mb-1">Subtítulo Hero</label>
              <textarea
                id="cms-sub"
                rows={2}
                value={cmsDraft.heroSubtitle}
                onChange={(e) => setCmsDraft((d) => ({ ...d, heroSubtitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cms-cta-d" className="block font-medium mb-1">Botão CTA Principal</label>
                <input
                  id="cms-cta-d"
                  type="text"
                  value={cmsDraft.heroCtaDriverLabel}
                  onChange={(e) => setCmsDraft((d) => ({ ...d, heroCtaDriverLabel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="cms-cta-p" className="block font-medium mb-1">Botão CTA Secundário</label>
                <input
                  id="cms-cta-p"
                  type="text"
                  value={cmsDraft.heroCtaPlansLabel}
                  onChange={(e) => setCmsDraft((d) => ({ ...d, heroCtaPlansLabel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cms-banner" className="block font-medium mb-1">Texto da Faixa de Comunicado</label>
              <input
                id="cms-banner"
                type="text"
                value={cmsDraft.announcementBanner}
                onChange={(e) => setCmsDraft((d) => ({ ...d, announcementBanner: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={cmsDraft.showAnnouncement}
                onChange={(e) => setCmsDraft((d) => ({ ...d, showAnnouncement: e.target.checked }))}
              />
              <span>Mostrar faixa de comunicado no topo do Site Oficial</span>
            </label>
          </div>

          {/* Contact & SEO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="cms-email" className="block font-medium mb-1">Email de Contacto</label>
              <input
                id="cms-email"
                type="email"
                value={cmsDraft.contactEmail}
                onChange={(e) => setCmsDraft((d) => ({ ...d, contactEmail: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cms-hours" className="block font-medium mb-1">Horário de Suporte</label>
              <input
                id="cms-hours"
                type="text"
                value={cmsDraft.supportHours}
                onChange={(e) => setCmsDraft((d) => ({ ...d, supportHours: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cms-seo" className="block font-medium mb-1">Título SEO</label>
              <input
                id="cms-seo"
                type="text"
                value={cmsDraft.seoTitle}
                onChange={(e) => setCmsDraft((d) => ({ ...d, seoTitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Section Order & Visibility */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="font-bold">Ordem e Visibilidade das Secções da Página Inicial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cmsDraft.sectionOrder.map((secId, idx) => (
                <div
                  key={secId}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                >
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(cmsDraft.visibleSections[secId])}
                      onChange={(e) =>
                        setCmsDraft((d) => ({
                          ...d,
                          visibleSections: {
                            ...d.visibleSections,
                            [secId]: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span className="font-semibold">{SECTION_LABELS[secId]}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      aria-label={`Subir ${SECTION_LABELS[secId]}`}
                      className="p-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === cmsDraft.sectionOrder.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      aria-label={`Descer ${SECTION_LABELS[secId]}`}
                      className="p-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showPreview && (
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-slate-50 dark:bg-slate-900 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cmsDraft.accentColor }}>
                PRÉ-VISUALIZAÇÃO PORTAL · {cmsDraft.brandTitle} · {cmsDraft.brandTagline}
              </p>
              <p className="text-lg font-extrabold">{cmsDraft.heroTitle}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{cmsDraft.heroSubtitle}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span
                  style={{ backgroundColor: cmsDraft.primaryColor }}
                  className="px-3 py-1.5 rounded-lg text-white font-semibold"
                >
                  {cmsDraft.heroCtaDriverLabel}
                </span>
                <span className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold">
                  {cmsDraft.heroCtaPlansLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Secções ativas: {cmsDraft.sectionOrder.filter((id) => cmsDraft.visibleSections[id]).map((id) => SECTION_LABELS[id]).join(' → ')}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                saveCmsDraft(cmsDraft);
                setLocalUnsavedDirty(false);
                setCmsNotice('Rascunho guardado no servidor (/api/cms/draft) sem alterar o Portal público.');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:border-blue-600"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Rascunho
            </button>
            {state.cms.draftSnapshot && (
              <button
                type="button"
                onClick={() => {
                  discardCmsDraft();
                  setLocalUnsavedDirty(false);
                  setCmsDraft((prev) => ({
                    ...prev,
                    brandTitle: state.cms.brandTitle ?? 'AIVAD',
                    brandTagline: state.cms.brandTagline ?? 'O Cérebro Inteligente do Motorista',
                    primaryColor: state.cms.primaryColor ?? '#1D4ED8',
                    accentColor: state.cms.accentColor ?? '#DC2626',
                    heroTitle: state.cms.heroTitle,
                    heroSubtitle: state.cms.heroSubtitle,
                    heroCtaDriverLabel: state.cms.heroCtaDriverLabel ?? 'Entrar como Motorista',
                    heroCtaPlansLabel: state.cms.heroCtaPlansLabel ?? 'Explorar Planos',
                    announcementBanner: state.cms.announcementBanner,
                    showAnnouncement: state.cms.showAnnouncement,
                    contactEmail: state.cms.contactEmail ?? 'suporte@aivad-ecosystem.local',
                    supportHours: state.cms.supportHours ?? 'Seg–Sex · 09:00–19:00',
                    seoTitle: state.cms.seoTitle ?? 'AIVAD — O Cérebro Inteligente do Motorista',
                    seoDescription: state.cms.seoDescription ?? '',
                    sectionOrder: state.cms.sectionOrder ?? DEFAULT_ORDER,
                    visibleSections: state.cms.visibleSections ?? DEFAULT_VISIBILITY,
                    benefits: state.cms.benefits ?? [],
                    faqs: state.cms.faqs ?? [],
                    navigationMenus: state.cms.navigationMenus ?? [],
                    pagesContent: state.cms.pagesContent ?? {},
                    mediaAssets: state.cms.mediaAssets ?? [],
                    supportedLanguages: state.cms.supportedLanguages ?? ['pt-PT', 'en-GB', 'es-ES'],
                    localizedContent: state.cms.localizedContent ?? {},
                  }));
                  setCmsNotice('Rascunho descartado; repostos os valores publicados.');
                }}
                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold"
              >
                Descartar Rascunho
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                updateCmsAndPublish(cmsDraft, `Publicação CMS (${cmsDraft.brandTitle})`);
                setLocalUnsavedDirty(false);
                setCmsNotice('Alterações publicadas ao vivo no Site Oficial AIVAD.');
              }}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Publicar no Site Oficial
            </button>
          </div>
        </Card>

        {/* Menus, Páginas, Imagens/Media e Idiomas (PARTE VIII) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">Menus de Navegação &amp; Imagens do Portal</h3>
            <div className="space-y-2">
              {cmsDraft.navigationMenus.map((mn, idx) => (
                <div key={mn.id} className="flex items-center justify-between gap-2 p-2 rounded border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={mn.visible}
                      aria-label={`Mostrar menu ${mn.label}`}
                      onChange={(e) => {
                        setLocalUnsavedDirty(true);
                        setCmsDraft((d) => ({
                          ...d,
                          navigationMenus: d.navigationMenus.map((x, i) =>
                            i === idx ? { ...x, visible: e.target.checked } : x
                          ),
                        }));
                      }}
                    />
                    <input
                      type="text"
                      aria-label={`Etiqueta do menu ${mn.pageId}`}
                      value={mn.label}
                      onChange={(e) => {
                        setLocalUnsavedDirty(true);
                        setCmsDraft((d) => ({
                          ...d,
                          navigationMenus: d.navigationMenus.map((x, i) =>
                            i === idx ? { ...x, label: e.target.value } : x
                          ),
                        }));
                      }}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <span className="font-mono-tabular text-[11px] text-slate-400">/{mn.pageId}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="font-bold">Imagem Hero &amp; Texto Alternativo (Media Assets)</p>
              {cmsDraft.mediaAssets.map((asset, idx) => (
                <div key={asset.id} className="space-y-1.5 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono-tabular text-slate-500">Slot: {asset.slot} · {asset.label}</span>
                  <input
                    type="text"
                    aria-label={`URL de imagem ${asset.slot}`}
                    value={asset.url}
                    onChange={(e) => {
                      setLocalUnsavedDirty(true);
                      setCmsDraft((d) => ({
                        ...d,
                        mediaAssets: d.mediaAssets.map((m, i) =>
                          i === idx ? { ...m, url: e.target.value } : m
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular text-[11px]"
                  />
                  <input
                    type="text"
                    aria-label={`Texto alternativo ${asset.slot}`}
                    value={asset.alt}
                    onChange={(e) => {
                      setLocalUnsavedDirty(true);
                      setCmsDraft((d) => ({
                        ...d,
                        mediaAssets: d.mediaAssets.map((m, i) =>
                          i === idx ? { ...m, alt: e.target.value } : m
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">Editor de Páginas Internas &amp; Idiomas ({cmsDraft.supportedLanguages.join(', ')})</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="cms-page-slug" className="font-semibold">Página Interna:</label>
                <select
                  id="cms-page-slug"
                  value={editingPageSlug}
                  onChange={(e) => setEditingPageSlug(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="mercados">Mercados</option>
                  <option value="plataformas">Plataformas</option>
                  <option value="funcionalidades">Funcionalidades</option>
                  <option value="seguranca">Segurança &amp; RGPD</option>
                </select>
              </div>
              <input
                type="text"
                aria-label="Título da página interna"
                placeholder="Título personalizado da página..."
                value={cmsDraft.pagesContent[editingPageSlug]?.title ?? ''}
                onChange={(e) => {
                  setLocalUnsavedDirty(true);
                  const cur = cmsDraft.pagesContent[editingPageSlug] ?? {
                    title: '',
                    subtitle: '',
                    body: '',
                    updatedAt: getTodayIso(),
                  };
                  setCmsDraft((d) => ({
                    ...d,
                    pagesContent: {
                      ...d.pagesContent,
                      [editingPageSlug]: { ...cur, title: e.target.value, updatedAt: getTodayIso() },
                    },
                  }));
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <textarea
                rows={2}
                aria-label="Corpo editorial da página interna"
                placeholder="Texto introdutório da página..."
                value={cmsDraft.pagesContent[editingPageSlug]?.body ?? ''}
                onChange={(e) => {
                  setLocalUnsavedDirty(true);
                  const cur = cmsDraft.pagesContent[editingPageSlug] ?? {
                    title: '',
                    subtitle: '',
                    body: '',
                    updatedAt: getTodayIso(),
                  };
                  setCmsDraft((d) => ({
                    ...d,
                    pagesContent: {
                      ...d.pagesContent,
                      [editingPageSlug]: { ...cur, body: e.target.value, updatedAt: getTodayIso() },
                    },
                  }));
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="cms-lang-sel" className="font-semibold">Tradução do Portal:</label>
                <select
                  id="cms-lang-sel"
                  value={editingLangCode}
                  onChange={(e) => setEditingLangCode(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                >
                  {cmsDraft.supportedLanguages.map((lng) => (
                    <option key={lng} value={lng}>{lng}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                aria-label={`Título Hero em ${editingLangCode}`}
                placeholder={`Título Hero (${editingLangCode})`}
                value={cmsDraft.localizedContent[editingLangCode]?.heroTitle ?? ''}
                onChange={(e) => {
                  setLocalUnsavedDirty(true);
                  const cur = cmsDraft.localizedContent[editingLangCode] ?? {
                    heroTitle: '',
                    heroSubtitle: '',
                    brandTagline: '',
                    announcementBanner: '',
                  };
                  setCmsDraft((d) => ({
                    ...d,
                    localizedContent: {
                      ...d.localizedContent,
                      [editingLangCode]: { ...cur, heroTitle: e.target.value },
                    },
                  }));
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <textarea
                rows={2}
                aria-label={`Subtítulo Hero em ${editingLangCode}`}
                placeholder={`Subtítulo Hero (${editingLangCode})`}
                value={cmsDraft.localizedContent[editingLangCode]?.heroSubtitle ?? ''}
                onChange={(e) => {
                  setLocalUnsavedDirty(true);
                  const cur = cmsDraft.localizedContent[editingLangCode] ?? {
                    heroTitle: '',
                    heroSubtitle: '',
                    brandTagline: '',
                    announcementBanner: '',
                  };
                  setCmsDraft((d) => ({
                    ...d,
                    localizedContent: {
                      ...d.localizedContent,
                      [editingLangCode]: { ...cur, heroSubtitle: e.target.value },
                    },
                  }));
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </Card>
        </div>

        {/* Benefits & FAQs CMS Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">Cartões de Benefício no Portal ({cmsDraft.benefits.length})</h3>
            <div className="space-y-2">
              {cmsDraft.benefits.map((b) => (
                <div key={b.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{b.title}</p>
                    <p className="text-slate-500">{b.description}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover benefício ${b.title}`}
                    onClick={() =>
                      setCmsDraft((d) => ({
                        ...d,
                        benefits: d.benefits.filter((x) => x.id !== b.id),
                      }))
                    }
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                placeholder="Título do benefício"
                value={newBenefit.title}
                onChange={(e) => setNewBenefit((b) => ({ ...b, title: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                placeholder="Descrição breve"
                value={newBenefit.description}
                onChange={(e) => setNewBenefit((b) => ({ ...b, description: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBenefit.title.trim()) return;
                  setCmsDraft((d) => ({
                    ...d,
                    benefits: [
                      ...d.benefits,
                      { id: `ben-${Date.now()}`, title: newBenefit.title.trim(), description: newBenefit.description.trim() },
                    ],
                  }));
                  setNewBenefit({ title: '', description: '' });
                }}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Benefício
              </button>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold">Perguntas Frequentes FAQ ({cmsDraft.faqs.length})</h3>
            <div className="space-y-2">
              {cmsDraft.faqs.map((f) => (
                <div key={f.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{f.question}</p>
                    <p className="text-slate-500">{f.answer}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover FAQ ${f.question}`}
                    onClick={() =>
                      setCmsDraft((d) => ({
                        ...d,
                        faqs: d.faqs.filter((x) => x.id !== f.id),
                      }))
                    }
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                placeholder="Pergunta"
                value={newFaq.question}
                onChange={(e) => setNewFaq((q) => ({ ...q, question: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                placeholder="Resposta"
                value={newFaq.answer}
                onChange={(e) => setNewFaq((q) => ({ ...q, answer: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
                  setCmsDraft((d) => ({
                    ...d,
                    faqs: [
                      ...d.faqs,
                      { id: `faq-${Date.now()}`, question: newFaq.question.trim(), answer: newFaq.answer.trim() },
                    ],
                  }));
                  setNewFaq({ question: '', answer: '' });
                }}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar FAQ
              </button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Publicar Comunicado / Novidade no Portal
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pubTitle.trim()) return;
                updateCmsAndPublish(
                  {
                    publications: [
                      {
                        id: `pub-${Date.now()}`,
                        title: pubTitle,
                        category: 'Comunicado',
                        summary: pubSummary || 'Publicado via Consola CMS AIVAD.',
                        publishedAt: getTodayIso(),
                        status: 'Publicado',
                      },
                      ...state.cms.publications,
                    ],
                  },
                  `Nova publicação: ${pubTitle}`
                );
                setPubTitle('');
                setPubSummary('');
              }}
              className="space-y-2.5"
            >
              <input
                type="text"
                placeholder="Título da publicação"
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <textarea
                rows={2}
                placeholder="Resumo público..."
                value={pubSummary}
                onChange={(e) => setPubSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
                Publicar Comunicado
              </button>
            </form>
          </Card>

          <Card className="p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Histórico de Revisões &amp; Rollback CMS
            </h3>
            {state.cms.revisionHistory.length === 0 ? (
              <p className="text-slate-500">As revisões anteriores aparecerão aqui após a primeira publicação.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.cms.revisionHistory.map((rev) => (
                  <div key={rev.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{rev.summary}</p>
                      <p className="text-slate-500">{rev.savedBy} · {rev.savedAt.slice(0, 19).replace('T', ' ')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => rollbackCms(rev.id)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Referral Coupons & 30-Day Trial Ecosystem (Comando 6 §16) */}
        <Card className="p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cupões de Indicação &amp; Período Experimental de 30 Dias (Sem Cobrança Real Ativa)
              </h3>
              <p className="text-slate-500">
                Todos os planos incluem {state.plans[0]?.trialDays ?? 30} dias de teste gratuito. A estrutura comercial e de descontos está pronta sem processar cobranças financeiras reais nesta fase.
              </p>
            </div>
            <StatusLabel tone="info" text="Cobrança Real Desativada (Estrutura Pronta)" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!couponCode.trim()) return;
              addReferralCoupon({
                code: couponCode.trim().toUpperCase(),
                referrerName: couponReferrer.trim() || 'Embaixador AIVAD',
                countryScope: ['ALL'],
                trialDaysGranted: 30,
                discountPctAfterTrial: couponDiscount,
                maxRedemptions: 100,
                validUntil: '2027-12-31',
                active: true,
              });
              setCouponCode('');
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-2.5"
          >
            <input
              type="text"
              placeholder="Código (ex: AIVAD-PORTO30)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              aria-label="Código do cupão de indicação"
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular uppercase"
            />
            <input
              type="text"
              placeholder="Promotor / Parceiro"
              value={couponReferrer}
              onChange={(e) => setCouponReferrer(e.target.value)}
              aria-label="Nome do promotor"
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="number"
              min={5}
              max={50}
              value={couponDiscount}
              onChange={(e) => setCouponDiscount(Number(e.target.value))}
              aria-label="Desconto percentual após 30 dias"
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Criar Cupão 30 Dias
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {state.referralCoupons.map((cp) => (
              <div
                key={cp.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-950/60"
              >
                <div>
                  <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                    {cp.code}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {cp.referrerName} · {cp.trialDaysGranted} dias grátis + {cp.discountPctAfterTrial}% desc. · Usos {cp.currentRedemptions}/{cp.maxRedemptions}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleReferralCouponActive(cp.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    cp.active
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {cp.active ? 'Ativo' : 'Pausado'}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // VERSÕES & RELEASES
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Gestão de Versões & Releases (Android, iOS, Web, Backend)"
        description="A publicação de versão atualiza a área de Downloads do Site Oficial sem confundir atualizações do site com pacotes nativos."
      />

      <Card className="p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Registar Nova Release
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!verForm.version.trim()) return;
            addVersionRelease({
              channel: verForm.channel,
              version: verForm.version,
              buildNumber: 250 + state.versions.length,
              minSupportedVersion: '2.2.0',
              mandatoryUpdate: verForm.mandatoryUpdate,
              rolloutPct: verForm.rolloutPct,
              status: verForm.rolloutPct === 100 ? 'Publicado' : 'Gradual',
              releaseDate: getTodayIso(),
              notes: verForm.notes,
            });
          }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <select
            aria-label="Canal da versão"
            value={verForm.channel}
            onChange={(e) => setVerForm((f) => ({ ...f, channel: e.target.value as AppVersionRecord['channel'] }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="Android">Android</option>
            <option value="iOS">iOS</option>
            <option value="Web">Web</option>
            <option value="Backend">Backend</option>
          </select>
          <input
            type="text"
            aria-label="Número da versão"
            value={verForm.version}
            onChange={(e) => setVerForm((f) => ({ ...f, version: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
          />
          <input
            type="number"
            min={5}
            max={100}
            aria-label="Percentagem de rollout"
            value={verForm.rolloutPct}
            onChange={(e) => setVerForm((f) => ({ ...f, rolloutPct: Number(e.target.value) }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
            Lançar Release
          </button>
          <input
            type="text"
            placeholder="Notas de lançamento..."
            value={verForm.notes}
            onChange={(e) => setVerForm((f) => ({ ...f, notes: e.target.value }))}
            className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verForm.mandatoryUpdate}
              onChange={(e) => setVerForm((f) => ({ ...f, mandatoryUpdate: e.target.checked }))}
            />
            <span>Atualização obrigatória</span>
          </label>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Canal</th>
              <th className="p-3">Versão / Build</th>
              <th className="p-3">Rollout</th>
              <th className="p-3">Obrigatória</th>
              <th className="p-3">Notas</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.versions.map((v) => (
              <tr key={v.id}>
                <td className="p-3 font-bold">{v.channel}</td>
                <td className="p-3 font-mono-tabular">v{v.version} (#{v.buildNumber})</td>
                <td className="p-3 font-mono-tabular">{v.rolloutPct}%</td>
                <td className="p-3">{v.mandatoryUpdate ? 'Sim' : 'Não'}</td>
                <td className="p-3">{v.notes}</td>
                <td className="p-3">
                  <StatusLabel tone={v.status === 'Publicado' ? 'success' : 'info'} text={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
