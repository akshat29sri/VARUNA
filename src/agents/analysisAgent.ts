import { DepthLevel, ModelComparisonResult, ObservationPoint, OceanAnomaly, OceanRegion, OceanVariable } from '../types/ocean';
import { OBSERVATION_POINTS } from '../data/observations';
import { OCEAN_ANOMALIES } from '../data/anomalies';
import { computeModelComparison } from '../data/modelComparisons';
import { calculateDistanceKm } from '../utils/geo';

export class AnalysisAgent {
  static findNearestObservation(lat: number, lon: number): ObservationPoint {
    let nearest = OBSERVATION_POINTS[0];
    let minDist = Infinity;
    for (const obs of OBSERVATION_POINTS) {
      const dist = calculateDistanceKm(lat, lon, obs.lat, obs.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = obs;
      }
    }
    return nearest;
  }

  static findAnomaliesForRegion(regionId: string, depth?: DepthLevel): OceanAnomaly[] {
    return OCEAN_ANOMALIES.filter((a) => {
      if (regionId === 'arabian-sea' && a.id.includes('as-warm-eddy')) return true;
      if (regionId === 'bay-of-bengal' && a.id.includes('bob-fresh-plume')) return true;
      if (regionId === 'somali-current' && a.id.includes('somali-upwelling')) return true;
      if (regionId === 'equatorial-indian-ocean' && a.id.includes('wyrtki')) return true;
      return depth !== undefined ? a.depth === depth : true;
    });
  }

  static performModelComparison(obs: ObservationPoint, depth: DepthLevel, variable: OceanVariable, date: string): Promise<ModelComparisonResult> {
    return computeModelComparison(obs, depth, variable, date);
  }
}
