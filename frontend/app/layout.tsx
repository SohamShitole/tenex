import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/providers/ClientProviders'
import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

// Debug logging
console.log('🔍 Layout.tsx: Component loaded')
console.log('🔍 Layout.tsx: Inter font loaded:', inter.className)

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
  themeColor: '#0284c7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('🔍 Layout.tsx: RootLayout rendering')
  
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full min-h-screen bg-background-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased`}>
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              console.log('🔍 Body classes applied:', document.body.className);
              console.log('🔍 HTML classes applied:', document.documentElement.className);
              console.log('🔍 Checking if Tailwind is loaded...');
              
              // Check if Tailwind CSS is loaded
              const hasBackground = getComputedStyle(document.body).backgroundColor;
              console.log('🔍 Body background color:', hasBackground);
              
              // Check if custom CSS variables are loaded
              const rootStyle = getComputedStyle(document.documentElement);
              const brandColor = rootStyle.getPropertyValue('--primary');
              console.log('🔍 CSS Variables - Primary color:', brandColor);
              
              // Check if fonts are loaded
              const fontFamily = getComputedStyle(document.body).fontFamily;
              console.log('🔍 Font family:', fontFamily);
            `
          }}
        />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
} 