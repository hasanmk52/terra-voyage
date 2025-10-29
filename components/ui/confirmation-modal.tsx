"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmationModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm()
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="bg-white rounded-xl shadow-2xl border-0 overflow-hidden max-w-md w-full">
              {/* Header */}
              <div className="px-6 py-5 bg-white border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-full ${
                      variant === 'destructive' 
                        ? 'bg-red-50 text-red-500' 
                        : 'bg-blue-50 text-blue-500'
                    }`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 leading-6">
                      {title}
                    </h3>
                  </div>
                  {!isLoading && (
                    <button
                      onClick={handleCancel}
                      className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="px-6 py-5 bg-white">
                <p className="text-gray-600 leading-relaxed text-base mb-6">
                  {message}
                </p>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="order-2 sm:order-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={`order-1 sm:order-2 px-4 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      variant === 'destructive' 
                        ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                    }`}
                  >
                    {isLoading ? 'Processing...' : confirmText}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for easier usage
export function useConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive'
  }>({
    title: '',
    message: ''
  })
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    options: {
      confirmText?: string
      cancelText?: string
      variant?: 'default' | 'destructive'
    } = {}
  ) => {
    setConfig({
      title,
      message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      variant: options.variant
    })
    setOnConfirmCallback(() => onConfirm)
    setIsOpen(true)
    setIsLoading(false)
  }

  const handleConfirm = async () => {
    if (onConfirmCallback) {
      setIsLoading(true)
      try {
        await onConfirmCallback()
        // Success - wait for card animation to complete before closing modal
        setIsLoading(false)
        // Wait 450ms total: 250ms for card exit + 200ms buffer
        setTimeout(() => {
          setIsOpen(false)
        }, 450)
      } catch (error) {
        console.error('Confirmation action failed:', error)
        setIsLoading(false)
        // Keep modal open on error
      }
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false)
      setOnConfirmCallback(null)
    }
  }

  const ConfirmationModalComponent = () => (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={config.title}
      message={config.message}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      isLoading={isLoading}
    />
  )

  return {
    showConfirmation,
    ConfirmationModal: ConfirmationModalComponent,
    isLoading
  }
}