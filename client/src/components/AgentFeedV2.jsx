import React, { useEffect, useRef } from 'react';
import { Search, Brain, Wrench, FileText, Save, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AgentFeedV2 = ({ messages, isProcessing, fullHeight = false }) => {
  const feedEndRef = useRef(null);
  const containerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    // Only auto-scroll if user is not manually scrolling
    if (!isUserScrollingRef.current && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleScroll = () => {
    // User is manually scrolling
    isUserScrollingRef.current = true;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset after 2 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        // Check if user is at the bottom
        const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 10;
        isUserScrollingRef.current = !isAtBottom;
      }
    }, 2000);
  };

  const getIcon = (step) => {
    switch (step) {
      case 'fetching_data':
        return <Search className="w-5 h-5 text-gray-500" />;
      case 'monitor_agent':
        return <Brain className="w-5 h-5 text-blue-600" />;
      case 'diagnosis_agent':
        return <Wrench className="w-5 h-5 text-orange-500" />;
      case 'dispatch_agent':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'save_tickets':
        return <Save className="w-5 h-5 text-purple-600" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Brain className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepLabel = (step) => {
    const labels = {
      'fetching_data': 'Data Collection',
      'monitor_agent': 'Monitor Agent',
      'diagnosis_agent': 'Diagnosis Agent',
      'dispatch_agent': 'Dispatch Agent',
      'save_tickets': 'System Sync',
      'complete': 'Workflow Complete',
      'error': 'System Error'
    };
    return labels[step] || step;
  };

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
          <Brain className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-gray-900 font-medium">System Idle</p>
        <p className="text-sm text-gray-500 mt-1">Waiting for diagnostic initiation...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className={`${fullHeight ? 'h-full' : 'h-[500px]'} overflow-y-auto pr-2 relative`}
    >
      <div className="absolute top-4 left-4 h-full w-0.5 bg-gray-200"></div>
      
      <div className="space-y-6 pt-2 pb-6 pl-1">
        {messages.map((msg, index) => (
          <div key={index} className="relative flex items-start group animation-slide-in">
            {/* Timeline dot */}
            <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 
              ${msg.step === 'error' ? 'bg-red-500' : 'bg-gray-400 group-hover:bg-red-600 transition-colors'}`}>
            </div>

            <div className="ml-6 flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2 border-b border-gray-50 pb-2">
                <div className="flex items-center space-x-2">
                  {getIcon(msg.step)}
                  <span className="font-bold text-sm text-gray-900">{getStepLabel(msg.step)}</span>
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                </div>
              </div>
              <div className="text-sm text-gray-800 leading-relaxed space-y-2">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mb-1" {...props} />,
                    p: ({node, ...props}) => <p className="text-gray-800 leading-relaxed mb-2" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-800 space-y-1 ml-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-800 space-y-1 ml-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                    code: ({node, inline, ...props}) => 
                      inline 
                        ? <code className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                        : <code className="block bg-gray-800 text-gray-100 p-2 rounded text-xs font-mono overflow-x-auto" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto my-2" {...props} />,
                  }}
                >
                  {msg.message}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="relative flex items-start ml-1">
             <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse border-2 border-white z-10"></div>
             <div className="ml-6 flex items-center space-x-2 text-sm text-gray-500">
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
               <span className="ml-2 font-medium">Processing next step...</span>
             </div>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
};

export default AgentFeedV2;
