'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, authApi, isAuthenticated, getCurrentUser } from '@/lib/api'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        if (isAuthenticated()) {
          const storedUser = getCurrentUser()
          if (storedUser) {
            setUser(storedUser)
          } else {
            // Verify token with server
            const userData = await authApi.getCurrentUser()
            setUser(userData)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // Clear invalid auth data
        authApi.logout()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await authApi.login({ email, password })
      setUser(response.user)
      toast.success('Welcome back!')
      router.push('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await authApi.register({ email, username, password })
      setUser(response.user)
      toast.success('Account created successfully!')
      router.push('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 