import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const stats = [
    {
      title: 'Active Workflows',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: '⚡',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    {
      title: 'Products Tracked',
      value: '1,247',
      change: '+89',
      changeType: 'positive',
      icon: '📦',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    {
      title: 'Data Points',
      value: '45,892',
      change: '+3,421',
      changeType: 'positive',
      icon: '📊',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    {
      title: 'Competitors',
      value: '8',
      change: '+1',
      changeType: 'positive',
      icon: '🎯',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100'
    }
  ];

  const quickActions = [
    {
      title: 'Create Workflow',
      description: 'Set up a new scraping workflow',
      icon: '⚡',
      color: 'from-blue-500 to-purple-600',
      link: '/workflows'
    },
    {
      title: 'Add Products',
      description: 'Add new products to track',
      icon: '📦',
      color: 'from-green-500 to-teal-600',
      link: '/products'
    },
    {
      title: 'View Analytics',
      description: 'Check scraping performance',
      icon: '📊',
      color: 'from-purple-500 to-pink-600',
      link: '/workflows'
    },
    {
      title: 'Manage Competitors',
      description: 'Update competitor information',
      icon: '🎯',
      color: 'from-orange-500 to-red-600',
      link: '/competitors'
    }
  ];

  const recentActivity = [
    {
      action: 'Workflow completed',
      target: 'Electronics Scraping',
      time: '2 minutes ago',
      status: 'success'
    },
    {
      action: 'New product added',
      target: 'iPhone 15 Pro',
      time: '15 minutes ago',
      status: 'info'
    },
    {
      action: 'Price change detected',
      target: 'Samsung Galaxy S24',
      time: '1 hour ago',
      status: 'warning'
    },
    {
      action: 'Competitor updated',
      target: 'Amazon Electronics',
      time: '2 hours ago',
      status: 'info'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-white/80 to-blue-50/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent mb-2">
              Hi there! Ready to Achieve Great Things? 🚀
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Your web scraping platform is running smoothly. Here's what's happening today.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">System Status: Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Last Update: Just now</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-3xl">🤖</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                stat.changeType === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {stat.change}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
            <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="group">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <span className="text-2xl text-white">{action.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50/50 rounded-xl border border-gray-200/30">
              <div className={`w-3 h-3 rounded-full ${
                activity.status === 'success' ? 'bg-green-500' :
                activity.status === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                <p className="text-xs text-gray-600">{activity.target}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-gradient-to-r from-white/90 to-blue-50/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">💡</span>
            <span className="text-sm text-gray-600">Unlock more with Pro Plan</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">⚙️ Powered by Tracker Pro v2.0</span>
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
