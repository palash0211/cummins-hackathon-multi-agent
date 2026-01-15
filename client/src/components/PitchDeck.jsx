import React from 'react'
import { Download, FileText } from 'lucide-react'

const PITCH_DECK_CONTENT = `# Engine Health Monitor
### Predictive maintenance software for commercial fleets

---

## 1. The Problem
Unplanned truck breakdowns are expensive and unpredictable.

- Breakdowns cost fleets ~$760 per truck per day in lost revenue
- Existing telematics only show alerts *after* problems occur
- Fleet managers still rely on reactive, manual maintenance decisions

**Result:** High downtime, missed deliveries, and avoidable costs.

---

## 2. The Solution
**Engine Health Monitor predicts failures before trucks break down.**

We analyze existing engine telemetry to:
- Predict component failures weeks in advance
- Prioritize what needs fixing and when
- Automatically generate service actions

Fleets stop reacting to breakdowns and start preventing them.

---

## 3. Why Now
This wasn't possible until recently.

- Modern trucks now stream real-time engine telemetry
- Fleets are already paying for data they don't fully use
- Advances in AI enable accurate failure prediction from noisy data

**The data finally exists — but no one is turning it into decisions.**

---

## 4. Product
A simple dashboard for fleet managers:

- Real-time health scores for every truck
- Clear recommendations: *Fix now / Fix soon / Monitor*
- Automatic service ticket creation
- ROI tracking per prevented breakdown

Data source: We plug directly into existing fleet telematics systems already installed on modern trucks (e.g., engine sensors, fault codes, usage data). No new hardware required.

Setup takes days, not months.

---

## 5. Technical Implementation
**Multi-Agent AI Architecture**

Three specialized AI agents work together autonomously:

- **Monitor Agent:** Continuously analyzes parts usage across the fleet and categorizes components by risk level (Critical >90%, Warning 80-90%, OK <80%)
- **Research & Diagnosis Agent:** Evaluates flagged parts, performs real-time web research on recalls and pricing, assigns urgency scores, and recommends actions (REPLACE_NOW, SERVICE_SOON, MONITOR)
- **Dispatch Agent:** Automatically creates prioritized service tickets with downtime prevention metrics and cost savings calculations

**Technology Stack:**
- Backend: Python 3.12 + FastAPI (async, high-performance)
- Frontend: React 18 + Vite + TailwindCSS
- AI: Nemotron:Nvidia via OpenRouter API
- Data: (currently generating mock using AI and synthetic data for development)
- No additional hardware required—plugs into existing telematics

---

## 6. Traction
- MVP built and operational
- Live predictions using real engine data
- Ready for pilot programs with fleet operators

Initial feedback confirms strong demand for proactive maintenance.

---

## 7. Market Opportunity
We start with mid-sized commercial fleets.

- 3.5M commercial trucks in North America
- Initial target: fleets with 50–300 vehicles
- Expansion path: enterprise fleets and OEM partnerships

A large, recurring SaaS market with high willingness to pay.

---

## 8. Competition
Today's options fall short:

- **Telematics platforms:** data without decisions
- **Legacy systems:** manual and reactive

**Engine Health Monitor:**
- Predictive, not reactive
- Actionable recommendations, not alerts
- No additional hardware required


## 9. Why We Win
- Deep understanding of fleet maintenance workflows
- Uses data fleets already have
- Focused on preventing downtime, not reporting it
- Built for speed, simplicity, and fast deployment

Execution matters more than flashy features.

## 10. Vision
We're building the system fleets rely on to prevent breakdowns entirely.

Starting with diesel trucks, expanding across:
- Engine manufacturers
- Fleet sizes
- Maintenance and parts workflows

**Our goal:** Make unplanned downtime rare.`

const PitchDeck = () => {
  const handleDownloadMarkdown = () => {
    const blob = new Blob([PITCH_DECK_CONTENT], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'engine_health_monitor_pitch_deck.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  // Simple markdown renderer
  const renderMarkdown = (content) => {
    const lines = content.split('\n')
    const elements = []
    let currentSection = []
    let sectionIndex = 0

    lines.forEach((line, index) => {
      if (line === '---') {
        if (currentSection.length > 0) {
          elements.push(
            <div key={sectionIndex} className="pitch-section page-break-after mb-16 print:mb-0">
              {currentSection}
            </div>
          )
          currentSection = []
          sectionIndex++
        }
      } else if (line.startsWith('# ')) {
        currentSection.push(
          <h1 key={index} className="text-5xl font-bold text-red-700 mb-3">
            {line.substring(2)}
          </h1>
        )
      } else if (line.startsWith('### ')) {
        currentSection.push(
          <h3 key={index} className="text-2xl text-gray-600 mb-8">
            {line.substring(4)}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        currentSection.push(
          <h2 key={index} className="text-4xl font-bold text-gray-900 mb-6 border-b-4 border-red-600 pb-3">
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith('- ')) {
        const text = line.substring(2)
        currentSection.push(
          <li key={index} className="ml-6 mb-3 text-lg text-gray-700 flex items-start">
            <span className="text-red-600 mr-3 flex-shrink-0 font-bold">•</span>
            <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
          </li>
        )
      } else if (line.startsWith('**') && line.endsWith('**')) {
        currentSection.push(
          <p key={index} className="text-2xl font-bold text-red-700 mb-4">
            {line.replace(/\*\*/g, '')}
          </p>
        )
      } else if (line.trim() !== '') {
        currentSection.push(
          <p key={index} className="text-lg text-gray-700 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
        )
      }
    })

    if (currentSection.length > 0) {
      elements.push(
        <div key={sectionIndex} className="pitch-section mb-16">
          {currentSection}
        </div>
      )
    }

    return elements
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white max-w-5xl mx-auto print:max-w-none min-h-screen">
        {/* Header with Download Buttons */}
        <div className="sticky top-0 bg-gradient-to-r from-red-700 to-red-800 text-white p-6 flex justify-between items-center print:hidden z-10 shadow-lg">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Pitch Deck</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 bg-white text-red-700 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center space-x-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span>Download MD</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-yellow-400 text-red-900 rounded-lg font-semibold hover:bg-yellow-300 transition-all flex items-center space-x-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Print-only Header */}
        <div className="hidden print:block bg-gradient-to-r from-red-700 to-red-800 text-white p-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🚛 ENGINE HEALTH MONITOR</h1>
          <p className="text-xl">Predictive Maintenance Software for Commercial Fleets</p>
        </div>

        {/* Main Content */}
        <div className="p-12 print:p-16 max-w-4xl mx-auto">
          {renderMarkdown(PITCH_DECK_CONTENT)}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.75in;
          }
          .page-break-after {
            page-break-after: always;
          }
          .pitch-section {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default PitchDeck
