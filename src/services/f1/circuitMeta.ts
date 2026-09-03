/**
 * Static circuit metadata keyed by the provider's circuitId.
 *  - geo:   id in src/data/circuits.json (bacinger/f1-circuits) for the outline
 *  - laps:  scheduled race distance in laps
 *  - country: ISO 3166-1 alpha-2, for the flag component
 * Unknown circuits still render — they just skip the outline and lap count.
 */
export interface CircuitMeta {
  geo?: string;
  laps?: number;
  country: string;
}

export const CIRCUIT_META: Record<string, CircuitMeta> = {
  albert_park: { geo: 'au-1953', laps: 58, country: 'AU' },
  shanghai: { geo: 'cn-2004', laps: 56, country: 'CN' },
  suzuka: { geo: 'jp-1962', laps: 53, country: 'JP' },
  bahrain: { geo: 'bh-2002', laps: 57, country: 'BH' },
  jeddah: { geo: 'sa-2021', laps: 50, country: 'SA' },
  miami: { geo: 'us-2022', laps: 57, country: 'US' },
  imola: { geo: 'it-1953', laps: 63, country: 'IT' },
  monaco: { geo: 'mc-1929', laps: 78, country: 'MC' },
  catalunya: { geo: 'es-1991', laps: 66, country: 'ES' },
  villeneuve: { geo: 'ca-1978', laps: 70, country: 'CA' },
  red_bull_ring: { geo: 'at-1969', laps: 71, country: 'AT' },
  silverstone: { geo: 'gb-1948', laps: 52, country: 'GB' },
  spa: { geo: 'be-1925', laps: 44, country: 'BE' },
  hungaroring: { geo: 'hu-1986', laps: 70, country: 'HU' },
  zandvoort: { geo: 'nl-1948', laps: 72, country: 'NL' },
  monza: { geo: 'it-1922', laps: 53, country: 'IT' },
  madring: { geo: 'es-2026', laps: 57, country: 'ES' },
  baku: { geo: 'az-2016', laps: 51, country: 'AZ' },
  sepang: { geo: 'my-1999', laps: 56, country: 'MY' },
  marina_bay: { geo: 'sg-2008', laps: 62, country: 'SG' },
  americas: { geo: 'us-2012', laps: 56, country: 'US' },
  rodriguez: { geo: 'mx-1962', laps: 71, country: 'MX' },
  interlagos: { geo: 'br-1940', laps: 71, country: 'BR' },
  vegas: { geo: 'us-2023', laps: 50, country: 'US' },
  losail: { geo: 'qa-2004', laps: 57, country: 'QA' },
  yas_marina: { geo: 'ae-2009', laps: 58, country: 'AE' },
  hockenheimring: { geo: 'de-1932', laps: 67, country: 'DE' },
  nurburgring: { geo: 'de-1927', laps: 60, country: 'DE' },
  ricard: { geo: 'fr-1969', laps: 53, country: 'FR' },
  portimao: { geo: 'pt-2008', laps: 66, country: 'PT' },
  istanbul: { geo: 'tr-2005', laps: 58, country: 'TR' },
  sochi: { geo: 'ru-2014', laps: 53, country: 'RU' },
  mugello: { geo: 'it-1914', laps: 59, country: 'IT' },
};

/** Fallback when a circuit is not in the table: map the provider's country name to ISO. */
const COUNTRY_CODES: Record<string, string> = {
  australia: 'AU',
  china: 'CN',
  japan: 'JP',
  bahrain: 'BH',
  'saudi arabia': 'SA',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
  italy: 'IT',
  monaco: 'MC',
  spain: 'ES',
  canada: 'CA',
  austria: 'AT',
  uk: 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  belgium: 'BE',
  hungary: 'HU',
  netherlands: 'NL',
  azerbaijan: 'AZ',
  malaysia: 'MY',
  singapore: 'SG',
  mexico: 'MX',
  brazil: 'BR',
  qatar: 'QA',
  uae: 'AE',
  'united arab emirates': 'AE',
  germany: 'DE',
  france: 'FR',
  portugal: 'PT',
  turkey: 'TR',
  russia: 'RU',
  'south africa': 'ZA',
  argentina: 'AR',
  'korea': 'KR',
  india: 'IN',
  vietnam: 'VN',
};

export function getCircuitMeta(circuitId: string, countryName?: string): CircuitMeta {
  const known = CIRCUIT_META[circuitId];
  if (known) return known;
  const code = countryName ? COUNTRY_CODES[countryName.trim().toLowerCase()] : undefined;
  return { country: code ?? 'XX' };
}
