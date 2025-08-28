import React, { useState, useEffect } from 'react';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  startTime: string;
  endTime?: string;
  productsProcessed: number;
  totalProducts: number;
  errors: string[];
  results: any[];
}

interface WorkflowMonitorProps {
  workflowId?: string;
}

export const WorkflowMonitor: React.FC<WorkflowMonitorProps> = ({ workflowId }) => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);

  // Mock data for demonstration - in production, this would come from the backend
  useEffect(() => {
    const mockExecutions: WorkflowExecution[] = [
      {
        id: '1',
        workflowId: 'workflow1',
        workflowName: 'Electronics Price Tracking',
        status: 'completed',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        productsProcessed: 45,
        totalProducts: 45,
        errors: [],
        results: []
      },
      {
        id: '2',
        workflowId: 'workflow2',
        workflowName: 'Automotive Tools Monitoring',
        status: 'running',
        startTime: new Date(Date.now() - 1800000).toISOString(),
        productsProcessed: 23,
        totalProducts: 67,
        errors: ['Failed to scrape product ID 45'],
        results: []
      }
    ];
    setExecutions(mockExecutions);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'scheduled': return '⏰';
      default: return '❓';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const runWorkflow = async (workflowId: string) => {
    setIsLoading(true);
    try {
      // In production, this would call the backend API
      const response = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Add new execution to the list
        const newExecution: WorkflowExecution = {
          id: Date.now().toString(),
          workflowId,
          workflowName: executions.find(e => e.workflowId === workflowId)?.workflowName || 'Unknown',
          status: 'running',
          startTime: new Date().toISOString(),
          productsProcessed: 0,
          totalProducts: 0,
          errors: [],
          results: []
        };
        setExecutions(prev => [newExecution, ...prev]);
      }
    } catch (error) {
      console.error('Failed to run workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-white/80 to-blue-50/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent mb-2">
              Workflow Monitor
            </h2>
            <p className="text-lg text-gray-600">
              Monitor execution status and results of your scraping workflows
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {executions.filter(e => e.status === 'running').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {executions.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Executions List */}
      <div className="space-y-4">
        {executions.map((execution) => (
          <div key={execution.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getStatusIcon(execution.status)}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{execution.workflowName}</h3>
                  <p className="text-sm text-gray-600">Execution ID: {execution.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(execution.status)}`}>
                  {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                </span>
                {execution.status === 'running' && (
                  <button
                    onClick={() => runWorkflow(execution.workflowId)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Running...' : 'Run Again'}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {execution.status === 'running' && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{execution.productsProcessed} / {execution.totalProducts}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(execution.productsProcessed / execution.totalProducts) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Execution Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{execution.productsProcessed}</div>
                <div className="text-sm text-gray-600">Products Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{execution.totalProducts}</div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{execution.errors.length}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {formatDuration(execution.startTime, execution.endTime)}
                </div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
            </div>

            {/* Errors */}
            {execution.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-700 mb-2">Errors:</h4>
                <div className="space-y-1">
                  {execution.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
              <div className="text-sm text-gray-500">
                Started: {new Date(execution.startTime).toLocaleString()}
                {execution.endTime && ` • Ended: ${new Date(execution.endTime).toLocaleString()}`}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedExecution(execution)}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  View Details
                </button>
                {execution.status === 'completed' && (
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    Export Results
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {executions.length === 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Workflow Executions</h3>
          <p className="text-gray-600 mb-6">Run your workflows to see execution monitoring data</p>
        </div>
      )}

      {/* Execution Details Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800">
                Execution Details: {selectedExecution.workflowName}
              </h2>
              <button
                onClick={() => setSelectedExecution(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-semibold text-gray-700">Execution ID</div>
                    <div className="text-gray-900">{selectedExecution.id}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-semibold text-gray-700">Status</div>
                    <div className="text-gray-900">{selectedExecution.status}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-semibold text-gray-700">Start Time</div>
                    <div className="text-gray-900">{new Date(selectedExecution.startTime).toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-semibold text-gray-700">Duration</div>
                    <div className="text-gray-900">{formatDuration(selectedExecution.startTime, selectedExecution.endTime)}</div>
                  </div>
                </div>
                
                {selectedExecution.results.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Sample Results</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedExecution.results.slice(0, 3), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200/50 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
