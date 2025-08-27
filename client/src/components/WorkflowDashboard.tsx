import React, { useState, useEffect } from 'react';
import { ElementSelector } from './ElementSelector';

interface ScrapingWorkflow {
  id: string;
  name: string;
  description: string;
  categoryUrl: string;
  competitorName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ScrapingElement {
  id: string;
  name: string;
  selector: string;
  selectorType: string;
  attribute: string;
  order: number;
}

interface ProductUrl {
  id: string;
  url: string;
  lastScraped: string | null;
  createdAt: string;
}

const WorkflowDashboard = () => {
  const [workflows, setWorkflows] = useState<ScrapingWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ScrapingWorkflow | null>(null);
  const [showElementSelector, setShowElementSelector] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    categoryUrl: '',
    competitorName: ''
  });

  // Mock data for demonstration
  useEffect(() => {
    setWorkflows([
      {
        id: '1',
        name: 'Electronics Scraping',
        description: 'Track electronics prices from major retailers',
        categoryUrl: 'https://example.com/electronics',
        competitorName: 'TechStore',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z'
      },
      {
        id: '2',
        name: 'Automotive Tools',
        description: 'Monitor automotive tool pricing',
        categoryUrl: 'https://example.com/automotive',
        competitorName: 'ToolDepot',
        isActive: true,
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-19T16:45:00Z'
      }
    ]);
  }, []);

  const handleCreateWorkflow = () => {
    if (newWorkflow.name && newWorkflow.categoryUrl && newWorkflow.competitorName) {
      const workflow: ScrapingWorkflow = {
        id: Date.now().toString(),
        ...newWorkflow,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setWorkflows([...workflows, workflow]);
      setNewWorkflow({ name: '', description: '', categoryUrl: '', competitorName: '' });
      setShowCreateForm(false);
    }
  };

  const toggleWorkflowStatus = (id: string) => {
    setWorkflows(workflows.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
  };

  const deleteWorkflow = (id: string) => {
    setWorkflows(workflows.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-white/80 to-blue-50/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent mb-2">
              Workflow Management
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Create and manage your web scraping workflows. Monitor competitors and track product prices automatically.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Active Workflows: {workflows.filter(w => w.isActive).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Total Workflows: {workflows.length}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              + Create Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Create Workflow Form */}
      {showCreateForm && (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workflow Name</label>
              <input
                type="text"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                placeholder="Enter workflow name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competitor Name</label>
              <input
                type="text"
                value={newWorkflow.competitorName}
                onChange={(e) => setNewWorkflow({...newWorkflow, competitorName: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                placeholder="Enter competitor name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category URL</label>
              <input
                type="url"
                value={newWorkflow.categoryUrl}
                onChange={(e) => setNewWorkflow({...newWorkflow, categoryUrl: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                placeholder="https://example.com/category"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                rows={3}
                placeholder="Describe what this workflow will track"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreateWorkflow}
              className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg"
            >
              Create Workflow
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-3 border border-gray-200/50 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${workflow.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <h3 className="text-xl font-semibold text-gray-800">{workflow.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleWorkflowStatus(workflow.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                    workflow.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => deleteWorkflow(workflow.id)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">{workflow.description}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">🎯</span>
                <span className="text-sm text-gray-700">{workflow.competitorName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">🔗</span>
                <span className="text-sm text-blue-600 truncate">{workflow.categoryUrl}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">📅</span>
                <span className="text-sm text-gray-700">
                  Created: {new Date(workflow.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setSelectedWorkflow(workflow);
                  setShowElementSelector(true);
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md"
              >
                Configure Elements
              </button>
              <button className="px-4 py-2 border border-gray-200/50 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200">
                View Results
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {workflows.length === 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚡</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Workflows Yet</h3>
          <p className="text-gray-600 mb-6">Create your first scraping workflow to start monitoring competitors</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            Create Your First Workflow
          </button>
        </div>
      )}

      {/* Element Selector Modal */}
      {showElementSelector && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800">
                Configure Elements for {selectedWorkflow.name}
              </h2>
              <button
                onClick={() => setShowElementSelector(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="h-full overflow-hidden">
              <ElementSelector
                categoryUrl={selectedWorkflow.categoryUrl}
                onClose={() => setShowElementSelector(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { WorkflowDashboard };
