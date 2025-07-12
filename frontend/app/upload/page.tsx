'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/components/providers/AuthProvider'
import { logsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, Shield, Zap, BarChart3, Database, Cloud, Activity, Sparkles, TrendingUp, Eye, Clock, Server } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    const file = acceptedFiles[0]

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB')
      return
    }

    // Validate file type
    const validTypes = ['.log', '.txt', '.json', '.csv']
    const fileExtension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'))
    if (!validTypes.includes(fileExtension)) {
      toast.error('Please upload a valid log file (.log, .txt, .json, .csv)')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setUploadSuccess(false)
      setUploadedFileName(file.name)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 200)

      await logsApi.uploadFile(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadSuccess(true)
      
      toast.success('Log file uploaded successfully!')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload log file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.log', '.txt'],
      'application/json': ['.json'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const supportedFormats = [
    { name: 'ZScaler Web Proxy', ext: '.log', icon: Shield, color: 'text-blue-600' },
    { name: 'Nginx Access Logs', ext: '.log', icon: Server, color: 'text-green-600' },
    { name: 'Apache Logs', ext: '.log', icon: Database, color: 'text-orange-600' },
    { name: 'JSON Logs', ext: '.json', icon: FileText, color: 'text-purple-600' },
    { name: 'CSV Logs', ext: '.csv', icon: BarChart3, color: 'text-amber-600' },
    { name: 'Text Logs', ext: '.txt', icon: FileText, color: 'text-slate-600' }
  ]

  const features = [
    { icon: Zap, title: 'AI-Powered Analysis', description: 'Advanced machine learning algorithms detect anomalies and patterns' },
    { icon: TrendingUp, title: 'Real-time Insights', description: 'Get immediate analysis and actionable insights from your logs' },
    { icon: Eye, title: 'Visual Timeline', description: 'Interactive timeline view of events and anomalies' },
    { icon: Activity, title: 'Threat Detection', description: 'Automatic identification of security threats and unusual behavior' }
  ]

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft-xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-soft-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Upload Successful!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your log file <span className="font-semibold text-slate-900 dark:text-slate-100">{uploadedFileName}</span> has been uploaded and is being processed.
            </p>
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Processing</span>
                </div>
                <div className="mt-2 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Redirecting to dashboard in a few seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-violet-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-violet-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Logsight</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">AI Analytics</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Info */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-brand-100 dark:bg-brand-900/20 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">AI-Powered Analysis</span>
              </div>
              
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Upload Your Log Files
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                  Drop your log files and let our AI analyze them for security threats, anomalies, and insights in real-time.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported Formats */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Supported Formats</h3>
              <div className="grid grid-cols-2 gap-3">
                {supportedFormats.map((format, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <format.icon className={`w-5 h-5 ${format.color}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{format.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{format.ext}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Upload */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft-xl p-8 border border-slate-200 dark:border-slate-700">
              {!isUploading ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    isDragActive 
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-soft-lg">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        {isDragActive ? 'Drop your file here' : 'Drag & drop your log file'}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        or click to browse your computer
                      </p>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Supports: .log, .txt, .json, .csv (max 100MB)
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-soft-lg">
                    <Cloud className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Uploading {uploadedFileName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Please wait while we upload and prepare your file for analysis
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-brand-600 to-violet-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Progress</span>
                      <span className="font-medium text-brand-600 dark:text-brand-400">{Math.round(uploadProgress)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Processing Time</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Analysis typically takes 1-3 minutes depending on file size. You'll be redirected to the dashboard once processing is complete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 