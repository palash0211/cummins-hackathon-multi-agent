import React from 'react'
import { AlertTriangle, AlertCircle, Info, Clock, Truck, Wrench } from 'lucide-react'

const TicketList = ({ tickets }) => {
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'HIGH':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'MEDIUM':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-900 text-red-300 border-red-700'
      case 'HIGH':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700'
      case 'MEDIUM':
        return 'bg-blue-900 text-blue-300 border-blue-700'
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600'
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No service tickets yet</p>
          <p className="text-sm mt-1">Run a fleet check to generate tickets</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64 overflow-y-auto space-y-3 pr-2">
      {tickets.map((ticket, index) => (
        <div
          key={ticket.ticket_id || index}
          className={`p-4 rounded-lg border ${getPriorityColor(ticket.priority)}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getPriorityIcon(ticket.priority)}
              <span className="font-semibold text-sm">{ticket.ticket_id}</span>
              <span className={`px-2 py-0.5 text-xs rounded ${
                ticket.priority === 'URGENT' ? 'bg-red-700' :
                ticket.priority === 'HIGH' ? 'bg-yellow-700' :
                'bg-blue-700'
              }`}>
                {ticket.priority}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Truck className="w-3 h-3" />
              <span>{ticket.truck_id}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">{ticket.part_name}</div>
            <div className="text-xs text-gray-400">{ticket.action}</div>
            {ticket.reason && (
              <div className="text-xs text-gray-500 italic">{ticket.reason}</div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700">
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {ticket.created_at
                  ? new Date(ticket.created_at).toLocaleString()
                  : 'Just created'}
              </span>
            </div>
            {ticket.estimated_downtime_saved && (
              <div className="text-xs text-green-400">
                Saves {ticket.estimated_downtime_saved} days
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default TicketList