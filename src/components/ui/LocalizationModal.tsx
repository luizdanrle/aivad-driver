import React, { useEffect, useState } from 'react';
import { Check, Compass, Globe2, MapPin, Navigation, ShieldCheck, X } from 'lucide-react';
import { translateUi } from '../../core/localization';
import { useEcosystem } from '../../services/EcosystemContext';
import { Card } from './DesignSystem';

export const LocalizationPromptOverlay: React.FC<{
  manualOpen?: boolean;
  onCloseManual?: () => void;
}> = ({ manualOpen = false, onCloseManual }) => {
  const {
    state,
    activeMarket,
    requestBrowserGeolocation,
    simulateOrSelectLocation,
    confirmLocalMarket,
    dismissCountryChangePrompt,
  } = useEcosystem();

  const loc = state.localization;
  const prompt = loc.pendingCountryChangePrompt;
  const shouldShowFirstOpen = !loc.firstOpenConfirmed;
  const isVisible = manualOpen || shouldShowFirstOpen || Boolean(prompt);

  const [selectedCountry, setSelectedCountry] = useState(
    (prompt?.newCountryCode ?? loc.currentLocation.countryCode) === 'UNSET'
      ? activeMarket.code
      : (prompt?.newCountryCode ?? loc.currentLocation.countryCode)
  );
  const [selectedCity, setSelectedCity] = useState(
    loc.currentLocation.countryCode === 'UNSET'
      ? activeMarket.regions[0]?.cities[0] ?? activeMarket.name
      : (prompt?.newCity ?? loc.currentLocation.city)
  );

  useEffect(() => {
    if (!isVisible) return;
    const rawCountry = prompt?.newCountryCode ?? loc.currentLocation.countryCode;
    const nextCountry = rawCountry === 'UNSET' ? activeMarket.code : rawCountry;
    const nextCity =
      rawCountry === 'UNSET'
        ? activeMarket.regions[0]?.cities[0] ?? activeMarket.name
        : (prompt?.newCity ?? loc.currentLocation.city);
    setSelectedCountry(nextCountry);
    setSelectedCity(nextCity);
  }, [isVisible, prompt?.newCountryCode, prompt?.newCity, loc.currentLocation.countryCode, loc.currentLocation.city, activeMarket]);

  if (!isVisible) return null;

  const isUnsetLocation = loc.currentLocation.countryCode === 'UNSET';
  const targetCountryObj =
    state.countries.find((c) => c.code === selectedCountry) ?? activeMarket;
  const rawCities = targetCountryObj?.regions.flatMap((r) => r.cities) ?? [];
  const availableCities = rawCities.includes(selectedCity)
    ? rawCities
    : [selectedCity, ...rawCities].filter(Boolean);

  const closeAll = () => {
    if (shouldShowFirstOpen || prompt) {
      dismissCountryChangePrompt();
    }
    onCloseManual?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adaptação Internacional e Geolocalização AIVAD"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
    >
      <Card className="w-full max-w-lg p-6 space-y-5 shadow-2xl border-blue-200 dark:border-blue-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-700 text-white shrink-0">
              <Globe2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                AIVAD Internacionalização Automática
              </p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                {prompt
                  ? `Detetada mudança de país: ${prompt.newCity} (${prompt.newCountryCode})`
                  : isUnsetLocation
                  ? 'Localização não detetada automaticamente — confirme país e cidade de operação.'
                  : `${translateUi(loc.languageCode, 'welcome_title')} Identificámos que está em ${loc.currentLocation.city}, ${loc.currentLocation.countryName}.`}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAll}
            aria-label="Fechar diálogo de localização"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              {loc.currentLocation.approxAddress}
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-500">
              {loc.currentLocation.detectedBy}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            {prompt
              ? prompt.reason
              : translateUi(loc.languageCode, 'market_preparing')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label htmlFor="loc-country-pick" className="block font-semibold mb-1">
              País de Operação / Visualização
            </label>
            <select
              id="loc-country-pick"
              value={selectedCountry}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedCountry(code);
                const c = state.countries.find((x) => x.code === code);
                const firstCity = c?.regions[0]?.cities[0] ?? c?.name ?? code;
                setSelectedCity(firstCity);
                simulateOrSelectLocation(code, firstCity, c?.regions[0]?.name);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
            >
              {state.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.currency} · {c.marketStatus})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="loc-city-pick" className="block font-semibold mb-1">
              Região / Cidade
            </label>
            <select
              id="loc-city-pick"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                simulateOrSelectLocation(selectedCountry, e.target.value);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-medium"
            >
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong>Separação Garantida:</strong> O seu país de residência (
            <strong>{loc.residenceCountryCode}</strong>) e mercado profissional principal (
            <strong>{loc.primaryProfessionalMarketCode}</strong>) permanecem intactos, e todas as
            viagens anteriores mantêm a moeda original.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => requestBrowserGeolocation()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Detetar GPS Navegador</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeAll}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Manter {loc.selectedMarketCode}
            </button>
            <button
              type="button"
              onClick={() => {
                confirmLocalMarket(selectedCountry);
                onCloseManual?.();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar e Adaptar ({selectedCountry})</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const LocationPillButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { state, activeMarket } = useEcosystem();
  const loc = state.localization.currentLocation;
  const isUnset = loc.countryCode === 'UNSET';
  const differs = !isUnset && loc.countryCode !== activeMarket.code;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Alterar país ou localização atual"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-600 transition-colors whitespace-nowrap"
    >
      <Compass className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
      <span>
        {isUnset ? `Mercado ${activeMarket.code}` : `${loc.city}, ${loc.countryCode}`}
      </span>
      <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
        {differs ? `· Merc. ${activeMarket.code} (${activeMarket.currency})` : `· ${activeMarket.currency}`}
      </span>
    </button>
  );
};
