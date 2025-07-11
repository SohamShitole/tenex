'use client'

import React from 'react'
import type { LogEntry } from '@/lib/api'
import { X, AlertTriangle, Clock, Globe, Monitor, User, Code, FileText, Shield, Activity } from 'lucide-react'
import SeverityBadge from '@/components/ui/SeverityBadge'

interface LogEntryDetailsProps {
  entry: LogEntry
  onClose: () => void
}

export default function LogEntryDetails({ entry, onClose }: LogEntryDetailsProps) {
  const isAnomaly = entry.anomalies && entry.anomalies.length > 0

  return (
    <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Entry Details</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-6">
          {/* Anomaly Alert */}
          {isAnomaly && (
            <div className="alert-danger">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3">
                    {entry.anomalies.length === 1 ? 'Anomaly Detected' : `${entry.anomalies.length} Anomalies Detected`}
                  </h4>
                  <div className="space-y-3">
                    {entry.anomalies.map((anomaly, index) => (
                      <div key={anomaly.id || index} className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-red-800 dark:text-red-200">
                            {anomaly.reason}
                          </h5>
                          <SeverityBadge severity={anomaly.severity} />
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-red-700 dark:text-red-300">
                          <div className="flex items-center space-x-1">
                            <Activity className="w-4 h-4" />
                            <span>Confidence: {(anomaly.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Shield className="w-4 h-4" />
                            <span>Severity: {anomaly.severity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Information */}
          <div className="card">
            <div className="card-header">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                Key Information
              </h4>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Timestamp</span>
                  </div>
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {new Date(entry.timestamp).toISOString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Source IP</span>
                  </div>
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {entry.src_ip || 'N/A'}
                  </span>
                </div>
                
                {entry.url && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">URL</span>
                    </div>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate max-w-xs">
                      {entry.url}
                    </span>
                  </div>
                )}
                
                {entry.status_code && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status Code</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {entry.status_code}
                    </span>
                  </div>
                )}
                
                {entry.response_size && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Size</span>
                    </div>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {entry.response_size} bytes
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Agent */}
          {entry.user_agent && (
            <div className="card">
              <div className="card-header">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-600" />
                  User Agent
                </h4>
              </div>
              <div className="card-body">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-words">
                    {entry.user_agent}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Raw Log */}
          <div className="card">
            <div className="card-header">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <Code className="w-4 h-4 mr-2 text-blue-600" />
                Raw Log Entry
              </h4>
            </div>
            <div className="card-body">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                  {entry.raw_log}
                </pre>
              </div>
            </div>
          </div>

          {/* Additional Metadata */}
          <div className="card">
            <div className="card-header">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="w-4 h-4 mr-2 text-blue-600" />
                Additional Information
              </h4>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Entry ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100">#{entry.id}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Analyzed</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {isAnomaly ? 'Anomaly detected' : 'Normal behavior'}
                  </p>
                </div>
                {entry.method && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">HTTP Method</p>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{entry.method}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Log Type</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Web Access Log</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Entry #{entry.id} • Analyzed by Logsight AI
          </p>
          <button
            onClick={onClose}
            className="btn-secondary btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 