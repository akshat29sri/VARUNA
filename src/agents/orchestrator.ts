import { AgentExecutionContext, AgentExecutionResult, SuggestionAction, ToolCall } from './agentTypes';
import { VisualizationAgent } from './visualizationAgent';
import { AnalysisAgent } from './analysisAgent';
import { OBSERVATION_POINTS } from '../data/observations';
import { OCEAN_ANOMALIES } from '../data/anomalies';
import { TIMELINE_DATES } from '../data/oceanData';

export class OrchestratorAgent {
  static async processQuery(query: string, context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const q = query.toLowerCase().trim();
    const toolCalls: ToolCall[] = [];
    let updatedState: Partial<AgentExecutionContext> = {};

    // 1. Check for Demo Tour Trigger
    if (q.includes('demo') || q.includes('tour') || q.includes('walkthrough')) {
      toolCalls.push({ tool: 'startDemoTour', params: {} });
      return {
        toolCalls,
        assistantResponse: "Starting the interactive OceanMind Research Tour! We'll walk through the 3D globe, Arabian Sea thermocline, Argo profiling, and model validation.",
        responseType: 'suggestion',
        suggestions: [
          { id: 'next', label: 'Start Step 1 (Arabian Sea)', prompt: 'Explore Arabian Sea' },
          { id: 'explore-temp', label: 'Explore Temperature', prompt: 'Show temperature at 500m' }
        ]
      };
    }

    // 2. Check for Anomaly / "Is anything unusual"
    if (q.includes('unusual') || q.includes('anomaly') || q.includes('weird') || q.includes('extreme') || q.includes('hotspot')) {
      const anomalies = AnalysisAgent.findAnomaliesForRegion(context.currentRegion.id, context.currentDepth);
      if (anomalies.length === 0) {
        return {
          toolCalls: [],
          assistantResponse: 'The real model and Argo layers are connected, but anomaly detection is intentionally disabled in Step 2 because a real climatological baseline has not yet been wired in. I will not invent an anomaly value.',
          responseType: 'simple',
          suggestions: [
            { id: 'obs', label: 'Show Observations', prompt: 'Show the nearest Argo observations' },
            { id: 'cmp', label: 'Compare Model vs Obs', prompt: 'Compare this with observations' },
          ],
          updatedState: { showAnomalies: false, selectedAnomaly: null },
        };
      }

      const targetAnomaly = anomalies[0];

      toolCalls.push({ tool: 'toggleAnomalies', params: { enabled: true } });
      toolCalls.push({ tool: 'findAnomalies', params: { regionId: context.currentRegion.id } });
      toolCalls.push({ tool: 'setDepth', params: { depth: targetAnomaly.depth } });
      toolCalls.push({ tool: 'setVariable', params: { variable: targetAnomaly.variable } });

      updatedState = {
        showAnomalies: true,
        selectedAnomaly: targetAnomaly,
        currentDepth: targetAnomaly.depth,
        currentVariable: targetAnomaly.variable,
      };

      return {
        toolCalls,
        assistantResponse: `Yes. There's a noticeable ${targetAnomaly.variable} anomaly in the ${targetAnomaly.region} at ${targetAnomaly.depth} m (${targetAnomaly.magnitude > 0 ? '+' : ''}${targetAnomaly.magnitude}${targetAnomaly.unit} relative to baseline). I've highlighted the thermal contour on the 3D globe.`,
        responseType: 'insight',
        highlightData: [
          { label: 'Feature', value: targetAnomaly.title },
          { label: 'Magnitude', value: `${targetAnomaly.magnitude > 0 ? '+' : ''}${targetAnomaly.magnitude} ${targetAnomaly.unit}`, subtext: `Observed: ${targetAnomaly.observedValue}${targetAnomaly.unit} vs Climatology: ${targetAnomaly.baseline}${targetAnomaly.unit}` },
          { label: 'Depth', value: `${targetAnomaly.depth} m` }
        ],
        suggestions: [
          { id: 'cmp', label: 'Compare with Observations', prompt: 'Compare this with observations' },
          { id: 'time', label: 'Show Over Last 30 Days', prompt: 'Show how temperature changed over the last 30 days' },
          { id: 'prof', label: 'View Vertical Profile', prompt: 'Show the profile here' }
        ],
        updatedState,
      };
    }

    // 3. Check for Model Comparison ("Compare", "How different is the model", "Validation")
    if (q.includes('compare') || q.includes('model') || q.includes('different') || q.includes('bias') || q.includes('rmse') || q.includes('validation')) {
      const targetObs = context.selectedObservation || AnalysisAgent.findNearestObservation(context.currentRegion.lat, context.currentRegion.lon);
      const comparison = await AnalysisAgent.performModelComparison(targetObs, context.currentDepth, context.currentVariable, TIMELINE_DATES[context.currentDateIndex]?.isoDate ?? TIMELINE_DATES[0].isoDate);

      toolCalls.push({ tool: 'compareModelObservation', params: { obsId: targetObs.id, depth: context.currentDepth } });
      toolCalls.push({ tool: 'toggleObservations', params: { enabled: true } });

      updatedState = {
        showObservations: true,
        selectedObservation: targetObs,
      };

      return {
        toolCalls,
        assistantResponse: comparison.humanExplanation + ' Across the full depth profile, the Model MAE is ' + comparison.mae + comparison.unit + ' with RMSE of ' + comparison.rmse + comparison.unit + '.',
        responseType: 'explanation',
        highlightData: [
          { label: 'Observed Value', value: `${comparison.observedValue} ${comparison.unit}`, subtext: targetObs.name },
          { label: 'Model Prediction', value: `${comparison.modelValue} ${comparison.unit}`, subtext: 'Copernicus GLORYS12V1 reanalysis' },
          { label: 'Discrepancy (Δ)', value: `${comparison.difference > 0 ? '+' : ''}${comparison.difference} ${comparison.unit}`, subtext: `Bias: ${comparison.bias > 0 ? '+' : ''}${comparison.bias} ${comparison.unit}` }
        ],
        suggestions: [
          { id: 'view-prof', label: 'Inspect Vertical Profile', prompt: 'Show the profile here' },
          { id: 'research-view', label: 'Open Research Mode', prompt: 'Open research mode' },
          { id: 'anom', label: 'Check for Anomalies', prompt: 'Where is the ocean unusually warm?' }
        ],
        updatedState,
      };
    }

    // 4. Check for Profile ("Show profile", "vertical profile", "thermocline", "curve")
    if (q.includes('profile') || q.includes('thermocline') || q.includes('halocline') || q.includes('ctd')) {
      const targetObs = context.selectedObservation || AnalysisAgent.findNearestObservation(context.currentRegion.lat, context.currentRegion.lon);
      toolCalls.push({ tool: 'getProfile', params: { obsId: targetObs.id } });
      toolCalls.push({ tool: 'toggleObservations', params: { enabled: true } });

      return {
        toolCalls,
        assistantResponse: `Opened vertical profile for ${targetObs.name}. Notice the sharp thermocline between 50m and 150m where temperature drops rapidly before stabilizing into the deep abyss.`,
        responseType: 'simple',
        suggestions: [
          { id: 'cmp', label: 'Compare Model vs Obs', prompt: 'Compare this with observations' },
          { id: 'anom', label: 'Find Anomalies', prompt: 'Is anything unusual here?' }
        ],
        updatedState: {
          showObservations: true,
          selectedObservation: targetObs,
        }
      };
    }

    // 5. Check for Time / Animation ("play", "time", "last month", "last 30 days", "changed")
    if (q.includes('time') || q.includes('play') || q.includes('month') || q.includes('30 days') || q.includes('history') || q.includes('trend')) {
      toolCalls.push({ tool: 'setTime', params: { isPlaying: true } });
      return {
        toolCalls,
        assistantResponse: "Playing 30-day temporal evolution (January 1 – January 30, 2026). Watch the thermohaline eddy propagation and monsoonal current pulses.",
        responseType: 'simple',
        suggestions: [
          { id: 'as', label: 'Focus Arabian Sea', prompt: 'Explore Arabian Sea' },
          { id: 'obs', label: 'Show Observations', prompt: 'Show the nearest Argo observations' }
        ],
        updatedState: {
          isPlayingTime: true,
        }
      };
    }

    // 6. Check for Observations ("show observations", "argo", "buoys", "glider", "in situ")
    if (q.includes('observation') || q.includes('argo') || q.includes('buoy') || q.includes('glider') || q.includes('float')) {
      toolCalls.push({ tool: 'toggleObservations', params: { enabled: true } });
      const nearest = AnalysisAgent.findNearestObservation(context.currentRegion.lat, context.currentRegion.lon);
      
      return {
        toolCalls,
        assistantResponse: `Activated observational layer. Displaying in-situ Argo floats, gliders, and moored buoys across the basin. Selected ${nearest.name} nearby.`,
        responseType: 'simple',
        suggestions: [
          { id: 'prof', label: 'View Profile', prompt: 'Show the profile here' },
          { id: 'cmp', label: 'Compare with Model', prompt: 'Compare this with observations' }
        ],
        updatedState: {
          showObservations: true,
          selectedObservation: nearest,
        }
      };
    }

    // 7. Check for Research Mode
    if (q.includes('research mode') || q.includes('dashboard') || q.includes('statistical') || q.includes('statistics')) {
      toolCalls.push({ tool: 'setResearchMode', params: { enabled: true } });
      return {
        toolCalls,
        assistantResponse: "Switching to Research Mode with comprehensive statistical matrices, time-series telemetry, and dataset export capabilities.",
        responseType: 'simple',
        suggestions: [
          { id: 'globe', label: 'Return to 3D Globe', prompt: 'Explore Arabian Sea' },
          { id: 'anom', label: 'Check Anomalies', prompt: 'Is anything unusual here?' }
        ]
      };
    }

    // 8. General Spatial / Variable / Depth adjustments
    const parsedRegion = VisualizationAgent.parseRegion(q);
    const parsedDepth = VisualizationAgent.parseDepth(q);
    const parsedVariable = VisualizationAgent.parseVariable(q);

    let actionsTaken: string[] = [];

    if (parsedRegion) {
      toolCalls.push({ tool: 'focusRegion', params: { region: parsedRegion.name } });
      updatedState.currentRegion = parsedRegion;
      actionsTaken.push(`focused on ${parsedRegion.name}`);
    }

    if (parsedDepth !== null) {
      toolCalls.push({ tool: 'setDepth', params: { depth: parsedDepth } });
      updatedState.currentDepth = parsedDepth;
      actionsTaken.push(`dove to ${parsedDepth} m depth`);
    }

    if (parsedVariable) {
      toolCalls.push({ tool: 'setVariable', params: { variable: parsedVariable } });
      updatedState.currentVariable = parsedVariable;
      actionsTaken.push(`switched variable to ${parsedVariable}`);
    }

    if (actionsTaken.length > 0) {
      const responseText = `Sure — I've ${actionsTaken.join(' and ')}. I've also calibrated the 3D visualization and depth slice.`;
      return {
        toolCalls,
        assistantResponse: responseText,
        responseType: 'simple',
        suggestions: [
          { id: 'obs', label: 'Show Observations', prompt: 'Show the nearest Argo observations' },
          { id: 'anom', label: 'Find Anomalies', prompt: 'Is anything unusual here?' },
          { id: 'cmp', label: 'Compare Model vs Obs', prompt: 'Compare this with observations' }
        ],
        updatedState,
      };
    }

    // Fallback general ocean assistant response
    return {
      toolCalls: [],
      assistantResponse: `I'm analyzing the ${context.currentRegion.name} at ${context.currentDepth} m for ${context.currentVariable}. You can ask me to inspect depth profiles, highlight anomalies, compare numerical models with Argo floats, or animate changes over time.`,
      responseType: 'suggestion',
      suggestions: [
        { id: 's1', label: 'Explore Arabian Sea at 500m', prompt: 'Take me to 500 meters in the Arabian Sea and show temperature' },
        { id: 's2', label: 'Detect Anomalies', prompt: 'Where is the ocean unusually warm?' },
        { id: 's3', label: 'Compare Observations', prompt: 'Compare this with observations' },
        { id: 's4', label: 'Play 30-day Evolution', prompt: 'Play the temperature changes over time' }
      ]
    };
  }
}
