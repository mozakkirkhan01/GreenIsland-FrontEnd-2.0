/**
 * Single source of truth for agency branding + watermark defaults.
 *
 * This file was referenced (import { THEME_CONFIG } ...) from six places
 * in the codebase — header, footer, quotation-pdf-engine, back-cover — but
 * did not exist, so the PDF engine could not build at all. Values below are
 * modeled after the Green Island reference brochure supplied for this quote.
 *
 * "Dynamic" branding: nothing here is hardcoded into components. Every
 * value can be overridden per render via `PdfBuildContext.themeOverride`
 * (see quotation-pdf-engine.ts), so white-labeling this PDF for a different
 * agency — different name, logo, phone numbers, branch list, watermark
 * strength — is a data change at call time, not a code change.
 */

export interface BranchOffice {
  label: string;
  city: string;
}

export interface AgencyConfig {
  name: string;
  shortName: string;
  website: string;
  phone: string;
  email: string;
  headOffice: string;
  branchOffices: BranchOffice[];
}

export interface WatermarkConfig {
  enabled: boolean;
  fontSize: number;
  opacity: number;
  angle: number;
}

export interface ThemeConfig {
  agency: AgencyConfig;
  watermark: WatermarkConfig;
}

export const THEME_CONFIG: ThemeConfig = {
  agency: {
    name: 'Green Island Tours and Travels Private Limited',
    shortName: 'GREEN ISLAND',
    website: 'www.greenisland.in',
    phone: '03192-259457',
    email: 'santosh@greenisland.in',
    headOffice: 'Ram Narayan Building, 2nd Floor, Opp. Veterinary Gate, Dollygunj, Port Blair - 744103',
    branchOffices: [
      { label: 'Head Office', city: 'Port Blair' },
      { label: 'Branch Office', city: 'Mumbai | Delhi' },
      { label: 'Sales Team', city: 'Bangalore | Kolkata | Chennai | Raipur' },
    ],
  },
  watermark: {
    enabled: true,
    fontSize: 64,
    opacity: 0.06,
    angle: -35,
  },
};

/**
 * Nested-partial override shape: unlike `Partial<ThemeConfig>` (which still
 * requires a *full* AgencyConfig — including branchOffices — the moment you
 * touch `agency` at all), this lets a caller override just the handful of
 * fields it actually has dynamic data for (e.g. name/phone/email/website/
 * headOffice pulled from the Company table) while everything else quietly
 * falls back to THEME_CONFIG.
 */
export interface ThemeConfigOverride {
  agency?: Partial<AgencyConfig>;
  watermark?: Partial<WatermarkConfig>;
}

/**
 * Deep-merges a partial override onto the default THEME_CONFIG so callers
 * only need to specify the fields that differ (e.g. a different agency's
 * name + phone, leaving the watermark settings untouched).
 */
export function mergeThemeConfig(override?: ThemeConfigOverride | null): ThemeConfig {
  if (!override) return THEME_CONFIG;
  return {
    agency: { ...THEME_CONFIG.agency, ...override.agency },
    watermark: { ...THEME_CONFIG.watermark, ...override.watermark },
  };
}
