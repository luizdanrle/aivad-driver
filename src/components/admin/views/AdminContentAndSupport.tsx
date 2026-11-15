import React, { useState } from 'react';
import { Inbox, Newspaper, PackageCheck, Palette, RotateCcw } from 'lucide-react';
import type { AppVersionRecord, TicketRecord } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

export const AdminContentAndSupport: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    replyToTicket,
    updateTicketStatus,
    updateCmsAndPublish,
    rollbackCms,
    addVersionRelease,
  } = useEcosystem();

  const [selectedTicketId, setSelectedTicketId] = useState(state.tickets[0]?.id ?? '');
  const [adminReply, setAdminReply] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // CMS Draft State
  const [cmsDraft, setCmsDraft] = useState({
    heroTitle: state.cms.heroTitle,
    heroSubtitle: state.cms.heroSubtitle,
    announcementBanner: state.cms.announcementBanner,
    showAnnouncement: state.cms.showAnnouncement,
  });
  const [showPreview, setShowPreview] = useState(false);

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
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="CMS Integrado — Gestão Visual, Páginas & Publicações do Site Oficial"
          description="Rascunho, pré-visualização, publicação imediata para o Site Oficial AIVAD e rollback seguro de revisões anteriores."
        />

        <Card className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Editor Principal do Site Oficial (Hero &amp; Faixa de Aviso)
            </h3>
            <button
              type="button"
              onClick={() => setShowPreview((s) => !s)}
              className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 font-medium"
            >
              {showPreview ? 'Ocultar Pré-visualização' : 'Pré-visualizar'}
            </button>
          </div>

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

          {showPreview && (
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-1">
              <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">PRÉ-VISUALIZAÇÃO PORTAL</p>
              <p className="text-base font-bold">{cmsDraft.heroTitle}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{cmsDraft.heroSubtitle}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => updateCmsAndPublish(cmsDraft, 'Atualização editorial Hero & Banner')}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
          >
            Publicar no Site Oficial
          </button>
        </Card>

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
                        publishedAt: '2026-11-14',
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
              releaseDate: '2026-11-14',
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
