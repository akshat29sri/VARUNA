import React, { useState, useEffect } from 'react';
import { OceanGlobe } from './components/OceanScene/OceanGlobe';
import { TopHeader } from './components/Controls/TopHeader';
import { NavSidebar } from './components/Controls/NavSidebar';
import { DepthSlider } from './components/Controls/DepthSlider';
import { VariableSelector } from './components/Controls/VariableSelector';
import { TimeControl } from './components/Controls/TimeControl';
import { MicroInteractionToast } from './components/Controls/MicroInteractionToast';
import { ObservationProfileModal } from './components/Panels/ObservationProfileModal';
import { ComparisonPanel } from './components/Panels/ComparisonPanel';
import { InsightsPanel } from './components/Panels/InsightsPanel';
import { ResearchModeView } from './components/Panels/ResearchModeView';
import { DemoTourModal, DEMO_STEPS } from './components/Panels/DemoTourModal';
import { AssistantPanel } from './components/Assistant/AssistantPanel';

import { DepthLevel, ModelComparisonResult, ObservationPoint, OceanAnomaly, OceanRegion, OceanState, OceanVariable } from './types/ocean';
import { OCEAN_REGIONS, getTimelineDate } from './data/oceanData';
import { OBSERVATION_POINTS, setObservationPoints } from './data/observations';
import { fetchObservations } from './services/oceanApi';
import { OCEAN_ANOMALIES } from './data/anomalies';
import { computeModelComparison } from './data/modelComparisons';
import { OrchestratorAgent } from './agents/orchestrator';
import { AssistantMessage, SuggestionAction } from './agents/agentTypes';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Main Ocean State
  const [currentVariable, setCurrentVariable] = useState<OceanVariable>('temperature');
  const [currentDepth, setCurrentDepth] = useState<DepthLevel>(0);
  const [currentRegion, setCurrentRegion] = useState<OceanRegion>(OCEAN_REGIONS[0]); // Arabian Sea default
  const [timeIndex, setTimeIndex] = useState<number>(17); // Jan 18, 2026
  const [isPlayingTime, setIsPlayingTime] = useState<boolean>(false);

  // Layer toggles
  const [showObservations, setShowObservations] = useState<boolean>(true);
  const [showCurrents, setShowCurrents] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(false);

  // Selections
  const [selectedObservation, setSelectedObservation] = useState<ObservationPoint | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<OceanAnomaly | null>(null);
  const [activeComparison, setActiveComparison] = useState<ModelComparisonResult | null>(null);

  // UI Modes
  const [activeView, setActiveView] = useState<'explore' | 'compare' | 'time' | 'observations' | 'insights' | 'research'>('explore');
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isComparisonDrawerOpen, setIsComparisonDrawerOpen] = useState<boolean>(false);
  const [isDemoTourActive, setIsDemoTourActive] = useState<boolean>(false);
  const [demoTourStep, setDemoTourStep] = useState<number>(0);

  // Hover Telemetry
  const [hoverCoordinates, setHoverCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [hoverValue, setHoverValue] = useState<{ value: number; unit: string } | null>(null);

  // Micro-interaction Feedback Toast
  const [microToast, setMicroToast] = useState<string | null>(null);
  const [, setObservationRefresh] = useState(0);

  // Load real Argo observations for the currently selected timeline date.
  useEffect(() => {
    let cancelled = false;
    fetchObservations(getTimelineDate(timeIndex))
      .then((result) => {
        if (cancelled) return;
        setObservationPoints(result.observations);
        setObservationRefresh((value) => value + 1);
      })
      .catch(() => {
        if (cancelled) return;
        setObservationPoints([]);
        setObservationRefresh((value) => value + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [timeIndex]);

  const triggerToast = (msg: string) => {
    setMicroToast(msg);
    setTimeout(() => setMicroToast(null), 3200);
  };

  // Assistant Chat Messages
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      timestamp: '09:00 AM',
      content: 'Good morning. What would you like to explore today? I can help you investigate depth strata, compare numerical models with Argo floats, or track mesoscale anomalies.',
      type: 'simple',
      actions: [
        { id: 'a1', label: 'Explore Arabian Sea at 500m', prompt: 'Take me to 500 meters in the Arabian Sea and show temperature' },
        { id: 'a2', label: 'Check for Anomalies', prompt: 'Where is the ocean unusually warm?' },
        { id: 'a3', label: 'Compare Model vs Obs', prompt: 'Compare this with observations' },
      ],
    },
  ]);

  // Handle Depth Change
  const handleDepthChange = (depth: DepthLevel) => {
    setCurrentDepth(depth);
    triggerToast(depth === 0 ? 'Surfacing to 0 m...' : `Diving to ${depth} m...`);
  };

  // Handle Variable Change
  const handleVariableChange = (variable: OceanVariable) => {
    setCurrentVariable(variable);
    triggerToast(`Displaying ${variable.toUpperCase()} field...`);
  };

  // Handle Region Change
  const handleRegionChange = (region: OceanRegion) => {
    setCurrentRegion(region);
    triggerToast(`Navigating to ${region.name}...`);
  };

  // Handle Observation Select
  const handleSelectObservation = (obs: ObservationPoint) => {
    setSelectedObservation(obs);
    setIsProfileModalOpen(true);
    triggerToast(`Inspecting ${obs.name}...`);
  };

  // Handle Anomaly Select
  const handleSelectAnomaly = (anom: OceanAnomaly) => {
    setSelectedAnomaly(anom);
    setCurrentDepth(anom.depth);
    setCurrentVariable(anom.variable);
    setShowAnomalies(true);
    triggerToast(`Inspecting ${anom.title} (+${anom.magnitude} ${anom.unit})...`);
  };

  // Handle Model Comparison
  const handleCompareWithModel = async (obs: ObservationPoint) => {
    const comp = await computeModelComparison(obs, currentDepth, currentVariable, getTimelineDate(timeIndex));
    setActiveComparison(comp);
    setIsProfileModalOpen(false);
    setIsComparisonDrawerOpen(true);
    setActiveView('compare');
    triggerToast('Model vs In-Situ Comparison calculated.');
  };

  // AI Orchestrator Execution Handler
  const handleSendMessage = async (query: string) => {
    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);

    const context = {
      currentVariable,
      currentDepth,
      currentRegion,
      currentDateIndex: timeIndex,
      selectedObservation,
      selectedAnomaly,
      showObservations,
      showCurrents,
      showAnomalies,
      activeView,
    };

    const result = await OrchestratorAgent.processQuery(query, context);

    // Apply state mutations
    if (result.updatedState) {
      if (result.updatedState.currentDepth !== undefined) setCurrentDepth(result.updatedState.currentDepth);
      if (result.updatedState.currentVariable !== undefined) setCurrentVariable(result.updatedState.currentVariable);
      if (result.updatedState.currentRegion !== undefined) setCurrentRegion(result.updatedState.currentRegion);
      if (result.updatedState.showObservations !== undefined) setShowObservations(result.updatedState.showObservations);
      if (result.updatedState.showAnomalies !== undefined) setShowAnomalies(result.updatedState.showAnomalies);
      if (result.updatedState.selectedObservation !== undefined) setSelectedObservation(result.updatedState.selectedObservation);
      if (result.updatedState.selectedAnomaly !== undefined) setSelectedAnomaly(result.updatedState.selectedAnomaly);
      if (result.updatedState.isPlayingTime !== undefined) setIsPlayingTime(result.updatedState.isPlayingTime);
    }

    // Execute specific tool consequences
  
    for (const t of result.toolCalls) {
      if (t.tool === 'startDemoTour') {
        setIsDemoTourActive(true);
        setDemoTourStep(0);
      }

      if (t.tool === 'compareModelObservation') {
        const obs =
          result.updatedState?.selectedObservation ||
          selectedObservation ||
          OBSERVATION_POINTS[0];

        if (obs) {
          const comp = await computeModelComparison(
            obs,
            currentDepth,
            currentVariable,
            getTimelineDate(timeIndex)
          );

          setActiveComparison(comp);
          setIsComparisonDrawerOpen(true);
        }
      }

      if (t.tool === 'getProfile') {
        const obs =
          result.updatedState?.selectedObservation ||
          selectedObservation ||
          OBSERVATION_POINTS[0];

        if (obs) {
          setSelectedObservation(obs);
          setIsProfileModalOpen(true);
        }
      }

      if (t.tool === 'setResearchMode') {
        setActiveView('research');
      }
    }

    const botMsg: AssistantMessage = {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: result.assistantResponse,
      type: result.responseType,
      toolCalls: result.toolCalls,
      actions: result.suggestions,
      highlightData: result.highlightData,
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsAssistantOpen(true);
  };

  const handleExecuteAction = (action: SuggestionAction) => {
    handleSendMessage(action.prompt);
  };

  // Demo Tour Stepper Handler (Executing the exact 10-step hackathon script)
  const handleDemoTourNext = () => {
    const nextStep = demoTourStep + 1;
    if (nextStep >= DEMO_STEPS.length) {
      setIsDemoTourActive(false);
      triggerToast('Demo Tour completed!');
      return;
    }

    setDemoTourStep(nextStep);

    if (nextStep === 1) {
      // Step 2: Explore Arabian Sea
      handleRegionChange(OCEAN_REGIONS[0]);
    } else if (nextStep === 2) {
      // Step 3: Depth 500m & Temperature
      setCurrentVariable('temperature');
      handleDepthChange(500);
    } else if (nextStep === 3) {
      // Step 4: Show observations
      setShowObservations(true);
      triggerToast('Argo floats assimilated in Arabian Sea.');
    } else if (nextStep === 4) {
      // Step 5: Inspect Argo Float Profile
      const float = OBSERVATION_POINTS[0];
      if (float) {
        setSelectedObservation(float);
        setIsProfileModalOpen(true);
      } else {
        triggerToast('No Argo profile available for this date yet.');
      }
    } else if (nextStep === 5) {
      // Step 6: Compare Model vs Observation
      setIsProfileModalOpen(false);
      if (OBSERVATION_POINTS[0]) {
        void handleCompareWithModel(OBSERVATION_POINTS[0]);
      } else {
        triggerToast('No Argo profile available for comparison.');
      }
    } else if (nextStep === 6) {
      // Step 7: Anomaly Highlight
      setShowAnomalies(false);
      setSelectedAnomaly(null);
      triggerToast('Anomaly detection will be enabled after the real climatology baseline is connected.');
    } else if (nextStep === 7) {
      // Step 8: Play 30-Day Evolution
      setActiveView('time');
      setIsPlayingTime(true);
    } else if (nextStep === 8) {
      // Step 9: Research Mode
      setActiveView('research');
    } else if (nextStep === 9) {
      // Step 10: Ask AI Research Assistant
      setActiveView('explore');
      setIsAssistantOpen(true);
      handleSendMessage('Explain the temperature difference between the model and observation at 500m in the Arabian Sea.');
    }
  };

  return (
    <div className="ocean-workspace w-screen h-screen flex flex-col bg-[#02070f] overflow-hidden select-none">
      {/* 1. Top Navigation & Telemetry Readout */}
      <TopHeader
        currentRegion={currentRegion}
        hoverCoordinates={hoverCoordinates}
        hoverValue={hoverValue}
        activeView={activeView}
        onOpenDemoTour={() => {
          setIsDemoTourActive(true);
          setDemoTourStep(0);
        }}
        onToggleResearchMode={() => setActiveView(activeView === 'research' ? 'explore' : 'research')}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Vertical Navigation */}
        <NavSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          currentRegion={currentRegion}
          onSelectRegion={handleRegionChange}
          showObservations={showObservations}
          setShowObservations={setShowObservations}
          showCurrents={showCurrents}
          setShowCurrents={setShowCurrents}
          showAnomalies={showAnomalies}
          setShowAnomalies={setShowAnomalies}
        />

        {/* Center Stage: Interactive 3D Ocean Globe */}
        <main className="flex-1 h-full relative">
          <OceanGlobe
            currentVariable={currentVariable}
            currentDepth={currentDepth}
            currentRegion={currentRegion}
            timeIndex={timeIndex}
            showObservations={showObservations}
            showCurrents={showCurrents}
            showAnomalies={showAnomalies}
            selectedObservation={selectedObservation}
            selectedAnomaly={selectedAnomaly}
            onSelectObservation={handleSelectObservation}
            onSelectAnomaly={handleSelectAnomaly}
            onHoverTelemetry={(coords, val) => {
              setHoverCoordinates(coords);
              setHoverValue(val);
            }}
          />

          {/* Proactive Non-Intrusive Assistant Discovery Pill */}
          {!isAssistantOpen && !isDemoTourActive && (
            <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2 p-2.5 rounded-lg bg-[#04111f]/90 backdrop-blur-md border border-cyan-400/35 shadow-ocean-glow max-w-sm">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <div className="text-[11px] text-slate-200">
                <span className="font-semibold text-cyan-300">Data:</span> Copernicus model + Argo observations are connected.
              </div>
              <button
                onClick={() => handleSendMessage('Show me the nearest Argo observations')}
                className="px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold cursor-pointer shrink-0 transition"
              >
                Inspect
              </button>
            </div>
          )}

          {/* Bottom Docked Oceanographic Controls */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pointer-events-none">
            <div className="flex-1 max-w-xl pointer-events-auto flex flex-col gap-2">
              <VariableSelector
                currentVariable={currentVariable}
                onVariableChange={handleVariableChange}
              />
              <DepthSlider
                currentDepth={currentDepth}
                onDepthChange={handleDepthChange}
              />
            </div>

            {/* Time Scrubber (Visible when Time view selected or when timeline active) */}
            <div className="w-full md:w-96 pointer-events-auto">
              <TimeControl
                timeIndex={timeIndex}
                setTimeIndex={setTimeIndex}
                isPlaying={isPlayingTime}
                setIsPlaying={setIsPlayingTime}
              />
            </div>
          </div>
        </main>

        {/* Right Assistant Panel */}
        {isAssistantOpen && (
          <AssistantPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onExecuteAction={handleExecuteAction}
            onClose={() => setIsAssistantOpen(false)}
          />
        )}
      </div>

      {/* 3. Transient Micro-Interaction Feedback Banner */}
      <MicroInteractionToast message={microToast} />

      {/* 4. Vertical Profile Chart Modal */}
      {isProfileModalOpen && (
        <ObservationProfileModal
          observation={selectedObservation}
          onClose={() => setIsProfileModalOpen(false)}
          onCompareWithModel={handleCompareWithModel}
        />
      )}

      {/* 5. Model vs Observation Comparison Drawer */}
      {isComparisonDrawerOpen && (
        <ComparisonPanel
          comparison={activeComparison}
          onClose={() => setIsComparisonDrawerOpen(false)}
        />
      )}

      {/* 6. Insights & Anomalies Inspector */}
      {activeView === 'insights' && (
        <InsightsPanel
          selectedAnomaly={selectedAnomaly}
          onSelectAnomaly={handleSelectAnomaly}
          onClose={() => setActiveView('explore')}
        />
      )}

      {/* 7. Research Mode Workspace */}
      {activeView === 'research' && (
        <ResearchModeView
          state={{
            currentVariable,
            currentDepth,
            currentRegion,
            currentDateIndex: timeIndex,
            isPlayingTime,
            timeSpeed: 1,
            showObservations,
            showCurrents,
            showAnomalies,
            showBathymetryContours: true,
            showGraticules: true,
            selectedObservation,
            selectedAnomaly,
            activeComparison,
            activeView,
            isAssistantOpen,
            isProfileModalOpen,
            isComparisonDrawerOpen,
            isDemoTourActive,
            demoTourStep,
            hoverCoordinates,
            hoverValue,
            microInteraction: microToast,
          }}
          onClose={() => setActiveView('explore')}
        />
      )}

      {/* 8. 10-Step Guided Demo Tour Modal */}
      {isDemoTourActive && (
        <DemoTourModal
          currentStep={demoTourStep}
          onNextStep={handleDemoTourNext}
          onClose={() => setIsDemoTourActive(false)}
        />
      )}
    </div>
  );
};

export default App;
