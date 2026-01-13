import React, { useState, useEffect } from 'react';
import { Truck, AlertTriangle, CheckCircle, Clock, DollarSign, Activity, Wrench, RefreshCw, Shuffle, Server } from 'lucide-react';
import { get, post } from '../utils/api-client';
import AgentFeedV2 from './AgentFeedV2';
import AgentPipelineV2 from './AgentPipelineV2';
import TicketListV2 from './TicketListV2';
import StatCardV2 from './StatCardV2';

const DashboardV2 = ({ onReportDataUpdate }) => {
  const [stats, setStats] = useState({
    total_trucks: 0,
    total_parts: 0,
    critical_parts: 0,
    warning_parts: 0,
    total_tickets: 0,
    pending_tickets: 0,
    completed_tickets: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [fleetData, setFleetData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pipelineData, setPipelineData] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [diagnosisData, setDiagnosisData] = useState(null);
  const [monitoringData, setMonitoringData] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchFleetData();
    fetchTickets();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await get('/api/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFleetData = async () => {
    try {
      const data = await get('/api/fleet-data');
      setFleetData(data.data);
    } catch (error) {
      console.error('Error fetching fleet data:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const data = await get('/api/tickets');
      setTickets(data.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const generateRandomData = async () => {
    try {
      const response = await post('/api/generate-random-data');
      if (response.status === 'success') {
        setTickets([]);
        setAgentMessages([]);
        setSummary(null);
        await fetchFleetData();
        await fetchStats();
        await fetchTickets();
        console.log(`Generated ${response.data_count} random fleet parts`);
      }
    } catch (error) {
      console.error('Error generating random data:', error);
    }
  };

  const resetData = async () => {
    try {
      const response = await post('/api/reset-data');
      if (response.status === 'success') {
        setTickets([]);
        setAgentMessages([]);
        setSummary(null);
        await fetchFleetData();
        await fetchStats();
        await fetchTickets();
        console.log('Data reset to default successfully');
      }
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  };

  const runFleetCheck = async () => {
    setIsProcessing(true);
    setAgentMessages([]);
    setSummary(null);
    setPipelineData(null);

    // Use EventSource for streaming updates
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const eventSource = new EventSource(`${baseURL}/api/check-fleet-stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'step') {
            // Standard step update
            setAgentMessages(prev => [...prev, {
              step: data.step,
              status: data.status,
              message: data.message,
              timestamp: new Date().toISOString()
            }]);
          } 
          else if (data.type === 'agent_update') {
            // Detailed agent update (scraping, thinking)
            const agentData = data.data;
            
            setAgentMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              
              // If we are receiving thinking tokens
              if (agentData.status === 'thinking' && agentData.token) {
                // If last message is also thinking from same step, append
                if (lastMsg && lastMsg.status === 'thinking' && lastMsg.step === agentData.step) {
                  const updatedMsg = { ...lastMsg, message: lastMsg.message + agentData.token };
                  return [...prev.slice(0, -1), updatedMsg];
                } else {
                  // New thinking block
                  return [...prev, {
                    step: agentData.step,
                    status: 'thinking',
                    message: agentData.token, // Start with first token
                    timestamp: new Date().toISOString()
                  }];
                }
              }
              
              // Normal agent log (e.g. "scraped url", "searching")
              return [...prev, {
                step: agentData.step,
                status: agentData.status,
                message: agentData.message,
                timestamp: new Date().toISOString()
              }];
            });
          }
          else if (data.type === 'complete') {
            // Workflow complete with final data
            const result = data.data;
            setMonitoringData(result.monitoring);
            setResearchData(result.research);
            setDiagnosisData(result.diagnosis);
            
            if (result.dispatch?.tickets) {
              setTickets(result.dispatch.tickets);
            }
            if (result.dispatch?.summary) {
              setSummary(result.dispatch.summary);
            }
            
            if (onReportDataUpdate) {
              onReportDataUpdate({
                agentMessages: [], // cleared or keep history?
                tickets: result.dispatch?.tickets || [],
                researchData: result.research,
                diagnosisData: result.diagnosis,
                monitoringData: result.monitoring
              });
            }
            
            eventSource.close();
            setIsProcessing(false);
            fetchStats();
          }
          else if (data.type === 'error') {
            console.error('Stream error:', data.message);
            setAgentMessages(prev => [...prev, {
              step: 'error',
              status: 'error',
              message: data.message,
              timestamp: new Date().toISOString()
            }]);
            eventSource.close();
            setIsProcessing(false);
          }

        } catch (e) {
          console.error("Error parsing event data:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource connection failed:", err);
        const status = err?.target?.readyState;
        console.error("ReadyState:", status, "(0=connecting, 1=open, 2=closed)");
        
        setAgentMessages(prev => [...prev, {
          step: 'error',
          status: 'error',
          message: 'Connection failed. Check server CORS configuration and ensure backend is running.',
          timestamp: new Date().toISOString()
        }]);
        
        eventSource.close();
        setIsProcessing(false);
      };

    } catch (error) {
      console.error('Error initiating fleet check stream:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
         <div className="mb-4 md:mb-0">
           <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fleet Dashboard</h1>
           <p className="mt-1 text-sm text-gray-500 flex items-center">
             <Server className="w-4 h-4 mr-1.5 text-gray-400" />
             {fleetData.length > 0 ? `Monitoring ${fleetData.length} active components` : 'No active fleet data'}
             <span className="mx-2 text-gray-300">|</span>
             Last updated: {new Date().toLocaleTimeString()}
           </p>
         </div>
         
         <div className="flex items-center space-x-3">
            <button 
              onClick={generateRandomData}
              className="group flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors border border-purple-200"
            >
              <Shuffle className="w-4 h-4 mr-2 text-purple-600 transition-transform group-hover:rotate-180" />
              Simulate Data
            </button>
            <button 
              onClick={resetData}
              className="group flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors border border-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2 text-gray-500 transition-transform group-hover:rotate-180" />
              Reset
            </button>
            <button 
              onClick={runFleetCheck}
              disabled={isProcessing}
              className={`flex items-center px-6 py-2.5 text-sm font-bold text-white rounded-md shadow-sm transition-all
                ${isProcessing ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-red-200 hover:shadow-red-300 hover:-translate-y-0.5'}`}
            >
              {isProcessing ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Run Fleet Check
                </>
              )}
            </button>
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCardV2
          title="Total Trucks"
          value={stats.total_trucks}
          icon={<Truck className="w-6 h-6" />}
          color="blue"
        />
        <StatCardV2
          title="Critical Parts"
          value={stats.critical_parts}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
        <StatCardV2
          title="Warning Parts"
          value={stats.warning_parts}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
        />
        <StatCardV2
          title="Active Tickets"
          value={stats.pending_tickets}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Agent Pipeline Visualization */}
      {pipelineData && (
        <AgentPipelineV2 data={pipelineData} isLoading={isProcessing} />
      )}

      {/* Summary Alert */}
      {summary && (
        <div className="mb-10 bg-white rounded-xl shadow-lg border-l-4 border-l-green-500 p-6 flex flex-col md:flex-row items-center justify-between animate-fadeIn">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center mb-1">
              <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
              Analysis Complete
            </h3>
            <p className="text-gray-500">
              Potential Savings Identified: <span className="font-bold text-green-600">${summary.potential_savings?.toLocaleString() || 0}</span>
            </p>
          </div>
          <div className="flex items-center space-x-8 mt-4 md:mt-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.urgent_count || 0}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Urgent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{summary.high_count || 0}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.total_tickets || 0}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Agent Feed - Takes 1 column */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-red-600" />
              Live Activity Feed
            </h2>
          </div>
          <div className="flex-1 p-4 bg-gray-50/50">
            <AgentFeedV2 messages={agentMessages} isProcessing={isProcessing} />
          </div>
        </div>

        {/* Ticket List - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Wrench className="w-5 h-5 mr-2 text-red-600" />
              Generated Service Tickets
            </h2>
            <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {tickets.length} Pending
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            <TicketListV2 tickets={tickets} />
          </div>
        </div>
      </div>

      {/* Fleet Parts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Fleet Inventory Status</h2>
          <button className="text-sm text-blue-600 font-medium hover:text-blue-800">View Full Inventory</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3 border-b border-gray-100">Truck ID</th>
                <th className="px-6 py-3 border-b border-gray-100">Part Name</th>
                <th className="px-6 py-3 border-b border-gray-100">Health / Usage</th>
                <th className="px-6 py-3 border-b border-gray-100">Status</th>
                <th className="px-6 py-3 border-b border-gray-100">Last Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fleetData.slice(0, 8).map((part, index) => {
                const usage = part.max_hours > 0
                  ? Math.round((part.current_hours / part.max_hours) * 100)
                  : 0;
                const status = usage > 90 ? 'critical' : usage > 80 ? 'warning' : 'ok';

                return (
                  <tr key={index} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{part.truck_id}</td>
                    <td className="px-6 py-4 text-gray-600">{part.part_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-3">
                          <div
                            className={`h-1.5 rounded-full ${
                              status === 'critical' ? 'bg-red-600' :
                              status === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usage, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${
                           status === 'critical' ? 'text-red-600' :
                           status === 'warning' ? 'text-orange-500' : 'text-green-600'
                        }`}>{usage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider ${
                        status === 'critical' ? 'bg-red-100 text-red-700' :
                        status === 'warning' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{part.last_service}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {fleetData.length === 0 && (
             <div className="p-8 text-center text-gray-400">No fleet data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardV2;
