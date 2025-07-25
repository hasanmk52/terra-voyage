'use client'

import { useState, useEffect } from 'react'

export interface PWAInstallPrompt {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
  
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
}

class PWAManager {
  private installPrompt: BeforeInstallPromptEvent | null = null
  private isInstalled = false
  private registration: ServiceWorkerRegistration | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePWA()
    }
  }

  private async initializePWA() {
    // Check if already installed
    this.checkInstallStatus()
    
    // Register service worker
    await this.registerServiceWorker()
    
    // Set up install prompt listener
    this.setupInstallPrompt()
    
    // Set up app update listener
    this.setupUpdateListener()
  }

  private checkInstallStatus() {
    // Check if running as installed PWA
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      window.matchMedia('(display-mode: fullscreen)').matches ||
                      (window.navigator as any).standalone === true
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        console.log('Service Worker registered successfully:', this.registration)
        
        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          console.log('New service worker found, preparing update...')
        })

      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent the default install prompt
      event.preventDefault()
      
      // Store the event for later use
      this.installPrompt = event
      
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('pwa-install-available'))
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully')
      this.isInstalled = true
      this.installPrompt = null
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'))
    })
  }

  private setupUpdateListener() {
    if (!this.registration) return

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available
            window.dispatchEvent(new CustomEvent('pwa-update-available'))
          }
        })
      }
    })

    // Listen for controlling service worker change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload to get the new content
      window.location.reload()
    })
  }

  // Public methods
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      return false
    }

    try {
      await this.installPrompt.prompt()
      const result = await this.installPrompt.userChoice
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        return true
      } else {
        console.log('User dismissed the install prompt')
        return false
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }

  isInstallAvailable(): boolean {
    return this.installPrompt !== null
  }

  isAppInstalled(): boolean {
    return this.isInstalled
  }

  async updateApp(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return
    }

    // Tell the waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  async cacheTrip(tripId: string, tripData: any): Promise<void> {
    if (!this.registration) return

    // Send trip data to service worker for caching
    if (this.registration.active) {
      this.registration.active.postMessage({
        type: 'CACHE_TRIP',
        tripId,
        tripData
      })
    }
  }

  // Request persistent storage
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist()
        console.log('Persistent storage:', persistent)
        return persistent
      } catch (error) {
        console.error('Error requesting persistent storage:', error)
        return false
      }
    }
    return false
  }

  // Get storage estimate
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate()
      } catch (error) {
        console.error('Error getting storage estimate:', error)
        return null
      }
    }
    return null
  }

  // Share API integration
  async shareTrip(tripData: {
    title: string
    text: string
    url: string
  }): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share(tripData)
        return true
      } catch (error) {
        console.error('Error sharing:', error)
        return false
      }
    }
    return false
  }

  // Check if sharing is supported
  canShare(): boolean {
    return 'share' in navigator
  }

  // Notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission()
    }
    return 'denied'
  }

  // Show notification
  showNotification(title: string, options?: NotificationOptions): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        ...options
      })
    }
  }
}

// Singleton instance
export const pwaManager = new PWAManager()

// React hooks for PWA functionality
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Initial state
    setIsInstalled(pwaManager.isAppInstalled())
    setIsInstallable(pwaManager.isInstallAvailable())

    // Listen for install availability
    const handleInstallAvailable = () => setIsInstallable(true)
    const handleInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    window.addEventListener('pwa-install-available', handleInstallAvailable)
    window.addEventListener('pwa-installed', handleInstalled)

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable)
      window.removeEventListener('pwa-installed', handleInstalled)
    }
  }, [])

  const install = async () => {
    return await pwaManager.showInstallPrompt()
  }

  return { isInstallable, isInstalled, install }
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true)

    window.addEventListener('pwa-update-available', handleUpdateAvailable)

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable)
    }
  }, [])

  const update = async () => {
    await pwaManager.updateApp()
    setUpdateAvailable(false)
  }

  return { updateAvailable, update }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}