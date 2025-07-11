'use client'

import React from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, Bell, Settings, User, LogOut, Upload, Activity, Shield, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

export default function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleUploadClick = () => {
    router.push('/upload')
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 backdrop-blur-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Logsight</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Log Analytics</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Logs</span>
              </button>
              <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Analytics</span>
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs, anomalies, or errors..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded border">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleUploadClick}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            
            {/* User Menu */}
            <div className="relative">
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </button>
              
              {/* Dropdown menu would go here */}
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
} 