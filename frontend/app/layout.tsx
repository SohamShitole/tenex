import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/providers/ClientProviders'
import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Logsight - AI-Powered Log Analytics',
  description: 'Advanced log analysis and anomaly detection platform for cybersecurity professionals',
  keywords: 'log analysis, cybersecurity, anomaly detection, AI, machine learning, SOC, security analytics',
  authors: [{ name: 'Logsight Team' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Logsight - AI-Powered Log Analytics',
    description: 'Advanced log analysis and anomaly detection platform for cybersecurity professionals',
    type: 'website',
    locale: 'en_US',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className} h-full antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
} 