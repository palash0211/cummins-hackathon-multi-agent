import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function AgentPipeline({ data, isLoading }) {
  const [expandedStep, setExpandedStep] = useState(0);

  const getStepIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (status === 'started') return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
    return <AlertCircle className="w-6 h-6 text-gray-400" />;
  };

  const getStepColor = (step) => {
    const colors = {
      'fetching_data': 'from-slate-600 to-slate-700',
      'monitor_agent': 'from-blue-600 to-blue-700',
      'research_agent': 'from-purple-600 to-purple-700',
      'diagnosis_agent': 'from-amber-600 to-amber-700',
      'dispatch_agent': 'from-red-600 to-red-700',
      'save_tickets': 'from-green-600 to-green-700'
    };
    return colors[step] || 'from-gray-600 to-gray-700';
  };

  const getStepTitle = (step) => {
    const titles = {
      'fetching_data': '📊 Fetch Fleet Data',
      'monitor_agent': '🔍 Monitor Agent',
      'research_agent': '🌐 Research Agent',
      'diagnosis_agent': '🔧 Diagnosis Agent',
      'dispatch_agent': '📋 Dispatch Agent',
      'save_tickets': '💾 Save Tickets'
    };
    return titles[step] || step;
  };

  const getStepDescription = (step, result) => {
    const descriptions = {
      'fetching_data': `Loading ${result?.data_count || 0} parts from fleet database`,
      'monitor_agent': `Found ${result?.critical_count || 0} CRITICAL, ${result?.warning_count || 0} WARNING, ${result?.ok_count || 0} OK parts`,
      'research_agent': `Researched ${result?.parts_researched || 0} parts from ${result?.sources_checked || 0} web sources • ${result?.parts_with_recalls || 0} with active recalls`,
      'diagnosis_agent': `Generated ${result?.recommendations_count || 0} detailed recommendations with market insights`,
      'dispatch_agent': `Created ${result?.tickets_created || 0} service tickets (${result?.urgent_count || 0} URGENT) • ${result?.potential_savings || 0} savings`,
      'save_tickets': 'Persisted all tickets to Google Sheets database'
    };
    return descriptions[step] || step;
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">🤖 Multi-Agent Pipeline</h2>
        <p className="text-gray-400">Real-time agent collaboration and handovers</p>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-4">
        {data.map((step, index) => (
          <div key={index} className="relative">
            {/* Connection line */}
            {index < data.length - 1 && (
              <div className="absolute left-8 top-20 w-0.5 h-6 bg-gradient-to-b from-gray-600 to-transparent"></div>
            )}

            {/* Step Card */}
            <div
              onClick={() => setExpandedStep(expandedStep === index ? -1 : index)}
              className="cursor-pointer hover:border-gray-500 transition-all"
            >
              <div className={`bg-gradient-to-r ${getStepColor(step.step)} rounded-lg p-6 border border-gray-600 hover:border-gray-500 transform transition-all`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStepIcon(step.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {getStepTitle(step.step)}
                        </h3>
                        {step.agent && step.agent !== 'system' && (
                          <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                            {step.agent}
                          </span>
                        )}
                      </div>
                      <p className="text-white/80 text-sm">
                        {getStepDescription(step.step, step.result)}
                      </p>
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <ChevronRight
                    className={`w-6 h-6 text-white flex-shrink-0 transition-transform ${
                      expandedStep === index ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Expanded Details */}
                {expandedStep === index && step.result && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(step.result).map(([key, value]) => (
                        <div key={key} className="bg-black/30 rounded p-4">
                          <div className="text-xs uppercase tracking-wider text-white/60 mb-2">
                            {key.replace(/_/g, ' ')}
                          </div>
                          {typeof value === 'string' || typeof value === 'number' ? (
                            <div className="text-lg font-bold text-white">{value}</div>
                          ) : Array.isArray(value) && value.length > 0 ? (
                            <div className="space-y-2">
                              {value.slice(0, 3).map((item, i) => (
                                <div key={i} className="text-sm text-white/80 bg-black/50 rounded p-2">
                                  {typeof item === 'object' ? (
                                    <div>
                                      <div className="font-semibold">{item.truck_id || item.part_name || item.part}</div>
                                      <div className="text-xs text-white/60">
                                        {item.part || item.action || item.recall_status}
                                      </div>
                                    </div>
                                  ) : (
                                    item
                                  )}
                                </div>
                              ))}
                              {value.length > 3 && (
                                <div className="text-xs text-white/60 italic">
                                  +{value.length - 3} more items
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-blue-400">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Pipeline processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
