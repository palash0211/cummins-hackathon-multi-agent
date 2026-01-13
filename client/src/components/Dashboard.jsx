import React, { useState, useEffect } from 'react'
import { Truck, AlertTriangle, CheckCircle, Clock, DollarSign, Activity, Wrench, RefreshCw, Shuffle } from 'lucide-react'
import { get, post } from '../utils/api-client'
import AgentFeed from './AgentFeed'
import AgentPipeline from './AgentPipeline'
import TicketList from './TicketList'

const Dashboard = ({ onReportDataUpdate }) => {
  const [stats, setStats] = useState({
    total_trucks: 0,
    total_parts: 0,
    critical_parts: 0,
    warning_parts: 0,
    total_tickets: 0,
    pending_tickets: 0,
    completed_tickets: 0
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentMessages, setAgentMessages] = useState([])
  const [tickets, setTickets] = useState([])
  const [fleetData, setFleetData] = useState([])
  const [summary, setSummary] = useState(null)
  const [pipelineData, setPipelineData] = useState(null)
  const [researchData, setResearchData] = useState(null)
  const [diagnosisData, setDiagnosisData] = useState(null)
  const [monitoringData, setMonitoringData] = useState(null)

  useEffect(() => {
    fetchStats()
    fetchFleetData()
    fetchTickets()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await get('/api/stats')
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchFleetData = async () => {
    try {
      const data = await get('/api/fleet-data')
      setFleetData(data.data)
    } catch (error) {
      console.error('Error fetching fleet data:', error)
    }
  }

  const fetchTickets = async () => {
    try {
      const data = await get('/api/tickets')
      setTickets(data.data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  const generateRandomData = async () => {
    try {
      const response = await post('/api/generate-random-data')
      if (response.status === 'success') {
        // Clear tickets and refresh data
        setTickets([])
        setAgentMessages([])
        setSummary(null)
        await fetchFleetData()
        await fetchStats()
        await fetchTickets() // Also refresh tickets
        // Simple console log instead of alert
        console.log(`Generated ${response.data_count} random fleet parts`)
      }
    } catch (error) {
      console.error('Error generating random data:', error)
    }
  }

  const resetData = async () => {
    try {
      const response = await post('/api/reset-data')
      if (response.status === 'success') {
        // Clear tickets and refresh data
        setTickets([])
        setAgentMessages([])
        setSummary(null)
        await fetchFleetData()
        await fetchStats()
        await fetchTickets() // Also refresh tickets
        // Simple console log instead of alert
        console.log('Data reset to default successfully')
      }
    } catch (error) {
      console.error('Error resetting data:', error)
    }
  }

  const runFleetCheck = async () => {
    setIsProcessing(true)
    setAgentMessages([])
    setSummary(null)
    setPipelineData(null)

    try {
      const response = await post('/api/check-fleet')
      
      // Set pipeline data for visualization
      if (response.steps) {
        setPipelineData(response.steps)
      }
      
      // Store full data for detailed report
      const monitoring = response.monitoring
      const research = response.research
      const diagnosis = response.diagnosis
      
      setMonitoringData(monitoring)
      setResearchData(research)
      setDiagnosisData(diagnosis)
      
      // Update state with results
      if (monitoring) {
        const messages = [
          {
            step: 'monitor_agent',
            status: 'completed',
            message: `Found ${monitoring.critical?.length || 0} critical and ${monitoring.warning?.length || 0} warning parts`
          },
          {
            step: 'research_agent',
            status: 'completed',
            message: `Researched ${research?.summary?.total_parts_researched || 0} parts from web sources`
          },
          {
            step: 'diagnosis_agent',
            status: 'completed',
            message: `Generated ${diagnosis?.recommendations?.length || 0} recommendations`
          },
          {
            step: 'dispatch_agent',
            status: 'completed',
            message: `Created ${response.dispatch?.tickets?.length || 0} service tickets`
          }
        ]
        setAgentMessages(messages)
        
        // Update parent with report data
        if (onReportDataUpdate) {
          onReportDataUpdate({
            agentMessages: messages,
            tickets: response.dispatch?.tickets || [],
            researchData: research,
            diagnosisData: diagnosis,
            monitoringData: monitoring
          })
        }
      }

      if (response.dispatch?.tickets) {
        setTickets(response.dispatch.tickets)
      }

      if (response.dispatch?.summary) {
        setSummary(response.dispatch.summary)
      }

      fetchStats()
    } catch (error) {
      console.error('Error running fleet check:', error)
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Action Buttons */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {fleetData.length > 0 && `Monitoring ${fleetData.length} parts | Last updated: ${new Date().toLocaleTimeString()}`}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={generateRandomData}
            className="px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 bg-purple-600 hover:bg-purple-700 active:scale-95"
            title="Generate random fleet data for demo"
          >
            <span className="flex items-center space-x-2">
              <Shuffle className="w-5 h-5" />
              <span>Random Data</span>
            </span>
          </button>
          <button
            onClick={resetData}
            className="px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 bg-orange-600 hover:bg-orange-700 active:scale-95"
            title="Reset to default data"
          >
            <span className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5" />
              <span>Reset</span>
            </span>
          </button>
          <button
            onClick={runFleetCheck}
            disabled={isProcessing}
            className={`px-6 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${
              isProcessing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center space-x-2">
                <Activity className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Wrench className="w-5 h-5" />
                <span>Run Fleet Check</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Trucks"
          value={stats.total_trucks}
          icon={<Truck className="w-8 h-8" />}
          color="blue"
        />
        <StatCard
          title="Critical Parts"
          value={stats.critical_parts}
          icon={<AlertTriangle className="w-8 h-8" />}
          color="red"
        />
        <StatCard
          title="Warning Parts"
          value={stats.warning_parts}
          icon={<Clock className="w-8 h-8" />}
          color="yellow"
        />
        <StatCard
          title="Active Tickets"
          value={stats.pending_tickets}
          icon={<CheckCircle className="w-8 h-8" />}
          color="green"
        />
      </div>

      {/* Agent Pipeline Visualization */}
      {pipelineData && (
        <div className="mb-8">
          <AgentPipeline data={pipelineData} isLoading={isProcessing} />
        </div>
      )}

      {/* Summary Alert */}
      {summary && (
        <div className="mb-8 p-6 bg-gradient-to-r from-green-900 to-blue-900 rounded-lg border border-green-500">
          <h3 className="text-xl font-bold mb-3 flex items-center">
            <DollarSign className="w-6 h-6 mr-2" />
            Analysis Complete - Potential Savings: ${summary.potential_savings?.toLocaleString() || 0}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{summary.urgent_count || 0}</div>
              <div className="text-sm text-gray-300">Urgent Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">{summary.high_count || 0}</div>
              <div className="text-sm text-gray-300">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{summary.total_tickets || 0}</div>
              <div className="text-sm text-gray-300">Total Tickets</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Feed */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-500" />
            Agent Activity Feed
          </h2>
          <AgentFeed messages={agentMessages} isProcessing={isProcessing} />
        </div>

        {/* Ticket List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
            Service Tickets
          </h2>
          <TicketList tickets={tickets} />
        </div>
      </div>

      {/* Fleet Parts Table */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Fleet Parts Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gray-700">
              <tr>
                <th className="px-4 py-3">Truck ID</th>
                <th className="px-4 py-3">Part Name</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Service</th>
              </tr>
            </thead>
            <tbody>
              {fleetData.slice(0, 10).map((part, index) => {
                const usage = part.max_hours > 0
                  ? Math.round((part.current_hours / part.max_hours) * 100)
                  : 0
                const status = usage > 90 ? 'critical' : usage > 80 ? 'warning' : 'ok'

                return (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">{part.truck_id}</td>
                    <td className="px-4 py-3">{part.part_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              status === 'critical' ? 'bg-red-500' :
                              status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{usage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        status === 'critical' ? 'bg-red-900 text-red-300' :
                        status === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-green-900 text-green-300'
                      }`}>
                        {status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{part.last_service}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-900 to-blue-700 text-blue-400',
    red: 'from-red-900 to-red-700 text-red-400',
    yellow: 'from-yellow-900 to-yellow-700 text-yellow-400',
    green: 'from-green-900 to-green-700 text-green-400'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} p-6 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className="opacity-75">{icon}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
      <div className="text-sm opacity-90">{title}</div>
    </div>
  )
}

export default Dashboard