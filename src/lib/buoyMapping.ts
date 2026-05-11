// Per PRD §6.3 — maps each spot to its primary deep-water buoy + nearshore
// correction + NOAA CO-OPS tide station + NWS marine zone.

export interface BuoyMapping {
  spotId: string;
  primaryBuoy: string;
  secondaryBuoy?: string;
  tideStation: string;
  nwsZone: string;
}

export const BUOY_MAPPINGS: BuoyMapping[] = [
  // Region 1 — Sonoma
  { spotId: 'secrets',       primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  { spotId: 'timber-cove',   primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  { spotId: 'mystos',        primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  { spotId: 'russian-rivermouth', primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  { spotId: 'salmon-creek',  primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  { spotId: 'doran-beach',   primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  // Region 2 — Point Reyes / West Marin
  { spotId: 'point-reyes',   primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ545' },
  { spotId: 'drakes-estero', primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ545' },
  { spotId: 'dillon-beach',  primaryBuoy: '46013', tideStation: '9415020', nwsZone: 'PZZ540' },
  { spotId: 'bolinas-patch', primaryBuoy: '46026', secondaryBuoy: '46013', tideStation: '9414958', nwsZone: 'PZZ545' },
  { spotId: 'bolinas-jetty', primaryBuoy: '46026', secondaryBuoy: '46013', tideStation: '9414958', nwsZone: 'PZZ545' },
  { spotId: 'bolinas-groin', primaryBuoy: '46026', secondaryBuoy: '46013', tideStation: '9414958', nwsZone: 'PZZ545' },
  { spotId: 'stinson',       primaryBuoy: '46026', tideStation: '9414958', nwsZone: 'PZZ545' },
  // Region 3 — Marin Headlands / SF
  { spotId: 'muir-beach',    primaryBuoy: '46237', secondaryBuoy: '46026', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'rodeo',         primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'fort-point',    primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'deadmans',      primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'kellys-cove',   primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'ocean-beach-north', primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'ocean-beach',   primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  { spotId: 'ocean-beach-south', primaryBuoy: '46026', secondaryBuoy: '46237', tideStation: '9414290', nwsZone: 'PZZ545' },
  // Region 4 — San Mateo North
  { spotId: 'sharp-park',    primaryBuoy: '46026', secondaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'linda-mar',     primaryBuoy: '46026', secondaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'pedro-point',   primaryBuoy: '46026', secondaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'rockaway',      primaryBuoy: '46026', secondaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'montara',       primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'princeton',     primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'mavericks',     primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'francis-beach', primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  // Region 5 — Hwy 1 South
  { spotId: 'martins',       primaryBuoy: '46012', tideStation: '9413450', nwsZone: 'PZZ560' },
  { spotId: 'tunitas',       primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'san-gregorio',  primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'pomponio',      primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'pescadero',     primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'bean-hollow',   primaryBuoy: '46012', tideStation: '9414131', nwsZone: 'PZZ560' },
  { spotId: 'gazos',         primaryBuoy: '46012', tideStation: '9413745', nwsZone: 'PZZ560' },
  { spotId: 'ano-nuevo',     primaryBuoy: '46042', secondaryBuoy: '46012', tideStation: '9413450', nwsZone: 'PZZ560' },
  { spotId: 'waddell',       primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'scott-creek',   primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'davenport',     primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  // Region 6 — Santa Cruz
  { spotId: 'four-mile',     primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'steamer-lane',  primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'cowell',        primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'pleasure-point',primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'capitola',      primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
  { spotId: 'the-hook',      primaryBuoy: '46042', tideStation: '9413745', nwsZone: 'PZZ565' },
];

export const BUOY_MAP_BY_SPOT: Record<string, BuoyMapping> = Object.fromEntries(
  BUOY_MAPPINGS.map((m) => [m.spotId, m])
);
