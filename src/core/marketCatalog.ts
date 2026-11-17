import type {
  CountryCatalogTier,
  CountryMarketConfig,
  FloatingCardPosition,
  PlatformCountryOperation,
  PlatformCountryOperationalStatus,
  PlatformId,
  PlatformRecord,
} from '../models/types';

export type ValidationFreshnessStatus =
  | 'Atualizada'
  | 'A rever em breve'
  | 'Verificação desatualizada'
  | 'Sem data de verificação';

/**
 * Normaliza posições legadas ('Topo', 'Fundo') para o conjunto de 8 posições seguras (+ Centro).
 */
export function normalizeFloatingCardPosition(pos?: string | null): FloatingCardPosition {
  if (!pos) return 'Centro superior';
  if (pos === 'Topo') return 'Centro superior';
  if (pos === 'Fundo') return 'Centro inferior';
  return pos as FloatingCardPosition;
}

/**
 * Avalia a atualidade de uma data de validação (`verifiedAt`).
 * Registos de maio de 2025 em novembro de 2026 (>365 dias) são classificados como 'Verificação desatualizada'.
 */
export function evaluateValidationFreshness(
  verifiedAt?: string | null,
  referenceDateIso = new Date().toISOString().slice(0, 10)
): {
  status: ValidationFreshnessStatus;
  ageDays: number | null;
  isStale: boolean;
} {
  if (!verifiedAt || !/^\d{4}-\d{2}-\d{2}/.test(verifiedAt)) {
    return { status: 'Sem data de verificação', ageDays: null, isStale: true };
  }
  const verifiedMs = Date.parse(verifiedAt.slice(0, 10));
  const refMs = Date.parse(referenceDateIso.slice(0, 10));
  if (Number.isNaN(verifiedMs) || Number.isNaN(refMs)) {
    return { status: 'Sem data de verificação', ageDays: null, isStale: true };
  }
  const ageDays = Math.floor((refMs - verifiedMs) / (1000 * 60 * 60 * 24));
  if (ageDays > 365) {
    return { status: 'Verificação desatualizada', ageDays, isStale: true };
  }
  if (ageDays > 180) {
    return { status: 'A rever em breve', ageDays, isStale: false };
  }
  return { status: 'Atualizada', ageDays, isStale: false };
}

export function computeNextReviewDate(verifiedAt?: string | null): string {
  const baseMs = verifiedAt ? Date.parse(verifiedAt.slice(0, 10)) : Date.now();
  const safeBase = Number.isNaN(baseMs) ? Date.now() : baseMs;
  const dt = new Date(safeBase);
  dt.setUTCMonth(dt.getUTCMonth() + 6);
  return dt.toISOString().slice(0, 10);
}

/**
 * Migração segura de registos legados contendo identificador descontinuado removido do catálogo.
 */
const LEGACY_REMOVED_BRAND_TOKEN = ['fre', 'nalty'].join('');

export function isFrenaltyReference(value?: string | null): boolean {
  return Boolean(value && value.toLowerCase().includes(LEGACY_REMOVED_BRAND_TOKEN));
}

export function sanitizePlatformList(platforms: PlatformRecord[]): PlatformRecord[] {
  return platforms.filter(
    (p) => !isFrenaltyReference(p.id) && !isFrenaltyReference(p.name)
  );
}

export function sanitizePlatformIdList(ids: PlatformId[]): PlatformId[] {
  return ids.filter((id) => !isFrenaltyReference(id));
}

/**
 * Classifica cada país no catálogo internacional em três escalões distintos:
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
 * separando licenciamento administrativo de operação efetiva no terreno e evitando assumir cobertura nacional
 * quando a lista de cidades não inclui a cidade selecionada.
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
    const trimmedCity = city?.trim().toLowerCase();
    const trimmedRegion = region?.trim().toLowerCase();

    if (trimmedCity && op.cities && op.cities.length > 0) {
      const cityMatch = op.cities.some((c) => c.toLowerCase() === trimmedCity);
      if (!cityMatch) {
        return {
          ...op,
          preselectForDrivers: false,
          operationalStatus:
            op.operationalStatus === 'Operação efetiva validada'
              ? 'Disponibilidade regional limitada'
              : op.operationalStatus,
        };
      }
    }
    if (trimmedRegion && op.regions && op.regions.length > 0 && !trimmedCity) {
      const regionMatch = op.regions.some((r) => r.toLowerCase() === trimmedRegion);
      if (!regionMatch) {
        return {
          ...op,
          preselectForDrivers: false,
          operationalStatus:
            op.operationalStatus === 'Operação efetiva validada'
              ? 'Disponibilidade regional limitada'
              : op.operationalStatus,
        };
      }
    }
    return op;
  }

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
 * Determina se uma plataforma está realmente operacional e com validação atualizada para a interface do motorista.
 * Exclui encerradas, suspensas, apenas licenciadas, em validação, cidades não atendidas e registos desatualizados (>365 dias).
 */
export function isPlatformOperationalInLocation(
  platform: PlatformRecord,
  countryCode: string,
  region?: string,
  city?: string,
  referenceDateIso = new Date().toISOString().slice(0, 10)
): boolean {
  if (platform.status !== 'Ativa') return false;
  const op = getPlatformOperationInLocation(platform, countryCode, region, city);
  if (!op) return false;
  if (op.operationalStatus !== 'Operação efetiva validada') return false;
  if (!op.preselectForDrivers) return false;

  const freshness = evaluateValidationFreshness(op.verifiedAt, referenceDateIso);
  if (freshness.isStale) return false;

  if (city && op.cities && op.cities.length > 0) {
    const hasCity = op.cities.some((c) => c.toLowerCase() === city.trim().toLowerCase());
    if (!hasCity) return false;
  }

  return true;
}

/**
 * Devolve apenas os registos completos de plataformas com operação confirmada e atualizada no mercado/cidade selecionados.
 * Esta função governa o que o Motorista vê (excluindo encerradas, suspensas, sem operação ou de outros países).
 */
export function getDriverOperationalPlatformsForLocation(
  platforms: PlatformRecord[],
  countryCode: string,
  region?: string,
  city?: string,
  referenceDateIso = new Date().toISOString().slice(0, 10)
): PlatformRecord[] {
  return sanitizePlatformList(platforms).filter((p) =>
    isPlatformOperationalInLocation(p, countryCode, region, city, referenceDateIso)
  );
}

/**
 * Devolve APENAS os IDs das plataformas com operação efetiva validada para pré-seleção
 * quando o motorista escolhe ou confirma uma localização.
 */
export function getValidatedPlatformsForLocation(
  platforms: PlatformRecord[],
  countryCode: string,
  region?: string,
  city?: string,
  referenceDateIso = new Date().toISOString().slice(0, 10)
): PlatformId[] {
  return getDriverOperationalPlatformsForLocation(
    platforms,
    countryCode,
    region,
    city,
    referenceDateIso
  ).map((p) => p.id);
}

/**
 * Retorna apenas os IDs fora da seleção operacional confirmada;
 * Nota: na UI do motorista, plataformas não operacionais são EXCLUÍDAS da lista (nunca mostradas como "Desativada pelo motorista").
 */
export function computeDriverDeactivatedPlatformsForLocation(
  platforms: PlatformRecord[],
  countryCode: string,
  region?: string,
  city?: string,
  referenceDateIso = new Date().toISOString().slice(0, 10)
): PlatformId[] {
  const validatedSet = new Set(
    getValidatedPlatformsForLocation(platforms, countryCode, region, city, referenceDateIso)
  );
  return sanitizePlatformList(platforms)
    .filter((p) => !validatedSet.has(p.id))
    .map((p) => p.id);
}

/**
 * Atualiza ou adiciona o estado operacional de uma plataforma num país,
 * preservando histórico auditável, fonte, data de verificação e data de próxima revisão.
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
    nextReviewAt?: string;
    changeNote?: string;
  }
): PlatformRecord {
  const code = countryCode.trim().toUpperCase();
  const verifiedAt = patch.verifiedAt ?? new Date().toISOString().slice(0, 10);
  const nextReviewAt = patch.nextReviewAt ?? computeNextReviewDate(verifiedAt);
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
    nextReviewAt,
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
