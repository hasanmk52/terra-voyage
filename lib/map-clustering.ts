import Supercluster from 'supercluster'
import { Activity, Day } from '@/lib/itinerary-validation'

export interface ActivityPoint {
  type: 'Feature'
  properties: {
    cluster: false
    activity: Activity
    dayIndex: number
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export interface ClusterPoint {
  type: 'Feature'
  properties: {
    cluster: true
    cluster_id: number
    point_count: number
    point_count_abbreviated: string
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export type MapPoint = ActivityPoint | ClusterPoint

export class MapClustering {
  private supercluster: Supercluster
  
  constructor() {
    this.supercluster = new Supercluster({
      radius: 60, // Cluster radius in pixels
      maxZoom: 16, // Max zoom to cluster points on
      minZoom: 0, // Min zoom to cluster points on
      minPoints: 2, // Minimum points to form a cluster
    })
  }

  // Convert days and activities to GeoJSON points
  public createPoints(days: Day[], selectedDay?: number): ActivityPoint[] {
    const points: ActivityPoint[] = []

    days.forEach((day, dayIndex) => {
      // Skip if selectedDay is set and this isn't the selected day
      if (selectedDay !== undefined && selectedDay !== day.day) return

      day.activities.forEach(activity => {
        // Validate coordinates for security
        const lat = activity.location.coordinates.lat;
        const lng = activity.location.coordinates.lng;
        
        if (
          typeof lat !== 'number' || typeof lng !== 'number' ||
          isNaN(lat) || isNaN(lng) ||
          lat < -90 || lat > 90 || lng < -180 || lng > 180 ||
          (lat === 0 && lng === 0)
        ) {
          console.warn('Invalid coordinates in clustering, skipping activity');
          return; // Skip invalid coordinates
        }

        points.push({
          type: 'Feature',
          properties: {
            cluster: false,
            activity,
            dayIndex
          },
          geometry: {
            type: 'Point',
            coordinates: [
              activity.location.coordinates.lng,
              activity.location.coordinates.lat
            ]
          }
        })
      })
    })

    return points
  }

  // Load points into the clustering algorithm
  public loadPoints(points: ActivityPoint[]): void {
    this.supercluster.load(points)
  }

  // Get clusters for current map bounds and zoom
  public getClusters(
    bbox: [number, number, number, number],
    zoom: number
  ): MapPoint[] {
    return this.supercluster.getClusters(bbox, zoom) as MapPoint[]
  }

  // Get individual points for a cluster
  public getClusterExpansionZoom(clusterId: number): number {
    return this.supercluster.getClusterExpansionZoom(clusterId)
  }

  // Get the points within a cluster
  public getClusterChildren(clusterId: number): MapPoint[] {
    return this.supercluster.getChildren(clusterId) as MapPoint[]
  }

  // Get all points in a cluster (including sub-clusters)
  public getClusterLeaves(
    clusterId: number, 
    limit?: number, 
    offset?: number
  ): ActivityPoint[] {
    return this.supercluster.getLeaves(clusterId, limit, offset) as ActivityPoint[]
  }

  // Create cluster marker element
  public createClusterElement(
    pointCount: number,
    clusterId: number,
    onClick: (clusterId: number) => void
  ): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'cluster-marker'
    
    // Size based on point count
    const size = pointCount < 10 ? 40 : pointCount < 100 ? 50 : 60
    const fontSize = pointCount < 10 ? '12px' : pointCount < 100 ? '14px' : '16px'
    
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${fontSize};
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    `

    // Add count text
    const countEl = document.createElement('span')
    countEl.textContent = pointCount.toString()
    el.appendChild(countEl)

    // Add pulse animation for large clusters
    if (pointCount > 20) {
      const pulseRing = document.createElement('div')
      pulseRing.style.cssText = `
        position: absolute;
        top: -5px;
        left: -5px;
        right: -5px;
        bottom: -5px;
        border: 2px solid #3B82F6;
        border-radius: 50%;
        animation: pulse 2s infinite;
        opacity: 0.6;
      `
      el.appendChild(pulseRing)
      
      // Add CSS animation
      if (!document.getElementById('cluster-animations')) {
        const style = document.createElement('style')
        style.id = 'cluster-animations'
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 1; }
            70% { transform: scale(1.1); opacity: 0.3; }
            100% { transform: scale(0.95); opacity: 1; }
          }
        `
        document.head.appendChild(style)
      }
    }

    // Hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.1)'
      el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
    })

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)'
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
    })

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick(clusterId)
    })

    return el
  }

  // Get cluster color based on activities
  public getClusterColor(activities: ActivityPoint[]): string {
    // Count activity types
    const typeCounts: Record<string, number> = {}
    activities.forEach(point => {
      const type = point.properties.activity.type
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    // Find most common type
    const mostCommonType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0]

    // Return color based on most common activity type
    const colors: Record<string, string> = {
      accommodation: '#8B5CF6',
      restaurant: '#F59E0B',
      attraction: '#EF4444',
      experience: '#10B981',
      transportation: '#3B82F6',
      shopping: '#EC4899',
      other: '#6B7280'
    }

    return colors[mostCommonType] || colors.other
  }
}

export const mapClustering = new MapClustering()