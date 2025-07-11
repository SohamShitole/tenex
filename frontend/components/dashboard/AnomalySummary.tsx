'use client'

import React from 'react'
import { useQuery } from 'react-query'
import { anomaliesApi, AnomalyStats } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { AlertTriangle, TrendingUp, Shield, Clock, Target, Activity } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#facc15',
  low: '#16a34a',
}

const SEVERITY_BG_COLORS: Record<string, string> = {
  critical: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  high: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  medium: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  low: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
}

interface AnomalySummaryProps {
  logId: string
}

export default function AnomalySummary({ logId }: AnomalySummaryProps) {
  const { data: stats, isLoading, error } = useQuery<AnomalyStats>(['anomaly-stats', logId], () => anomaliesApi.getAnomalyStats(logId), {
    enabled: !!logId,
  })

  if (!logId) {
    return (
      <div className="alert-info">
        <p>Select a log file to view anomaly analytics.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 loading-spinner mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading anomaly analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="alert-danger">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-3" />
          <p>Failed to load anomaly statistics</p>
        </div>
      </div>
    )
  }

  const severityData = Object.entries(stats.by_severity).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: SEVERITY_COLORS[severity] || '#64748b'
  }))

  const confidenceData = Object.entries(stats.confidence_distribution).map(([range, value]) => ({
    range,
    value,
    fill: '#3b82f6'
  }))

  const timelineData = stats.timeline.map(point => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString(),
    count: point.count,
    fullTimestamp: point.timestamp
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            Anomaly Analytics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered detection and analysis of unusual patterns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            <Activity className="w-4 h-4 mr-1" />
            {stats.total_anomalies} Total
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="metric-card">
          <div className="metric-value text-blue-600 dark:text-blue-400">
            {stats.total_anomalies}
          </div>
          <div className="metric-label">Total Anomalies</div>
        </div>
        {Object.entries(stats.by_severity).map(([severity, count]) => (
          <div key={severity} className="metric-card">
            <div className="flex items-center justify-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: SEVERITY_COLORS[severity] || '#64748b' }}
              />
              <span className="metric-value" style={{ color: SEVERITY_COLORS[severity] || '#64748b' }}>
                {count}
              </span>
            </div>
            <div className="metric-label capitalize">{severity}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.total_anomalies > 0 ? Math.round((count / stats.total_anomalies) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Severity Distribution</h3>
              <p className="chart-subtitle">Breakdown by severity level</p>
            </div>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          {severityData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No anomalies detected</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  dataKey="value" 
                  data={severityData} 
                  innerRadius={60} 
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, `${name} anomalies`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Confidence Distribution */}
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Confidence Distribution</h3>
              <p className="chart-subtitle">ML model confidence levels</p>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          {confidenceData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No confidence data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={confidenceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  formatter={(value) => [value, 'Anomalies']}
                  labelFormatter={(label) => `Confidence: ${label}`}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Anomaly Timeline</h3>
            <p className="chart-subtitle">Detection frequency over time</p>
          </div>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        {timelineData.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No timeline data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip 
                formatter={(value) => [value, 'Anomalies']}
                labelFormatter={(label) => `Time: ${label}`}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Severity Breakdown Cards */}
      {Object.entries(stats.by_severity).filter(([_, count]) => count > 0).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(stats.by_severity)
            .filter(([_, count]) => count > 0)
            .map(([severity, count]) => (
              <div
                key={severity}
                className={`p-4 rounded-lg border ${SEVERITY_BG_COLORS[severity] || 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold capitalize text-sm">{severity}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: SEVERITY_COLORS[severity] + '20' }}
                  >
                    <AlertTriangle 
                      className="w-4 h-4" 
                      style={{ color: SEVERITY_COLORS[severity] }}
                    />
                  </div>
                </div>
                <p className="text-xs opacity-75 mt-2">
                  {stats.total_anomalies > 0 ? Math.round((count / stats.total_anomalies) * 100) : 0}% of total
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
} 