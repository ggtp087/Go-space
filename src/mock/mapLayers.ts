export type MapLayer = {
  id: string
  label: string
  color: string
  variant: 'fill' | 'fill-soft' | 'outline' | 'outline-dashed'
  defaultOn: boolean
}

export const mapLayers: MapLayer[] = [
  { id: 'open-spaces', label: 'Public green & open spaces', color: '#2D6A4F', variant: 'fill', defaultOn: true },
  { id: 'service-areas', label: '400 m service areas', color: '#5CA97E', variant: 'fill-soft', defaultOn: true },
  { id: 'district-boundaries', label: 'District boundaries', color: '#4E5A52', variant: 'outline', defaultOn: true },
  { id: 'subdistrict-boundaries', label: 'Sub-district boundaries', color: '#889388', variant: 'outline-dashed', defaultOn: false },
  { id: 'street-network', label: 'Street network', color: '#8FB8D8', variant: 'fill', defaultOn: false },
  { id: 'population', label: 'Population', color: '#E08A2A', variant: 'fill', defaultOn: false },
]
