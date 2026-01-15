import React, { useState } from 'react'
import DashboardNewView from './components/DashboardNewView'
import DetailedReportV2 from './components/DetailedReportV2'
import PitchDeck from './components/PitchDeck'
import { FileText, LayoutDashboard, Presentation } from 'lucide-react'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [reportData, setReportData] = useState({
    agentMessages: [],
    tickets: [],
    researchData: null,
    diagnosisData: null,
    monitoringData: null
  })

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navigation Bar - Red/White Theme */}
      <nav className="bg-red-700 shadow-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-bold text-white bg-black rounded-lg p-1.5 shadow-sm">🚛</div>
            <span className="text-xl font-extrabold text-white tracking-tight">ENGINE HEALTH MONITOR</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center space-x-2 shadow-sm ${
                currentPage === 'dashboard'
                  ? 'bg-white text-red-700 shadow-inner'
                  : 'bg-red-800 text-red-100 hover:bg-red-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentPage('report')}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center space-x-2 shadow-sm ${
                currentPage === 'report'
                  ? 'bg-white text-red-700 shadow-inner'
                  : 'bg-red-800 text-red-100 hover:bg-red-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Detailed Report</span>
            </button>
            <button
              onClick={() => setCurrentPage('pitch')}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center space-x-2 shadow-sm ${
                currentPage === 'pitch'
                  ? 'bg-white text-red-700 shadow-inner'
                  : 'bg-yellow-400 text-red-900 hover:bg-yellow-300'
              }`}
            >
              <Presentation className="w-5 h-5" />
              <span>Pitch Deck</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {currentPage === 'dashboard' && <DashboardNewView />}
      {currentPage === 'report' && (
        <div className="p-6 max-w-7xl mx-auto">
          <DetailedReportV2 {...reportData} />
        </div>
      )}
      {currentPage === 'pitch' && <PitchDeck />}
    </div>
  )
}

export default App