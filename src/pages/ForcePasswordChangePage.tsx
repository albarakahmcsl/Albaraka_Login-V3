import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { validatePasswordStrength } from '../utils/validation'
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export function ForcePasswordChangePage() {
  const navigate = useNavigate()
  const { user, changePassword, loading: authLoading } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean
    message: string
    errors: string[]
  } | null>(null)

  // Redirect if user doesn't need password reset
  useEffect(() => {
    if (!authLoading && user && !user.needs_password_reset) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (password) {
      validatePasswordStrength(password).then(setPasswordValidation)
    } else setPasswordValidation(null)
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setIsSuccess(false)
    setIsLoading(true)

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setIsSuccess(false)
      setIsLoading(false)
      return
    }

    if (!passwordValidation?.isValid) {
      setMessage('Password does not meet strength requirements.')
      setIsSuccess(false)
      setIsLoading(false)
      return
    }

    if (!user) {
      setMessage('User not authenticated.')
      setIsLoading(false)
      return
    }

    try {
      // Force password change
      await changePassword(password, true)
      setMessage('Password changed successfully! Redirecting...')
      setIsSuccess(true)
      setPassword('')
      setConfirmPassword('')

      setTimeout(() => navigate('/dashboard', { replace: true }), 1000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to change password.')
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* ... form JSX unchanged ... */}
    </div>
  )
}
