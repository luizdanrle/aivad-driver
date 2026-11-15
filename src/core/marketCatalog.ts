import type {
  CountryCatalogTier,
  CountryMarketConfig,
  PlatformCountryOperation,
  PlatformCountryOperationalStatus,
  PlatformId,
  PlatformRecord,
} from '../models/types';

/**
 * Classifica cada país no catálogo internacional em três escalões distintos (PARTE II):
 * 1. Mercado Oficialmente Ativo ('Disponível')
 * 2. País Configurado ('Em validação' | 'Em preparação')
 * 3. País Suportado ('Em estudo' | 'Não configurado' | 'Temporariamente indisponível' | 'Descontinuado')
 */
export function deriveCountryCatalogTier(country: CountryMarketConfig): CountryCatalogTier {
  if (country.catalogTier) return country.catalogTier;
  if (country.marketStatus === 'Disponível') {
    return 'Mercado Oficialmente Ativo';
  }
  if (country.marketStatus === 'Em validação' || country.marketStatus === 'Em preparação') {
    return 'País Configurado';
  }
  return 'País Suportado';
}

export function groupCountriesByCatalogTier(countries: CountryMarketConfig[]): {
  officiallyActive: CountryMarketConfig[];
  configured: CountryMarketConfig[];
  supported: CountryMarketConfig[];
} {
  const officiallyActive: CountryMarketConfig[] = [];
  const configured: CountryMarketConfig[] = [];
  const supported: CountryMarketConfig[] = [];

  for (const c of countries) {
    const tier = deriveCountryCatalogTier(c);
    if (tier === 'Mercado Oficialmente Ativo') officiallyActive.push(c);
    else if (tier === 'País Configurado') configured.push(c);
    else supported.push(c);
  }

  return { officiallyActive, configured, supported };
}

/**
 * Obtém o registo operacional real de uma plataforma num determinado país/região/cidade,
 * separando licenciamento administrativo de operação efetiva no terreno.
 */
export function getPlatformOperationInLocation(
  platform: PlatformRecord,
  countryCode: string,
  region?: string,
  city?: string
): PlatformCountryOperation | null {
  const normalizedCountry = countryCode.trim().toUpperCase();
  const op = platform.countryOperations?.find(
    (entry) => entry.countryCode.toUpperCase() === normalizedCountry
  );

  if (op) {
    if (city && op.cities && op.cities.length > 0) {
      const cityMatch = op.cities.some((c) => c.toLowerCase() === city.trim().toLowerCase());
      if (!cityMatch && op.operationalStatus === 'Disponibilidade regional limitada') {
        return {
          ...op,
          preselectForDrivers: false,
        };
      }
    }
    if (region && op.regions && op.regions.length > 0) {
      const regionMatch = op.regions.some((r) => r.toLowerCase() === region.trim().toLowerCase());
      if (!regionMatch && op.operationalStatus === 'Disponibilidade regional limitada') {
        return {
          ...op,
          preselectForDrivers: false,
        };
      }
    }
    return op;
  }

  // Fallback conservador quando uma plataforma é adicionada sem matriz detalhada por país:
  // nunca pré-seleciona automaticamente sem validação explícita de operação efetiva.
  if (platform.countryScope.map((c) => c.toUpperCase()).includes(normalizedCountry)) {
    const inferredStatus: PlatformCountryOperationalStatus =
      platform.status === 'Suspensa'
        ? 'Suspensa'
        : platform.status === 'Encerrada'
          ? 'Encerrada no país'
          : 'Em validação';
    return {
      countryCode: normalizedCountry,
      operationalStatus: inferredStatus,
      preselectForDrivers: false,
      validationSource: 'Catálogo administrativo (validação local pendente)',
      verifiedAt: '2025-05-01',
      history: [],
    };
  }

  return null;
}

/**
 * Devolve APENAS as plataformas com operação efetiva validada para pré-seleção
 * quando o motorista escolhe ou confirma uma localização (PARTE II).
 * - Licenciadas sem operação confirmada, suspensas ou encerradas no país NUNCA são pré-selecionadas.
 * - Plataformas encerradas num país (ex.: FREE NOW e Cabify em PT) permanecem intactas noutros mercados ativos.
 */
export function getValidatedPlatformsForLocation(
  platforms: PlatformRecord[],
  countryCode: string,
  region?: string,
  city?: string
): PlatformId[] {
  const validated: PlatformId[] = [];

  for (const p of platforms) {
    if (p.status !== 'Ativa') continue;
    const op = getPlatformOperationInLocation(p, countryCode, region, city);
    if (!op) continue;
    if (op.operationalStatus !== 'Operação efetiva validada') continue;
    if (!op.preselectForDrivers) continue;

    if (city && op.cities && op.cities.length > 0) {
      const hasCity = op.cities.some((c) => c.toLowerCase() === city.trim().toLowerCase());
      if (!hasCity) continue;
    }

    validated.push(p.id);
  }

  return validated;
}

/**
 * Calcula a lista de plataformas desativadas por omissão para o perfil do motorista
 * numa dada localização, garantindo que apenas as plataformas com operação validada
 * ficam ativas na seleção inicial.
 */
export function computeDriverDeactivatedPlatformsForLocation(
  platforms: PlatformRecord[],
  countryCode: string,
  region?: string,
  city?: string
): PlatformId[] {
  const validatedSet = new Set(getValidatedPlatformsForLocation(platforms, countryCode, region, city));
  return platforms.filter((p) => !validatedSet.has(p.id)).map((p) => p.id);
}

/**
 * Atualiza ou adiciona o estado operacional de uma plataforma num país,
 * preservando histórico auditável, fonte e data de verificação sem eliminar a marca globalmente.
 */
export function upsertPlatformCountryOperation(
  platform: PlatformRecord,
  countryCode: string,
  patch: {
    operationalStatus: PlatformCountryOperationalStatus;
    preselectForDrivers?: boolean;
    regions?: string[];
    cities?: string[];
    licensingNote?: string;
    validationSource: string;
    verifiedAt?: string;
    changeNote?: string;
  }
): PlatformRecord {
  const code = countryCode.trim().toUpperCase();
  const verifiedAt = patch.verifiedAt ?? new Date().toISOString().slice(0, 10);
  const existingList = platform.countryOperations ?? [];
  const existing = existingList.find((item) => item.countryCode.toUpperCase() === code);

  const preselect =
    patch.operationalStatus === 'Operação efetiva validada'
      ? (patch.preselectForDrivers ?? true)
      : false;

  const historyEntry = {
    date: verifiedAt,
    status: patch.operationalStatus,
    note:
      patch.changeNote ??
      `Estado atualizado pela administração para "${patch.operationalStatus}" (${patch.validationSource}).`,
  };

  const nextOp: PlatformCountryOperation = {
    countryCode: code,
    operationalStatus: patch.operationalStatus,
    regions: patch.regions ?? existing?.regions,
    cities: patch.cities ?? existing?.cities,
    preselectForDrivers: preselect,
    licensingNote: patch.licensingNote ?? existing?.licensingNote,
    validationSource: patch.validationSource,
    verifiedAt,
    history: [historyEntry, ...(existing?.history ?? [])].slice(0, 20),
  };

  const nextOperations = existing
    ? existingList.map((item) => (item.countryCode.toUpperCase() === code ? nextOp : item))
    : [...existingList, nextOp];

  const nextCountryScope = platform.countryScope.map((c) => c.toUpperCase()).includes(code)
    ? platform.countryScope
    : [...platform.countryScope, code];

  return {
    ...platform,
    countryScope: nextCountryScope,
    countryOperations: nextOperations,
  };
}
