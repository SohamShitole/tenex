'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/components/providers/AuthProvider'
import { logsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, Shield, Zap, BarChart3, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
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
      
      toast.success('Log file uploaded successfully!')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.log', '.txt'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Logsight</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload & Analyze</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {user?.username}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Upload Your Log File
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload your log files to get AI-powered analysis, anomaly detection, and insights that help you understand your system's behavior.
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : isUploading
                ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
            }`}
          >
            <input {...getInputProps()} />
            
            {isUploading ? (
              <div className="space-y-6">
                <div className="w-16 h-16 loading-spinner mx-auto"></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Uploading Your Log File
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Please wait while we process your file...
                  </p>
                  <div className="w-full max-w-md mx-auto">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {isDragActive ? 'Drop your log file here' : 'Drag & drop your log file here'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    or click to browse from your computer
                  </p>
                  <div className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Supported formats:</span>
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">.log</span>
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">.txt</span>
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">.json</span>
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">.csv</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Maximum file size: 100MB
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              AI-Powered Analysis
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced machine learning algorithms detect anomalies and patterns in your logs automatically.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Real-time Processing
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get instant insights as soon as your log file is uploaded and processed.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Visual Insights
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Beautiful charts and graphs help you understand your log data at a glance.
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Need Help?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We support various log formats including web server logs, application logs, and system logs. 
                For best results, ensure your log files are properly formatted and contain timestamp information.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  <Database className="w-4 h-4 mr-1" />
                  Apache/Nginx Logs
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                  <Shield className="w-4 h-4 mr-1" />
                  Security Logs
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  <Zap className="w-4 h-4 mr-1" />
                  Application Logs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 