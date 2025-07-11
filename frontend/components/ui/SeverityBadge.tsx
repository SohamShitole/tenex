'use client'

import React from 'react'
import clsx from 'clsx'

interface SeverityBadgeProps {
  severity: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const COLOR_MAP: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800',
}

const SIZE_MAP: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
}

export default function SeverityBadge({ severity, className, size = 'sm' }: SeverityBadgeProps) {
  const level = severity.toLowerCase()
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium border',
        COLOR_MAP[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
        SIZE_MAP[size],
        className,
      )}
    >
      {severity}
    </span>
  )
} 