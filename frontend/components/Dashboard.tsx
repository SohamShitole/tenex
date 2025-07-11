'use client'

import React, { useState } from 'react'
import Header from '@/components/Header'
import LogsList from '@/components/dashboard/LogsList'
import AnomalySummary from '@/components/dashboard/AnomalySummary'
import LogEntriesTable from '@/components/dashboard/LogEntriesTable'
import LogEntryDetails from '@/components/dashboard/LogEntryDetails'
import type { LogFile, LogEntry } from '@/lib/api'
import clsx from 'clsx'

export default function Dashboard() {
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)

  const handleLogSelect = (log: LogFile) => {
    setSelectedLog(log)
    setSelectedEntry(null) // Reset entry selection when log changes
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 sidebar custom-scrollbar">
          <div className="sidebar-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Log Files</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Recent uploads and analysis
            </p>
          </div>
          <div className="sidebar-content">
            <LogsList
              onSelect={handleLogSelect}
              selectedId={selectedLog?.id}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {selectedLog ? (
                selectedLog.status === 'ready' ? (
                  <div className="space-y-6 animate-fade-in">
                    {/* Page Header */}
                    <div className="mb-8">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {selectedLog.filename}
                      </h1>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          Size: {(selectedLog.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <span>•</span>
                        <span>
                          Processed: {selectedLog.processed_at ? new Date(selectedLog.processed_at).toLocaleString() : 'Processing...'}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          Ready
                        </span>
                      </div>
                    </div>

                    <AnomalySummary logId={selectedLog.id} />
                    <LogEntriesTable
                      logId={selectedLog.id}
                      onEntrySelect={setSelectedEntry}
                      selectedEntryId={selectedEntry?.id}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <div className="w-16 h-16 loading-spinner mx-auto mb-4"></div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Processing Log File
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        We're analyzing your log file and detecting anomalies...
                      </p>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        Status: {selectedLog.status}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Log File Selected
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Select a log file from the sidebar to view its analysis and anomaly detection results.
                    </p>
                    <button
                      onClick={() => window.location.href = '/upload'}
                      className="btn-primary btn-md"
                    >
                      Upload New Log File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
          
          {/* Details Panel */}
          <div className={clsx(
            "w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out",
            selectedEntry ? 'block' : 'hidden'
          )}>
            {selectedEntry && (
              <LogEntryDetails 
                entry={selectedEntry} 
                onClose={() => setSelectedEntry(null)} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 