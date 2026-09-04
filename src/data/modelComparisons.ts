import { DepthLevel, ModelComparisonResult, ObservationPoint, OceanVariable } from '../types/ocean';
import { fetchOceanProfile } from '../services/oceanApi';

export async function computeModelComparison(
  obs: ObservationPoint,
  depth: DepthLevel,
  variable: OceanVariable = 'temperature',
  date: string,
): Promise<ModelComparisonResult> {
  if (variable !== 'temperature' && variable !== 'salinity') {
    throw new Error('Model comparison currently supports temperature and salinity.');
  }

  const model = await fetchOceanProfile(obs.lat, obs.lon, date, variable);
  if (model.profile.length === 0) throw new Error('No model profile was returned for this location/date.');

  const observed = obs.profile
    .map((p) => ({ depth: p.depth, value: variable === 'temperature' ? p.temperature : p.salinity }))
    .filter((p) => Number.isFinite(p.value));

  const nearestModelValue = (targetDepth: number) => {
    let best = model.profile[0];
    let bestDistance = Math.abs(best.depth - targetDepth);
    for (const point of model.profile) {
      const distance = Math.abs(point.depth - targetDepth);
      if (distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    return best.value;
  };

  const verticalDeltaProfile = observed.map((point) => {
    const modelValue = nearestModelValue(point.depth);
    const delta = Number((modelValue - point.value).toFixed(3));
    return {
      depth: point.depth,
      model: Number(modelValue.toFixed(3)),
      observation: Number(point.value.toFixed(3)),
      delta,
    };
  });

  const atDepthObservation = observed.reduce((best, point) =>
    Math.abs(point.depth - depth) < Math.abs(best.depth - depth) ? point : best,
  observed[0]);
  const atDepthModel = nearestModelValue(atDepthObservation.depth);
  const difference = Number((atDepthModel - atDepthObservation.value).toFixed(2));

  const deltas = verticalDeltaProfile.map((p) => p.delta);
  const mae = deltas.length ? deltas.reduce((sum, x) => sum + Math.abs(x), 0) / deltas.length : 0;
  const bias = deltas.length ? deltas.reduce((sum, x) => sum + x, 0) / deltas.length : 0;
  const rmse = deltas.length ? Math.sqrt(deltas.reduce((sum, x) => sum + x * x, 0) / deltas.length) : 0;

  const obsValues = verticalDeltaProfile.map((p) => p.observation);
  const modelValues = verticalDeltaProfile.map((p) => p.model);
  const correlation = pearsonCorrelation(obsValues, modelValues);
  const unit = variable === 'temperature' ? '°C' : 'PSU';

  let humanExplanation: string;
  if (Math.abs(difference) < 0.2) {
    humanExplanation = `The Copernicus model is very close to the Argo observation at the selected depth (${difference >= 0 ? '+' : ''}${difference}${unit}).`;
  } else if (difference > 0) {
    humanExplanation = `The Copernicus model is warmer/saltier by +${difference}${unit} than the Argo observation at the selected depth.`;
  } else {
    humanExplanation = `The Copernicus model is lower by ${difference}${unit} than the Argo observation at the selected depth.`;
  }

  return {
    locationName: `${obs.name} (${obs.instrument})`,
    lat: obs.lat,
    lon: obs.lon,
    depth,
    variable,
    modelValue: Number(atDepthModel.toFixed(2)),
    observedValue: Number(atDepthObservation.value.toFixed(2)),
    difference,
    unit,
    mae: Number(mae.toFixed(2)),
    bias: Number(bias.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    correlation: Number(correlation.toFixed(3)),
    humanExplanation,
    detailedAnalysis: `Comparison uses the Argo vertical profile at ${obs.lat.toFixed(3)}°, ${obs.lon.toFixed(3)}° and the nearest-depth values from the Copernicus Marine GLORYS12V1 reanalysis for ${date}. Profile statistics are computed only from paired finite observations and model values; no synthetic error term is introduced.`,
    verticalDeltaProfile,
  };
}

function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length < 2 || b.length !== a.length) return 0;
  const meanA = a.reduce((s, x) => s + x, 0) / a.length;
  const meanB = b.reduce((s, x) => s + x, 0) / b.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  if (denomA === 0 || denomB === 0) return 0;
  return numerator / Math.sqrt(denomA * denomB);
}
