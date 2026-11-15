import type {
  CountryMarketConfig,
  CurrencyCode,
  LocalizationProfile,
  UnitSystem,
} from '../models/types';

export const CURRENCY_META: Record<string, { symbol: string; decimals: number; locale: string }> = {
  EUR: { symbol: '€', decimals: 2, locale: 'pt-PT' },
  BRL: { symbol: 'R$', decimals: 2, locale: 'pt-BR' },
  GBP: { symbol: '£', decimals: 2, locale: 'en-GB' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  CHF: { symbol: 'CHF ', decimals: 2, locale: 'de-CH' },
  AOA: { symbol: 'Kz ', decimals: 2, locale: 'pt-AO' },
  CVE: { symbol: 'ECV ', decimals: 2, locale: 'pt-CV' },
  MXN: { symbol: 'MX$', decimals: 2, locale: 'es-MX' },
  CAD: { symbol: 'CA$', decimals: 2, locale: 'en-CA' },
  AUD: { symbol: 'A$', decimals: 2, locale: 'en-AU' },
};

export interface GeoBoundingRegion {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  approxAddress: string;
  timezone: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export const GLOBAL_GEO_BOUNDING_REGIONS: GeoBoundingRegion[] = [
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    region: 'Área Metropolitana de Lisboa',
    city: 'Lisboa',
    approxAddress: 'Avenida da Liberdade / Marquês de Pombal, Lisboa',
    timezone: 'Europe/Lisbon',
    latMin: 38.55,
    latMax: 39.05,
    lonMin: -9.5,
    lonMax: -8.75,
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    region: 'Área Metropolitana do Porto',
    city: 'Porto',
    approxAddress: 'Boavista / Aliados, Porto',
    timezone: 'Europe/Lisbon',
    latMin: 40.95,
    latMax: 41.4,
    lonMin: -8.85,
    lonMax: -8.35,
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    region: 'Algarve',
    city: 'Faro',
    approxAddress: 'Aeroporto de Faro / Baixa, Faro',
    timezone: 'Europe/Lisbon',
    latMin: 36.95,
    latMax: 37.35,
    lonMin: -8.98,
    lonMax: -7.4,
  },
  {
    countryCode: 'ES',
    countryName: 'Espanha',
    region: 'Comunidad de Madrid',
    city: 'Madrid',
    approxAddress: 'Paseo de la Castellana / Atocha, Madrid',
    timezone: 'Europe/Madrid',
    latMin: 40.25,
    latMax: 40.6,
    lonMin: -3.9,
    lonMax: -3.45,
  },
  {
    countryCode: 'ES',
    countryName: 'Espanha',
    region: 'Cataluña',
    city: 'Barcelona',
    approxAddress: 'Eixample / El Prat, Barcelona',
    timezone: 'Europe/Madrid',
    latMin: 41.25,
    latMax: 41.55,
    lonMin: 1.95,
    lonMax: 2.35,
  },
  {
    countryCode: 'BR',
    countryName: 'Brasil',
    region: 'São Paulo',
    city: 'São Paulo',
    approxAddress: 'Av. Paulista / Pinheiros, São Paulo',
    timezone: 'America/Sao_Paulo',
    latMin: -23.85,
    latMax: -23.35,
    lonMin: -46.85,
    lonMax: -46.35,
  },
  {
    countryCode: 'BR',
    countryName: 'Brasil',
    region: 'Rio de Janeiro',
    city: 'Rio de Janeiro',
    approxAddress: 'Centro / Copacabana, Rio de Janeiro',
    timezone: 'America/Sao_Paulo',
    latMin: -23.1,
    latMax: -22.75,
    lonMin: -43.65,
    lonMax: -43.1,
  },
  {
    countryCode: 'FR',
    countryName: 'França',
    region: 'Île-de-France',
    city: 'Paris',
    approxAddress: 'Gare du Nord / Champs-Élysées, Paris',
    timezone: 'Europe/Paris',
    latMin: 48.72,
    latMax: 49.02,
    lonMin: 2.15,
    lonMax: 2.55,
  },
  {
    countryCode: 'UK',
    countryName: 'Reino Unido',
    region: 'Greater London',
    city: 'Londres',
    approxAddress: 'Westminster / Canary Wharf, Londres',
    timezone: 'Europe/London',
    latMin: 51.35,
    latMax: 51.68,
    lonMin: -0.45,
    lonMax: 0.2,
  },
  {
    countryCode: 'DE',
    countryName: 'Alemanha',
    region: 'Berlin',
    city: 'Berlim',
    approxAddress: 'Mitte / Alexanderplatz, Berlim',
    timezone: 'Europe/Berlin',
    latMin: 52.38,
    latMax: 52.65,
    lonMin: 13.15,
    lonMax: 13.65,
  },
  {
    countryCode: 'US',
    countryName: 'Estados Unidos',
    region: 'New York',
    city: 'Nova Iorque',
    approxAddress: 'Midtown Manhattan, New York',
    timezone: 'America/New_York',
    latMin: 40.55,
    latMax: 40.92,
    lonMin: -74.1,
    lonMax: -73.75,
  },
  {
    countryCode: 'AO',
    countryName: 'Angola',
    region: 'Luanda',
    city: 'Luanda',
    approxAddress: 'Ingombota / Talatona, Luanda',
    timezone: 'Africa/Luanda',
    latMin: -9.05,
    latMax: -8.7,
    lonMin: 13.1,
    lonMax: 13.4,
  },
];

export function getTodayIso(referenceDate = new Date()): string {
  return referenceDate.toISOString().slice(0, 10);
}

export function daysAgoIso(daysAgo: number, referenceDate = new Date()): string {
  const d = new Date(referenceDate.getTime() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

export function daysFromNowIso(daysAhead: number, referenceDate = new Date()): string {
  const d = new Date(referenceDate.getTime() + daysAhead * 86400000);
  return d.toISOString().slice(0, 10);
}

export function getCurrentMonthLabel(referenceDate = new Date(), locale = 'pt-PT'): string {
  try {
    const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(referenceDate);
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return referenceDate.toISOString().slice(0, 7);
  }
}

export function buildUnavailableLocation(
  reason = 'Localização automática indisponível. Selecione manualmente país e cidade.'
): {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  approxAddress: string;
  timezone: string;
} {
  return {
    countryCode: 'UNSET',
    countryName: 'Localização não detetada',
    region: 'Não detetada',
    city: 'Não detetada',
    approxAddress: reason,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

export function resolveLocationFromCoordinates(
  latitude: number,
  longitude: number
): {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  approxAddress: string;
  timezone: string;
} {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return buildUnavailableLocation('Coordenadas inválidas ou indisponíveis.');
  }

  const exact = GLOBAL_GEO_BOUNDING_REGIONS.find(
    (b) =>
      latitude >= b.latMin &&
      latitude <= b.latMax &&
      longitude >= b.lonMin &&
      longitude <= b.lonMax
  );
  if (exact) {
    return {
      countryCode: exact.countryCode,
      countryName: exact.countryName,
      region: exact.region,
      city: exact.city,
      approxAddress: exact.approxAddress,
      timezone: exact.timezone,
    };
  }

  if (latitude >= 36.8 && latitude <= 42.2 && longitude >= -9.6 && longitude <= -6.1) {
    return {
      countryCode: 'PT',
      countryName: 'Portugal',
      region: 'Portugal Continental',
      city: 'Lisboa',
      approxAddress: `Coordenadas aproximadas (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      timezone: 'Europe/Lisbon',
    };
  }
  if (latitude >= -33.7 && latitude <= 5.3 && longitude >= -73.9 && longitude <= -34.7) {
    return {
      countryCode: 'BR',
      countryName: 'Brasil',
      region: 'Território Nacional',
      city: 'São Paulo',
      approxAddress: `Coordenadas aproximadas (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      timezone: 'America/Sao_Paulo',
    };
  }
  if (latitude >= 36.0 && latitude <= 43.8 && longitude >= -9.3 && longitude <= 4.3) {
    return {
      countryCode: 'ES',
      countryName: 'Espanha',
      region: 'Península Ibérica',
      city: 'Madrid',
      approxAddress: `Coordenadas aproximadas (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      timezone: 'Europe/Madrid',
    };
  }
  if (latitude >= 49.9 && latitude <= 58.7 && longitude >= -8.2 && longitude <= 1.8) {
    return {
      countryCode: 'UK',
      countryName: 'Reino Unido',
      region: 'Great Britain',
      city: 'Londres',
      approxAddress: `Coordenadas aproximadas (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      timezone: 'Europe/London',
    };
  }

  // Never fabricate "US / Nova Iorque" when coordinates fall outside known geo boxes
  return {
    countryCode: 'UNSET',
    countryName: 'Localização não detetada',
    region: 'Zona fora dos mercados mapeados',
    city: `Coordenadas (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
    approxAddress: `Localização GPS fora dos mercados pré-mapeados (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
    timezone: 'UTC',
  };
}

export function detectFallbackLocation(
  browserLanguage = '',
  timezone = ''
): {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  approxAddress: string;
  timezone: string;
} {
  const tz = timezone.toLowerCase();
  const lang = browserLanguage.toLowerCase();

  if (tz.includes('sao_paulo') || tz.includes('fortaleza') || tz.includes('recife') || lang.includes('pt-br')) {
    return {
      countryCode: 'BR',
      countryName: 'Brasil',
      region: 'São Paulo',
      city: 'São Paulo',
      approxAddress: 'Localização aproximada por fuso/idioma (Av. Paulista, São Paulo)',
      timezone: timezone || 'America/Sao_Paulo',
    };
  }
  if (tz.includes('madrid') || lang.startsWith('es')) {
    return {
      countryCode: 'ES',
      countryName: 'Espanha',
      region: 'Comunidad de Madrid',
      city: 'Madrid',
      approxAddress: 'Localização aproximada por fuso/idioma (Centro, Madrid)',
      timezone: timezone || 'Europe/Madrid',
    };
  }
  if (tz.includes('london') || lang.includes('en-gb')) {
    return {
      countryCode: 'UK',
      countryName: 'Reino Unido',
      region: 'Greater London',
      city: 'Londres',
      approxAddress: 'Localização aproximada por fuso/idioma (Central London)',
      timezone: timezone || 'Europe/London',
    };
  }
  if (tz.includes('paris') || lang.startsWith('fr')) {
    return {
      countryCode: 'FR',
      countryName: 'França',
      region: 'Île-de-France',
      city: 'Paris',
      approxAddress: 'Localização aproximada por fuso/idioma (Paris)',
      timezone: timezone || 'Europe/Paris',
    };
  }
  if (tz.includes('new_york') || tz.includes('los_angeles') || tz.includes('chicago') || lang.includes('en-us')) {
    return {
      countryCode: 'US',
      countryName: 'Estados Unidos',
      region: 'New York',
      city: 'Nova Iorque',
      approxAddress: 'Localização aproximada por fuso/idioma (New York)',
      timezone: timezone || 'America/New_York',
    };
  }
  if (tz.includes('luanda') || lang.includes('pt-ao')) {
    return {
      countryCode: 'AO',
      countryName: 'Angola',
      region: 'Luanda',
      city: 'Luanda',
      approxAddress: 'Localização aproximada por fuso/idioma (Luanda)',
      timezone: timezone || 'Africa/Luanda',
    };
  }
  if (tz.includes('lisbon') || lang.includes('pt-pt') || lang === 'pt') {
    return {
      countryCode: 'PT',
      countryName: 'Portugal',
      region: 'Área Metropolitana de Lisboa',
      city: 'Lisboa',
      approxAddress: 'Localização aproximada por fuso/idioma (Lisboa, Portugal)',
      timezone: timezone || 'Europe/Lisbon',
    };
  }

  return buildUnavailableLocation(
    'Fuso horário ou idioma sem correspondência automática. Selecione país e cidade manualmente.'
  );
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'EUR',
  _locale?: string
): string {
  const meta = CURRENCY_META[currency] ?? { symbol: `${currency} `, decimals: 2, locale: 'pt-PT' };
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(meta.decimals);
  const formatted = currency === 'EUR' || currency === 'BRL' ? fixed.replace('.', ',') : fixed;
  const sign = amount < 0 ? '-' : '';
  return `${sign}${meta.symbol}${formatted}`;
}

export function formatHistoricalMoney(
  amountBaseEur: number,
  originalAmount?: number,
  originalCurrency?: CurrencyCode,
  activeDisplayCurrency: CurrencyCode = 'EUR'
): string {
  if (originalCurrency && originalAmount !== undefined) {
    if (originalCurrency === activeDisplayCurrency) {
      return formatMoney(originalAmount, originalCurrency);
    }
    return `${formatMoney(originalAmount, originalCurrency)} (hist. original)`;
  }
  return formatMoney(amountBaseEur, activeDisplayCurrency);
}

export function formatDistance(km: number, unitSystem: UnitSystem = 'metric'): string {
  if (unitSystem === 'imperial') {
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDistanceRate(
  amountPerKm: number,
  currency: CurrencyCode = 'EUR',
  unitSystem: UnitSystem = 'metric'
): string {
  if (unitSystem === 'imperial') {
    const perMile = amountPerKm / 0.621371;
    return `${formatMoney(perMile, currency)}/mi`;
  }
  return `${formatMoney(amountPerKm, currency)}/km`;
}

export function evaluateCountryChange(
  profile: LocalizationProfile,
  newCountryCode: string,
  newCity: string,
  newRegion: string,
  countries: CountryMarketConfig[]
): {
  nextProfile: LocalizationProfile;
  marketFound?: CountryMarketConfig;
  requiresConfirmationPrompt: boolean;
  historicalCurrencyPreserved: true;
  professionalProfilePreserved: true;
} {
  const market = countries.find((c) => c.code === newCountryCode);
  const countryChanged = newCountryCode !== profile.selectedMarketCode;

  const updatedLocation = {
    ...profile.currentLocation,
    countryCode: newCountryCode,
    countryName: market?.name ?? newCountryCode,
    region: newRegion,
    city: newCity,
    timezone: market?.timezone ?? profile.currentLocation.timezone,
    detectedAt: new Date().toISOString(),
  };

  if (!countryChanged) {
    return {
      nextProfile: {
        ...profile,
        currentLocation: updatedLocation,
        pendingCountryChangePrompt: null,
      },
      marketFound: market,
      requiresConfirmationPrompt: false,
      historicalCurrencyPreserved: true,
      professionalProfilePreserved: true,
    };
  }

  return {
    nextProfile: {
      ...profile,
      currentLocation: updatedLocation,
      // IMPORTANT: NEVER mutate residenceCountryCode or primaryProfessionalMarketCode automatically
      pendingCountryChangePrompt: {
        newCountryCode,
        newCity,
        newRegion,
        reason: `Localização atual alterada para ${newCity} (${market?.name ?? newCountryCode}). O seu perfil profissional (${profile.primaryProfessionalMarketCode}) e o histórico financeiro na moeda original serão preservados.`,
      },
    },
    marketFound: market,
    requiresConfirmationPrompt: true,
    historicalCurrencyPreserved: true,
    professionalProfilePreserved: true,
  };
}

export function confirmLocalMarketAdaptation(
  profile: LocalizationProfile,
  targetCountryCode: string,
  countries: CountryMarketConfig[]
): LocalizationProfile {
  const market = countries.find((c) => c.code === targetCountryCode);
  return {
    ...profile,
    selectedMarketCode: targetCountryCode,
    languageCode: market?.languageCode ?? profile.languageCode,
    unitSystem: market?.unitSystem ?? profile.unitSystem,
    firstOpenConfirmed: true,
    pendingCountryChangePrompt: null,
  };
}

const I18N_DICT: Record<string, Record<string, string>> = {
  'pt-PT': {
    nav_home: 'Início',
    nav_ops: 'Operação',
    nav_tacho: 'Tacógrafo',
    nav_reports: 'Relatórios',
    nav_profile: 'Perfil',
    welcome_title: 'Bem-vindo ao AIVAD!',
    market_preparing: 'Estamos a preparar a sua experiência para este mercado.',
    confirm_market: 'Confirmar localização',
    correct_market: 'Alterar país / cidade',
    gross_earnings: 'Ganhos Brutos',
    net_estimated: 'Líquido Estimado',
    tachograph_title: 'Tacógrafo TVDE Auditável',
  },
  'pt-BR': {
    nav_home: 'Início',
    nav_ops: 'Operação',
    nav_tacho: 'Tacógrafo',
    nav_reports: 'Relatórios',
    nav_profile: 'Perfil',
    welcome_title: 'Bem-vindo ao AIVAD!',
    market_preparing: 'Estamos preparando sua experiência para este mercado.',
    confirm_market: 'Confirmar localização',
    correct_market: 'Alterar país / cidade',
    gross_earnings: 'Ganhos Brutos',
    net_estimated: 'Líquido Estimado',
    tachograph_title: 'Tacógrafo Digital de Jornada',
  },
  'en-GB': {
    nav_home: 'Home',
    nav_ops: 'Operations',
    nav_tacho: 'Tachograph',
    nav_reports: 'Reports',
    nav_profile: 'Profile',
    welcome_title: 'Welcome to AIVAD!',
    market_preparing: 'Preparing your local compliance, currency and market rules.',
    confirm_market: 'Confirm location',
    correct_market: 'Change country / city',
    gross_earnings: 'Gross Earnings',
    net_estimated: 'Estimated Net',
    tachograph_title: 'Auditable Driver Tachograph',
  },
  'es-ES': {
    nav_home: 'Inicio',
    nav_ops: 'Operación',
    nav_tacho: 'Tacógrafo',
    nav_reports: 'Informes',
    nav_profile: 'Perfil',
    welcome_title: '¡Bienvenido a AIVAD!',
    market_preparing: 'Estamos preparando tu experiencia para este mercado.',
    confirm_market: 'Confirmar ubicación',
    correct_market: 'Cambiar país / ciudad',
    gross_earnings: 'Ingresos Brutos',
    net_estimated: 'Neto Estimado',
    tachograph_title: 'Tacógrafo Digital VTC',
  },
  'fr-FR': {
    nav_home: 'Accueil',
    nav_ops: 'Opération',
    nav_tacho: 'Tachygraphe',
    nav_reports: 'Rapports',
    nav_profile: 'Profil',
    welcome_title: 'Bienvenue sur AIVAD !',
    market_preparing: 'Préparation de votre expérience locale et devise.',
    confirm_market: 'Confirmer la position',
    correct_market: 'Changer de pays / ville',
    gross_earnings: 'Revenus Bruts',
    net_estimated: 'Net Estimé',
    tachograph_title: 'Tachygraphe Numérique VTC',
  },
};

export function translateUi(languageCode: string, key: string): string {
  const exact = I18N_DICT[languageCode]?.[key];
  if (exact) return exact;
  const prefix = languageCode.split('-')[0];
  const fallbackLang =
    prefix === 'en'
      ? 'en-GB'
      : prefix === 'es'
      ? 'es-ES'
      : prefix === 'fr'
      ? 'fr-FR'
      : 'pt-PT';
  return I18N_DICT[fallbackLang]?.[key] ?? I18N_DICT['pt-PT'][key] ?? key;
}
