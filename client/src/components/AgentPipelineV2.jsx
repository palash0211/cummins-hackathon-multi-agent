import React, { useState } from 'react';
import { ChevronRight, Loader, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function AgentPipelineV2({ data, isLoading }) {
  const [expandedStep, setExpandedStep] = useState(0);

  const getStepStatus = (status) => {
    if (status === 'completed') return { icon: <CheckCircle className="w-5 h-5 text-white" />, color: 'bg-green-600', border: 'border-green-600' };
    if (status === 'started') return { icon: <Loader className="w-5 h-5 text-white animate-spin" />, color: 'bg-red-600', border: 'border-red-600' };
    return { icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />, color: 'bg-gray-200', border: 'border-gray-300' };
  };

  const getStepTitle = (step) => {
    const titles = {
      'fetching_data': 'Fleet Data',
      'monitor_agent': 'Monitor Agent',
      'research_agent': 'Research Agent',
      'diagnosis_agent': 'Diagnosis Agent',
      'dispatch_agent': 'Dispatch Agent',
      'save_tickets': 'Save Tickets'
    };
    return titles[step] || step;
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Pipeline Activity</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time intelligent diagnostic workflow</p>
        </div>
        {isLoading && (
          <div className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium animate-pulse">
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Processing Fleet Data...
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute top-8 left-0 w-full h-1 bg-gray-100 -z-10"></div>
        <div className="grid grid-cols-6 gap-4">
          {data.map((step, index) => {
            const statusStyle = getStepStatus(step.status);
            const isActive = expandedStep === index;
            
            return (
              <div 
                key={index} 
                className={`relative flex flex-col items-center cursor-pointer group`}
                onClick={() => setExpandedStep(index)}
              >
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 ${statusStyle.color} ${statusStyle.border} ${isActive ? 'ring-4 ring-offset-2 ring-red-100 scale-110' : 'group-hover:scale-105'}`}
                >
                  {statusStyle.icon}
                </div>
                
                <h3 className={`mt-4 text-sm font-bold text-center ${isActive ? 'text-red-700' : 'text-gray-600'}`}>
                  {getStepTitle(step.step)}
                </h3>
                
                {index < data.length - 1 && (
                  <ArrowRight className="absolute top-6 -right-1/2 w-6 h-6 text-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {expandedStep !== -1 && data[expandedStep] && data[expandedStep].result && (
        <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center">
              <span className="w-2 h-6 bg-red-600 rounded mr-3"></span>
              Analysis Details: {getStepTitle(data[expandedStep].step)}
            </h3>
            {data[expandedStep].agent && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold uppercase rounded-full tracking-wide">
                Agent: {data[expandedStep].agent}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(data[expandedStep].result).map(([key, value]) => (
              <div key={key} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">
                  {key.replace(/_/g, ' ')}
                </div>
                
                {typeof value === 'string' || typeof value === 'number' ? (
                  <div className="text-xl font-bold text-gray-900">{value}</div>
                ) : Array.isArray(value) && value.length > 0 ? (
                  <div className="space-y-3">
                    {value.slice(0, 3).map((item, i) => (
                      <div key={i} className="text-sm border-l-2 border-red-500 pl-3">
                        {typeof item === 'object' ? (
                          <div>
                            <div className="font-bold text-gray-800">{item.truck_id || item.part_name || item.part}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              {item.action || item.recall_status || (item.usage_percentage ? `${item.usage_percentage}% usage` : null)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-700">{item}</span>
                        )}
                      </div>
                    ))}
                    {value.length > 3 && (
                      <div className="text-xs text-red-600 font-medium hover:underline cursor-pointer">
                        +{value.length - 3} more items...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 italic text-sm">No data available</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
