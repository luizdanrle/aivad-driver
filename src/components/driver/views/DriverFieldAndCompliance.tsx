import React, { useState } from 'react';
import { Copy, Lock, MapPin, Mic, Scale, Send, ShieldCheck, Star, Unlock, Video } from 'lucide-react';
import { answerDriverQuery } from '../../../core/intelligence';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

const SUPPORT_SUB_TABS = [
  { id: 'suporte', label: 'Tickets & Suporte' },
  { id: 'legislacao', label: 'Legislação' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'avaliacao-rapida', label: 'Avaliação Rápida' },
  { id: 'dashcam', label: 'Dashcam' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'sugestoes', label: 'Sugestões' },
];

export const DriverFieldAndCompliance: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    visibleDriverPlatforms,
    toggleZonePreference,
    addPassengerReview,
    incrementReviewCopy,
    toggleDashcamProtection,
    addDashcamCapture,
    setDriverNav,
  } = useEcosystem();

  const renderSupportSubNav = () => (
    <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-800">
      {SUPPORT_SUB_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setDriverNav(t.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === t.id
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-500'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  // Map Layers State
  const [layers, setLayers] = useState({
    demand: true,
    events: true,
    traffic: true,
    tolls: true,
    chargers: true,
    parking: true,
    bases: true,
    favorites: true,
  });
  const [selectedZoneId, setSelectedZoneId] = useState(state.zones[0]?.id ?? '');

  // Quick Passenger Review State
  const [revStars, setRevStars] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [revTags, setRevTags] = useState<string[]>(['Pontual', 'Cordial']);
  const [revNotes, setRevNotes] = useState('');
  const [revPlatform, setRevPlatform] = useState(visibleDriverPlatforms[0]?.id ?? 'uber');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Assistant State
  const [aiQuery, setAiQuery] = useState('Qual é o meu rendimento líquido estimado e fontes?');
  const [aiHistory, setAiHistory] = useState<
    Array<{
      q: string;
      a: string;
      sources: string[];
      dataNature: string;
    }>
  >(() => {
    const initial = answerDriverQuery('Qual é o meu rendimento líquido estimado?', {
      trips: state.trips,
      expenses: state.expenses,
      campaigns: state.campaigns,
      vehicles: state.vehicles,
      obligationsCount: state.obligations.length,
    });
    return [
      {
        q: 'Qual é o meu rendimento líquido estimado?',
        a: initial.answer,
        sources: initial.sources,
        dataNature: initial.dataNature,
      },
    ];
  });

  if (activeTab === 'mapas-zonas') {
    const selectedZone = state.zones.find((z) => z.id === selectedZoneId) ?? state.zones[0];
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Mapa Interativo de Zonas & Camadas Operacionais"
          description="Dados históricos de procura, bases, carregamento EV e preferências de zona. Sem invenção de dados em tempo real sem API oficial ligada."
          demoNotice="Feed tempo real de trânsito/procura: INTEGRAÇÃO A VALIDAR"
        />

        <Card className="p-4 flex flex-wrap gap-3 text-xs">
          {(
            [
              ['demand', 'Procura histórica'],
              ['events', 'Eventos'],
              ['traffic', 'Trânsito (demo)'],
              ['tolls', 'Portagens'],
              ['chargers', 'Carregamento EV'],
              ['parking', 'Estacionamento'],
              ['bases', 'Bases'],
              ['favorites', 'Favoritas / Evitar'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
              />
              <span>{label}</span>
            </label>
          ))}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-4">
            <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-gradient-to-b from-blue-50/90 to-indigo-50/60 dark:from-[#0B1324] dark:to-[#0F182B] overflow-hidden border border-blue-200/80 dark:border-slate-700">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Subtle city grid */}
                <path
                  d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"
                  className="stroke-blue-200/90 dark:stroke-slate-800"
                  strokeWidth="0.4"
                />
                {/* River Tagus representation */}
                <path d="M0 84 Q45 78 100 88 L100 100 L0 100 Z" className="fill-blue-200/75 dark:fill-[#0F2942]" />
                {state.zones.map((z) => {
                  const fill =
                    layers.favorites && z.preference === 'Favorita'
                      ? '#1D4ED8'
                      : layers.favorites && z.preference === 'Evitar'
                      ? '#E11D48'
                      : '#4F46E5';
                  return (
                    <g
                      key={z.id}
                      onClick={() => setSelectedZoneId(z.id)}
                      className="cursor-pointer"
                    >
                      {layers.demand && (
                        <circle
                          cx={z.x}
                          cy={z.y}
                          r={z.historicalDemand === 'Alta' ? 11 : 7}
                          fill={fill}
                          fillOpacity={0.22}
                          stroke={selectedZone?.id === z.id ? '#1D4ED8' : fill}
                          strokeWidth={selectedZone?.id === z.id ? 0.9 : 0.45}
                        />
                      )}
                      <circle cx={z.x} cy={z.y} r={2.2} fill={fill} stroke="#FFFFFF" strokeWidth="0.5" />
                      <text
                        x={z.x}
                        y={z.y - 4}
                        textAnchor="middle"
                        className="fill-slate-800 dark:fill-slate-100"
                        fontSize="3.2"
                        fontWeight="bold"
                      >
                        {z.name.split('/')[0].trim()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Card>

          <Card className="lg:col-span-4 p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {selectedZone.name} ({selectedZone.city})
            </h3>
            <div className="space-y-1.5">
              <p><strong>Procura histórica:</strong> {selectedZone.historicalDemand}</p>
              {layers.traffic && <p><strong>Trânsito (indicativo):</strong> {selectedZone.trafficLevel}</p>}
              {layers.chargers && <p><strong>Postos EV na zona:</strong> {selectedZone.evChargersCount}</p>}
              {layers.parking && <p><strong>Lugares estacionamento:</strong> {selectedZone.parkingSpots}</p>}
              {layers.tolls && <p><strong>Portagens próximas:</strong> {selectedZone.tollsNearby ? 'Sim' : 'Não'}</p>}
              {layers.bases && <p><strong>Base Operacional:</strong> {selectedZone.isBase ? 'Sim' : 'Não'}</p>}
              {layers.events && selectedZone.activeEvent && (
                <p className="text-blue-700 dark:text-blue-400">
                  <strong>Evento:</strong> {selectedZone.activeEvent}
                </p>
              )}
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-semibold block">Classificação da Zona pelo Motorista:</span>
              <div className="flex gap-1.5">
                {(['Favorita', 'Neutra', 'Evitar'] as const).map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => toggleZonePreference(selectedZone.id, pref)}
                    className={`px-2.5 py-1 rounded border text-xs font-medium ${
                      selectedZone.preference === pref
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'legislacao') {
    const activeCountryCode = state.localization.selectedMarketCode;
    const countryObligations = state.obligations.filter((ob) => ob.countryCode === activeCountryCode);
    const displayedObligations =
      countryObligations.length > 0 ? countryObligations : state.obligations;
    const otherObligations = state.obligations.filter((ob) => ob.countryCode !== activeCountryCode);

    return (
      <div className="space-y-6">
        {renderSupportSubNav()}
        <ContextualHelpBanner
          title={`AIVAD Compliance Intelligence — Mercado Ativo (${activeCountryCode})`}
          description="Cada obrigação indica fonte oficial, artigo, datas, estado regulamentar e selo de validação jurídica humana antes de comunicação definitiva."
        />

        <div className="space-y-4">
          {displayedObligations.map((ob) => (
            <Card key={ob.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {ob.countryCode} · {ob.category} · {ob.affectedProfile}
                  </span>
                  <h3 className="text-base font-bold mt-0.5">{ob.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <StatusLabel
                    tone={
                      ob.status === 'Em vigor'
                        ? 'success'
                        : ob.status === 'Em transição' || ob.status === 'Publicado'
                        ? 'info'
                        : 'warning'
                    }
                    text={ob.status}
                  />
                  <StatusLabel
                    tone={ob.humanValidated ? 'success' : 'warning'}
                    text={ob.humanValidated ? 'Validado Humanamente' : 'A aguardar validação'}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{ob.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                <div><strong>Fonte:</strong> {ob.officialSource}</div>
                <div><strong>Artigo:</strong> {ob.articleRef}</div>
                <div><strong>Publicação / Vigor:</strong> {ob.publishedDate} / {ob.effectiveDate}</div>
                <div><strong>Prazo Adaptação:</strong> {ob.adaptationDeadline}</div>
              </div>
            </Card>
          ))}
        </div>

        {otherObligations.length > 0 && countryObligations.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Outros Mercados Catalogados ({otherObligations.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherObligations.map((ob) => (
                <Card key={ob.id} className="p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{ob.countryCode} · {ob.title}</span>
                    <StatusLabel tone={ob.humanValidated ? 'success' : 'warning'} text={ob.status} />
                  </div>
                  <p className="text-slate-500">{ob.officialSource} · {ob.articleRef}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'avaliacao-rapida') {
    const tagOptions = ['Pontual', 'Cordial', 'Silencioso', 'Viagem tranquila', 'Bagagem cuidadosa', 'Atraso na recolha', 'Comportamento inadequado'];
    const composedText =
      revNotes.trim() ||
      `Passageiro avaliado com ${revStars} estrelas (${revTags.join(', ') || 'sem etiquetas'}). Registo baseado apenas na observação do motorista.`;

    return (
      <div className="space-y-6">
        {renderSupportSubNav()}
        <ContextualHelpBanner
          title="AIVAD Quick Review — Avaliação Rápida de Passageiros"
          description="Construa avaliações fiéis ao que observou e copie para a área de transferência. Nunca envia automaticamente sem API oficial autorizada."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-6 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Nova Avaliação</h3>
              <select
                aria-label="Plataforma da avaliação"
                value={revPlatform}
                onChange={(e) => setRevPlatform(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {visibleDriverPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Classificação:</span>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrelas`}
                  onClick={() => setRevStars(n)}
                  className={`p-1.5 rounded ${n <= revStars ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tagOptions.map((tag) => {
                const active = revTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setRevTags((prev) =>
                        active ? prev.filter((x) => x !== tag) : [...prev, tag]
                      )
                    }
                    className={`px-2.5 py-1 rounded border font-medium ${
                      active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor="rev-notes" className="block font-medium mb-1">
                Notas observadas pelo motorista (ou ditado por voz no dispositivo)
              </label>
              <div className="flex gap-2">
                <textarea
                  id="rev-notes"
                  rows={3}
                  value={revNotes}
                  onChange={(e) => setRevNotes(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  placeholder="Descreva apenas factos observados na viagem..."
                />
                <button
                  type="button"
                  title="Simular texto de ditado"
                  onClick={() =>
                    setRevNotes('Passageiro pontual no ponto de recolha e viagem sem incidentes.')
                  }
                  className="px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                addPassengerReview({
                  platformId: revPlatform,
                  stars: revStars,
                  tags: revTags,
                  notes: revNotes,
                  generatedText: composedText,
                  copiedCount: 0,
                })
              }
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold"
            >
              Guardar Avaliação no Histórico
            </button>
          </Card>

          <Card className="lg:col-span-6 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Histórico &amp; Cópia Rápida</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {state.reviews.map((r) => (
                <div key={r.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {r.platformId.toUpperCase()} · {r.stars}★
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(r.generatedText);
                        incrementReviewCopy(r.id);
                        setCopiedId(r.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === r.id ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{r.generatedText}</p>
                  <p className="text-[11px] text-slate-400">
                    Envio automático para plataforma: Desativado (INTEGRAÇÃO A VALIDAR)
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'dashcam') {
    return (
      <div className="space-y-6">
        {renderSupportSubNav()}
        <ContextualHelpBanner
          title="Dashcam, Privacidade & Retenção Protegida"
          description="Associada às viagens concluídas com bloqueio de proteção contra eliminação automática e mascaramento de privacidade conforme RGPD local."
          demoNotice="Captura de hardware nativo: INTEGRAÇÃO A VALIDAR"
        />

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => addDashcamCapture(state.trips[0]?.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Video className="w-4 h-4" />
            Simular Registo de Clip Associado à Última Viagem
          </button>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">ID Clip</th>
                <th className="p-3">Viagem</th>
                <th className="p-3">Resolução / Duração</th>
                <th className="p-3">Retenção</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Proteção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.dashcamClips.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-mono-tabular font-semibold">{c.id}</td>
                  <td className="p-3 font-mono-tabular">{c.tripId ?? 'Sem viagem'}</td>
                  <td className="p-3 font-mono-tabular">{c.resolution} · {c.durationSec}s ({c.sizeMb} MB)</td>
                  <td className="p-3">{c.retentionDays} dias · Privacidade: {c.privacyZoneMasked ? 'Ativa' : 'Padrão'}</td>
                  <td className="p-3">
                    <StatusLabel tone={c.protectedLock ? 'success' : 'warning'} text={c.status} />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleDashcamProtection(c.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {c.protectedLock ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{c.protectedLock ? 'Desproteger' : 'Proteger'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // ASSISTENTE IA
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Assistente Inteligente AIVAD (Fundamentado nos Seus Dados)"
        description="Responde sobre ganhos, custos, viagens, campanhas, veículos e legislação usando exclusivamente os dados reais registados no seu perfil, indicando a origem e separando estimativas."
      />

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            'Qual é o meu rendimento líquido estimado?',
            'Quantos quilómetros e média por hora tenho?',
            'Quais são as minhas campanhas ativas?',
            'O meu veículo é elegível para Uber e Bolt?',
            'Qual é o estado da Lei n.º 59/2026?',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAiQuery(preset)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs hover:border-blue-600"
            >
              {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!aiQuery.trim()) return;
            const res = answerDriverQuery(aiQuery, {
              trips: state.trips,
              expenses: state.expenses,
              campaigns: state.campaigns,
              vehicles: state.vehicles,
              obligationsCount: state.obligations.length,
            });
            setAiHistory((prev) => [
              { q: aiQuery, a: res.answer, sources: res.sources, dataNature: res.dataNature },
              ...prev,
            ]);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            aria-label="Pergunta ao Assistente Inteligente AIVAD"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            placeholder="Pergunte sobre os seus ganhos, despesas, campanhas, veículo ou legislação..."
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Consultar</span>
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {aiHistory.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2 text-xs"
            >
              <p className="font-bold text-slate-900 dark:text-white">Pergunta: {item.q}</p>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{item.a}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <span>Fontes: {item.sources.join(' · ')}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {item.dataNature}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
