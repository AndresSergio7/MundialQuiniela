import { hasFlag } from 'country-flag-icons';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

const FLAG_CDN_BASE = 'https://purecatamphetamine.github.io/country-flag-icons/3x2';
const FLAG_PNG_CDN_BASE = 'https://flagcdn.com/w40';

const ISO3_TO_FLAG_CODE: Record<string, string> = {
  MEX: 'MX', CRC: 'CR', ZAF: 'ZA', CAN: 'CA', BIH: 'BA', QAT: 'QA',
  SUI: 'CH', BRA: 'BR', MAR: 'MA', HTI: 'HT', SCO: 'GB-SCT', USA: 'US',
  URU: 'UY', ESP: 'ES', POR: 'PT', ARG: 'AR', POL: 'PL', FRA: 'FR',
  BEL: 'BE', AUS: 'AU', KOR: 'KR', GER: 'DE', JPN: 'JP', NED: 'NL',
  SEN: 'SN', ENG: 'GB-ENG', IRN: 'IR', ECU: 'EC', COL: 'CO', ITA: 'IT',
  PER: 'PE', CRO: 'HR', CIV: 'CI', DEN: 'DK', SRB: 'RS', CMR: 'CM',
  CHI: 'CL', GHA: 'GH', ALG: 'DZ', TUR: 'TR', EGY: 'EG', VEN: 'VE',
  PAR: 'PY', RSA: 'ZA', NZL: 'NZ', UKR: 'UA', COD: 'CD',
};

export function toCountryFlagCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  if (hasFlag(normalized)) return normalized;

  const mapped = ISO3_TO_FLAG_CODE[normalized];
  if (mapped && hasFlag(mapped)) return mapped;

  if (normalized.length === 2 && hasFlag(normalized)) return normalized;

  return null;
}

export function getCountryFlagSvgUrl(code: string) {
  const flagCode = toCountryFlagCode(code);
  if (!flagCode) return null;
  return `${FLAG_CDN_BASE}/${flagCode}.svg`;
}

// PNG via flagcdn.com — funciona en React Native mobile (no soporta SVG remoto)
// flagcdn solo acepta códigos ISO2 estándar, no variantes como GB-SCT
export function getCountryFlagPngUrl(code: string) {
  const flagCode = toCountryFlagCode(code);
  if (!flagCode || flagCode.includes('-')) return null;
  return `${FLAG_PNG_CDN_BASE}/${flagCode.toLowerCase()}.png`;
}

export function getCountryFlagFallback(code: string) {
  const flagCode = toCountryFlagCode(code);
  if (!flagCode) return '🏳️';

  if (flagCode.length === 2) {
    return getUnicodeFlagIcon(flagCode);
  }

  if (flagCode.startsWith('GB-')) {
    return getUnicodeFlagIcon('GB');
  }

  return '🏳️';
}