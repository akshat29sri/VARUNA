import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Terminal, ArrowRight, Bot, User, Check, Layers, GitCompare } from 'lucide-react';
import { AssistantMessage, SuggestionAction } from '../../agents/agentTypes';

interface AssistantPanelProps {
  messages: AssistantMessage[];
  onSendMessage: (query: string) => void;
  onExecuteAction: (action: SuggestionAction) => void;
  onClose: () => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  messages,
  onSendMessage,
  onExecuteAction,
  onClose,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    onSendMessage(inputQuery.trim());
    setInputQuery('');
  };

  const starterSuggestions = [
    'Explore temperature in the Arabian Sea at 500m',
    'Where is the ocean unusually warm?',
    'Compare model data with observations',
    'Show how temperature changed over the last 30 days',
    'Show the nearest Argo observations',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[#040d1a]/95 backdrop-blur-2xl border-l border-ocean-800/60 shadow-2xl z-40 flex flex-col justify-between select-none">
      {/* Assistant Header */}
      <div className="px-4 py-3 bg-ocean-950/80 border-b border-ocean-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-ocean-600 to-indigo-600 flex items-center justify-center text-cyan-200 shadow-ocean-glow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">OceanMind Assistant</h3>
            <p className="text-[11px] text-cyan-400 font-mono">Oceanographic Research Colleague</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-ocean-900/60 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-2 max-w-[92%] ${
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            {/* Sender Badge */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              {msg.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-cyan-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span>Research Assistant</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            {/* Content Bubble */}
            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-sm shadow-md'
                  : 'bg-ocean-950/90 text-slate-200 border border-ocean-800/80 rounded-tl-sm shadow-inner'
              }`}
            >
              <p>{msg.content}</p>

              {/* Highlight Metrics */}
              {msg.highlightData && (
                <div className="mt-3 grid grid-cols-1 gap-1.5 pt-2 border-t border-ocean-800/80 font-mono">
                  {msg.highlightData.map((h, idx) => (
                    <div key={idx} className="p-2 rounded bg-abyss-900 border border-ocean-900 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">{h.label}:</span>
                      <span className="text-cyan-300 font-bold">{h.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tool Execution Receipt */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-ocean-800/60 flex flex-wrap gap-1">
                  {msg.toolCalls.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-ocean-900 text-[10px] font-mono text-ocean-300">
                      <Terminal className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{t.tool}()</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Suggestion Buttons */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {msg.actions.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => onExecuteAction(act)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-ocean-900/80 hover:bg-ocean-800 border border-ocean-700/60 text-cyan-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    <span>{act.label}</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Suggestion Pills if few messages */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Suggested Research Queries:</span>
          <div className="flex flex-wrap gap-1.5">
            {starterSuggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(s)}
                className="px-2.5 py-1 rounded-md bg-ocean-950 hover:bg-ocean-900 border border-ocean-800 text-[11px] text-slate-300 hover:text-white transition cursor-pointer text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-ocean-950/80 border-t border-ocean-800/60 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask research questions or instruct workspace..."
          className="flex-1 bg-abyss-900 border border-ocean-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-gradient-to-r from-ocean-600 to-cyan-600 hover:from-ocean-500 hover:to-cyan-500 text-white transition cursor-pointer shadow-ocean-glow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
