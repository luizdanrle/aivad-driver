import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Compass, Globe2, MapPin, Navigation, ShieldCheck, X } from 'lucide-react';
import { translateUi } from '../../core/localization';
import { useEcosystem } from '../../services/EcosystemContext';
import { Button, Card } from './DesignSystem';

export const LocalizationPromptOverlay: React.FC<{
  manualOpen?: boolean;
  onCloseManual?: () => void;
}> = ({ manualOpen = false, onCloseManual }) => {
  const prefersReducedMotion = useReducedMotion();
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
  // Never fire unsolicited modal on initial page load; open only on explicit click or detected country change
  const isVisible = manualOpen || Boolean(prompt);

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
  }, [
    isVisible,
    prompt?.newCountryCode,
    prompt?.newCity,
    loc.currentLocation.countryCode,
    loc.currentLocation.city,
    activeMarket,
  ]);

  const isUnsetLocation = loc.currentLocation.countryCode === 'UNSET';
  const targetCountryObj =
    state.countries.find((c) => c.code === selectedCountry) ?? activeMarket;
  const rawCities = targetCountryObj?.regions.flatMap((r) => r.cities) ?? [];
  const availableCities = rawCities.includes(selectedCity)
    ? rawCities
    : [selectedCity, ...rawCities].filter(Boolean);

  const closeAll = () => {
    if (prompt) {
      dismissCountryChangePrompt();
    }
    onCloseManual?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Adaptação Internacional e Geolocalização AIVAD"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-lg"
          >
            <Card className="rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl border-blue-200 dark:border-blue-900">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shrink-0 shadow-xs">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                      Internacionalização Inteligente AIVAD
                    </p>
                    <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 dark:text-white leading-snug">
                      {prompt
                        ? `Detetada mudança de país: ${prompt.newCity} (${prompt.newCountryCode})`
                        : isUnsetLocation
                        ? 'Confirme o país e a cidade da sua operação'
                        : `${translateUi(loc.languageCode, 'welcome_title')} Operação em ${loc.currentLocation.city}, ${loc.currentLocation.countryName}`}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAll}
                  aria-label="Fechar diálogo de localização"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131F36] border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    {loc.currentLocation.approxAddress}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    {loc.currentLocation.detectedBy}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {prompt ? prompt.reason : translateUi(loc.languageCode, 'market_preparing')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="loc-country-pick" className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
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
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] font-medium"
                  >
                    {state.countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.currency} · {c.marketStatus})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="loc-city-pick" className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
                    Região / Cidade
                  </label>
                  <select
                    id="loc-city-pick"
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      simulateOrSelectLocation(selectedCountry, e.target.value);
                    }}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1324] font-medium"
                  >
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Separação Garantida:</strong> O seu país de residência (
                  <strong>{loc.residenceCountryCode}</strong>) e mercado profissional principal (
                  <strong>{loc.primaryProfessionalMarketCode}</strong>) permanecem intactos, e todas as
                  viagens anteriores mantêm a moeda original.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => requestBrowserGeolocation()}
                  icon={<Navigation className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}
                >
                  Detetar GPS
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="neutral" size="sm" onClick={closeAll}>
                    Manter {loc.selectedMarketCode}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      confirmLocalMarket(selectedCountry);
                      onCloseManual?.();
                    }}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    Confirmar ({selectedCountry})
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
      className="min-h-[40px] max-w-full min-w-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131F36] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
    >
      <Compass className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
      <span className="truncate">
        {isUnset ? `Mercado ${activeMarket.code}` : `${loc.city}, ${loc.countryCode}`}
      </span>
      <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
        {differs ? `· ${activeMarket.code} (${activeMarket.currency})` : `· ${activeMarket.currency}`}
      </span>
    </button>
  );
};
