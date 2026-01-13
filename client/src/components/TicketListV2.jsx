import React from 'react';
import { AlertTriangle, AlertCircle, Info, Clock, Truck, Wrench, CheckCircle2 } from 'lucide-react';

const TicketListV2 = ({ tickets }) => {
  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'URGENT':
        return { 
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          borderClass: 'border-l-red-600'
        };
      case 'HIGH':
        return { 
          icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          borderClass: 'border-l-orange-500'
        };
      case 'MEDIUM':
        return { 
          icon: <Info className="w-5 h-5 text-blue-500" />,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          borderClass: 'border-l-blue-500'
        };
      default:
        return { 
          icon: <Info className="w-5 h-5 text-gray-500" />,
          badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
          borderClass: 'border-l-gray-400'
        };
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Wrench className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Active Service Tickets</h3>
        <p className="text-gray-500 text-sm mt-1 max-w-xs text-center">
          Run the fleet diagnostic agent to identify maintenance needs and generate tickets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket, index) => {
        const { icon, badgeClass, borderClass } = getPriorityInfo(ticket.priority);
        
        return (
          <div
            key={ticket.ticket_id || index}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 p-5 hover:shadow-md transition-shadow duration-200 ${borderClass}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                {icon}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900">{ticket.ticket_id}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded-full border ${badgeClass}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-xs font-medium text-gray-500 space-x-2">
                    <div className="flex items-center">
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      {ticket.truck_id}
                    </div>
                    <span>•</span>
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Just created'}
                    </div>
                  </div>
                </div>
              </div>
              
              {ticket.estimated_downtime_saved && (
                <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-100">
                   <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                   Save {ticket.estimated_downtime_saved} days
                </div>
              )}
            </div>

            <div className="pl-8">
              <h4 className="text-sm font-bold text-gray-900 mb-1">{ticket.part_name}</h4>
              <p className="text-sm text-gray-600 mb-2">{ticket.action}</p>
              
              {ticket.reason && (
                <div className="mt-3 bg-gray-50 p-2.5 rounded text-xs text-gray-500 border border-gray-100 italic">
                  "{ticket.reason}"
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
               <button className="text-xs font-bold text-red-700 hover:text-red-800 transition-colors uppercase tracking-wide">
                 View Details →
               </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketListV2;
