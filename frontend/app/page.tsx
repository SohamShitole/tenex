'use client'

import { useEffect } from 'react'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  console.log('🔍 Page.tsx: Home component rendering')
  
  useEffect(() => {
    console.log('🔍 Page.tsx: Home component mounted')
    console.log('🔍 Page.tsx: Checking DOM elements...')
    
    // Check if our components are rendering
    setTimeout(() => {
      const header = document.querySelector('header')
      const dashboard = document.querySelector('[data-testid="dashboard"]') || document.querySelector('.dashboard')
      
      console.log('🔍 Page.tsx: Header found:', !!header)
      console.log('🔍 Page.tsx: Dashboard found:', !!dashboard)
      
      if (header) {
        console.log('🔍 Page.tsx: Header classes:', header.className)
        console.log('🔍 Page.tsx: Header computed styles:', getComputedStyle(header))
      }
      
      // Check if Tailwind classes are being applied
      const body = document.body
      const computedStyles = getComputedStyle(body)
      console.log('🔍 Page.tsx: Body background-color:', computedStyles.backgroundColor)
      console.log('🔍 Page.tsx: Body color:', computedStyles.color)
      console.log('🔍 Page.tsx: Body font-family:', computedStyles.fontFamily)
    }, 100)
  }, [])
  
  return (
    <main className="min-h-screen bg-background-50 dark:bg-slate-900">
      <Dashboard />
    </main>
  )
} 