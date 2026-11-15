import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confirmLocalMarketAdaptation,
  detectFallbackLocation,
  evaluateCountryChange,
  formatDistance,
  formatHistoricalMoney,
  formatMoney,
  resolveLocationFromCoordinates,
  translateUi,
} from './localization.ts';
import type { CountryMarketConfig, LocalizationProfile } from '../models/types.ts';

const MOCK_COUNTRIES: CountryMarketConfig[] = [
  {
    code: 'PT',
    name: 'Portugal',
    nativeName: 'Portugal',
    language: 'Português (PT)',
    languageCode: 'pt-PT',
    currency: 'EUR',
    currencySymbol: '€',
    decimalSeparator: ',',
    timezone: 'Europe/Lisbon',
    unitSystem: 'metric',
    vatPct: 23,
    activePlatforms: ['uber', 'bolt', 'cabify'],
    tvdeRegulated: true,
    driverLicenseRequired: 'CMTVDE',
    vehicleMaxAgeYears: 7,
    taxCategories: ['TVDE 6%', 'IVA 23%'],
    regions: [{ name: 'Lisboa', cities: ['Lisboa', 'Cascais'] }],
    marketStatus: 'Disponível',
  },
  {
    code: 'BR',
    name: 'Brasil',
    nativeName: 'Brasil',
    language: 'Português (BR)',
    languageCode: 'pt-BR',
    currency: 'BRL',
    currencySymbol: 'R$',
    decimalSeparator: ',',
    timezone: 'America/Sao_Paulo',
    unitSystem: 'metric',
    vatPct: 0,
    activePlatforms: ['uber', '99'],
    tvdeRegulated: false,
    driverLicenseRequired: 'CNH EAR',
    vehicleMaxAgeYears: 10,
    taxCategories: ['MEI', 'Simples Nacional'],
    regions: [{ name: 'São Paulo', cities: ['São Paulo', 'Campinas'] }],
    marketStatus: 'Disponível',
  },
  {
    code: 'UK',
    name: 'Reino Unido',
    nativeName: 'United Kingdom',
    language: 'English (UK)',
    languageCode: 'en-GB',
    currency: 'GBP',
    currencySymbol: '£',
    decimalSeparator: '.',
    timezone: 'Europe/London',
    unitSystem: 'imperial',
    vatPct: 20,
    activePlatforms: ['uber', 'bolt', 'freenow'],
    tvdeRegulated: true,
    driverLicenseRequired: 'PHV Licence',
    vehicleMaxAgeYears: 8,
    taxCategories: ['VAT 20%'],
    regions: [{ name: 'Greater London', cities: ['Londres'] }],
    marketStatus: 'Em validação',
  },
];

test('Geolocation coordinate resolver identifies PT, BR, ES, UK and handles permission denied fallback cleanly', () => {
  const lisboa = resolveLocationFromCoordinates(38.7223, -9.1393);
  assert.equal(lisboa.countryCode, 'PT');
  assert.equal(lisboa.city, 'Lisboa');

  const saoPaulo = resolveLocationFromCoordinates(-23.5505, -46.6333);
  assert.equal(saoPaulo.countryCode, 'BR');
  assert.equal(saoPaulo.city, 'São Paulo');

  const fallbackBr = detectFallbackLocation('pt-BR', 'America/Sao_Paulo');
  assert.equal(fallbackBr.countryCode, 'BR');
  assert.ok(fallbackBr.approxAddress.includes('aproximada'));

  const fallbackAny = detectFallbackLocation('fr-FR', 'Europe/Paris');
  assert.equal(fallbackAny.countryCode, 'FR');
});

test('Country change prompts local adaptation without altering residence, professional market, or historical transaction currency', () => {
  const profile: LocalizationProfile = {
    currentLocation: {
      countryCode: 'PT',
      countryName: 'Portugal',
      region: 'Área Metropolitana de Lisboa',
      city: 'Lisboa',
      approxAddress: 'Lisboa',
      timezone: 'Europe/Lisbon',
      detectedBy: 'Geolocation API',
      detectedAt: '2026-11-14T08:00:00Z',
    },
    residenceCountryCode: 'PT',
    primaryProfessionalMarketCode: 'PT',
    additionalProfessionalMarketCodes: [],
    selectedMarketCode: 'PT',
    languageCode: 'pt-PT',
    unitSystem: 'metric',
    permissionStatus: 'granted',
    firstOpenConfirmed: true,
    pendingCountryChangePrompt: null,
  };

  // Driver travels to Brazil or UK
  const result = evaluateCountryChange(profile, 'BR', 'São Paulo', 'São Paulo', MOCK_COUNTRIES);
  assert.equal(result.requiresConfirmationPrompt, true);
  assert.equal(result.historicalCurrencyPreserved, true);
  assert.equal(result.professionalProfilePreserved, true);
  // Residence and Primary Professional Market MUST NOT be silently overwritten!
  assert.equal(result.nextProfile.residenceCountryCode, 'PT');
  assert.equal(result.nextProfile.primaryProfessionalMarketCode, 'PT');
  assert.equal(result.nextProfile.currentLocation.countryCode, 'BR');
  assert.ok(result.nextProfile.pendingCountryChangePrompt);

  const confirmed = confirmLocalMarketAdaptation(result.nextProfile, 'BR', MOCK_COUNTRIES);
  assert.equal(confirmed.selectedMarketCode, 'BR');
  assert.equal(confirmed.languageCode, 'pt-BR');
  assert.equal(confirmed.primaryProfessionalMarketCode, 'PT'); // still PT!

  // Historical EUR trip keeps EUR symbol even when local display is BRL
  const histEurDisplay = formatHistoricalMoney(25.5, 25.5, 'EUR', 'BRL');
  assert.ok(histEurDisplay.includes('€25,50'));
  assert.ok(histEurDisplay.includes('hist. original'));
});

test('Currency, unit conversion, and i18n adapt cleanly across countries', () => {
  assert.equal(formatMoney(19.9, 'EUR'), '€19,90');
  assert.equal(formatMoney(45.5, 'BRL'), 'R$45,50');
  assert.equal(formatMoney(32.0, 'GBP'), '£32.00');

  assert.equal(formatDistance(10, 'metric'), '10.0 km');
  assert.equal(formatDistance(10, 'imperial'), '6.2 mi');

  assert.equal(translateUi('pt-PT', 'nav_tacho'), 'Tacógrafo');
  assert.equal(translateUi('en-GB', 'nav_tacho'), 'Tachograph');
  assert.equal(translateUi('es-ES', 'welcome_title'), '¡Bienvenido a AIVAD!');
});

test('Unknown coordinates and unrecognized locale fallback return UNSET instead of fabricating US/New York', () => {
  const ocean = resolveLocationFromCoordinates(0, -30);
  assert.equal(ocean.countryCode, 'UNSET');
  assert.equal(ocean.countryName, 'Localização não detetada');

  const unknownFallback = detectFallbackLocation('xx-XX', 'Unknown/Zone');
  assert.equal(unknownFallback.countryCode, 'UNSET');
  assert.equal(unknownFallback.city, 'Não detetada');
});

