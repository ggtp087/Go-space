import { districtSeeds } from './districts'
import { getSubDistrictParentId } from './subdistricts'

export type NearbySpace = {
  id: string
  name: string
  type: string
  distanceM: number
  districtId: string
}

const TEMPLATES = [
  { type: 'Urban park', namePrefix: 'Park' },
  { type: 'Urban forest', namePrefix: 'Park' },
  { type: 'Public plaza', namePrefix: 'Plaza' },
  { type: 'Playground', namePrefix: 'Playground' },
]

const nameCounters: Record<string, number> = {}
function nextName(prefix: string): string {
  nameCounters[prefix] = (nameCounters[prefix] ?? 0) + 1
  return `${prefix} ${nameCounters[prefix]}`
}

// Two generic public spaces per district, so both the Map's "Nearby public
// spaces" list and the header search have something to show for every area.
export const publicSpaces: NearbySpace[] = districtSeeds.flatMap((district, districtIndex) =>
  [0, 1].map((i) => {
    const globalIndex = districtIndex * 2 + i
    const template = TEMPLATES[globalIndex % TEMPLATES.length]
    return {
      id: `${district.id}-space-${i + 1}`,
      name: nextName(template.namePrefix),
      type: template.type,
      distanceM: 150 + ((globalIndex * 137) % 700),
      districtId: district.id,
    }
  }),
)

/** Nearby spaces for a district, or (falling back to its parent) a sub-district. */
export function getNearbySpaces(areaId: string): NearbySpace[] {
  const districtId = getSubDistrictParentId(areaId) ?? areaId
  return publicSpaces.filter((space) => space.districtId === districtId)
}
