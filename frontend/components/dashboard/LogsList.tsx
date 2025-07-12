'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { logsApi, LogFile } from '@/lib/api'
import { AlertCircle, FileText, Database, Search, Filter, Calendar, MoreVertical, Clock, Activity, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface LogsListProps {
  onSelect?: (log: LogFile) => void
  selectedId?: string
}

export default function LogsList({ onSelect, selectedId }: LogsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest')
  
  const { data: logs, isLoading, error } = useQuery(['log-files'], () => logsApi.getLogFiles(), {
    refetchInterval: 5000, // Refetch every 5 seconds to update status
  })

  // Auto-select first log once data arrives
  useEffect(() => {
    if (!selectedId && logs && logs.length > 0 && onSelect) {
      onSelect(logs[0])
    }
  }, [logs, selectedId, onSelect])

  // Filter and sort logs
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = log.filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'name':
        return a.filename.localeCompare(b.filename)
      case 'size':
        return b.file_size - a.file_size
      default:
        return 0
    }
  }) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'uploaded':
        return <Clock className="w-4 h-4 text-amber-500" />
      default:
        return <FileText className="w-4 h-4 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
      case 'processing':
        return 'bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
      case 'uploaded':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 loading-spinner mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 mx-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-sm text-red-700 dark:text-red-300">Failed to load log files</p>
        </div>
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
          <Database className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Log Files
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Upload your first log file to get started with analysis
        </p>
        <button
          onClick={() => window.location.href = '/upload'}
          className="btn-primary btn-md"
        >
          Upload Log File
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Log Files
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filteredLogs.length} files available
              </p>
            </div>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all duration-200"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 pr-8"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
                <option value="uploaded">Uploaded</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 pr-8"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
              <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Log Files List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={clsx(
                'group relative rounded-xl border-2 transition-all duration-200 cursor-pointer',
                'hover:shadow-soft-lg hover:border-slate-300 dark:hover:border-slate-600',
                {
                  'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-soft ring-1 ring-brand-500': selectedId === log.id,
                  'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800': selectedId !== log.id,
                }
              )}
              onClick={() => onSelect?.(log)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-soft">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      {log.status === 'processing' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse-soft"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm mb-1">
                        {log.filename}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', getStatusColor(log.status))}>
                          {getStatusIcon(log.status)}
                          <span className="ml-1.5 capitalize">{log.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Size</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatFileSize(log.file_size)}
                    </span>
                  </div>
                  
                  {log.total_entries && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Entries</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {log.total_entries.toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {log.log_format && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Format</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {log.log_format}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar for processing files */}
                {log.status === 'processing' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Processing</span>
                      <span className="font-medium text-brand-600 dark:text-brand-400">
                        {log.processing_progress || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div 
                        className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${log.processing_progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Date range for ready files */}
                {log.status === 'ready' && log.date_range_start && log.date_range_end && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>
                        {new Date(log.date_range_start).toLocaleDateString()} - {new Date(log.date_range_end).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 