'use client'

import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { logsApi, LogEntry } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import clsx from 'clsx'
import { AlertTriangle, ChevronLeft, ChevronRight, Filter, Search, Eye, Calendar, Globe, Activity, FileText, Clock, ExternalLink, MoreHorizontal, ArrowUpDown, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
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
  const [sortField, setSortField] = useState<'timestamp' | 'status_code'>('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useQuery(
    ['log-entries', logId, page, showAnomaliesOnly, searchTerm, sortField, sortDirection],
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

  const handleSort = (field: 'timestamp' | 'status_code') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusIcon = (statusCode: number | null) => {
    if (!statusCode) return null
    
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />
    } else if (statusCode >= 300 && statusCode < 400) {
      return <ArrowUpDown className="w-4 h-4 text-amber-500" />
    } else if (statusCode >= 400 && statusCode < 500) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    } else if (statusCode >= 500) {
      return <XCircle className="w-4 h-4 text-red-600" />
    }
    return null
  }

  const getStatusColor = (statusCode: number | null) => {
    if (!statusCode) return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    
    if (statusCode >= 200 && statusCode < 300) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
    } else if (statusCode >= 300 && statusCode < 400) {
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
    } else if (statusCode >= 500) {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 loading-spinner mx-auto mb-3"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading log entries...</p>
            </div>
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
          <div>
            <p className="font-medium">Failed to load log entries</p>
            <p className="text-sm opacity-75 mt-1">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No Log Entries Found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {showAnomaliesOnly ? 'No anomalies detected in this log file' : 'No log entries match your current filters'}
            </p>
            {showAnomaliesOnly && (
              <button
                onClick={toggleAnomalies}
                className="btn-primary btn-md"
              >
                Show All Entries
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Log Entries
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pagination?.total || 0} entries • {entries.filter(e => e.anomalies?.length > 0).length} anomalies
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2.5 w-64 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-200"
            />
          </div>
          
          {/* Anomalies Filter */}
          <button
            onClick={toggleAnomalies}
            className={clsx(
              'inline-flex items-center px-3 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200',
              showAnomaliesOnly 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 shadow-soft' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-soft'
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showAnomaliesOnly ? 'Show All' : 'Anomalies Only'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Time</span>
                    {sortField === 'timestamp' && (
                      <ArrowUpDown className={clsx('w-3 h-3', sortDirection === 'desc' ? 'rotate-180' : '')} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Source</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Request</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('status_code')}
                >
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Status</span>
                    {sortField === 'status_code' && (
                      <ArrowUpDown className={clsx('w-3 h-3', sortDirection === 'desc' ? 'rotate-180' : '')} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Anomaly</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
              {entries.map((entry: LogEntry) => {
                const isAnomaly = entry.anomalies && entry.anomalies.length > 0
                const firstAnomaly = isAnomaly ? entry.anomalies[0] : null
                const isSelected = entry.id === selectedEntryId
                
                return (
                  <tr
                    key={entry.id}
                    className={clsx(
                      'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all duration-200',
                      {
                        'bg-brand-50 dark:bg-brand-900/20 border-l-4 border-brand-500': isSelected,
                        'hover:bg-red-50 dark:hover:bg-red-900/20': isAnomaly && !isSelected,
                      }
                    )}
                    onClick={() => onEntrySelect(entry)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <div>
                          <div className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                            {formatTimestamp(entry.timestamp)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                          <Globe className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                            {entry.src_ip || 'Unknown'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            IP Address
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="max-w-sm">
                        <div className="text-sm text-slate-900 dark:text-slate-100 truncate font-medium">
                          {entry.method && entry.url ? `${entry.method} ${entry.url}` : entry.url || 'No URL'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                          {entry.user_agent ? entry.user_agent.slice(0, 60) + '...' : 'No user agent'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.status_code ? (
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(entry.status_code)}
                          <span className={clsx(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                            getStatusColor(entry.status_code)
                          )}>
                            {entry.status_code}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No status</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      {isAnomaly && firstAnomaly ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse-soft"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-red-700 dark:text-red-300 truncate">
                              {firstAnomaly.reason}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <SeverityBadge severity={firstAnomaly.severity} />
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {(firstAnomaly.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Normal</span>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEntrySelect(entry)
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle more actions
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="More actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > pagination.per_page && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.per_page) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.per_page, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-ghost btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, Math.ceil(pagination.total / pagination.per_page)))].map((_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={clsx(
                          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                          pageNum === page
                            ? 'bg-brand-600 text-white shadow-soft'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setPage(Math.min(Math.ceil(pagination.total / pagination.per_page), page + 1))}
                  disabled={page >= Math.ceil(pagination.total / pagination.per_page)}
                  className="btn-ghost btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 