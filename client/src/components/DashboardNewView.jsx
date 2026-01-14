import React, { useState, useEffect, useRef } from 'react';
import { Truck, AlertTriangle, Clock, Activity, ChevronLeft, ChevronRight, PlayCircle, Shuffle, RefreshCw } from 'lucide-react';
import { get, post } from '../utils/api-client';
import AgentFeedV2 from './AgentFeedV2';
import TicketListV2 from './TicketListV2';

const DashboardNewView = () => {
  const [drawerWidth, setDrawerWidth] = useState(400); // Initial drawer width
  const [isResizing, setIsResizing] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('tickets'); // 'tickets' or 'fleet-data'
  const [fleetData, setFleetData] = useState([]);
  const [stats, setStats] = useState({
    total_trucks: 0,
    total_parts: 0,
    critical_parts: 0,
    warning_parts: 0,
    total_tickets: 0,
    pending_tickets: 0,
    completed_tickets: 0
  });

  const drawerRef = useRef(null);
  const MIN_DRAWER_WIDTH = 300;
  const MAX_DRAWER_WIDTH = 800;

  useEffect(() => {
    fetchStats();
    fetchTickets();
    fetchFleetData();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= MIN_DRAWER_WIDTH && newWidth <= MAX_DRAWER_WIDTH) {
        setDrawerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const fetchStats = async () => {
    try {
      const data = await get('/api/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const fetchFleetData = async () => {
    try {
      const data = await get('/api/fleet-data');
      setFleetData(data.data);
    } catch (error) {
      console.error('Error fetching fleet data:', error);
    }
  };

  const generateRandomData = async () => {
    try {
      const response = await post('/api/generate-random-data');
      if (response.status === 'success') {
        setTickets([]);
        setAgentMessages([]);
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
    setIsDrawerCollapsed(false); // Auto-expand drawer when starting

    try {
      let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      baseURL = baseURL.replace(/\/+$/, '');
      const eventSource = new EventSource(`${baseURL}/api/check-fleet-stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'agent_update') {
            const agentName = data.agent || 'system';
            const message = data.message || '';
            
            setAgentMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              
              if (lastMsg && lastMsg.step === agentName && lastMsg.status === 'thinking') {
                return [
                  ...prev.slice(0, -1), 
                  { ...lastMsg, message: lastMsg.message + message }
                ];
              }
              
              return [...prev, {
                step: agentName,
                status: 'thinking',
                message: message,
                timestamp: new Date().toISOString()
              }];
            });
          }
          else if (data.type === 'agent_complete') {
            const agentName = data.agent || 'system';
            const summary = data.summary || 'Completed';
            
            setAgentMessages(prev => [...prev, {
              step: agentName,
              status: 'completed',
              message: `✓ ${agentName} completed: ${summary}`,
              timestamp: new Date().toISOString()
            }]);
          }
          else if (data.type === 'tickets_created') {
            if (data.tickets && Array.isArray(data.tickets)) {
              setTickets(data.tickets);
              setAgentMessages(prev => [...prev, {
                step: 'system',
                status: 'completed',
                message: `📋 Created ${data.tickets.length} service tickets`,
                timestamp: new Date().toISOString()
              }]);
            }
          }
          else if (data.type === 'complete') {
            setAgentMessages(prev => [...prev, {
              step: 'system',
              status: 'completed',
              message: data.message || '✅ Multi-agent orchestration complete',
              timestamp: new Date().toISOString()
            }]);
            
            eventSource.close();
            setIsProcessing(false);
            fetchStats();
            fetchTickets();
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
        setAgentMessages(prev => [...prev, {
          step: 'error',
          status: 'error',
          message: 'Connection failed. Check server configuration.',
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

  const toggleDrawer = () => {
    setIsDrawerCollapsed(!isDrawerCollapsed);
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white overflow-hidden">
      {/* Main Content - Tickets View */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginRight: isDrawerCollapsed ? '0px' : `${drawerWidth}px` }}
      >
        {/* Header */}
        <header className="bg-gradient-to-r from-red-700 to-red-600 shadow-lg border-b border-red-800">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                  <Truck className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Cummins Fleet Monitor</h1>
                  <p className="text-red-100 text-sm flex items-center mt-0.5">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    {stats.total_trucks} Active Trucks • {stats.total_parts} Components
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={generateRandomData}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Random Data</span>
                </button>
                <button
                  onClick={resetData}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <div className="flex bg-red-800 rounded-lg p-1 shadow-lg border border-red-700">
                  <button
                    onClick={() => setViewMode('tickets')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      viewMode === 'tickets'
                        ? 'bg-white text-red-700 shadow-md'
                        : 'text-red-100 hover:text-white'
                    }`}
                  >
                    Service Tickets
                  </button>
                  <button
                    onClick={() => setViewMode('fleet-data')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      viewMode === 'fleet-data'
                        ? 'bg-white text-red-700 shadow-md'
                        : 'text-red-100 hover:text-white'
                    }`}
                  >
                    Fleet Data
                  </button>
                </div>
                <button
                  onClick={runFleetCheck}
                  disabled={isProcessing}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg
                    ${isProcessing 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-white text-red-700 hover:bg-red-50 hover:shadow-xl'}`}
                >
                  <PlayCircle className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isProcessing ? 'Processing...' : 'Run Diagnostics'}</span>
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-red-800 bg-opacity-50 rounded-lg px-4 py-3 border border-red-700">
                <div className="text-red-200 text-xs font-medium uppercase tracking-wide">Critical Parts</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.critical_parts}</div>
              </div>
              <div className="bg-red-800 bg-opacity-50 rounded-lg px-4 py-3 border border-red-700">
                <div className="text-red-200 text-xs font-medium uppercase tracking-wide">Warning Parts</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.warning_parts}</div>
              </div>
              <div className="bg-red-800 bg-opacity-50 rounded-lg px-4 py-3 border border-red-700">
                <div className="text-red-200 text-xs font-medium uppercase tracking-wide">Total Tickets</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.total_tickets}</div>
              </div>
              <div className="bg-red-800 bg-opacity-50 rounded-lg px-4 py-3 border border-red-700">
                <div className="text-red-200 text-xs font-medium uppercase tracking-wide">Pending</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.pending_tickets}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
                {viewMode === 'tickets' ? 'Generated Service Tickets' : 'Fleet Parts Data'}
              </h2>
              <span className="text-sm text-gray-400">
                <Clock className="w-4 h-4 inline mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            
            {viewMode === 'tickets' ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
                <TicketListV2 tickets={tickets} />
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-900 bg-opacity-50 border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-100 uppercase tracking-wider">Truck ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-100 uppercase tracking-wider">Part Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-100 uppercase tracking-wider">Current Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-100 uppercase tracking-wider">Max Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-100 uppercase tracking-wider">Usage %</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-red-100 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {fleetData.map((part, index) => {
                        const currentHours = parseInt(part.current_hours || 0);
                        const maxHours = parseInt(part.max_hours || 1);
                        const usagePercent = Math.round((currentHours / maxHours) * 100);
                        const status = usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'ok';
                        
                        return (
                          <tr key={index} className="hover:bg-gray-700 transition-colors">
                            <td className="px-4 py-3 text-sm text-white font-medium">{part.truck_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{part.part_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{currentHours.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{maxHours.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-semibold ${
                                status === 'critical' ? 'text-red-400' :
                                status === 'warning' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {usagePercent}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                status === 'critical' ? 'bg-red-900 text-red-200 border border-red-700' :
                                status === 'warning' ? 'bg-yellow-900 text-yellow-200 border border-yellow-700' :
                                'bg-green-900 text-green-200 border border-green-700'
                              }`}>
                                {status === 'critical' ? '🔴 Critical' : status === 'warning' ? '⚠️ Warning' : '✅ OK'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Resizable Drawer - Live Activity Feed */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full bg-gray-800 border-l border-gray-700 shadow-2xl transition-transform duration-300 ${
          isDrawerCollapsed ? 'translate-x-full' : 'translate-x-0'
        }`}
        style={{ width: `${drawerWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 hover:bg-red-500 cursor-col-resize transition-colors"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute left-[-4px] top-1/2 transform -translate-y-1/2 w-2 h-12 bg-red-600 rounded-full"></div>
        </div>

        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-red-700 to-red-600 border-b border-red-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-700 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Live Activity Feed</h3>
                <p className="text-red-100 text-xs">{agentMessages.length} events</p>
              </div>
            </div>
            <button
              onClick={toggleDrawer}
              className="w-8 h-8 rounded-lg bg-red-800 hover:bg-red-900 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="h-[calc(100vh-80px)] overflow-hidden p-4">
          <div className="h-full">
            <AgentFeedV2 messages={agentMessages} isProcessing={isProcessing} fullHeight={true} />
          </div>
        </div>
      </div>

      {/* Collapsed Drawer Toggle Button */}
      {isDrawerCollapsed && (
        <button
          onClick={toggleDrawer}
          className="fixed top-1/2 right-4 transform -translate-y-1/2 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-3 rounded-l-xl shadow-2xl z-50 border border-red-800 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Resizing Overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
};

export default DashboardNewView;
