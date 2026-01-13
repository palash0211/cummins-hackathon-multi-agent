import React from 'react'
import { FileText, Activity, CheckCircle, ExternalLink, AlertTriangle, Clock, TrendingUp, Database, Globe } from 'lucide-react'

const DetailedReport = ({ agentMessages, tickets, researchData, diagnosisData, monitoringData }) => {
  // Extract web sources from research data
  const webSources = researchData?.parts_research?.flatMap(part => 
    part.web_sources_checked > 0 ? [{ part: part.part_name, sources: part.web_sources_checked }] : []
  ) || []

  // Generate detailed textual analysis
  const generateAnalysis = () => {
    if (!researchData || !diagnosisData || !monitoringData) {
      return "No analysis data available. Please run a fleet check first."
    }

    const critical = monitoringData.critical || []
    const warning = monitoringData.warning || []
    const totalParts = critical.length + warning.length
    const researchedParts = researchData.parts_research || []
    const recommendations = diagnosisData.recommendations || []
    const recallParts = researchedParts.filter(p => p.recall_status === 'active')

    return {
      overview: `Fleet health analysis completed for ${totalParts} parts requiring attention. System identified ${critical.length} critical components and ${warning.length} warning-level items across the fleet.`,
      
      criticalFindings: critical.length > 0 
        ? `CRITICAL FINDINGS: ${critical.map(p => `${p.part} on Truck ${p.truck_id} (${p.usage_percentage}% usage)`).join(', ')}. These components require immediate attention to prevent potential failures and costly downtime.`
        : "No critical findings detected at this time.",
      
      researchInsights: researchedParts.length > 0
        ? `Market intelligence gathered from ${researchData.summary?.total_sources_checked || 0} web sources. ` +
          (recallParts.length > 0 
            ? `⚠️ RECALL ALERT: ${recallParts.length} part(s) have active recalls - ${recallParts.map(p => p.part_name).join(', ')}. ` 
            : "") +
          `Price analysis indicates market rates ranging from budget to premium options for optimal cost management.`
        : "Limited market intelligence available.",
      
      recommendations: recommendations.length > 0
        ? `RECOMMENDED ACTIONS: ${recommendations.map((r, i) => 
            `(${i+1}) ${r.part} - ${r.action} (Priority: ${r.priority}, Est. Cost: ${r.estimated_cost})`
          ).join('; ')}.`
        : "No specific recommendations generated.",
      
      webIntelligence: researchedParts.length > 0
        ? researchedParts.map(part => ({
            part: part.part_name,
            details: `${part.part_name}: ${part.recall_status !== 'none' ? '🔴 Recall Status: ' + part.recall_status : '✅ No recalls'}. Market Price: ${part.market_price}. Common Issues: ${part.failure_patterns?.join(', ') || 'Data pending'}. Recommended Suppliers: ${part.suppliers?.join(', ') || 'See service tickets'}. Maintenance: ${part.maintenance_tips || 'Follow OEM schedule'}.`,
            urgency: part.urgency_multiplier || 1.0,
            sources: part.web_sources_checked || 0
          }))
        : []
    }
  }

  const analysis = generateAnalysis()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 border border-blue-500">
        <h2 className="text-3xl font-bold mb-2 flex items-center">
          <FileText className="w-8 h-8 mr-3" />
          Detailed Analysis Report
        </h2>
        <p className="text-gray-300">Comprehensive AI-powered fleet health analysis with real-time web intelligence</p>
        <p className="text-xs text-gray-400 mt-2">Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
          Executive Summary
        </h3>
        {typeof analysis === 'string' ? (
          <p className="text-gray-300 leading-relaxed">{analysis}</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-semibold mb-2 text-blue-400">Overview</h4>
              <p className="text-gray-300 leading-relaxed">{analysis.overview}</p>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-red-500">
              <h4 className="font-semibold mb-2 text-red-400">Critical Findings</h4>
              <p className="text-gray-300 leading-relaxed">{analysis.criticalFindings}</p>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-purple-500">
              <h4 className="font-semibold mb-2 text-purple-400 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Web Intelligence Insights
              </h4>
              <p className="text-gray-300 leading-relaxed">{analysis.researchInsights}</p>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-green-500">
              <h4 className="font-semibold mb-2 text-green-400">Recommendations</h4>
              <p className="text-gray-300 leading-relaxed">{analysis.recommendations}</p>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Part Analysis with Web References */}
      {analysis.webIntelligence && analysis.webIntelligence.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <Database className="w-6 h-6 mr-2 text-purple-500" />
            Part-by-Part Intelligence Analysis
          </h3>
          <div className="space-y-4">
            {analysis.webIntelligence.map((item, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  item.urgency > 1.5 ? 'bg-red-900/30 border-red-500' :
                  item.urgency > 1.2 ? 'bg-yellow-900/30 border-yellow-500' :
                  'bg-gray-900 border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-lg">{item.part}</h4>
                  <div className="flex items-center space-x-2">
                    {item.urgency > 1.0 && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-600">
                        Urgency: {item.urgency}x
                      </span>
                    )}
                    <span className="px-2 py-1 rounded text-xs bg-purple-600 flex items-center">
                      <Globe className="w-3 h-3 mr-1" />
                      {item.sources} sources
                    </span>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed text-sm">{item.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Web Sources Reference Section */}
      {researchData?.parts_research && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <ExternalLink className="w-6 h-6 mr-2 text-green-500" />
            Web Research Sources & References
          </h3>
          <div className="space-y-3">
            {researchData.parts_research.map((part, index) => (
              <div key={index} className="bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-400">{part.part_name}</h4>
                  <span className="text-xs text-gray-500">
                    {part.web_sources_checked || 0} sources checked
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <p className="mb-2">Research Categories:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {part.web_sources_checked > 0 ? (
                      <>
                        {part.sources_scraped && part.sources_scraped.length > 0 ? (
                          part.sources_scraped.map((source, idx) => (
                            <li key={idx} className="text-green-400">
                              ✅ {source.category} - {source.description}
                              {source.url && (
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-400 hover:underline"
                                >
                                  [link]
                                </a>
                              )}
                            </li>
                          ))
                        ) : (
                          <li className="text-yellow-400">⏳ Sources identified but content pending</li>
                        )}
                      </>
                    ) : (
                      <li className="text-gray-500">⚠️ No web sources scraped for this part</li>
                    )}
                    {part.recall_status !== 'none' && (
                      <li className="text-red-400 font-semibold">
                        ⚠️ Active Recall Found: {part.recall_details || 'See NHTSA database'}
                      </li>
                    )}
                  </ul>
                </div>
                {part.suppliers && part.suppliers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Recommended Suppliers:</p>
                    <div className="flex flex-wrap gap-2">
                      {part.suppliers.map((supplier, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">
                          {supplier}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700">
            <p className="text-xs text-gray-400 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-blue-400" />
              <span>
                Total web sources checked: <strong className="text-blue-300">{researchData.summary?.total_sources_checked || 0}</strong> | 
                Data freshness: <strong className="text-blue-300">{researchData.summary?.data_freshness || 'N/A'}</strong>
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Agent Activity Feed */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-500" />
          Agent Activity Feed
        </h3>
        {agentMessages.length > 0 ? (
          <div className="space-y-2">
            {agentMessages.map((msg, index) => (
              <div 
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-900 rounded-lg hover:bg-gray-850 transition-colors"
              >
                <div className={`mt-1 ${
                  msg.status === 'completed' ? 'text-green-500' :
                  msg.status === 'processing' ? 'text-yellow-500' :
                  'text-blue-500'
                }`}>
                  {msg.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-300">
                    {msg.step.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-400">{msg.message}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No agent activity yet. Run a fleet check to see agents in action.</p>
        )}
      </div>

      {/* Service Tickets */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
          Service Tickets Generated
        </h3>
        {tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  ticket.priority === 'URGENT' ? 'bg-red-900/30 border-red-500' :
                  ticket.priority === 'HIGH' ? 'bg-yellow-900/30 border-yellow-500' :
                  'bg-gray-900 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold">{ticket.part} - Truck {ticket.truck_id}</h4>
                    <p className="text-sm text-gray-400">{ticket.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      ticket.priority === 'URGENT' ? 'bg-red-600' :
                      ticket.priority === 'HIGH' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}>
                      {ticket.priority}
                    </span>
                    <p className="text-sm font-bold mt-2">{ticket.estimated_cost}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>📍 Location: {ticket.location}</p>
                  <p>⏰ ETA: {ticket.estimated_time}</p>
                  <p>🔧 Recommended Action: {ticket.recommended_action}</p>
                  {ticket.notes && <p className="italic">💡 Notes: {ticket.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No service tickets generated yet. Run a fleet check to create tickets.</p>
        )}
      </div>

      {/* Footer Note */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 border border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          This report is generated by AI agents using real-time web intelligence. 
          All recommendations should be verified with certified Cummins technicians.
        </p>
      </div>
    </div>
  )
}

export default DetailedReport
