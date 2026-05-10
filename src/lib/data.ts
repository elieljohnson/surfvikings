// Surf Vikings — data layer
// Spot registry, scoring engine, and synthetic 48hr timelines.
// Scoring model matches the PRD: direction (30) + period (20) + size (15)
// + wind direction (15) + wind speed penalty + tide (10) + tide-direction bonus
// + special modifiers (e.g., Bolinas Groin lagoon rip).

export type RegionId =
  | 'sonoma'
  | 'pt-reyes'
  | 'marin'
  | 'sf'
  | 'sm-north'
  | 'sm-south'
  | 'sc';

export interface BathymetryProfile {
  label: string;
  depth: number[];
  distance: number[];
}

// Per-spot scoring quirks that don't fit the generic model. Add new kinds
// here as they come up (Tomales outflow at Dillon, Sloat rip at OB, etc.).
export type SpecialRule =
  | {
      /** Falling tide creates a strong outbound rip below `below` ft.
       *  Applies a `penalty` to the score and pins tide-quality near zero. */
      kind: 'falling-tide-rip';
      below: number;
      penalty: number;
    };

export interface Spot {
  id: string;
  region: RegionId;
  regionLabel: string;
  name: string;
  subtitle: string;
  difficulty: number;
  type: string;
  bottom: string;
  optimalSwell: number;
  optimalSize: [number, number];
  optimalPeriod: [number, number];
  offshore: number;
  optimalTide: 'low' | 'mid' | 'high' | 'rising';
  lat: number;
  lng: number;
  /** Fallback estimate (mins). Overridden at runtime by useDriveTimes once
   * the user's home base is geocoded and the OSRM matrix returns. */
  driveMin: number;
  bathymetry?: BathymetryProfile;
  /** 0–1: fraction of open-ocean swell energy that reaches the break from
   * its optimal direction. 1 = fully exposed; 0 = totally blocked. */
  shadowFactor?: number;
  /** 0–1: how much the bottom contour shifts week-to-week. 0 = pure rock
   * reef; 1 = a beach with constantly re-forming sandbars. */
  sandMobility?: number;
  specialRules?: SpecialRule[];
  watchOnly?: boolean;
  sharkAdvisory?: boolean;
}

export const SPOTS: Spot[] = [
  // Region 1 — Sonoma Coast
  { id: 'secrets',       region: 'sonoma',   regionLabel: 'Sonoma Coast', name: 'Secrets',             subtitle: 'Horseshoe Cove · Salt Point', difficulty: 6,  type: 'Point · Left',         bottom: 'Rock ledge',    optimalSwell: 270, optimalSize: [6,12],optimalPeriod: [14,18], offshore: 135, optimalTide: 'low',    lat: 38.5651, lng: -123.3294, driveMin: 112,
    shadowFactor: 0.7, sandMobility: 0.0 },
  { id: 'timber-cove',   region: 'sonoma',   regionLabel: 'Sonoma Coast', name: 'Timber Cove',         subtitle: 'Cove right · Day-use access', difficulty: 5,  type: 'Cove · Right',         bottom: 'Sand + rock',   optimalSwell: 315, optimalSize: [2,6], optimalPeriod: [12,16], offshore: 45,  optimalTide: 'low',    lat: 38.4574, lng: -123.0734, driveMin: 100,
    shadowFactor: 0.65, sandMobility: 0.7 },
  { id: 'mystos',        region: 'sonoma',   regionLabel: 'Sonoma Coast', name: 'Mystos',              subtitle: 'Fort Ross reef · Right',       difficulty: 8,  type: 'Reef · Right · Expert',bottom: 'Uneven reef',   optimalSwell: 200, optimalSize: [4,8], optimalPeriod: [12,16], offshore: 45,  optimalTide: 'high',   lat: 38.5040, lng: -123.2335, driveMin: 105,
    shadowFactor: 0.65, sandMobility: 0.0 },
  { id: 'russian-rivermouth', region: 'sonoma', regionLabel: 'Sonoma Coast', name: 'Russian Rivermouth', subtitle: 'Jenner · Sandbar right',     difficulty: 6,  type: 'Rivermouth · Right',   bottom: 'Sand',          optimalSwell: 240, optimalSize: [2,7], optimalPeriod: [10,14], offshore: 80,  optimalTide: 'rising', lat: 38.4515, lng: -123.1310, driveMin: 95,
    shadowFactor: 0.7, sandMobility: 1.0 },
  { id: 'salmon-creek',  region: 'sonoma',   regionLabel: 'Sonoma Coast', name: 'Salmon Creek',        subtitle: 'Bodega Bay',                   difficulty: 6,  type: 'Beach · L/R',          bottom: 'Sand',          optimalSwell: 270, optimalSize: [3,12],optimalPeriod: [12,16], offshore: 100, optimalTide: 'mid',    lat: 38.3544, lng: -123.0728, driveMin: 86,
    shadowFactor: 0.9, sandMobility: 0.85 },
  { id: 'doran-beach',   region: 'sonoma',   regionLabel: 'Sonoma Coast', name: 'Doran Beach',         subtitle: 'Bodega Bay · S-facing crescent',difficulty: 3, type: 'Beach · Beginner',     bottom: 'Sand',          optimalSwell: 250, optimalSize: [2,7], optimalPeriod: [12,16], offshore: 337, optimalTide: 'high',   lat: 38.3140, lng: -123.0316, driveMin: 85,
    shadowFactor: 0.4, sandMobility: 0.7 },
  // Region 2 — Point Reyes
  { id: 'point-reyes',   region: 'pt-reyes', regionLabel: 'Point Reyes',  name: 'Point Reyes Beach',   subtitle: 'The Great Beach',              difficulty: 6,  type: 'Beach',                bottom: 'Sand',          optimalSwell: 280, optimalSize: [2,8], optimalPeriod: [12,16], offshore: 120, optimalTide: 'rising', lat: 38.0548, lng: -122.9652, driveMin: 62,
    shadowFactor: 0.95, sandMobility: 0.9 },
  { id: 'drakes-estero', region: 'pt-reyes', regionLabel: 'Point Reyes',  name: 'Drakes Estero',       subtitle: 'Drakes Bay · 1-mile walk-in',  difficulty: 5,  type: 'Rivermouth · L/R',     bottom: 'Sand',          optimalSwell: 200, optimalSize: [1,8], optimalPeriod: [10,14], offshore: 0,   optimalTide: 'rising', lat: 38.0287, lng: -122.9430, driveMin: 75,
    shadowFactor: 0.6, sandMobility: 1.0 },
  { id: 'dillon-beach',  region: 'pt-reyes', regionLabel: 'Point Reyes',  name: 'Dillon Beach',        subtitle: 'Tomales Bay mouth',            difficulty: 3,  type: 'Beach',                bottom: 'Sand',          optimalSwell: 270, optimalSize: [2,8], optimalPeriod: [10,14], offshore: 80,  optimalTide: 'high',   lat: 38.2531, lng: -122.9668, driveMin: 74,
    shadowFactor: 0.85, sandMobility: 0.7 },
  // Bolinas cluster
  // Bolinas profiles share the same 1800→100m offshore distance grid so
  // they can be compared on a shared y-axis (see BathymetryCrossSection).
  // Depths reflect the distinct geometry of each break, not generic ramps.
  { id: 'bolinas-patch', region: 'marin',  regionLabel: 'Bolinas',      name: 'The Patch',           subtitle: 'Duxbury Reef',                 difficulty: 3,  type: 'Reef · Long/slow',     bottom: 'Rock ledge',    optimalSwell: 225, optimalSize: [1,6], optimalPeriod: [12,16], offshore: 0,   optimalTide: 'low',    lat: 37.9042, lng: -122.7101, driveMin: 22,
    // Reef-edge drop at ~1km out, then a long flat intertidal shelf.
    bathymetry: { label: 'Duxbury Reef — largest intertidal reef in N. America. Permanent shape.', depth: [22,18,12,4,2,1], distance: [1800,1400,1000,600,300,100] },
    shadowFactor: 0.55, sandMobility: 0.0 },
  { id: 'bolinas-jetty', region: 'marin',  regionLabel: 'Bolinas',      name: 'The Jetty',           subtitle: 'Channel / Wharf Rd',           difficulty: 4,  type: 'Beach · Pier/groyne',  bottom: 'Sand',          optimalSwell: 225, optimalSize: [1,6], optimalPeriod: [12,16], offshore: 0,   optimalTide: 'mid',    lat: 37.8987, lng: -122.6986, driveMin: 22,
    // Smooth, near-linear sand ramp — no reef shelf, no scour.
    bathymetry: { label: 'Shifting sandbars — lagoon outflow reshapes weekly.', depth: [22,17,12,7,4,1.5], distance: [1800,1400,1000,600,300,100] },
    shadowFactor: 0.45, sandMobility: 0.85 },
  { id: 'bolinas-groin', region: 'marin',  regionLabel: 'Bolinas',      name: 'The Groin',           subtitle: 'Sea Drift · Lagoon mouth',     difficulty: 6,  type: 'Jetty · Left',         bottom: 'Sand + groin',  optimalSwell: 245, optimalSize: [4,8], optimalPeriod: [14,18], offshore: 0,   optimalTide: 'rising', lat: 37.8994, lng: -122.6962, driveMin: 22,
    // Lagoon outflow scours a deeper trough offshore of the structure;
    // sand piles back up inshore, giving a sharp rise over the bar.
    bathymetry: { label: 'Groin + lagoon hydraulics = river-mouth dynamic.', depth: [22,18,14,11,5,1], distance: [1800,1400,1000,600,300,100] },
    shadowFactor: 0.50, sandMobility: 0.6,
    specialRules: [{ kind: 'falling-tide-rip', below: 2, penalty: -15 }] },
  { id: 'stinson',       region: 'marin',  regionLabel: 'Stinson',      name: 'Stinson Beach',       subtitle: 'Open 3-mile beach',            difficulty: 3,  type: 'Beach · L/R',          bottom: 'Sand',          optimalSwell: 250, optimalSize: [2,6], optimalPeriod: [10,14], offshore: 45,  optimalTide: 'high',   lat: 37.8978, lng: -122.6477, driveMin: 18,
    shadowFactor: 0.6, sandMobility: 0.7 },
  { id: 'muir-beach',    region: 'marin',  regionLabel: 'Muir Beach',   name: 'Muir Beach',          subtitle: 'Cove beach · Mt Tam shelter',  difficulty: 4,  type: 'Cove · Beachbreak',    bottom: 'Sand',          optimalSwell: 250, optimalSize: [1,6], optimalPeriod: [10,14], offshore: 45,  optimalTide: 'mid',    lat: 37.8589, lng: -122.5795, driveMin: 18,
    shadowFactor: 0.5, sandMobility: 0.85 },
  { id: 'rodeo',         region: 'marin',  regionLabel: 'Marin Headlands', name: 'Rodeo Beach',      subtitle: 'Fort Cronkhite',               difficulty: 4,  type: 'Cove · Beachbreak',    bottom: 'Sand',          optimalSwell: 270, optimalSize: [1,6], optimalPeriod: [10,14], offshore: 45,  optimalTide: 'low',    lat: 37.831,  lng: -122.540,  driveMin: 14,
    shadowFactor: 0.5, sandMobility: 0.85 },
  // Region 3 — San Francisco
  { id: 'fort-point',    region: 'sf', regionLabel: 'SF',   name: 'Fort Point',          subtitle: 'Under the Golden Gate',        difficulty: 7,  type: 'Reef · Left',          bottom: 'Boulders',      optimalSwell: 290, optimalSize: [4,12],optimalPeriod: [12,18], offshore: 180, optimalTide: 'low',    lat: 37.8108, lng: -122.4770, driveMin: 24,
    shadowFactor: 0.25, sandMobility: 0.0 },
  { id: 'deadmans',      region: 'sf', regionLabel: 'SF',   name: 'Deadmans',            subtitle: 'Lands End · Sutro Baths reef', difficulty: 8,  type: 'Reef · Left',          bottom: 'Uneven reef',   optimalSwell: 315, optimalSize: [6,12],optimalPeriod: [14,18], offshore: 135, optimalTide: 'low',    lat: 37.7800, lng: -122.5135, driveMin: 30,
    shadowFactor: 0.7, sandMobility: 0.0 },
  { id: 'kellys-cove',   region: 'sf', regionLabel: 'SF',   name: "Kelly's Cove",        subtitle: 'OB north end · Cliff House shelter', difficulty: 4, type: 'Cove · Beach',         bottom: 'Sand',          optimalSwell: 225, optimalSize: [2,8], optimalPeriod: [10,14], offshore: 90,  optimalTide: 'mid',    lat: 37.7780, lng: -122.5135, driveMin: 30,
    shadowFactor: 0.6, sandMobility: 0.7 },
  { id: 'ocean-beach-north', region: 'sf', regionLabel: 'SF', name: 'Ocean Beach (N)', subtitle: 'North end · Lawton to Lincoln',  difficulty: 6, type: 'Beach · Powerful',     bottom: 'Sand',          optimalSwell: 290, optimalSize: [3,10],optimalPeriod: [12,18], offshore: 90,  optimalTide: 'mid',    lat: 37.7700, lng: -122.5125, driveMin: 31,
    shadowFactor: 0.95, sandMobility: 0.95 },
  { id: 'ocean-beach',   region: 'sf', regionLabel: 'SF',   name: 'Ocean Beach',         subtitle: 'Central · Mid avenues',        difficulty: 7,  type: 'Beach · Powerful',     bottom: 'Sand',          optimalSwell: 290, optimalSize: [4,15],optimalPeriod: [14,20], offshore: 100, optimalTide: 'mid',    lat: 37.7604, lng: -122.5107, driveMin: 32,
    shadowFactor: 0.95, sandMobility: 0.95 },
  { id: 'ocean-beach-south', region: 'sf', regionLabel: 'SF', name: 'Ocean Beach (S)', subtitle: 'Sloat · VFW to Sloat Blvd',     difficulty: 7,  type: 'Beach · Powerful',     bottom: 'Sand',          optimalSwell: 290, optimalSize: [3,12],optimalPeriod: [12,18], offshore: 80,  optimalTide: 'mid',    lat: 37.7400, lng: -122.5083, driveMin: 33,
    shadowFactor: 0.95, sandMobility: 0.95 },
  // Region 4 — San Mateo North
  { id: 'sharp-park',    region: 'sm-north', regionLabel: 'Pacifica',     name: 'Sharp Park',          subtitle: 'Pier sandbar · Pacifica',      difficulty: 6,  type: 'Beach · Pier/groyne',  bottom: 'Sand + reef',   optimalSwell: 300, optimalSize: [3,12],optimalPeriod: [12,18], offshore: 90,  optimalTide: 'low',    lat: 37.6325, lng: -122.4900, driveMin: 38,
    shadowFactor: 0.9, sandMobility: 0.85 },
  { id: 'linda-mar',     region: 'sm-north', regionLabel: 'Pacifica',     name: 'Linda Mar',           subtitle: 'Pacifica · Taco Bell',         difficulty: 2,  type: 'Beach · Beginner',     bottom: 'Sand',          optimalSwell: 295, optimalSize: [2,8], optimalPeriod: [12,16], offshore: 135, optimalTide: 'rising', lat: 37.5932, lng: -122.4978, driveMin: 46,
    shadowFactor: 0.7, sandMobility: 0.7 },
  { id: 'pedro-point',   region: 'sm-north', regionLabel: 'Pacifica',     name: 'Pedro Point',         subtitle: 'Big-wave left · S of Linda Mar', difficulty: 9, type: 'Reef · Left',          bottom: 'Rock reef',     optimalSwell: 315, optimalSize: [8,25],optimalPeriod: [16,20], offshore: 135, optimalTide: 'high',   lat: 37.5820, lng: -122.4980, driveMin: 48,
    shadowFactor: 0.7, sandMobility: 0.0 },
  { id: 'rockaway',      region: 'sm-north', regionLabel: 'Pacifica',     name: 'Rockaway',            subtitle: 'Pacifica',                     difficulty: 6,  type: 'Beach + reef',         bottom: 'Sand + rock',   optimalSwell: 290, optimalSize: [3,12],optimalPeriod: [12,16], offshore: 120, optimalTide: 'rising', lat: 37.6112, lng: -122.4956, driveMin: 42,
    shadowFactor: 0.7, sandMobility: 0.6 },
  { id: 'montara',       region: 'sm-north', regionLabel: 'Pacifica',     name: 'Montara',             subtitle: 'Exposed beach',                difficulty: 5,  type: 'Beach',                bottom: 'Sand',          optimalSwell: 280, optimalSize: [3,10],optimalPeriod: [12,16], offshore: 90,  optimalTide: 'low',    lat: 37.5428, lng: -122.5131, driveMin: 54,
    shadowFactor: 0.95, sandMobility: 0.95 },
  { id: 'princeton',     region: 'sm-north', regionLabel: 'Half Moon Bay',name: 'Princeton Jetty',     subtitle: 'Pillar Point Harbor',          difficulty: 2,  type: 'Jetty · Wedge',        bottom: 'Sand + rock',   optimalSwell: 225, optimalSize: [2,7], optimalPeriod: [10,14], offshore: 60,  optimalTide: 'high',   lat: 37.4944, lng: -122.4836, driveMin: 58,
    shadowFactor: 0.4, sandMobility: 0.5 },
  { id: 'mavericks',     region: 'sm-north', regionLabel: 'Half Moon Bay',name: 'Mavericks',           subtitle: 'Big wave reef',                difficulty: 10, type: 'Reef · XXL',           bottom: 'Boulders',      optimalSwell: 305, optimalSize: [12,40],optimalPeriod:[18,22], offshore: 90,  optimalTide: 'low',    lat: 37.4936, lng: -122.4960, driveMin: 58,
    shadowFactor: 0.85, sandMobility: 0.0, watchOnly: true },
  { id: 'francis-beach', region: 'sm-north', regionLabel: 'Half Moon Bay',name: 'Francis Beach',       subtitle: 'HMB State Beach · 4-mile crescent', difficulty: 3, type: 'Beach',                bottom: 'Sand',          optimalSwell: 280, optimalSize: [2,10],optimalPeriod: [12,16], offshore: 90,  optimalTide: 'high',   lat: 37.4694, lng: -122.4497, driveMin: 62,
    shadowFactor: 0.95, sandMobility: 0.95 },
  // Region 5 — Hwy 1 South
  { id: 'martins',       region: 'sm-south', regionLabel: 'Hwy 1 South',  name: 'Martin’s Beach',      subtitle: 'Sheltered cove',               difficulty: 4,  type: 'Cove beach',           bottom: 'Sand + rock',   optimalSwell: 235, optimalSize: [3,6], optimalPeriod: [12,16], offshore: 45,  optimalTide: 'mid',    lat: 37.3533, lng: -122.4076, driveMin: 74 },
  { id: 'ano-nuevo',     region: 'sm-south', regionLabel: 'Hwy 1 South',  name: 'Año Nuevo',           subtitle: 'Elephant seal point',          difficulty: 6,  type: 'Reef + beach',         bottom: 'Rock + sand',   optimalSwell: 280, optimalSize: [3,8], optimalPeriod: [14,18], offshore: 90,  optimalTide: 'mid',    lat: 37.1083, lng: -122.3377, driveMin: 96, sharkAdvisory: true },
  { id: 'waddell',       region: 'sm-south', regionLabel: 'Hwy 1 South',  name: 'Waddell Creek',       subtitle: 'Rivermouth + reef',            difficulty: 5,  type: 'Reef + beach',         bottom: 'Rock + sand',   optimalSwell: 270, optimalSize: [3,10],optimalPeriod: [12,18], offshore: 45,  optimalTide: 'mid',    lat: 37.0964, lng: -122.2794, driveMin: 102 },
  { id: 'scott-creek',   region: 'sm-south', regionLabel: 'Hwy 1 South',  name: 'Scott Creek',         subtitle: 'North point',                  difficulty: 4,  type: 'Reef + beach',         bottom: 'Rock + sand',   optimalSwell: 300, optimalSize: [3,8], optimalPeriod: [12,16], offshore: 90,  optimalTide: 'mid',    lat: 37.0433, lng: -122.2297, driveMin: 108 },
  { id: 'davenport',     region: 'sm-south', regionLabel: 'Hwy 1 South',  name: 'Davenport',           subtitle: 'Scenic reef',                  difficulty: 5,  type: 'Reef + point',         bottom: 'Rock reef',     optimalSwell: 225, optimalSize: [3,8], optimalPeriod: [12,18], offshore: 45,  optimalTide: 'mid',    lat: 37.0083, lng: -122.1972, driveMin: 114 },
  // Region 6 — Santa Cruz
  { id: 'four-mile',     region: 'sc',       regionLabel: 'Santa Cruz',   name: 'Four Mile',           subtitle: 'Beach break',                  difficulty: 4,  type: 'Beach',                bottom: 'Sand',          optimalSwell: 285, optimalSize: [3,6], optimalPeriod: [12,16], offshore: 45,  optimalTide: 'mid',    lat: 36.9597, lng: -122.1775, driveMin: 120 },
  { id: 'steamer-lane',  region: 'sc',       regionLabel: 'Santa Cruz',   name: 'Steamer Lane',        subtitle: 'The Point · The Slot',         difficulty: 8,  type: 'Reef · Right',         bottom: 'Rock + kelp',   optimalSwell: 285, optimalSize: [4,15],optimalPeriod: [14,20], offshore: 22,  optimalTide: 'mid',    lat: 36.9514, lng: -122.0236, driveMin: 128 },
  { id: 'cowell',        region: 'sc',       regionLabel: 'Santa Cruz',   name: 'Cowell',              subtitle: 'Learner wave',                 difficulty: 1,  type: 'Beach · Beginner',     bottom: 'Sand',          optimalSwell: 200, optimalSize: [2,4], optimalPeriod: [10,14], offshore: 315, optimalTide: 'high',   lat: 36.9543, lng: -122.0201, driveMin: 128 },
  { id: 'pleasure-point',region: 'sc',       regionLabel: 'Santa Cruz',   name: 'Pleasure Point',      subtitle: 'Sewer Peak · 1st · 2nd',       difficulty: 5,  type: 'Reef · Right',         bottom: 'Rock + kelp',   optimalSwell: 285, optimalSize: [3,10],optimalPeriod: [12,18], offshore: 340, optimalTide: 'mid',    lat: 36.9594, lng: -121.9672, driveMin: 132 },
  { id: 'capitola',      region: 'sc',       regionLabel: 'Santa Cruz',   name: 'Capitola',            subtitle: 'Village jetty',                difficulty: 3,  type: 'Beach · Long',         bottom: 'Sand',          optimalSwell: 200, optimalSize: [2,5], optimalPeriod: [10,14], offshore: 0,   optimalTide: 'high',   lat: 36.9736, lng: -121.9533, driveMin: 136 },
  { id: 'the-hook',      region: 'sc',       regionLabel: 'Santa Cruz',   name: 'The Hook',            subtitle: 'Classic right',                difficulty: 5,  type: 'Reef · Right',         bottom: 'Rock + kelp',   optimalSwell: 245, optimalSize: [3,8], optimalPeriod: [12,16], offshore: 0,   optimalTide: 'mid',    lat: 36.9582, lng: -121.9627, driveMin: 134 },
];

export const FAVORITES = ['bolinas-patch', 'bolinas-jetty', 'bolinas-groin', 'stinson', 'rodeo', 'muir-beach'];

export interface CurrentConditions {
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  secondarySwellHeight: number;
  secondarySwellPeriod: number;
  secondarySwellDirection: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  airTemp: number;
  waterTemp: number;
  tideHeight: number;
  tideRising: boolean;
  updatedAgo: number;
}

export const CURRENT: CurrentConditions = {
  swellHeight: 3.2,
  swellPeriod: 15,
  swellDirection: 228,
  secondarySwellHeight: 1.4,
  secondarySwellPeriod: 9,
  secondarySwellDirection: 295,
  windSpeed: 6,
  windDirection: 35,
  windGust: 9,
  airTemp: 58,
  waterTemp: 54,
  tideHeight: 1.2,
  tideRising: true,
  updatedAgo: 4,
};

export interface ForecastHour {
  hour: number;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  tideHeight: number;
  tideRising: boolean;
  score: number;
}

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function angleDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function tideMatch(optimal: Spot['optimalTide'], h: number, rising: boolean): number {
  const bands: Record<Spot['optimalTide'], [number, number]> = {
    low:    [0, 2],
    mid:    [2, 4],
    high:   [4, 6],
    rising: [1.5, 5],
  };
  const [lo, hi] = bands[optimal] || [0, 6];
  const inside = h >= lo && h <= hi;
  const base = inside ? 10 : Math.max(0, 10 - Math.min(Math.abs(h - lo), Math.abs(h - hi)) * 3);
  const bonus = rising && inside ? 3 : 0;
  return base + bonus;
}

interface ScoringInput {
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  windSpeed: number;
  windDirection: number;
  tideHeight: number;
  tideRising: boolean;
}

// Walk a spot's special rules and return aggregated effects. `tideOverride`,
// when set, replaces tide-quality with a near-zero value (signals "do not
// surf") for `metricQuality` callers.
function evaluateSpecialRules(
  spot: Spot,
  c: { tideHeight: number; tideRising: boolean },
): { penalty: number; tideOverride: number | null } {
  let penalty = 0;
  let tideOverride: number | null = null;
  for (const rule of spot.specialRules ?? []) {
    if (rule.kind === 'falling-tide-rip' && !c.tideRising && c.tideHeight < rule.below) {
      penalty += rule.penalty;
      tideOverride = 0.1;
    }
  }
  return { penalty, tideOverride };
}

export function computeScore(spot: Spot, c: ScoringInput): number {
  if (spot.watchOnly) {
    const sizeOK = c.swellHeight > 8 ? 30 : c.swellHeight * 3;
    const periodOK = c.swellPeriod > 17 ? 30 : (c.swellPeriod - 10) * 4;
    const dirOK = 40 - angleDelta(c.swellDirection, spot.optimalSwell) * 0.8;
    return Math.max(0, Math.min(100, sizeOK + periodOK + dirOK));
  }
  const dirDelta = angleDelta(c.swellDirection, spot.optimalSwell);
  const dirScore = Math.max(0, 30 - dirDelta * 0.7);
  const [pMin, pMax] = spot.optimalPeriod;
  let pScore: number;
  if (c.swellPeriod >= pMin && c.swellPeriod <= pMax) pScore = 20;
  else if (c.swellPeriod < pMin) pScore = Math.max(0, 20 - (pMin - c.swellPeriod) * 3);
  else pScore = Math.max(0, 20 - (c.swellPeriod - pMax) * 2);
  const [sMin, sMax] = spot.optimalSize;
  const sCenter = (sMin + sMax) / 2;
  const sSpread = (sMax - sMin) / 2 + 1;
  const sScore = Math.max(0, 15 - Math.pow((c.swellHeight - sCenter) / sSpread, 2) * 10);
  const windDelta = angleDelta(c.windDirection, spot.offshore);
  const windDirScore = Math.max(0, 15 - windDelta * 0.09);
  const windPenalty = c.windSpeed > 20 ? -10 : c.windSpeed > 12 ? -(c.windSpeed - 12) : 0;
  const tideScore = tideMatch(spot.optimalTide, c.tideHeight, c.tideRising);
  const { penalty: special } = evaluateSpecialRules(spot, c);
  return Math.max(0, Math.min(100, dirScore + pScore + sScore + windDirScore + windPenalty + tideScore + special + 5));
}

export function buildTimeline(spot: Spot, hours = 48): ForecastHour[] {
  const rnd = seededRand(spot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const data: ForecastHour[] = [];
  for (let h = 0; h < hours; h++) {
    const swellH = CURRENT.swellHeight + Math.sin(h / 8) * 0.6 - h * 0.015 + (rnd() - 0.5) * 0.2;
    const swellP = CURRENT.swellPeriod - h * 0.05 + (rnd() - 0.5) * 0.5;
    const swellD = CURRENT.swellDirection + h * 0.4 + (rnd() - 0.5) * 3;
    const hourOfDay = h % 24;
    const windPattern = Math.max(0, Math.sin(((hourOfDay - 6) / 24) * Math.PI * 2)) * 14;
    const windS = 4 + windPattern + (rnd() - 0.5) * 2;
    const windD = hourOfDay < 10 ? 40 + (rnd() - 0.5) * 30 : 280 + (rnd() - 0.5) * 40;
    const tidePhase = ((h + 4) / 12.4) * Math.PI * 2;
    const tideH = 2.8 + Math.sin(tidePhase) * 2.6;
    const tideRising = Math.cos(tidePhase) > 0;
    const sh = Math.max(0.5, swellH);
    const sp = Math.max(6, swellP);
    const sd = (swellD + 360) % 360;
    const ws = Math.max(0, windS);
    const wd = (windD + 360) % 360;
    data.push({
      hour: h,
      swellHeight: sh,
      swellPeriod: sp,
      swellDirection: sd,
      windSpeed: ws,
      windDirection: wd,
      windGust: Math.max(0, ws + 3 + rnd() * 2),
      tideHeight: tideH,
      tideRising,
      score: computeScore(spot, {
        swellHeight: sh, swellPeriod: sp, swellDirection: sd,
        windSpeed: ws, windDirection: wd,
        tideHeight: tideH, tideRising,
      }),
    });
  }
  return data;
}

export interface Rating {
  label: string;
  tone: string;
  color: string;
}

export function scoreToRating(score: number, watchOnly?: boolean): Rating {
  if (watchOnly) {
    if (score >= 80) return { label: 'FIRING', tone: 'mavericks', color: '#FF6D00' };
    if (score >= 35) return { label: 'WATCH', tone: 'watch', color: '#EAB308' };
    return { label: 'FLAT', tone: 'flat', color: '#4B5058' };
  }
  if (score >= 80) return { label: 'EPIC', tone: 'epic',         color: '#05F772' };
  if (score >= 60) return { label: 'GOOD', tone: 'good',         color: '#8EF705' };
  if (score >= 50) return { label: 'FAIR', tone: 'fair',         color: '#BAF705' };
  if (score >= 35) return { label: 'MID',  tone: 'mediocre',     color: '#EAB308' };
  if (score >= 30) return { label: 'MEH',  tone: 'meh',          color: '#F97316' };
  if (score >= 15) return { label: 'POOR', tone: 'poor',         color: '#EF4444' };
  return { label: 'FLAT', tone: 'flat', color: '#4B5058' };
}

export interface BestWindow {
  start: number;
  end: number;
  peak: number;
  peakHour: number;
  end_score: number;
}

export function findBestWindows(timeline: ForecastHour[]): BestWindow[] {
  const windows: BestWindow[] = [];
  let run: BestWindow | null = null;
  timeline.forEach((t, i) => {
    if (t.score >= 55) {
      if (!run) run = { start: i, end: i, peak: t.score, peakHour: i, end_score: t.score };
      else {
        run.end = i;
        run.end_score = t.score;
        if (t.score > run.peak) {
          run.peak = t.score;
          run.peakHour = i;
        }
      }
    } else if (run) {
      windows.push(run);
      run = null;
    }
  });
  if (run) windows.push(run);
  return windows.sort((a, b) => b.peak - a.peak);
}

// Format an hour-offset from `anchor` as a short local-time label.
// `h=0` is "now" (no day prefix); future days get a single-letter day
// prefix (S/M/T/W/T/F/S). The single letter is ambiguous in isolation
// (T = Tue or Thu) but unambiguous in chronological context where labels
// run in calendar order. Saves ~16px per label so 5 ticks fit on narrow
// viewports without colliding. Uses the browser's local timezone.
const DAY_INITIALS = ['S','M','T','W','T','F','S'];
export function hourLabel(h: number, anchor: number = Date.now()): string {
  const t = new Date(anchor + h * 3600_000);
  const today = new Date(anchor).getDay();
  const dayPrefix = t.getDay() === today ? '' : `${DAY_INITIALS[t.getDay()]} `;
  const hr = t.getHours();
  const suffix = hr >= 12 ? 'pm' : 'am';
  const disp = ((hr + 11) % 12) + 1;
  return `${dayPrefix}${disp}${suffix}`;
}

const CARDINALS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
export function degToCardinal(deg: number): string {
  return CARDINALS[Math.round(deg / 22.5) % 16];
}

// NorCal-tuned wetsuit recommendation by water temp (°F). Returns the
// suit thickness label surfers actually use ("4/3", "3/2", etc.). Returns
// null when we don't have a temp reading and the caller should hide the
// recommendation rather than guess.
export function wetsuitForWaterF(waterF: number | undefined | null): string | null {
  if (typeof waterF !== 'number' || !Number.isFinite(waterF)) return null;
  if (waterF < 52) return '5/4 + boots';
  if (waterF < 58) return '4/3 mm';
  if (waterF < 63) return '3/2 mm';
  if (waterF < 68) return '2mm spring';
  return 'trunks';
}

export type MetricKey = 'swellHeight' | 'swellPeriod' | 'windSpeed' | 'tideHeight';

export function metricQuality(spot: Spot, c: ForecastHour, metric: MetricKey): number {
  if (spot.watchOnly) {
    if (metric === 'swellHeight') return Math.min(1, c.swellHeight / 15);
    if (metric === 'swellPeriod') return Math.min(1, Math.max(0, (c.swellPeriod - 10) / 8));
    if (metric === 'windSpeed')   return c.windSpeed < 6 ? 1 : c.windSpeed < 12 ? 0.6 : c.windSpeed < 20 ? 0.3 : 0.1;
    if (metric === 'tideHeight')  return 0.7;
  }
  if (metric === 'swellHeight') {
    const [sMin, sMax] = spot.optimalSize;
    const sCenter = (sMin + sMax) / 2;
    const sSpread = (sMax - sMin) / 2 + 1;
    const q = 1 - Math.pow((c.swellHeight - sCenter) / sSpread, 2) * 0.7;
    return Math.max(0, Math.min(1, q));
  }
  if (metric === 'swellPeriod') {
    const [pMin, pMax] = spot.optimalPeriod;
    if (c.swellPeriod >= pMin && c.swellPeriod <= pMax) return 1;
    if (c.swellPeriod < pMin) return Math.max(0, 1 - (pMin - c.swellPeriod) * 0.15);
    return Math.max(0, 1 - (c.swellPeriod - pMax) * 0.1);
  }
  if (metric === 'windSpeed') {
    const windDelta = angleDelta(c.windDirection, spot.offshore);
    const dirQ = Math.max(0, 1 - windDelta / 180);
    const spdQ = c.windSpeed < 4 ? 1
              : c.windSpeed < 8 ? 0.9
              : c.windSpeed < 12 ? 0.65
              : c.windSpeed < 18 ? 0.35
              : 0.1;
    return Math.max(0.05, dirQ * 0.6 + spdQ * 0.4);
  }
  if (metric === 'tideHeight') {
    const { tideOverride } = evaluateSpecialRules(spot, c);
    if (tideOverride !== null) return tideOverride;
    const bands: Record<Spot['optimalTide'], [number, number]> = { low:[0,2], mid:[2,4], high:[4,6], rising:[1.5,5] };
    const [lo, hi] = bands[spot.optimalTide] || [0, 6];
    const inside = c.tideHeight >= lo && c.tideHeight <= hi;
    if (inside) return c.tideRising && spot.optimalTide === 'rising' ? 1 : 0.9;
    const d = Math.min(Math.abs(c.tideHeight - lo), Math.abs(c.tideHeight - hi));
    return Math.max(0, 1 - d * 0.35);
  }
  return 0.6;
}
