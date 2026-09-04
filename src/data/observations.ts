import { ObservationPoint } from '../types/ocean';

// Populated at runtime from the real Argo GDAC/ERDDAP service.
// Keeping this as a mutable export preserves the existing app/agent imports.
export let OBSERVATION_POINTS: ObservationPoint[] = [];

export function setObservationPoints(points: ObservationPoint[]) {
  OBSERVATION_POINTS = points;
}
