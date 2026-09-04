export type OceanVariable = 'temperature' | 'salinity' | 'currents' | 'chlorophyll' | 'oxygen';

export interface VariableConfig {
  id: OceanVariable;
  name: string;
  unit: string;
  min: number;
  max: number;
  colormap: 'turbo' | 'haline' | 'velocity' | 'chlorophyll' | 'oxygen';
  description: string;
  depthDecay: number; // rate of parameter variation with depth
}

export type DepthLevel = 0 | 50 | 100 | 250 | 500 | 1000 | 2000 | 4000;

export interface OceanRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoomDistance: number;
  description: string;
  avgTempSurface: number;
  avgSalinitySurface: number;
  thermoclineDepth: number; // in meters
}

export type InstrumentType = 'Argo Float' | 'Underwater Glider' | 'CTD Mooring' | 'BGC Float';

export interface VerticalProfilePoint {
  depth: number;
  temperature: number;
  salinity: number;
  density: number;
  dissolvedOxygen: number;
  modelTemperature?: number;
  modelSalinity?: number;
}

export interface ObservationPoint {
  id: string;
  wmoId: string;
  name: string;
  instrument: InstrumentType;
  lat: number;
  lon: number;
  surfaceTemp: number;
  surfaceSalinity: number;
  currentDepth: number;
  tempAtDepth: number;
  salinityAtDepth: number;
  timestamp: string;
  status: 'active' | 'drifting' | 'profiling';
  institution: string;
  profile: VerticalProfilePoint[];
}

export interface OceanAnomaly {
  id: string;
  title: string;
  region: string;
  lat: number;
  lon: number;
  depth: DepthLevel;
  variable: OceanVariable;
  magnitude: number; // e.g., +2.1
  unit: string;
  baseline: number;
  observedValue: number;
  severity: 'moderate' | 'high' | 'severe';
  summary: string;
  scientificContext: string;
  suggestedAction: string;
}

export interface ModelComparisonResult {
  locationName: string;
  lat: number;
  lon: number;
  depth: DepthLevel;
  variable: OceanVariable;
  modelValue: number;
  observedValue: number;
  difference: number;
  unit: string;
  mae: number;
  bias: number;
  rmse: number;
  correlation: number;
  humanExplanation: string;
  detailedAnalysis: string;
  verticalDeltaProfile: {
    depth: number;
    model: number;
    observation: number;
    delta: number;
  }[];
}

export interface OceanState {
  currentVariable: OceanVariable;
  currentDepth: DepthLevel;
  currentRegion: OceanRegion;
  currentDateIndex: number; // 0 to 29 (30-day window)
  isPlayingTime: boolean;
  timeSpeed: number;
  
  // Layer toggles
  showObservations: boolean;
  showCurrents: boolean;
  showAnomalies: boolean;
  showBathymetryContours: boolean;
  showGraticules: boolean;
  
  // Selections
  selectedObservation: ObservationPoint | null;
  selectedAnomaly: OceanAnomaly | null;
  activeComparison: ModelComparisonResult | null;
  
  // UI Views
  activeView: 'explore' | 'compare' | 'time' | 'observations' | 'insights' | 'research';
  isAssistantOpen: boolean;
  isProfileModalOpen: boolean;
  isComparisonDrawerOpen: boolean;
  isDemoTourActive: boolean;
  demoTourStep: number;
  
  // Telemetry under cursor
  hoverCoordinates: { lat: number; lon: number } | null;
  hoverValue: { value: number; unit: string } | null;
  
  // Micro-interaction banner
  microInteraction: string | null;
}
