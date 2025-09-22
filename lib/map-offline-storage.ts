/**
 * Map Offline Storage Service
 * Handles caching of map tiles and offline functionality
 */

export interface MapTile {
  key: string
  url: string
  data: Blob
  timestamp: number
  accessCount: number
  lastAccess: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface CacheStats {
  totalTiles: number
  totalSize: number
  oldestTile: number
  newestTile: number
  hitRate: number
}

export interface OfflineMapConfig {
  maxCacheSize: number // bytes
  maxTileAge: number // milliseconds
  preloadRadius: number // tiles around viewport
  compressionLevel: number // 0-9
}

export class MapOfflineStorage {
  private static readonly DB_NAME = 'terra-voyage-maps'
  private static readonly DB_VERSION = 1
  private static readonly STORE_NAME = 'map-tiles'
  private static readonly DEFAULT_CONFIG: OfflineMapConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    maxTileAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    preloadRadius: 1,
    compressionLevel: 6
  }

  private db: IDBDatabase | null = null
  private config: OfflineMapConfig
  private cacheStats: CacheStats | null = null
  private isSupported: boolean

  constructor(config: Partial<OfflineMapConfig> = {}) {
    this.config = { ...MapOfflineStorage.DEFAULT_CONFIG, ...config }
    this.isSupported = this.checkSupport()
  }

  /**
   * Checks if offline storage is supported in current environment
   */
  private checkSupport(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        'indexedDB' in window &&
        'caches' in window &&
        'serviceWorker' in navigator
      )
    } catch {
      return false
    }
  }

  /**
   * Initializes the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Offline map storage is not supported in this environment')
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MapOfflineStorage.DB_NAME, MapOfflineStorage.DB_VERSION)

      request.onerror = () => reject(new Error('Failed to open IndexedDB'))

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create tiles store
        if (!db.objectStoreNames.contains(MapOfflineStorage.STORE_NAME)) {
          const store = db.createObjectStore(MapOfflineStorage.STORE_NAME, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('lastAccess', 'lastAccess', { unique: false })
          store.createIndex('accessCount', 'accessCount', { unique: false })
        }
      }
    })
  }

  /**
   * Stores a map tile in offline cache
   */
  async storeTile(tileUrl: string, tileData: Blob): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const key = this.generateTileKey(tileUrl)
    const now = Date.now()

    const tile: MapTile = {
      key,
      url: tileUrl,
      data: tileData,
      timestamp: now,
      accessCount: 1,
      lastAccess: now
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MapOfflineStorage.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MapOfflineStorage.STORE_NAME)
      
      const request = store.put(tile)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to store tile'))
    })
  }

  /**
   * Retrieves a tile from offline cache
   */
  async getTile(tileUrl: string): Promise<MapTile | null> {
    if (!this.db) throw new Error('Database not initialized')

    const key = this.generateTileKey(tileUrl)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MapOfflineStorage.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MapOfflineStorage.STORE_NAME)
      
      const request = store.get(key)
      
      request.onsuccess = () => {
        const tile = request.result as MapTile | undefined
        
        if (tile) {
          // Update access statistics
          tile.lastAccess = Date.now()
          tile.accessCount++
          store.put(tile)
        }
        
        resolve(tile || null)
      }
      
      request.onerror = () => reject(new Error('Failed to retrieve tile'))
    })
  }

  /**
   * Checks if tile exists and is still valid
   */
  async isTileValid(tileUrl: string): Promise<boolean> {
    const tile = await this.getTile(tileUrl)
    
    if (!tile) return false
    
    const age = Date.now() - tile.timestamp
    return age < this.config.maxTileAge
  }

  /**
   * Preloads tiles for a given area
   */
  async preloadArea(
    center: { lat: number; lng: number },
    zoom: number,
    radius: number = this.config.preloadRadius
  ): Promise<{ success: number; failed: number }> {
    const tiles = this.generateTileList(center, zoom, radius)
    let success = 0
    let failed = 0

    const promises = tiles.map(async (tileCoords) => {
      try {
        const tileUrl = this.generateTileUrl(tileCoords.x, tileCoords.y, tileCoords.z)
        
        // Check if already cached and valid
        if (await this.isTileValid(tileUrl)) {
          success++
          return
        }

        // Fetch and cache tile
        const response = await fetch(tileUrl)
        if (response.ok) {
          const blob = await response.blob()
          await this.storeTile(tileUrl, blob)
          success++
        } else {
          failed++
        }
      } catch (error) {
        failed++
        console.warn('Failed to preload tile:', error)
      }
    })

    await Promise.allSettled(promises)
    return { success, failed }
  }

  /**
   * Cleans up old or excess tiles
   */
  async cleanup(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const stats = await this.getCacheStats()
    
    // If under size limit and no old tiles, no cleanup needed
    if (stats.totalSize < this.config.maxCacheSize && 
        Date.now() - stats.oldestTile < this.config.maxTileAge) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MapOfflineStorage.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MapOfflineStorage.STORE_NAME)
      const index = store.index('lastAccess')
      
      // Get tiles sorted by last access (oldest first)
      const request = index.openCursor()
      const tilesToDelete: string[] = []
      let currentSize = stats.totalSize
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        
        if (cursor) {
          const tile = cursor.value as MapTile
          const tileAge = Date.now() - tile.timestamp
          
          // Delete if too old or if we need to free space
          if (tileAge > this.config.maxTileAge || 
              currentSize > this.config.maxCacheSize) {
            tilesToDelete.push(tile.key)
            currentSize -= tile.data.size
          }
          
          cursor.continue()
        } else {
          // Delete identified tiles
          Promise.all(
            tilesToDelete.map(key => {
              return new Promise<void>((resolveDelete, rejectDelete) => {
                const deleteRequest = store.delete(key)
                deleteRequest.onsuccess = () => resolveDelete()
                deleteRequest.onerror = () => rejectDelete(new Error(`Failed to delete tile ${key}`))
              })
            })
          ).then(() => resolve()).catch(reject)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to cleanup tiles'))
    })
  }

  /**
   * Gets cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MapOfflineStorage.STORE_NAME], 'readonly')
      const store = transaction.objectStore(MapOfflineStorage.STORE_NAME)
      
      const request = store.openCursor()
      
      let totalTiles = 0
      let totalSize = 0
      let oldestTile = Infinity
      let newestTile = 0
      let totalHits = 0
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        
        if (cursor) {
          const tile = cursor.value as MapTile
          totalTiles++
          totalSize += tile.data.size
          oldestTile = Math.min(oldestTile, tile.timestamp)
          newestTile = Math.max(newestTile, tile.timestamp)
          totalHits += tile.accessCount
          
          cursor.continue()
        } else {
          const hitRate = totalTiles > 0 ? totalHits / totalTiles : 0
          
          const stats: CacheStats = {
            totalTiles,
            totalSize,
            oldestTile: oldestTile === Infinity ? 0 : oldestTile,
            newestTile,
            hitRate
          }
          
          this.cacheStats = stats
          resolve(stats)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to get cache stats'))
    })
  }

  /**
   * Clears all cached tiles
   */
  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MapOfflineStorage.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(MapOfflineStorage.STORE_NAME)
      
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear cache'))
    })
  }

  /**
   * Checks if offline mode is available for given area
   */
  async checkOfflineAvailability(
    bounds: MapBounds,
    zoom: number
  ): Promise<{ available: boolean; coverage: number }> {
    const tiles = this.generateTileListForBounds(bounds, zoom)
    let availableTiles = 0

    for (const tile of tiles) {
      const tileUrl = this.generateTileUrl(tile.x, tile.y, tile.z)
      if (await this.isTileValid(tileUrl)) {
        availableTiles++
      }
    }

    const coverage = tiles.length > 0 ? availableTiles / tiles.length : 0
    return {
      available: coverage > 0.8, // 80% coverage required
      coverage
    }
  }

  /**
   * Generates a unique key for a tile URL
   */
  private generateTileKey(tileUrl: string): string {
    // Extract tile coordinates from URL or use hash
    const match = tileUrl.match(/\/(\d+)\/(\d+)\/(\d+)/)
    if (match) {
      return `tile_${match[1]}_${match[2]}_${match[3]}`
    }
    
    // Fallback to hash
    return `tile_${this.hashString(tileUrl)}`
  }

  /**
   * Generates a standard Mapbox tile URL
   */
  private generateTileUrl(x: number, y: number, z: number): string {
    return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.png?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
  }

  /**
   * Generates list of tiles for a center point and radius
   */
  private generateTileList(
    center: { lat: number; lng: number },
    zoom: number,
    radius: number
  ): Array<{ x: number; y: number; z: number }> {
    const centerTile = this.latLngToTile(center.lat, center.lng, zoom)
    const tiles: Array<{ x: number; y: number; z: number }> = []

    for (let x = centerTile.x - radius; x <= centerTile.x + radius; x++) {
      for (let y = centerTile.y - radius; y <= centerTile.y + radius; y++) {
        tiles.push({ x, y, z: zoom })
      }
    }

    return tiles
  }

  /**
   * Generates list of tiles for geographic bounds
   */
  private generateTileListForBounds(
    bounds: MapBounds,
    zoom: number
  ): Array<{ x: number; y: number; z: number }> {
    const nwTile = this.latLngToTile(bounds.north, bounds.west, zoom)
    const seTile = this.latLngToTile(bounds.south, bounds.east, zoom)
    const tiles: Array<{ x: number; y: number; z: number }> = []

    for (let x = nwTile.x; x <= seTile.x; x++) {
      for (let y = nwTile.y; y <= seTile.y; y++) {
        tiles.push({ x, y, z: zoom })
      }
    }

    return tiles
  }

  /**
   * Converts lat/lng to tile coordinates
   */
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom)
    const x = Math.floor(((lng + 180) / 360) * n)
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n)
    
    return { x, y }
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Gets current configuration
   */
  getConfig(): OfflineMapConfig {
    return { ...this.config }
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<OfflineMapConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Checks if offline storage is supported
   */
  isOfflineSupported(): boolean {
    return this.isSupported
  }
}