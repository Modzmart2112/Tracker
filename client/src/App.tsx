import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Database, 
  Settings, 
  Home,
  Workflow,
  BarChart,
  Users,
  FileText
} from 'lucide-react';
import WorkflowDashboard from './components/WorkflowDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('workflows');

  const navigationItems = [
    { id: 'workflows', label: 'Workflows', icon: Workflow, component: WorkflowDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart, component: AnalyticsDashboard },
    { id: 'data', label: 'Data', icon: Database, component: DataViewer },
    { id: 'reports', label: 'Reports', icon: FileText, component: ReportsViewer },
    { id: 'users', label: 'Users', icon: Users, component: UsersManagement },
    { id: 'settings', label: 'Settings', icon: Settings, component: SettingsPanel }
  ];

  const ActiveComponent = navigationItems.find(item => item.id === activeTab)?.component || WorkflowDashboard;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Tracker Pro</h1>
                </div>
                <Badge variant="secondary" className="ml-2">Beta</Badge>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b">
          <div className="container mx-auto px-6">
            <div className="flex space-x-8">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto py-6">
          <ActiveComponent />
        </main>
      </div>
    </Router>
  );
}

// Placeholder components for other tabs
function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Workflows</CardTitle>
            <CardDescription>Active scraping workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">12</div>
            <p className="text-sm text-gray-600 mt-2">+2 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Products Tracked</CardTitle>
            <CardDescription>Total products being monitored</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">1,247</div>
            <p className="text-sm text-gray-600 mt-2">+89 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Points</CardTitle>
            <CardDescription>Scraped data records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">45,892</div>
            <p className="text-sm text-gray-600 mt-2">+3,421 from last week</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DataViewer() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Data Viewer</h1>
      <Card>
        <CardHeader>
          <CardTitle>Scraped Data</CardTitle>
          <CardDescription>View and analyze collected data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Data viewing functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsViewer() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>View and download reports</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Reporting functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersManagement() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage system users and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">User management functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configure system preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Settings functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;