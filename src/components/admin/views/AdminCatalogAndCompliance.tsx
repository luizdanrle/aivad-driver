import React, { useState } from 'react';
import { Bell, Globe2, MapPin, Plus, Scale } from 'lucide-react';
import { evaluateVehicleEligibility } from '../../../core/intelligence';
import { CURRENCY_META, getTodayIso } from '../../../core/localization';
import type {
  ComplianceObligation,
  MarketStatus,
  PlatformStatus,
  UnitSystem,
} from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import { PlatformBadge } from '../../ui/ChartsAndVisuals';
import {
  Card,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

const MARKET_STATUSES: MarketStatus[] = [
  'Não configurado',
  'Em estudo',
  'Em preparação',
  'Em validação',
  'Disponível',
  'Temporariamente indisponível',
  'Descontinuado',
];

export const AdminCatalogAndCompliance: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    updatePlatformStatus,
    addPlatform,
    addCountryMarket,
    updateCountryMarketStatus,
    addRegionOrCityToCountry,
    validateLegislation,
    addLegislation,
    broadcastNotification,
  } = useEcosystem();

  const [newPlatForm, setNewPlatForm] = useState({
    name: '',
    shortCode: '',
    brandColor: '#1D4ED8',
    commissionPct: 18,
    countryScope: 'PT,ES',
    citiesScope: 'Lisboa,Madrid',
    categories: 'Standard,Comfort',
  });

  const [newCountryForm, setNewCountryForm] = useState({
    code: '',
    name: '',
    nativeName: '',
    language: 'Português',
    languageCode: 'pt-PT',
    currency: 'EUR',
    timezone: 'Europe/Lisbon',
    unitSystem: 'metric' as UnitSystem,
    vatPct: 23,
    driverLicenseRequired: 'Licença Local / TVDE',
    vehicleMaxAgeYears: 7,
    regionName: '',
    cityName: '',
    marketStatus: 'Em preparação' as MarketStatus,
  });

  const [regionInputs, setRegionInputs] = useState<Record<string, { region: string; city: string }>>({});

  const [newLawForm, setNewLawForm] = useState({
    title: '',
    countryCode: 'PT',
    category: 'Lei TVDE' as ComplianceObligation['category'],
    officialSource: 'Diário da República / IMT',
    articleRef: 'Art. 1.º',
    adaptationDeadline: '2027-03-01',
    summary: '',
  });

  const [notifForm, setNotifForm] = useState({
    title: '',
    body: '',
    targetUserId: 'ALL',
    category: 'Administração' as const,
  });

  // ==========================================================
  // PLATAFORMAS (Multi-app dinâmico sem hardcode)
  // ==========================================================
  if (activeTab === 'plataformas') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Catálogo Internacional de Plataformas (Multipaís / Multicidade)"
          description="Crie, ative ou oculte plataformas livremente. Inativar remove dos menus do Modo Motorista preservando todo o histórico. Integrações externas exibem o estado de validação separado do estado operacional."
        />

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Nova Plataforma ao Catálogo Global
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPlatForm.name.trim()) return;
              const cleanId = newPlatForm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              addPlatform({
                id: cleanId || `plat-${Date.now()}`,
                name: newPlatForm.name.trim(),
                shortCode: (newPlatForm.shortCode.trim() || newPlatForm.name.slice(0, 2)).toUpperCase(),
                brandColor: newPlatForm.brandColor,
                countryScope: newPlatForm.countryScope
                  .split(',')
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean),
                citiesScope: newPlatForm.citiesScope
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                categories: newPlatForm.categories
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                requirements: ['Licença de motorista profissional ativa no mercado'],
                docsRequired: ['Carta de condução', 'Seguro comercial / TVDE'],
                benefits: ['Gestão consolidada multi-app AIVAD'],
                commissionPct: newPlatForm.commissionPct,
                status: 'Ativa',
                integrationStatus: 'Em análise',
                integrationLabel: 'INTEGRAÇÃO A VALIDAR',
              });
              setNewPlatForm((f) => ({ ...f, name: '', shortCode: '' }));
            }}
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end text-xs"
          >
            <div>
              <label htmlFor="np-name" className="block mb-1 font-medium">Nome</label>
              <input
                id="np-name"
                type="text"
                value={newPlatForm.name}
                onChange={(e) => setNewPlatForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: 99 / DiDi"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="np-code" className="block mb-1 font-medium">Sigla</label>
              <input
                id="np-code"
                type="text"
                maxLength={3}
                value={newPlatForm.shortCode}
                onChange={(e) => setNewPlatForm((f) => ({ ...f, shortCode: e.target.value }))}
                placeholder="99"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="np-comm" className="block mb-1 font-medium">Comissão (%)</label>
              <input
                id="np-comm"
                type="number"
                value={newPlatForm.commissionPct}
                onChange={(e) => setNewPlatForm((f) => ({ ...f, commissionPct: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="np-countries" className="block mb-1 font-medium">Países (CSV)</label>
              <input
                id="np-countries"
                type="text"
                value={newPlatForm.countryScope}
                onChange={(e) => setNewPlatForm((f) => ({ ...f, countryScope: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="np-cities" className="block mb-1 font-medium">Cidades (CSV)</label>
              <input
                id="np-cities"
                type="text"
                value={newPlatForm.citiesScope}
                onChange={(e) => setNewPlatForm((f) => ({ ...f, citiesScope: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold">
              Adicionar Plataforma
            </button>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Plataforma</th>
                <th className="p-3">Países &amp; Cidades</th>
                <th className="p-3">Comissão &amp; Categorias</th>
                <th className="p-3">Requisitos / Documentos</th>
                <th className="p-3">Estado Operacional (Cascata Motorista)</th>
                <th className="p-3">Integração Externa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.platforms.map((pl) => (
                <tr key={pl.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <PlatformBadge
                        name={pl.name}
                        shortCode={pl.shortCode}
                        brandColor={pl.brandColor}
                        size="sm"
                      />
                      <span className="font-bold">{pl.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-mono-tabular font-semibold">{pl.countryScope.join(', ')}</p>
                    <p className="text-[11px] text-slate-500">
                      {pl.citiesScope?.join(', ') || 'Âmbito nacional'}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-mono-tabular font-bold">{pl.commissionPct}%</p>
                    <p className="text-[11px] text-slate-500">{pl.categories.join(' · ')}</p>
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {pl.requirements?.[0] ?? 'Configuração base'}
                    </p>
                  </td>
                  <td className="p-3">
                    <select
                      aria-label={`Estado operacional de ${pl.name}`}
                      value={pl.status}
                      onChange={(e) => updatePlatformStatus(pl.id, e.target.value as PlatformStatus)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Ativa">Ativa</option>
                      <option value="Oculta">Oculta</option>
                      <option value="Suspensa">Suspensa</option>
                      <option value="Encerrada">Encerrada</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <StatusLabel tone="warning" text={`${pl.integrationStatus} · ${pl.integrationLabel}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // ==========================================================
  // PAÍSES E MERCADOS INTERNACIONAIS (Ilimitado + Estados Dinâmicos)
  // ==========================================================
  if (activeTab === 'paises') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Gestão Internacional Dinâmica (Países, Regiões, Cidades & Estados de Mercado)"
          description="Adicione mercados ilimitados no mundo inteiro, configure moedas, fusos horários, unidades (km/mi) e gerencie o estado de cada mercado. Apenas mercados marcados como 'Disponível' aparecem como prontos no Portal Oficial."
        />

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Novo País / Mercado ao Ecossistema
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleanCode = newCountryForm.code.trim().toUpperCase();
              if (!cleanCode || !newCountryForm.name.trim()) return;
              if (state.countries.some((c) => c.code === cleanCode)) return;
              const currMeta = CURRENCY_META[newCountryForm.currency] ?? {
                symbol: `${newCountryForm.currency} `,
                decimals: 2,
                locale: newCountryForm.languageCode,
              };
              addCountryMarket({
                code: cleanCode,
                name: newCountryForm.name.trim(),
                nativeName: newCountryForm.nativeName.trim() || newCountryForm.name.trim(),
                language: newCountryForm.language,
                languageCode: newCountryForm.languageCode,
                currency: newCountryForm.currency,
                currencySymbol: currMeta.symbol.trim(),
                decimalSeparator: newCountryForm.currency === 'USD' || newCountryForm.currency === 'GBP' ? '.' : ',',
                timezone: newCountryForm.timezone,
                unitSystem: newCountryForm.unitSystem,
                vatPct: newCountryForm.vatPct,
                activePlatforms: ['uber', 'bolt'],
                tvdeRegulated: true,
                driverLicenseRequired: newCountryForm.driverLicenseRequired,
                vehicleMaxAgeYears: newCountryForm.vehicleMaxAgeYears,
                taxCategories: ['Imposto local sobre faturação', 'Segurança social'],
                regions: [
                  {
                    name: newCountryForm.regionName.trim() || 'Região Metropolitana Principal',
                    cities: [newCountryForm.cityName.trim() || 'Capital'],
                  },
                ],
                marketStatus: newCountryForm.marketStatus,
              });
              setNewCountryForm((f) => ({ ...f, code: '', name: '', nativeName: '', regionName: '', cityName: '' }));
            }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs items-end"
          >
            <div>
              <label htmlFor="nc-code" className="block mb-1 font-medium">Código ISO</label>
              <input
                id="nc-code"
                type="text"
                maxLength={4}
                placeholder="Ex: IT, MX, AO"
                value={newCountryForm.code}
                onChange={(e) => setNewCountryForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular uppercase"
              />
            </div>
            <div>
              <label htmlFor="nc-name" className="block mb-1 font-medium">Nome do País</label>
              <input
                id="nc-name"
                type="text"
                placeholder="Ex: Itália"
                value={newCountryForm.name}
                onChange={(e) => setNewCountryForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="nc-curr" className="block mb-1 font-medium">Moeda</label>
              <select
                id="nc-curr"
                value={newCountryForm.currency}
                onChange={(e) => setNewCountryForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              >
                {Object.keys(CURRENCY_META).map((cur) => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nc-unit" className="block mb-1 font-medium">Unidades</label>
              <select
                id="nc-unit"
                value={newCountryForm.unitSystem}
                onChange={(e) => setNewCountryForm((f) => ({ ...f, unitSystem: e.target.value as UnitSystem }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="metric">Métrico (km)</option>
                <option value="imperial">Imperial (mi)</option>
              </select>
            </div>
            <div>
              <label htmlFor="nc-city" className="block mb-1 font-medium">Cidade Inicial</label>
              <input
                id="nc-city"
                type="text"
                placeholder="Ex: Milão"
                value={newCountryForm.cityName}
                onChange={(e) => setNewCountryForm((f) => ({ ...f, cityName: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold">
              Adicionar País
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          {state.countries.map((c) => {
            const rDraft = regionInputs[c.code] ?? { region: c.regions[0]?.name ?? 'Região Centro', city: '' };
            return (
              <Card key={c.code} className="p-5 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 dark:bg-slate-800 text-white font-mono-tabular font-bold">
                        {c.code}
                      </span>
                      <h3 className="text-base font-bold">{c.name} ({c.nativeName})</h3>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      {c.language} ({c.languageCode}) · Moeda: <strong className="font-mono-tabular">{c.currency}</strong> · Fuso:{' '}
                      <span className="font-mono-tabular">{c.timezone}</span> · IVA {c.vatPct}% · Idade máx. {c.vehicleMaxAgeYears} anos ({c.unitSystem})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor={`mkt-status-${c.code}`} className="text-[11px] font-semibold text-slate-500">
                      Estado do Mercado:
                    </label>
                    <select
                      id={`mkt-status-${c.code}`}
                      value={c.marketStatus}
                      onChange={(e) => updateCountryMarketStatus(c.code, e.target.value as MarketStatus)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
                    >
                      {MARKET_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="lg:col-span-7 space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Regiões e Cidades Configuradas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.regions.map((r) => (
                        <div
                          key={r.name}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="font-semibold">{r.name}:</span>{' '}
                          <span className="text-slate-600 dark:text-slate-300">{r.cities.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!rDraft.city.trim()) return;
                      addRegionOrCityToCountry(c.code, rDraft.region.trim() || 'Região Principal', rDraft.city.trim());
                      setRegionInputs((prev) => ({ ...prev, [c.code]: { ...rDraft, city: '' } }));
                    }}
                    className="lg:col-span-5 flex flex-wrap sm:flex-nowrap items-end gap-2"
                  >
                    <input
                      type="text"
                      aria-label={`Região em ${c.name}`}
                      placeholder="Região"
                      value={rDraft.region}
                      onChange={(e) =>
                        setRegionInputs((prev) => ({
                          ...prev,
                          [c.code]: { ...rDraft, region: e.target.value },
                        }))
                      }
                      className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <input
                      type="text"
                      aria-label={`Nova cidade em ${c.name}`}
                      placeholder="Nova cidade..."
                      value={rDraft.city}
                      onChange={(e) =>
                        setRegionInputs((prev) => ({
                          ...prev,
                          [c.code]: { ...rDraft, city: e.target.value },
                        }))
                      }
                      className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-700 text-white font-semibold whitespace-nowrap"
                    >
                      + Cidade
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeTab === 'veiculos-eleg') {
    const activePlats = state.platforms.filter((p) => p.status === 'Ativa').slice(0, 4);
    return (
      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold">Catálogo Central de Veículos &amp; Regras Dinâmicas Multi-Plataforma</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Veículo</th>
              <th className="p-3">Ano / Mercado</th>
              <th className="p-3">Elegibilidade Legal</th>
              {activePlats.map((pl) => (
                <th key={pl.id} className="p-3">{pl.name} Comercial</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.vehicles.map((v) => {
              const mkt = state.countries.find((c) => c.code === v.countryCode);
              const el = evaluateVehicleEligibility(v, new Date().getFullYear(), state.platforms, mkt?.vehicleMaxAgeYears);
              return (
                <tr key={v.id}>
                  <td className="p-3 font-semibold">{v.brand} {v.model} ({v.fuelType})</td>
                  <td className="p-3">{v.year} · {v.city}/{v.countryCode}</td>
                  <td className="p-3">
                    <StatusLabel
                      tone={el.tvdeLegalEligible ? 'success' : 'danger'}
                      text={el.tvdeLegalEligible ? 'Elegível' : 'Inelegível'}
                    />
                  </td>
                  {activePlats.map((pl) => {
                    const res = el.platformEligibility[pl.id];
                    return (
                      <td key={pl.id} className="p-3">
                        {res?.eligible ? res.categories.join(', ') : res?.reasons[0] ?? 'N/D'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  }

  if (activeTab === 'legislacao') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD Compliance Admin — Fluxo de Validação Jurídica Humana Multi-País"
          description="Rascunhos detetados por monitorização exigem validação humana antes de serem comunicados como obrigações definitivas aos motoristas de cada mercado."
        />

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Nova Norma / Diploma para Análise
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newLawForm.title.trim()) return;
              addLegislation({
                countryCode: newLawForm.countryCode,
                title: newLawForm.title,
                category: newLawForm.category,
                officialSource: newLawForm.officialSource,
                articleRef: newLawForm.articleRef,
                publishedDate: getTodayIso(),
                effectiveDate: 'A definir',
                adaptationDeadline: newLawForm.adaptationDeadline,
                status: 'Em análise',
                affectedProfile: 'Todos TVDE',
                summary: newLawForm.summary || 'Pendente de revisão jurídica.',
                humanValidated: false,
              });
              setNewLawForm((f) => ({ ...f, title: '', summary: '' }));
            }}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <select
              aria-label="País da norma"
              value={newLawForm.countryCode}
              onChange={(e) => setNewLawForm((f) => ({ ...f, countryCode: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {state.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Título da obrigação ou diploma"
              value={newLawForm.title}
              onChange={(e) => setNewLawForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Fonte oficial (ex: Diário da República)"
              value={newLawForm.officialSource}
              onChange={(e) => setNewLawForm((f) => ({ ...f, officialSource: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
              Criar em Análise
            </button>
          </form>
        </Card>

        <div className="space-y-3">
          {state.obligations.map((ob) => (
            <Card key={ob.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-sm">{ob.countryCode} · {ob.title}</p>
                <p className="text-slate-500">{ob.officialSource} · {ob.articleRef}</p>
                <p className="text-slate-600 dark:text-slate-300">{ob.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <StatusLabel
                  tone={ob.humanValidated ? 'success' : 'warning'}
                  text={ob.humanValidated ? `Validado (${ob.status})` : 'Requer validação humana'}
                />
                {!ob.humanValidated && (
                  <button
                    type="button"
                    onClick={() => validateLegislation(ob.id, 'Em vigor')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Validar e Notificar Motoristas
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // NOTIFICAÇÕES & COMUNICAÇÃO
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Centro de Notificações & Comunicação Segmentada"
        description="Envie comunicados individuais ou gerais. Os alertas entregues aparecem imediatamente no Modo Motorista com confirmação de leitura."
      />

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Emitir Notificação / Comunicado
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!notifForm.title.trim() || !notifForm.body.trim()) return;
            broadcastNotification(
              notifForm.title,
              notifForm.body,
              notifForm.targetUserId,
              notifForm.category
            );
            setNotifForm((f) => ({ ...f, title: '', body: '' }));
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <input
            type="text"
            placeholder="Título da notificação"
            value={notifForm.title}
            onChange={(e) => setNotifForm((f) => ({ ...f, title: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <select
            aria-label="Destinatário"
            value={notifForm.targetUserId}
            onChange={(e) => setNotifForm((f) => ({ ...f, targetUserId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="ALL">Todos os utilizadores</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
            Enviar Comunicado
          </button>
          <textarea
            rows={2}
            placeholder="Corpo da mensagem..."
            value={notifForm.body}
            onChange={(e) => setNotifForm((f) => ({ ...f, body: e.target.value }))}
            className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </form>
      </Card>

      <Card className="p-5 space-y-2 text-xs">
        <h3 className="text-sm font-bold">Histórico de Envios &amp; Confirmação de Leitura</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {state.notifications.map((n) => (
            <div key={n.id} className="py-2.5 flex justify-between gap-3">
              <div>
                <p className="font-semibold">{n.title}</p>
                <p className="text-slate-500">{n.body}</p>
              </div>
              <StatusLabel tone={n.read ? 'success' : 'info'} text={n.read ? 'Lida' : 'Entregue (Não lida)'} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
