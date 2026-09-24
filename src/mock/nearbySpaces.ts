export type NearbySpace = {
  id: string
  name: string
  type: string
  distanceM: number
}

// Generic placeholder public spaces near the selected area.
export const nearbySpaces: NearbySpace[] = [
  { id: 'park-1', name: 'Park 1', type: 'Urban park', distanceM: 180 },
  { id: 'park-2', name: 'Park 2', type: 'Urban forest', distanceM: 640 },
  { id: 'plaza-1', name: 'Plaza 1', type: 'Public plaza', distanceM: 710 },
  { id: 'playground-1', name: 'Playground 1', type: 'Playground', distanceM: 890 },
]
