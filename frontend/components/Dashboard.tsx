'use client'

import { useState, useEffect } from 'react'
import Header from './Header'
import LogsList from './dashboard/LogsList'
import AnomalySummary from './dashboard/AnomalySummary'
import LogEntriesTable from './dashboard/LogEntriesTable'
import { LogFile, LogEntry } from '@/lib/api'
import { FileText, TrendingUp, Activity, Shield, Database, Clock } from 'lucide-react'

export default function Dashboard() {
  console.log('🔍 Dashboard.tsx: Dashboard component rendering')
  
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)

  useEffect(() => {
    console.log('🔍 Dashboard.tsx: Dashboard component mounted')
    
    // Check if our dashboard elements are rendering with correct styles
    setTimeout(() => {
      const dashboardMain = document.querySelector('[data-testid="dashboard-main"]')
      const header = document.querySelector('header')
      const sidebar = document.querySelector('[data-testid="sidebar"]')
      
      console.log('🔍 Dashboard.tsx: Dashboard main found:', !!dashboardMain)
      console.log('🔍 Dashboard.tsx: Header found:', !!header)
      console.log('🔍 Dashboard.tsx: Sidebar found:', !!sidebar)
      
      if (dashboardMain) {
        const styles = getComputedStyle(dashboardMain)
        console.log('🔍 Dashboard.tsx: Dashboard main background:', styles.backgroundColor)
        console.log('🔍 Dashboard.tsx: Dashboard main classes:', dashboardMain.className)
      }
      
      if (header) {
        const styles = getComputedStyle(header)
        console.log('🔍 Dashboard.tsx: Header background:', styles.backgroundColor)
        console.log('🔍 Dashboard.tsx: Header backdrop-filter:', styles.backdropFilter)
      }
      
      // Check if Tailwind classes are working
      const testElement = document.createElement('div')
      testElement.className = 'bg-brand-600 text-white p-4 rounded-xl'
      document.body.appendChild(testElement)
      
      const testStyles = getComputedStyle(testElement)
      console.log('🔍 Dashboard.tsx: Test element background (should be blue):', testStyles.backgroundColor)
      console.log('🔍 Dashboard.tsx: Test element color (should be white):', testStyles.color)
      console.log('🔍 Dashboard.tsx: Test element border-radius:', testStyles.borderRadius)
      
      document.body.removeChild(testElement)
    }, 200)
  }, [])

  const handleLogSelect = (log: LogFile) => {
    console.log('🔍 Dashboard.tsx: Log selected:', log.filename)
    setSelectedLog(log)
    setSelectedEntry(null) // Reset entry selection when log changes
  }

  const handleEntrySelect = (entry: LogEntry | null) => {
    console.log('🔍 Dashboard.tsx: Entry selected:', entry?.id)
    setSelectedEntry(entry)
    if (entry) {
      setIsDetailsExpanded(true)
    }
  }

  const toggleDetails = () => {
    console.log('🔍 Dashboard.tsx: Toggle details, current state:', isDetailsExpanded)
    setIsDetailsExpanded(!isDetailsExpanded)
  }

  return (
    <div className="min-h-screen bg-background-50 dark:bg-slate-900" data-testid="dashboard-main">
      <Header />
      
      <div className="flex h-screen pt-16">
        {/* Sidebar */}
        <div 
          className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-soft overflow-hidden"
          data-testid="sidebar"
        >
          <LogsList 
            onSelect={handleLogSelect}
            selectedId={selectedLog?.id}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedLog ? (
            <div className="flex-1 flex flex-col lg:flex-row">
              {/* Main Analytics */}
              <div className={`flex-1 overflow-auto transition-all duration-300 ${
                isDetailsExpanded ? 'lg:w-1/2' : 'lg:w-full'
              }`}>
                <div className="p-6 space-y-6">
                  {/* File Header */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-violet-600 rounded-xl flex items-center justify-center shadow-soft">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            {selectedLog.filename}
                          </h1>
                          <p className="text-slate-600 dark:text-slate-400">
                            {selectedLog.status === 'ready' ? 'Ready for analysis' : 'Processing...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Size: {(selectedLog.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">•</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Entries: {selectedLog.total_entries?.toLocaleString() || 'N/A'}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">•</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Processed: {selectedLog.processed_at ? new Date(selectedLog.processed_at).toLocaleString() : 'Processing...'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center space-x-4">
                      <button
                        onClick={toggleDetails}
                        className="btn btn-secondary btn-sm"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
                      </button>
                      <button className="btn btn-ghost btn-sm">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Fullscreen
                      </button>
                    </div>
                  </div>

                  {/* Analytics Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-brand-600 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Analytics Overview
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            AI-powered insights and anomaly detection
                          </p>
                        </div>
                      </div>
                    </div>
                    <AnomalySummary logId={selectedLog.id} />
                  </div>

                  {/* Security Analytics */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Security Analytics
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            AI-powered threat detection and anomaly analysis
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="btn btn-ghost btn-sm">
                          <Database className="w-4 h-4 mr-2" />
                          Filter
                        </button>
                        <button className="btn btn-ghost btn-sm">
                          <Clock className="w-4 h-4 mr-2" />
                          Export
                        </button>
                      </div>
                    </div>
                    <AnomalySummary logId={selectedLog.id} />
                  </div>

                  {/* Log Entries */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Database className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Log Entries
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Detailed view of all log entries with anomaly highlights
                          </p>
                        </div>
                      </div>
                    </div>
                    <LogEntriesTable 
                      logId={selectedLog.id}
                      onEntrySelect={handleEntrySelect}
                      selectedEntryId={selectedEntry?.id}
                    />
                  </div>
                </div>
              </div>

              {/* Expandable Details Panel */}
              {isDetailsExpanded && (
                <div className="lg:w-1/2 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-soft-lg overflow-auto animate-slide-in-right">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Detailed Analysis
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                          File Information
                        </h4>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                          <p>Filename: {selectedLog.filename}</p>
                          <p>Size: {(selectedLog.file_size / 1024 / 1024).toFixed(2)} MB</p>
                          <p>Total Entries: {selectedLog.total_entries?.toLocaleString() || 'N/A'}</p>
                          <p>Format: {selectedLog.log_format}</p>
                          <p>Status: {selectedLog.status}</p>
                        </div>
                      </div>
                      
                      {selectedEntry && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                            Selected Entry
                          </h4>
                          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <p>ID: {selectedEntry.id}</p>
                            <p>Timestamp: {new Date(selectedEntry.timestamp).toLocaleString()}</p>
                            <p>Source: {selectedEntry.src_ip || 'N/A'}</p>
                            <p>Method: {selectedEntry.method || 'N/A'}</p>
                            <p>Status: {selectedEntry.status_code || 'N/A'}</p>
                            <p>Anomalies: {selectedEntry.anomalies?.length || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Select a log file to analyze
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Choose a file from the sidebar to view detailed analytics and insights
                </p>
                <button
                  onClick={() => window.location.href = '/upload'}
                  className="btn btn-primary btn-lg"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Upload New Log File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 