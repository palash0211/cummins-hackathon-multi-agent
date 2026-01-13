import React, { useEffect, useRef } from 'react'
import { Search, Brain, Wrench, FileText, Save, CheckCircle, AlertCircle } from 'lucide-react'

const AgentFeed = ({ messages, isProcessing }) => {
  const feedEndRef = useRef(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getIcon = (step) => {
    switch (step) {
      case 'fetching_data':
        return <Search className="w-5 h-5" />
      case 'monitor_agent':
        return <Brain className="w-5 h-5 text-blue-400" />
      case 'diagnosis_agent':
        return <Wrench className="w-5 h-5 text-yellow-400" />
      case 'dispatch_agent':
        return <FileText className="w-5 h-5 text-green-400" />
      case 'save_tickets':
        return <Save className="w-5 h-5 text-purple-400" />
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Brain className="w-5 h-5" />
    }
  }

  const getStepLabel = (step) => {
    const labels = {
      'fetching_data': 'Data Fetcher',
      'monitor_agent': 'Monitor Agent',
      'diagnosis_agent': 'Diagnosis Agent',
      'dispatch_agent': 'Dispatch Agent',
      'save_tickets': 'Database',
      'complete': 'Complete',
      'error': 'Error'
    }
    return labels[step] || step
  }

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Agent feed will appear here when processing starts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64 overflow-y-auto space-y-3 pr-2">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-start space-x-3 p-3 rounded-lg transition-all ${
            msg.status === 'started' ? 'bg-gray-700' :
            msg.status === 'completed' ? 'bg-gray-700 border border-green-800' :
            msg.status === 'error' ? 'bg-red-900' : 'bg-gray-700'
          }`}
        >
          <div className="flex-shrink-0 mt-1">
            {getIcon(msg.step)}
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">
                {getStepLabel(msg.step)}
              </span>
              {msg.status === 'started' && (
                <span className="text-xs text-yellow-400">Processing...</span>
              )}
              {msg.status === 'completed' && (
                <span className="text-xs text-green-400">Complete</span>
              )}
            </div>
            <p className="text-sm text-gray-300">{msg.message}</p>

            {/* Show additional data for certain steps */}
            {msg.step === 'monitor_agent' && msg.data && msg.status === 'completed' && (
              <div className="mt-2 text-xs space-y-1">
                {msg.data.critical?.length > 0 && (
                  <div className="text-red-400">
                    Critical: {msg.data.critical.map(p => `${p.truck_id}-${p.part}`).join(', ')}
                  </div>
                )}
                {msg.data.warning?.length > 0 && (
                  <div className="text-yellow-400">
                    Warning: {msg.data.warning.map(p => `${p.truck_id}-${p.part}`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {msg.step === 'diagnosis_agent' && msg.data && msg.status === 'completed' && (
              <div className="mt-2 text-xs space-y-1">
                {msg.data.recommendations?.map((rec, i) => (
                  <div key={i} className={`${
                    rec.action === 'REPLACE_NOW' ? 'text-red-400' :
                    rec.action === 'SERVICE_SOON' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {rec.truck_id} - {rec.part}: {rec.action}
                  </div>
                )).slice(0, 3)}
                {msg.data.recommendations?.length > 3 && (
                  <div className="text-gray-400">
                    ...and {msg.data.recommendations.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {isProcessing && (
        <div className="flex items-center space-x-3 p-3 bg-blue-900 rounded-lg animate-pulse">
          <Brain className="w-5 h-5 text-blue-400 animate-spin" />
          <span className="text-sm">Agents are thinking...</span>
        </div>
      )}

      <div ref={feedEndRef} />
    </div>
  )
}

export default AgentFeed