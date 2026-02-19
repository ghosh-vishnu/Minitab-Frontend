/**
 * Region → Country mapping for Create Company form.
 * Select Region first, then Select Country shows only countries in that region.
 */
export interface RegionOption {
  id: string
  name: string
}

export interface CountryOption {
  id: string
  name: string
}

export const REGIONS: RegionOption[] = [
  { id: 'asia', name: 'Asia' },
  { id: 'europe', name: 'Europe' },
  { id: 'north-america', name: 'North America' },
  { id: 'south-america', name: 'South America' },
  { id: 'africa', name: 'Africa' },
  { id: 'oceania', name: 'Oceania' },
]

export const REGION_COUNTRIES: Record<string, CountryOption[]> = {
  asia: [
    { id: 'IN', name: 'India' },
    { id: 'CN', name: 'China' },
    { id: 'JP', name: 'Japan' },
    { id: 'KR', name: 'South Korea' },
    { id: 'SG', name: 'Singapore' },
    { id: 'MY', name: 'Malaysia' },
    { id: 'TH', name: 'Thailand' },
    { id: 'VN', name: 'Vietnam' },
    { id: 'ID', name: 'Indonesia' },
    { id: 'PK', name: 'Pakistan' },
    { id: 'BD', name: 'Bangladesh' },
    { id: 'AE', name: 'United Arab Emirates' },
    { id: 'SA', name: 'Saudi Arabia' },
  ],
  europe: [
    { id: 'GB', name: 'United Kingdom' },
    { id: 'DE', name: 'Germany' },
    { id: 'FR', name: 'France' },
    { id: 'IT', name: 'Italy' },
    { id: 'ES', name: 'Spain' },
    { id: 'NL', name: 'Netherlands' },
    { id: 'BE', name: 'Belgium' },
    { id: 'CH', name: 'Switzerland' },
    { id: 'AT', name: 'Austria' },
    { id: 'SE', name: 'Sweden' },
    { id: 'PL', name: 'Poland' },
  ],
  'north-america': [
    { id: 'US', name: 'United States' },
    { id: 'CA', name: 'Canada' },
    { id: 'MX', name: 'Mexico' },
  ],
  'south-america': [
    { id: 'BR', name: 'Brazil' },
    { id: 'AR', name: 'Argentina' },
    { id: 'CO', name: 'Colombia' },
    { id: 'CL', name: 'Chile' },
    { id: 'PE', name: 'Peru' },
  ],
  africa: [
    { id: 'ZA', name: 'South Africa' },
    { id: 'NG', name: 'Nigeria' },
    { id: 'EG', name: 'Egypt' },
    { id: 'KE', name: 'Kenya' },
    { id: 'MA', name: 'Morocco' },
  ],
  oceania: [
    { id: 'AU', name: 'Australia' },
    { id: 'NZ', name: 'New Zealand' },
  ],
}

export function getCountriesByRegionId(regionId: string): CountryOption[] {
  return REGION_COUNTRIES[regionId] ?? []
}

/**
 * Time zones by country (for Select Time Zone dropdown).
 * Country name must match the option value used in Select Country.
 */
export interface TimeZoneOption {
  value: string
  label: string
}

export const COUNTRY_TIMEZONES: Record<string, TimeZoneOption[]> = {
  India: [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  ],
  China: [
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  ],
  Japan: [
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  ],
  'South Korea': [
    { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)' },
  ],
  Singapore: [
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  ],
  Malaysia: [
    { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (MYT)' },
  ],
  Thailand: [
    { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT)' },
  ],
  Vietnam: [
    { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT)' },
  ],
  Indonesia: [
    { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
    { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA)' },
  ],
  Pakistan: [
    { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
  ],
  Bangladesh: [
    { value: 'Asia/Dhaka', label: 'Asia/Dhaka (BST)' },
  ],
  'United Arab Emirates': [
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  ],
  'Saudi Arabia': [
    { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST)' },
  ],
  'United Kingdom': [
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  ],
  Germany: [
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  ],
  France: [
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  ],
  Italy: [
    { value: 'Europe/Rome', label: 'Europe/Rome (CET)' },
  ],
  Spain: [
    { value: 'Europe/Madrid', label: 'Europe/Madrid (CET)' },
  ],
  Netherlands: [
    { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET)' },
  ],
  Belgium: [
    { value: 'Europe/Brussels', label: 'Europe/Brussels (CET)' },
  ],
  Switzerland: [
    { value: 'Europe/Zurich', label: 'Europe/Zurich (CET)' },
  ],
  Austria: [
    { value: 'Europe/Vienna', label: 'Europe/Vienna (CET)' },
  ],
  Sweden: [
    { value: 'Europe/Stockholm', label: 'Europe/Stockholm (CET)' },
  ],
  Poland: [
    { value: 'Europe/Warsaw', label: 'Europe/Warsaw (CET)' },
  ],
  'United States': [
    { value: 'America/New_York', label: 'America/New_York (ET)' },
    { value: 'America/Chicago', label: 'America/Chicago (CT)' },
    { value: 'America/Denver', label: 'America/Denver (MT)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  ],
  Canada: [
    { value: 'America/Toronto', label: 'America/Toronto (ET)' },
    { value: 'America/Vancouver', label: 'America/Vancouver (PT)' },
  ],
  Mexico: [
    { value: 'America/Mexico_City', label: 'America/Mexico_City (CST)' },
  ],
  Brazil: [
    { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  ],
  Argentina: [
    { value: 'America/Argentina/Buenos_Aires', label: 'America/Argentina/Buenos_Aires (ART)' },
  ],
  Colombia: [
    { value: 'America/Bogota', label: 'America/Bogota (COT)' },
  ],
  Chile: [
    { value: 'America/Santiago', label: 'America/Santiago (CLT)' },
  ],
  Peru: [
    { value: 'America/Lima', label: 'America/Lima (PET)' },
  ],
  'South Africa': [
    { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  ],
  Nigeria: [
    { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)' },
  ],
  Egypt: [
    { value: 'Africa/Cairo', label: 'Africa/Cairo (EET)' },
  ],
  Kenya: [
    { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  ],
  Morocco: [
    { value: 'Africa/Casablanca', label: 'Africa/Casablanca (WET)' },
  ],
  Australia: [
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
    { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST)' },
    { value: 'Australia/Perth', label: 'Australia/Perth (AWST)' },
  ],
  'New Zealand': [
    { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST)' },
  ],
}

export function getTimeZonesForCountry(countryName: string): TimeZoneOption[] {
  return COUNTRY_TIMEZONES[countryName] ?? []
}
