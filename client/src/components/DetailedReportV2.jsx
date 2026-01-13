import React from 'react';
import { FileText, Activity, CheckCircle, ExternalLink, AlertTriangle, Clock, TrendingUp, Database, Globe, AlertOctagon } from 'lucide-react';

const DetailedReportV2 = ({ agentMessages, tickets, researchData, diagnosisData, monitoringData }) => {
  // Extract web sources from research data
  const webSources = researchData?.parts_research?.flatMap(part => 
    part.web_sources_checked > 0 ? [{ part: part.part_name, sources: part.web_sources_checked }] : []
  ) || [];

  // Generate detailed textual analysis
  const generateAnalysis = () => {
    if (!researchData || !diagnosisData || !monitoringData) {
      return "No analysis data available. Please run a fleet check first.";
    }

    const critical = monitoringData.critical || [];
    const warning = monitoringData.warning || [];
    const totalParts = critical.length + warning.length;
    const researchedParts = researchData.parts_research || [];
    const recommendations = diagnosisData.recommendations || [];
    const recallParts = researchedParts.filter(p => p.recall_status === 'active');

    return {
      overview: `Fleet health analysis completed for ${totalParts} parts requiring attention. System identified ${critical.length} critical components and ${warning.length} warning-level items across the fleet.`,
      
      criticalFindings: critical.length > 0 
        ? critical.map(p => ({
            text: `${p.part} on Truck ${p.truck_id}`,
            details: `Usage: ${p.usage_percentage}% | Risk Level: Critical`
          }))
        : [],
      
      researchInsights: researchedParts.length > 0
        ? `Market intelligence gathered from ${researchData.summary?.total_sources_checked || 0} web sources. ` +
          (recallParts.length > 0 
            ? `${recallParts.length} part(s) have active recalls.` 
            : "") 
        : "Limited market intelligence available.",
      
      recommendations: recommendations.length > 0
        ? recommendations.map(r => ({
            part: r.part,
            action: r.action,
            priority: r.priority,
            cost: r.estimated_cost
          }))
        : [],
      
      webIntelligence: researchedParts.length > 0
        ? researchedParts.map(part => ({
            part: part.part_name,
            recallStatus: part.recall_status,
            marketPrice: part.market_price,
            failurePatterns: part.failure_patterns || [],
            tips: part.maintenance_tips,
            sources: part.web_sources_checked || 0,
            scraped_sources: part.scraped_sources || part.sources_scraped || []
          }))
        : []
    };
  };

  const analysis = generateAnalysis();

  if (typeof analysis === 'string') {
     return (
       <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
         <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
           <FileText className="w-10 h-10 text-gray-300" />
         </div>
         <h2 className="text-xl font-bold text-gray-900 mb-2">Detailed Analysis Report</h2>
         <p className="text-gray-500">Run a fleet check to generate a comprehensive health report.</p>
       </div>
     );
  }

  return (
    <div className="space-y-8 bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 flex items-center">
            <span className="bg-red-600 text-white p-2 rounded mr-4">
              <FileText className="w-6 h-6" />
            </span>
            Fleet Health Report
          </h2>
          <p className="text-gray-500 mt-2 ml-14">
            AI-generated analysis based on real-time diagnostics and market intelligence.
          </p>
        </div>
        <div className="text-right text-sm text-gray-400">
          <div>Report generated</div>
          <div className="font-mono text-gray-600">{new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overview */}
        <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-gray-600" />
            Executive Summary
          </h3>
          <p className="text-gray-700 leading-relaxed text-sm">{analysis.overview}</p>
        </div>

        {/* Web Insights High Level */}
        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-blue-600" />
            Market Intelligence
          </h3>
          <p className="text-gray-700 leading-relaxed text-sm">{analysis.researchInsights}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Critical Findings & Recommendations */}
        <div className="lg:col-span-1 space-y-6">
           {/* Critical Findings List */}
           <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
             <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
               <h3 className="font-bold text-white flex items-center">
                 <AlertOctagon className="w-5 h-5 mr-2" />
                 Critical Issues
               </h3>
               <span className="bg-red-800 text-white text-xs px-2 py-0.5 rounded-full">
                 {analysis.criticalFindings.length} Items
               </span>
             </div>
             <div className="divide-y divide-gray-100">
               {analysis.criticalFindings.length > 0 ? (
                 analysis.criticalFindings.map((item, i) => (
                   <div key={i} className="p-4 hover:bg-red-50 transition-colors">
                     <div className="font-bold text-gray-900 text-sm">{item.text}</div>
                     <div className="text-xs text-red-600 mt-1">{item.details}</div>
                   </div>
                 ))
               ) : (
                 <div className="p-4 text-center text-gray-500 text-sm">No critical issues found.</div>
               )}
             </div>
           </div>

           {/* Recommendations List */}
           <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
             <div className="bg-gray-800 px-4 py-3">
               <h3 className="font-bold text-white flex items-center">
                 <CheckCircle className="w-5 h-5 mr-2" />
                 Action Plan
               </h3>
             </div>
             <div className="divide-y divide-gray-100">
               {analysis.recommendations.map((rec, i) => (
                 <div key={i} className="p-4">
                   <div className="flex justify-between mb-1">
                     <span className="font-bold text-gray-900 text-sm">{rec.part}</span>
                     <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase
                       ${rec.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                       {rec.priority}
                     </span>
                   </div>
                   <p className="text-xs text-gray-600 mb-2">{rec.action}</p>
                   <div className="text-xs text-gray-400 font-mono">Est. Cost: {rec.cost}</div>
                 </div>
               ))}
               {analysis.recommendations.length === 0 && (
                 <div className="p-4 text-center text-gray-500 text-sm">No actions required.</div>
               )}
             </div>
           </div>
        </div>

        {/* Right Column: Web Intelligence Details */}
        <div className="lg:col-span-2">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-2">
            <Globe className="w-5 h-5 mr-2 text-blue-600" />
            Web Research Breakdown
          </h3>
          
          <div className="space-y-4">
            {analysis.webIntelligence.map((item, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 flex items-center">
                      {item.part}
                      {item.recallStatus !== 'none' && (
                        <span className="ml-3 px-2 py-0.5 bg-red-600 text-white text-xs rounded uppercase font-bold tracking-wide animate-pulse">
                          Recall Active
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center mt-1 space-x-4 text-sm">
                      <span className="text-gray-500">Market Price: <b className="text-gray-900">{item.marketPrice}</b></span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">Sources Scanned: <b className="text-blue-600">{item.sources}</b></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <a href={`https://www.google.com/search?q=${item.part}+recall`} target="_blank" rel="noreferrer" 
                       className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-end">
                      Verify on Web <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <h5 className="text-xs font-bold uppercase text-gray-400 mb-2">Common Failure Patterns</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {item.failurePatterns && item.failurePatterns.length > 0 ? (
                        item.failurePatterns.map((fail, fIdx) => (
                          <li key={fIdx} className="text-sm text-gray-700">{fail}</li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400 italic">No specific patterns found</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <h5 className="text-xs font-bold uppercase text-gray-400 mb-2">Maintenance Tips</h5>
                    <p className="text-sm text-gray-700">{item.tips || "Follow standard OEM maintenance schedule."}</p>
                  </div>
                </div>
                
                {item.scraped_sources && item.scraped_sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                     <h5 className="text-xs font-bold uppercase text-gray-400 mb-2">Sources Analyzed</h5>
                     <div className="flex flex-wrap gap-2">
                       {item.scraped_sources.map((source, sIdx) => (
                         <a key={sIdx} href={source.url} target="_blank" rel="noopener noreferrer" 
                            className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition-colors border border-blue-100">
                            <ExternalLink className="w-3 h-3 mr-1 opacity-70" />
                            {source.description || new URL(source.url).hostname}
                         </a>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedReportV2;
