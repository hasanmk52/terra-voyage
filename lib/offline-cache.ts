import { Trip, Activity } from '@prisma/client'

export interface TripWithActivities extends Trip {
  activities: Activity[]
  user: {
    name: string | null
    email: string
  }
}

export interface CachedTrip {
  id: string
  data: TripWithActivities
  cachedAt: number
  lastModified: number
  syncStatus: 'synced' | 'pending' | 'conflict'
}

export interface OfflineQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: 'trip' | 'activity'
  data: any
  timestamp: number
  retryCount: number
}

class OfflineCacheManager {
  private dbName = 'terraVoyageOffline'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  constructor() {
    this.initDB()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Trips store
        if (!db.objectStoreNames.contains('trips')) {
          const tripsStore = db.createObjectStore('trips', { keyPath: 'id' })
          tripsStore.createIndex('userId', 'data.userId')
          tripsStore.createIndex('lastModified', 'lastModified')
          tripsStore.createIndex('syncStatus', 'syncStatus')
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' })
          queueStore.createIndex('timestamp', 'timestamp')
          queueStore.createIndex('type', 'type')
          queueStore.createIndex('resource', 'resource')
        }

        // User preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' })
        }

        // Static data store (for emergency info, etc.)
        if (!db.objectStoreNames.contains('staticData')) {
          const staticStore = db.createObjectStore('staticData', { keyPath: 'key' })
          staticStore.createIndex('category', 'category')
        }
      }
    })
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB()
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB')
    }
    return this.db
  }

  /**
   * Cache a trip for offline access
   */
  async cacheTrip(trip: TripWithActivities): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(['trips'], 'readwrite')
    const store = transaction.objectStore('trips')

    const cachedTrip: CachedTrip = {
      id: trip.id,
      data: trip,
      cachedAt: Date.now(),
      lastModified: new Date(trip.updatedAt).getTime(),
      syncStatus: 'synced'
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cachedTrip)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cached trip
   */
  async getCachedTrip(tripId: string): Promise<CachedTrip | null> {
    const db = await this.getDB()
    const transaction = db.transaction(['trips'], 'readonly')
    const store = transaction.objectStore('trips')

    return new Promise((resolve, reject) => {
      const request = store.get(tripId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all cached trips for a user
   */
  async getCachedTrips(userId: string): Promise<CachedTrip[]> {
    const db = await this.getDB()
    const transaction = db.transaction(['trips'], 'readonly')
    const store = transaction.objectStore('trips')
    const index = store.index('userId')

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update cached trip
   */
  async updateCachedTrip(
    tripId: string,
    updates: Partial<TripWithActivities>
  ): Promise<void> {
    const cachedTrip = await this.getCachedTrip(tripId)
    if (!cachedTrip) {
      throw new Error('Trip not found in cache')
    }

    const updatedTrip: CachedTrip = {
      ...cachedTrip,
      data: { ...cachedTrip.data, ...updates },
      lastModified: Date.now(),
      syncStatus: 'pending'
    }

    const db = await this.getDB()
    const transaction = db.transaction(['trips'], 'readwrite')
    const store = transaction.objectStore('trips')

    await new Promise<void>((resolve, reject) => {
      const request = store.put(updatedTrip)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    // Add to offline queue
    await this.addToOfflineQueue({
      type: 'update',
      resource: 'trip',
      data: { id: tripId, ...updates }
    })
  }

  /**
   * Add item to offline sync queue
   */
  async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(['offlineQueue'], 'readwrite')
    const store = transaction.objectStore('offlineQueue')

    const queueItem: OfflineQueueItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      ...item
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.add(queueItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get pending offline queue items
   */
  async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    const db = await this.getDB()
    const transaction = db.transaction(['offlineQueue'], 'readonly')
    const store = transaction.objectStore('offlineQueue')
    const index = store.index('timestamp')

    return new Promise((resolve, reject) => {
      const request = index.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove item from offline queue
   */
  async removeFromOfflineQueue(itemId: string): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(['offlineQueue'], 'readwrite')
    const store = transaction.objectStore('offlineQueue')

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(itemId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Cache static data (emergency info, etc.)
   */
  async cacheStaticData(key: string, data: any, category: string = 'general'): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(['staticData'], 'readwrite')
    const store = transaction.objectStore('staticData')

    const staticItem = {
      key,
      category,
      data,
      cachedAt: Date.now()
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(staticItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cached static data
   */
  async getStaticData(key: string): Promise<any> {
    const db = await this.getDB()
    const transaction = db.transaction(['staticData'], 'readonly')
    const store = transaction.objectStore('staticData')

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result?.data || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: Record<string, any>): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(['preferences'], 'readwrite')
    const store = transaction.objectStore('preferences')

    const prefItem = {
      key: 'userPreferences',
      data: preferences,
      updatedAt: Date.now()
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(prefItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<Record<string, any> | null> {
    const db = await this.getDB()
    const transaction = db.transaction(['preferences'], 'readonly')
    const store = transaction.objectStore('preferences')

    return new Promise((resolve, reject) => {
      const request = store.get('userPreferences')
      request.onsuccess = () => resolve(request.result?.data || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(['trips', 'offlineQueue', 'preferences', 'staticData'], 'readwrite')

    const stores = ['trips', 'offlineQueue', 'preferences', 'staticData']
    const clearPromises = stores.map(storeName => {
      const store = transaction.objectStore(storeName)
      return new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })

    await Promise.all(clearPromises)
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalTrips: number
    pendingSync: number
    cacheSize: string
    lastSync: number | null
  }> {
    const db = await this.getDB()
    
    // Get trips count
    const tripsTransaction = db.transaction(['trips'], 'readonly')
    const tripsStore = tripsTransaction.objectStore('trips')
    const tripsCount = await new Promise<number>((resolve, reject) => {
      const request = tripsStore.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Get pending sync count
    const queueTransaction = db.transaction(['offlineQueue'], 'readonly')
    const queueStore = queueTransaction.objectStore('offlineQueue')
    const pendingCount = await new Promise<number>((resolve, reject) => {
      const request = queueStore.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Estimate cache size (simplified)
    const estimatedSize = tripsCount * 50 + pendingCount * 10 // KB estimate
    const cacheSizeStr = estimatedSize > 1024 
      ? `${(estimatedSize / 1024).toFixed(1)} MB`
      : `${estimatedSize} KB`

    // Get last sync from preferences
    const preferences = await this.getPreferences()
    const lastSync = preferences?.lastSync || null

    return {
      totalTrips: tripsCount,
      pendingSync: pendingCount,
      cacheSize: cacheSizeStr,
      lastSync
    }
  }

  /**
   * Check if app is offline
   */
  isOffline(): boolean {
    return !navigator.onLine
  }

  /**
   * Set up network status listeners
   */
  setupNetworkListeners(onOnline: () => void, onOffline: () => void): void {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
  }
}

// Singleton instance
export const offlineCacheManager = new OfflineCacheManager()

/**
 * React hook for offline status (to be used in components)
 */
export function createOfflineStatusHook() {
  return function useOfflineStatus() {
    if (typeof window === 'undefined') return false
    
    const [isOffline, setIsOffline] = useState(!navigator.onLine)

    useEffect(() => {
      const handleOnline = () => setIsOffline(false)
      const handleOffline = () => setIsOffline(true)

      offlineCacheManager.setupNetworkListeners(handleOnline, handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }, [])

    return isOffline
  }
}

/**
 * Service to sync offline changes when online
 */
export class OfflineSyncService {
  private issyncing = false

  async syncPendingChanges(): Promise<void> {
    if (this.issyncing || offlineCacheManager.isOffline()) {
      return
    }

    this.issyncing = true

    try {
      const pendingItems = await offlineCacheManager.getOfflineQueue()
      
      for (const item of pendingItems) {
        try {
          await this.syncItem(item)
          await offlineCacheManager.removeFromOfflineQueue(item.id)
        } catch (error) {
          console.error('Failed to sync item:', item, error)
          // Increment retry count or remove if too many retries
          if (item.retryCount >= 3) {
            await offlineCacheManager.removeFromOfflineQueue(item.id)
          }
        }
      }

      // Update last sync time
      const preferences = await offlineCacheManager.getPreferences() || {}
      preferences.lastSync = Date.now()
      await offlineCacheManager.savePreferences(preferences)

    } finally {
      this.issyncing = false
    }
  }

  private async syncItem(item: OfflineQueueItem): Promise<void> {
    const endpoint = `/api/${item.resource}s`
    const method = item.type === 'create' ? 'POST' : 
                   item.type === 'update' ? 'PUT' : 'DELETE'

    const response = await fetch(
      item.type === 'delete' ? `${endpoint}/${item.data.id}` : endpoint,
      {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: item.type === 'delete' ? undefined : JSON.stringify(item.data)
      }
    )

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`)
    }
  }
}

export const offlineSyncService = new OfflineSyncService()