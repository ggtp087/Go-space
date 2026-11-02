import { opsTypeValues, type OpsType } from '../config/opsTypes'
import { getSubDistrictFeature, mockDistrictBoundaries } from './mapBoundaries'

export type NearbySpace = {
  id: string
  name: string
  type: OpsType
  distanceM: number
  districtId: string
}

// English-only placeholder names, same convention as opsPoints.ts's own
// per-type name prefix — display labels for the UI go through
// t.map.opsTypes instead of this.
const NAME_PREFIX_EN: Record<OpsType, string> = {
  open_space: 'Open Space',
  public_park: 'Public Park',
  park_15min: '15-Minute Park',
  sports_ground: 'Sports Ground',
}

const nameCounters: Record<OpsType, number> = { open_space: 0, public_park: 0, park_15min: 0, sports_ground: 0 }
function nextName(type: OpsType): string {
  nameCounters[type] += 1
  return `${NAME_PREFIX_EN[type]} ${nameCounters[type]}`
}

// Two generic public spaces per district, cycling through the 4 canonical
// open-space types, so both the Map's "Nearby public spaces" list and the
// header search have something to show for every area.
export const publicSpaces: NearbySpace[] = mockDistrictBoundaries.features.flatMap((district, districtIndex) =>
  [0, 1].map((i) => {
    const globalIndex = districtIndex * 2 + i
    const type = opsTypeValues[globalIndex % opsTypeValues.length]
    return {
      id: `${district.properties.id}-space-${i + 1}`,
      name: nextName(type),
      type,
      distanceM: 150 + ((globalIndex * 137) % 700),
      districtId: district.properties.id,
    }
  }),
)

/** Nearby spaces for a district, or (falling back to its parent) a sub-district. */
export function getNearbySpaces(areaId: string): NearbySpace[] {
  const districtId = getSubDistrictFeature(areaId)?.properties.district_id ?? areaId
  return publicSpaces.filter((space) => space.districtId === districtId)
}
