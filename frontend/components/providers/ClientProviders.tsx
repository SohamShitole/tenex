'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/providers/AuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401 errors
        if (error?.response?.status === 401) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

interface ClientProvidersProps {
  children: React.ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.25)',
            },
            success: {
              style: {
                background: '#22c55e',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
            loading: {
              style: {
                background: '#3b82f6',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#3b82f6',
              },
            },
          }}
        />
      </AuthProvider>
      {/* React Query DevTools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
} 