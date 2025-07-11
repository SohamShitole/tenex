'use client'

import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { logsApi, LogEntry } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import clsx from 'clsx'
import { AlertTriangle, ChevronLeft, ChevronRight, Filter, Search, Eye, Calendar, Globe, Activity, FileText } from 'lucide-react'
import SeverityBadge from '@/components/ui/SeverityBadge'

interface LogEntriesTableProps {
  logId: string
  onEntrySelect: (entry: LogEntry | null) => void
  selectedEntryId?: number | null
}

export default function LogEntriesTable({ logId, onEntrySelect, selectedEntryId }: LogEntriesTableProps) {
  const [page, setPage] = useState(1)
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error } = useQuery(
    ['log-entries', logId, page, showAnomaliesOnly, searchTerm],
    () =>
      logsApi.getLogEntries(logId, {
        page,
        per_page: 50,
        anomalies_only: showAnomaliesOnly,
        search: searchTerm || undefined,
      }),
    {
      keepPreviousData: true,
      onSuccess: (d) => {
        // Clear selection if the selected entry is not in the new data
        if (selectedEntryId && !d.entries.find((e) => e.id === selectedEntryId)) {
          onEntrySelect(null)
        }
      }
    },
  )

  const entries = data?.entries ?? []
  const pagination = data?.pagination

  const toggleAnomalies = () => {
    setShowAnomaliesOnly((prev) => !prev)
    setPage(1)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 loading-spinner mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading log entries...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert-danger">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-3" />
          <p>Failed to load log entries</p>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="chart-container">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Log Entries Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {showAnomaliesOnly ? 'No anomalies detected in this log file' : 'No log entries match your current filters'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Log Entries
          </h3>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {pagination?.total || 0} entries
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={toggleAnomalies}
            className={clsx(
              'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              showAnomaliesOnly 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            {showAnomaliesOnly ? 'Show All' : 'Anomalies Only'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="chart-container p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="data-table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Time</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Globe className="w-4 h-4" />
                    <span>Source</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Activity className="w-4 h-4" />
                    <span>Anomaly</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="data-table-body">
              {entries.map((entry: LogEntry) => {
                const isAnomaly = entry.anomalies && entry.anomalies.length > 0
                const firstAnomaly = isAnomaly ? entry.anomalies[0] : null
                const isSelected = entry.id === selectedEntryId
                
                return (
                  <tr
                    key={entry.id}
                    className={clsx(
                      'data-table-row cursor-pointer transition-colors duration-150',
                      {
                        'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500': isSelected,
                        'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20': isAnomaly && !isSelected,
                      }
                    )}
                    onClick={() => onEntrySelect(entry)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {entry.src_ip || '—'}
                      </div>
                      {entry.src_ip && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          IP Address
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-900 dark:text-gray-100">
                        {entry.url || entry.raw_log.slice(0, 120)}
                      </div>
                      {entry.user_agent && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {entry.user_agent.slice(0, 50)}...
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.status_code ? (
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          {
                            'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300': entry.status_code >= 200 && entry.status_code < 300,
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300': entry.status_code >= 300 && entry.status_code < 400,
                            'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300': entry.status_code >= 400,
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': entry.status_code < 200,
                          }
                        )}>
                          {entry.status_code}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      {isAnomaly && firstAnomaly ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-red-700 dark:text-red-300 truncate">
                              {firstAnomaly.reason}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <SeverityBadge severity={firstAnomaly.severity} />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {(firstAnomaly.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEntrySelect(entry)
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > pagination.per_page && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.page - 1) * pagination.per_page) + 1} to {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.per_page)}
              </span>
              
              <button
                onClick={() => setPage(Math.min(Math.ceil(pagination.total / pagination.per_page), page + 1))}
                disabled={page >= Math.ceil(pagination.total / pagination.per_page)}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 