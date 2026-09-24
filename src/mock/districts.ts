import type { Year } from './years'

export type DistrictRow = {
  id: string
  year: Year
  name: string
  nameTh: string
  population: number
  accessibilityPct: number
  openSpaces: number
  opsSharePct: number
}

/** Color for a given accessibility percentage, on the 5-step scale. */
export function accessibilityColor(pct: number): string {
  if (pct >= 80) return '#2A7A54'
  if (pct >= 65) return '#7FB88F'
  if (pct >= 50) return '#D8D3A0'
  if (pct >= 30) return '#E4B064'
  return '#D9822B'
}

type DistrictSeed = Omit<DistrictRow, 'year'>

const districtSeeds2026: DistrictSeed[] = [
  { id: 'pathum-wan', name: 'Pathum Wan', nameTh: 'ปทุมวัน', population: 62000, accessibilityPct: 86, openSpaces: 9, opsSharePct: 14.8 },
  { id: 'bang-rak', name: 'Bang Rak', nameTh: 'บางรัก', population: 45000, accessibilityPct: 79, openSpaces: 6, opsSharePct: 11.9 },
  { id: 'watthana', name: 'Watthana', nameTh: 'วัฒนา', population: 79000, accessibilityPct: 76, openSpaces: 7, opsSharePct: 10.4 },
  { id: 'chatuchak', name: 'Chatuchak', nameTh: 'จตุจักร', population: 158000, accessibilityPct: 74, openSpaces: 8, opsSharePct: 13.2 },
  { id: 'huai-khwang', name: 'Huai Khwang', nameTh: 'ห้วยขวาง', population: 84000, accessibilityPct: 71, openSpaces: 5, opsSharePct: 9.1 },
  { id: 'khlong-toei', name: 'Khlong Toei', nameTh: 'คลองเตย', population: 96000, accessibilityPct: 61, openSpaces: 6, opsSharePct: 9.8 },
  { id: 'bang-kapi', name: 'Bang Kapi', nameTh: 'บางกะปิ', population: 146000, accessibilityPct: 49, openSpaces: 4, opsSharePct: 6.5 },
  { id: 'nong-khaem', name: 'Nong Khaem', nameTh: 'หนองแขม', population: 154000, accessibilityPct: 25, openSpaces: 2, opsSharePct: 3.4 },
  { id: 'min-buri', name: 'Min Buri', nameTh: 'มีนบุรี', population: 141000, accessibilityPct: 22, openSpaces: 2, opsSharePct: 3.1 },
  { id: 'nong-chok', name: 'Nong Chok', nameTh: 'หนองจอก', population: 172000, accessibilityPct: 12, openSpaces: 1, opsSharePct: 2.1 },
]

/** 2024 was an earlier sample year — slightly less coverage than 2026 for every district. */
function seedFor2024(seed: DistrictSeed): DistrictSeed {
  return {
    ...seed,
    accessibilityPct: Math.max(0, seed.accessibilityPct - 5),
    openSpaces: Math.max(0, seed.openSpaces - 1),
    opsSharePct: Math.round(seed.opsSharePct * 0.85 * 10) / 10,
  }
}

export const sampleDistrictRows: DistrictRow[] = [
  ...districtSeeds2026.map((seed) => ({ ...seed, year: 2026 as Year })),
  ...districtSeeds2026.map((seed) => ({ ...seedFor2024(seed), year: 2024 as Year })),
]

export function getDistrictRowsForYear(year: Year): DistrictRow[] {
  return sampleDistrictRows.filter((row) => row.year === year)
}

export function getDistrictRow(id: string, year: Year): DistrictRow | undefined {
  return sampleDistrictRows.find((row) => row.id === id && row.year === year)
}

export type ComparisonDistrict = {
  id: string
  name: string
  color: string
}

export const sampleComparisonDistricts: ComparisonDistrict[] = [
  { id: 'pathum-wan', name: 'Pathum Wan', color: '#1B4332' },
  { id: 'chatuchak', name: 'Chatuchak', color: '#3F8F63' },
  { id: 'nong-chok', name: 'Nong Chok', color: '#C2660F' },
]

export const sampleOpenSpaceTypes = ['All types', 'Parks', 'Urban forests', 'Playgrounds', 'Plazas', 'Sports fields']

export const sampleDistrictOptions = [
  { value: 'chatuchak', label: 'Chatuchak' },
  { value: 'pathum-wan', label: 'Pathum Wan' },
  { value: 'bang-rak', label: 'Bang Rak' },
  { value: 'watthana', label: 'Watthana' },
]
