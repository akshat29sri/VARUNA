import { DepthLevel, ModelComparisonResult, ObservationPoint, OceanAnomaly, OceanRegion, OceanVariable } from '../types/ocean';

export type AgentRole = 'orchestrator' | 'visualization' | 'data' | 'analysis' | 'assistant';

export type ToolName = 
  | 'setVariable'
  | 'setDepth'
  | 'setRegion'
  | 'setTime'
  | 'toggleObservations'
  | 'toggleCurrents'
  | 'toggleAnomalies'
  | 'focusRegion'
  | 'selectObservation'
  | 'compareModelObservation'
  | 'findAnomalies'
  | 'getProfile'
  | 'getOceanStatistics'
  | 'startDemoTour'
  | 'setResearchMode';

export interface ToolCall {
  tool: ToolName;
  params: Record<string, any>;
  reasoning?: string;
}

export interface SuggestionAction {
  id: string;
  label: string;
  prompt: string;
  toolCall?: ToolCall;
  variant?: 'primary' | 'secondary' | 'accent';
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  content: string;
  type?: 'simple' | 'insight' | 'explanation' | 'suggestion' | 'action_summary';
  toolCalls?: ToolCall[];
  actions?: SuggestionAction[];
  highlightData?: {
    label: string;
    value: string;
    subtext?: string;
  }[];
}

export interface AgentExecutionContext {
  currentVariable: OceanVariable;
  currentDepth: DepthLevel;
  currentRegion: OceanRegion;
  currentDateIndex: number;
  selectedObservation: ObservationPoint | null;
  selectedAnomaly: OceanAnomaly | null;
  showObservations: boolean;
  showCurrents: boolean;
  showAnomalies: boolean;
  activeView: string;
  isPlayingTime?: boolean;
}

export interface AgentExecutionResult {
  toolCalls: ToolCall[];
  assistantResponse: string;
  responseType: 'simple' | 'insight' | 'explanation' | 'suggestion';
  suggestions: SuggestionAction[];
  highlightData?: { label: string; value: string; subtext?: string }[];
  updatedState?: Partial<AgentExecutionContext>;
}
