import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { WorkflowDashboard } from './components/WorkflowDashboard';
import { ElementSelector } from './components/ElementSelector';
import { Dashboard } from './pages/dashboard';
import { ProductsPage as Products } from './pages/products-new';
import { Categories } from './pages/categories';
import { Competitors } from './pages/competitors';
import { BrandDetailPage as BrandDetail } from './pages/brand-detail';
import { Catalog } from './pages/catalog';
import { Pages } from './pages/pages';
import { Admin } from './pages/admin';

// Modern Icon Components
const Icon = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-6 h-6 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/workflows', label: 'Workflows', icon: '⚡' },
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/categories', label: 'Categories', icon: '🏷️' },
    { path: '/competitors', label: 'Competitors', icon: '🎯' },
    { path: '/catalog', label: 'Catalog', icon: '📚' },
    { path: '/pages', label: 'Pages', icon: '📄' },
    { path: '/admin', label: 'Admin', icon: '⚙️' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-xl z-50">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Tracker Pro
            </h1>
            <p className="text-xs text-gray-500">Web Scraping Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              location.pathname === item.path
                ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-800'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-200/50">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🚀</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Pro Features</p>
              <p className="text-xs text-gray-600">Unlock advanced scraping</p>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md">
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <div className="fixed top-0 left-64 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm z-40">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search workflows, products..."
              className="w-64 px-4 py-2 pl-10 bg-gray-50/80 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">U</span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-800">User</p>
              <p className="text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MainContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-gray-50/50 to-blue-50/30">
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <Sidebar />
        <Header />
        <MainContent>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflows" element={<WorkflowDashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/brand/:id" element={<BrandDetail />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/pages" element={<Pages />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </MainContent>
      </div>
    </Router>
  );
}

export default App;