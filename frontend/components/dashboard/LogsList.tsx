'use client'

import React, { useEffect } from 'react'
import type { LogFile } from '@/lib/api'
import { useQuery } from 'react-query'
import { logsApi } from '@/lib/api'
import { formatFileSize, formatDate } from '@/lib/api'
import clsx from 'clsx'
import { AlertCircle, CheckCircle2, Loader2, Circle, FileText, Database, Clock } from 'lucide-react'

interface LogsListProps {
  onSelect?: (log: LogFile) => void
  selectedId?: string
}

export default function LogsList({ onSelect, selectedId }: LogsListProps) {
  const { data: logs, isLoading, error } = useQuery(['log-files'], () => logsApi.getLogFiles(), {
    refetchInterval: 5000, // Refetch every 5 seconds to update status
  })

  // Auto-select first log once data arrives
  useEffect(() => {
    if (!selectedId && logs && logs.length > 0 && onSelect) {
      onSelect(logs[0])
    }
  }, [logs, selectedId, onSelect])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 loading-spinner mx-auto mb-3"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-sm text-red-700 dark:text-red-300">Failed to load log files</p>
        </div>
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Database className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          No Log Files
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Upload your first log file to get started with analysis
        </p>
        <button
          onClick={() => window.location.href = '/upload'}
          className="btn-primary btn-sm"
        >
          Upload Log File
        </button>
      </div>
    )
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="text-green-500 w-4 h-4" />
      case 'processing':
        return <Loader2 className="animate-spin text-blue-500 w-4 h-4" />
      case 'error':
        return <AlertCircle className="text-red-500 w-4 h-4" />
      default:
        return <Circle className="text-gray-400 w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
      case 'error':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className={clsx(
            'group relative rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md',
            {
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md': selectedId === log.id,
              'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600': selectedId !== log.id,
            }
          )}
          onClick={() => onSelect?.(log)}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                    {log.filename}
                  </h3>
                  <div className="flex items-center mt-1">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(log.status)
                    )}>
                      {statusIcon(log.status)}
                      <span className="ml-1.5 capitalize">{log.status}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Database className="w-3 h-3" />
                  <span>{formatFileSize(log.file_size)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{log.processed_at ? formatDate(log.processed_at) : 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Progress indicator for processing logs */}
            {log.status === 'processing' && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Analyzing log entries...
                </p>
              </div>
            )}

            {/* Selection indicator */}
            {selectedId === log.id && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 