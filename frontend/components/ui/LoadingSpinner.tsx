'use client'

import React from 'react'
import clsx from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const dimension = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-12 w-12' : 'h-6 w-6'

  return (
    <span
      className={clsx(
        'loading-spinner inline-block border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin',
        dimension,
        className,
      )}
    />
  )
} 