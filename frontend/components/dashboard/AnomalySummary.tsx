'use client'

import React from 'react'
import { useQuery } from 'react-query'
import { anomaliesApi, AnomalyStats } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, Area, AreaChart } from 'recharts'
import { AlertTriangle, TrendingUp, Shield, Clock, Target, Activity, Zap, Eye, ChevronDown, Filter, Download } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#059669',
}

const SEVERITY_BG_COLORS: Record<string, string> = {
  critical: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  high: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  medium: 'bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  low: 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
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
        <div className="flex items-center">
          <Shield className="w-5 h-5 mr-3" />
          <p>Select a log file to view anomaly analytics.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading State */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="alert-danger">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-3" />
          <div>
            <p className="font-medium">Failed to load anomaly statistics</p>
            <p className="text-sm opacity-75 mt-1">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </div>
    )
  }

  const severityData = Object.entries(stats.by_severity).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: SEVERITY_COLORS[severity] || '#64748b',
    percentage: stats.total_anomalies > 0 ? Math.round((count / stats.total_anomalies) * 100) : 0
  }))

  const confidenceData = Object.entries(stats.confidence_distribution).map(([range, value]) => ({
    range: range.replace('_', '-'),
    value,
    fill: '#0ea5e9'
  }))

  const timelineData = stats.timeline.map(point => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    count: point.count,
    fullTimestamp: point.timestamp
  }))

  const totalAnomalies = stats.total_anomalies || 0
  const criticalCount = stats.by_severity.critical || 0
  const highCount = stats.by_severity.high || 0
  const riskScore = totalAnomalies > 0 ? Math.round(((criticalCount * 4 + highCount * 3) / totalAnomalies) * 25) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Security Analytics
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            AI-powered threat detection and anomaly analysis
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-ghost btn-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          <button className="btn-ghost btn-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalAnomalies}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Total Anomalies
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Detection Rate</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {totalAnomalies > 0 ? '✓ Active' : '○ Inactive'}
            </span>
          </div>
        </div>

        <div className="card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {criticalCount + highCount}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                High Priority
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Risk Level</span>
            <span className={`font-medium ${riskScore > 70 ? 'text-red-600' : riskScore > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {riskScore > 70 ? 'High' : riskScore > 30 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>

        <div className="card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.timeline.length}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Time Points
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Coverage</span>
            <span className="font-medium text-violet-600 dark:text-violet-400">
              {stats.timeline.length > 0 ? '100%' : '0%'}
            </span>
          </div>
        </div>

        <div className="card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {Math.round(Object.values(stats.confidence_distribution).reduce((a, b) => a + b, 0) / Object.keys(stats.confidence_distribution).length * 100) || 0}%
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Avg Confidence
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Accuracy</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              High
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Severity Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Threat Distribution
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Breakdown by severity level
                </p>
              </div>
              <Target className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="card-body">
            {severityData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No anomalies detected</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Your system appears to be secure</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                                       <Pie 
                     dataKey="value" 
                     data={severityData} 
                     innerRadius={60} 
                     outerRadius={90}
                     paddingAngle={2}
                   >
                      {severityData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any) => [value, `${name} threats`]}
                      contentStyle={{
                        backgroundColor: 'rgb(30 41 59)',
                        border: '1px solid rgb(71 85 105)',
                        borderRadius: '12px',
                        color: 'rgb(248 250 252)',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3">
                  {severityData.map((item) => (
                    <div key={item.name} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100 capitalize text-sm">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.value} ({item.percentage}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Detection Timeline
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Anomaly frequency over time
                </p>
              </div>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="card-body">
            {timelineData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No timeline data available</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Data will appear as logs are processed</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(226 232 240)" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12, fill: 'rgb(100 116 139)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'rgb(100 116 139)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value) => [value, 'Anomalies']}
                    labelFormatter={(label) => `Time: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgb(30 41 59)',
                      border: '1px solid rgb(71 85 105)',
                      borderRadius: '12px',
                      color: 'rgb(248 250 252)',
                      fontSize: '14px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#colorAnomalies)"
                    dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#0369a1' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Confidence Distribution */}
      {confidenceData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Confidence Distribution
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  ML model confidence levels
                </p>
              </div>
              <Eye className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={confidenceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(226 232 240)" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 12, fill: 'rgb(100 116 139)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'rgb(100 116 139)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value) => [value, 'Detections']}
                  labelFormatter={(label) => `Confidence: ${label}%`}
                  contentStyle={{
                    backgroundColor: 'rgb(30 41 59)',
                    border: '1px solid rgb(71 85 105)',
                    borderRadius: '12px',
                    color: 'rgb(248 250 252)',
                    fontSize: '14px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
} 