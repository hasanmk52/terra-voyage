import puppeteer from 'puppeteer'
import { Trip, Activity } from '@prisma/client'
import { WeatherForecast } from './weather-types'
import { format } from 'date-fns'

export interface TripWithActivities extends Trip {
  activities: Activity[]
  user: {
    name: string | null
    email: string
  }
}

export interface PDFExportOptions {
  includeWeather?: boolean
  includeMap?: boolean
  includeEmergencyInfo?: boolean
  format?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  theme?: 'modern' | 'classic' | 'minimal'
}

export class PDFGenerator {
  private browser: puppeteer.Browser | null = null

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      })
    }
    return this.browser
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async generateItineraryPDF(
    trip: TripWithActivities,
    weather?: WeatherForecast,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    const browser = await this.initialize()
    const page = await browser.newPage()

    try {
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 800 })

      // Generate HTML content
      const htmlContent = this.generateHTMLContent(trip, weather, options)

      // Set HTML content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      // Add custom styles
      await page.addStyleTag({
        content: this.getCustomStyles(options.theme || 'modern')
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format === 'Letter' ? 'letter' : 'a4',
        landscape: options.orientation === 'landscape',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      })

      return pdfBuffer
    } finally {
      await page.close()
    }
  }

  private generateHTMLContent(
    trip: TripWithActivities,
    weather?: WeatherForecast,
    options: PDFExportOptions = {}
  ): string {
    const startDate = format(new Date(trip.startDate), 'MMMM d, yyyy')
    const endDate = format(new Date(trip.endDate), 'MMMM d, yyyy')
    const duration = Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    ) + 1 // Add 1 to make date range inclusive

    // Group activities by day
    const activitiesByDay = this.groupActivitiesByDay(trip.activities, trip.startDate)

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${trip.title} - Travel Itinerary</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        ${this.getCustomStyles(options.theme || 'modern')}
    </style>
</head>
<body>
    <div class="document">
        <!-- Header -->
        <header class="header">
            <div class="header-content">
                <h1 class="trip-title">${trip.title}</h1>
                <div class="trip-meta">
                    <div class="destination">
                        <span class="icon">📍</span>
                        ${trip.destination}
                    </div>
                    <div class="dates">
                        <span class="icon">📅</span>
                        ${startDate} - ${endDate} (${duration} days)
                    </div>
                    <div class="travelers">
                        <span class="icon">👥</span>
                        ${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}
                    </div>
                    ${trip.budget ? `
                    <div class="budget">
                        <span class="icon">💰</span>
                        Budget: $${trip.budget.toLocaleString()}
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="generated-info">
                <p>Generated on ${format(new Date(), 'MMMM d, yyyy')} by Terra Voyage</p>
                <p>Created by: ${trip.user.name || trip.user.email}</p>
            </div>
        </header>

        <!-- Trip Description -->
        ${trip.description ? `
        <section class="description-section">
            <h2>Trip Overview</h2>
            <p class="description">${trip.description}</p>
        </section>
        ` : ''}

        <!-- Weather Summary -->
        ${options.includeWeather && weather ? this.generateWeatherSection(weather) : ''}

        <!-- Daily Itinerary -->
        <section class="itinerary-section">
            <h2>Daily Itinerary</h2>
            ${Object.entries(activitiesByDay).map(([day, activities]) => 
              this.generateDaySection(parseInt(day), activities, trip.startDate)
            ).join('')}
        </section>

        <!-- Emergency Information -->
        ${options.includeEmergencyInfo ? this.generateEmergencySection(trip.destination) : ''}

        <!-- Footer -->
        <footer class="footer">
            <div class="footer-content">
                <p>This itinerary was generated using Terra Voyage - AI-Powered Travel Planning</p>
                <p>Visit us at terraVoyage.com for more travel planning tools</p>
            </div>
        </footer>
    </div>
</body>
</html>
    `
  }

  private groupActivitiesByDay(activities: Activity[], startDate: string | Date) {
    const grouped: Record<number, Activity[]> = {}
    const tripStart = new Date(startDate)

    activities.forEach(activity => {
      if (activity.startTime) {
        const activityDate = new Date(activity.startTime)
        const dayNumber = Math.floor(
          (activityDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1
        
        if (!grouped[dayNumber]) {
          grouped[dayNumber] = []
        }
        grouped[dayNumber].push(activity)
      }
    })

    // Sort activities within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      })
    })

    return grouped
  }

  private generateDaySection(dayNumber: number, activities: Activity[], tripStartDate: string | Date): string {
    const dayDate = new Date(tripStartDate)
    dayDate.setDate(dayDate.getDate() + (dayNumber - 1))
    const formattedDate = format(dayDate, 'EEEE, MMMM d')

    return `
    <div class="day-section">
        <div class="day-header">
            <h3 class="day-title">Day ${dayNumber}</h3>
            <p class="day-date">${formattedDate}</p>
        </div>
        <div class="activities-list">
            ${activities.map(activity => this.generateActivityItem(activity)).join('')}
        </div>
    </div>
    `
  }

  private generateActivityItem(activity: Activity): string {
    const startTime = activity.startTime ? format(new Date(activity.startTime), 'h:mm a') : ''
    const endTime = activity.endTime ? format(new Date(activity.endTime), 'h:mm a') : ''
    const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : startTime

    const typeIcon = this.getActivityIcon(activity.type)

    return `
    <div class="activity-item">
        <div class="activity-time">
            ${timeRange}
        </div>
        <div class="activity-content">
            <div class="activity-header">
                <span class="activity-icon">${typeIcon}</span>
                <h4 class="activity-name">${activity.name}</h4>
            </div>
            ${activity.description ? `
            <p class="activity-description">${activity.description}</p>
            ` : ''}
            ${activity.location ? `
            <div class="activity-location">
                <span class="location-icon">📍</span>
                ${activity.location}
            </div>
            ` : ''}
            ${activity.price ? `
            <div class="activity-price">
                <span class="price-icon">💰</span>
                $${activity.price.toLocaleString()} ${activity.currency || 'USD'}
            </div>
            ` : ''}
            ${activity.notes ? `
            <div class="activity-notes">
                <strong>Notes:</strong> ${activity.notes}
            </div>
            ` : ''}
        </div>
    </div>
    `
  }

  private generateWeatherSection(weather: WeatherForecast): string {
    const rainyDays = weather.forecast.filter(day => day.precipitation.probability > 50).length
    const avgTemp = Math.round(
      weather.forecast.reduce((sum, day) => sum + day.temperature.current, 0) / weather.forecast.length
    )

    return `
    <section class="weather-section">
        <h2>Weather Forecast</h2>
        <div class="weather-summary">
            <div class="weather-stat">
                <span class="weather-icon">🌡️</span>
                <div>
                    <span class="stat-value">${avgTemp}°C</span>
                    <span class="stat-label">Average Temperature</span>
                </div>
            </div>
            <div class="weather-stat">
                <span class="weather-icon">🌧️</span>
                <div>
                    <span class="stat-value">${rainyDays}</span>
                    <span class="stat-label">Rainy Days Expected</span>
                </div>
            </div>
        </div>
        <div class="weather-advice">
            <h3>Packing Recommendations</h3>
            <ul>
                ${avgTemp > 25 ? '<li>Light, breathable clothing for warm weather</li>' : ''}
                ${avgTemp < 10 ? '<li>Warm layers and waterproof jacket</li>' : ''}
                ${rainyDays > 2 ? '<li>Umbrella and rain gear essential</li>' : ''}
                <li>Comfortable walking shoes</li>
            </ul>
        </div>
    </section>
    `
  }

  private generateEmergencySection(destination: string): string {
    return `
    <section class="emergency-section">
        <h2>Emergency Information</h2>
        <div class="emergency-content">
            <div class="emergency-item">
                <h3>Emergency Numbers</h3>
                <ul>
                    <li><strong>Local Emergency:</strong> Varies by country (research before travel)</li>
                    <li><strong>Tourist Police:</strong> Contact local authorities</li>
                    <li><strong>Embassy:</strong> Contact your country's embassy in ${destination}</li>
                </ul>
            </div>
            <div class="emergency-item">
                <h3>Important Reminders</h3>
                <ul>
                    <li>Keep copies of important documents</li>
                    <li>Share your itinerary with trusted contacts</li>
                    <li>Register with your embassy if traveling internationally</li>
                    <li>Keep emergency cash in multiple locations</li>
                </ul>
            </div>
        </div>
    </section>
    `
  }

  private getActivityIcon(type: string): string {
    const iconMap: Record<string, string> = {
      ACCOMMODATION: '🏨',
      TRANSPORTATION: '🚗',
      RESTAURANT: '🍽️',
      ATTRACTION: '🎯',
      EXPERIENCE: '🎪',
      SHOPPING: '🛍️',
      OTHER: '📌'
    }
    return iconMap[type] || '📌'
  }

  private getCustomStyles(theme: string): string {
    const baseStyles = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .document {
        max-width: 210mm;
        margin: 0 auto;
        padding: 0;
        position: relative;
      }

      /* Print-specific styles */
      @page {
        margin: 20mm 15mm;
        size: A4;
      }

      .page-break {
        page-break-before: always;
      }

      .no-page-break {
        page-break-inside: avoid;
      }

      .header {
        border-bottom: 3px solid #3b82f6;
        padding-bottom: 2rem;
        margin-bottom: 2rem;
        page-break-after: avoid;
      }

      .trip-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1e40af;
        margin-bottom: 1rem;
      }

      .trip-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .trip-meta > div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        color: #4b5563;
      }

      .icon {
        font-size: 1.2rem;
      }

      .generated-info {
        text-align: right;
        font-size: 0.9rem;
        color: #6b7280;
      }

      .description-section {
        margin-bottom: 2rem;
        page-break-inside: avoid;
      }

      .description {
        font-size: 1.1rem;
        line-height: 1.7;
        color: #4b5563;
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
      }

      .weather-section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f0f9ff;
        border-radius: 8px;
        page-break-inside: avoid;
      }

      .weather-summary {
        display: flex;
        gap: 2rem;
        margin-bottom: 1rem;
      }

      .weather-stat {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .weather-icon {
        font-size: 2rem;
      }

      .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1e40af;
      }

      .stat-label {
        font-size: 0.9rem;
        color: #6b7280;
      }

      .weather-advice h3 {
        margin-bottom: 0.5rem;
        color: #1e40af;
      }

      .weather-advice ul {
        margin-left: 1.5rem;
      }

      .itinerary-section h2 {
        font-size: 1.8rem;
        color: #1e40af;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }

      .day-section {
        margin-bottom: 2rem;
        page-break-inside: avoid;
      }

      .day-header {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px 8px 0 0;
      }

      .day-title {
        font-size: 1.3rem;
        font-weight: 600;
      }

      .day-date {
        font-size: 1rem;
        opacity: 0.9;
      }

      .activities-list {
        border: 1px solid #e5e7eb;
        border-top: none;
        border-radius: 0 0 8px 8px;
      }

      .activity-item {
        display: flex;
        gap: 1rem;
        padding: 1.5rem;
        border-bottom: 1px solid #f3f4f6;
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-time {
        flex-shrink: 0;
        width: 120px;
        font-weight: 600;
        color: #3b82f6;
        font-size: 0.9rem;
      }

      .activity-content {
        flex: 1;
      }

      .activity-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .activity-icon {
        font-size: 1.2rem;
      }

      .activity-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1f2937;
      }

      .activity-description {
        color: #4b5563;
        margin-bottom: 0.5rem;
        line-height: 1.5;
      }

      .activity-location,
      .activity-price,
      .activity-notes {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .location-icon,
      .price-icon {
        font-size: 1rem;
      }

      .emergency-section {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #fef2f2;
        border-radius: 8px;
        border-left: 4px solid #ef4444;
        page-break-inside: avoid;
      }

      .emergency-section h2 {
        color: #dc2626;
        margin-bottom: 1rem;
      }

      .emergency-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }

      .emergency-item h3 {
        color: #dc2626;
        margin-bottom: 0.5rem;
      }

      .emergency-item ul {
        margin-left: 1.5rem;
      }

      .emergency-item li {
        margin-bottom: 0.25rem;
      }

      .footer {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }

      .footer-content {
        color: #6b7280;
        font-size: 0.9rem;
      }

      .footer-content p {
        margin-bottom: 0.25rem;
      }

      @media print {
        .day-section {
          page-break-inside: avoid;
        }
        
        .activity-item {
          page-break-inside: avoid;
        }
      }
    `

    const themeStyles = {
      modern: `
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          margin-bottom: 2rem;
          padding: 2rem;
          border: none;
        }
        
        .trip-title {
          color: white;
        }
        
        .trip-meta > div {
          color: rgba(255, 255, 255, 0.9);
        }
      `,
      classic: `
        .header {
          border: 2px solid #1e40af;
          background: #f8fafc;
        }
        
        .day-header {
          background: #1e40af;
        }
      `,
      minimal: `
        .header {
          border-bottom: 1px solid #d1d5db;
          background: none;
        }
        
        .trip-title {
          color: #111827;
          font-weight: 500;
        }
        
        .day-header {
          background: #f9fafb;
          color: #111827;
          border: 1px solid #d1d5db;
        }
      `
    }

    return baseStyles + (themeStyles[theme as keyof typeof themeStyles] || themeStyles.modern)
  }

  /**
   * Generate a compact itinerary template for mobile viewing
   */
  async generateCompactItineraryPDF(
    trip: TripWithActivities,
    weather?: WeatherForecast,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    const browser = await this.initialize()
    const page = await browser.newPage()

    try {
      await page.setViewport({ width: 375, height: 667 }) // Mobile viewport
      const htmlContent = this.generateCompactHTMLContent(trip, weather, options)
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'a4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true
      })

      return pdfBuffer
    } finally {
      await page.close()
    }
  }

  private generateCompactHTMLContent(
    trip: TripWithActivities,
    weather?: WeatherForecast,
    options: PDFExportOptions = {}
  ): string {
    const activitiesByDay = this.groupActivitiesByDay(trip.activities, trip.startDate)
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${trip.title} - Compact Itinerary</title>
    <style>
        ${this.getCompactStyles()}
    </style>
</head>
<body>
    <div class="compact-document">
        <header class="compact-header">
            <h1>${trip.title}</h1>
            <div class="trip-info">
                <span>📍 ${trip.destination}</span>
                <span>📅 ${format(new Date(trip.startDate), 'MMM d')} - ${format(new Date(trip.endDate), 'MMM d')}</span>
            </div>
        </header>

        ${Object.entries(activitiesByDay).map(([day, activities]) => 
          this.generateCompactDaySection(parseInt(day), activities, trip.startDate)
        ).join('')}

        <footer class="compact-footer">
            <p>Generated by Terra Voyage</p>
        </footer>
    </div>
</body>
</html>
    `
  }

  private generateCompactDaySection(dayNumber: number, activities: Activity[], tripStartDate: string | Date): string {
    const dayDate = new Date(tripStartDate)
    dayDate.setDate(dayDate.getDate() + (dayNumber - 1))
    
    return `
    <div class="compact-day">
        <h2>Day ${dayNumber} - ${format(dayDate, 'EEE, MMM d')}</h2>
        <div class="compact-activities">
            ${activities.map(activity => `
                <div class="compact-activity">
                    <div class="activity-time">${activity.startTime ? format(new Date(activity.startTime), 'HH:mm') : ''}</div>
                    <div class="activity-details">
                        <span class="activity-icon">${this.getActivityIcon(activity.type)}</span>
                        <span class="activity-name">${activity.name}</span>
                        ${activity.location ? `<div class="activity-location">📍 ${activity.location}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `
  }

  private getCompactStyles(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
      }
      
      .compact-document {
        padding: 15px;
      }
      
      .compact-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #3b82f6;
      }
      
      .compact-header h1 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #1e40af;
      }
      
      .trip-info {
        display: flex;
        justify-content: center;
        gap: 15px;
        font-size: 11px;
        color: #666;
      }
      
      .compact-day {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }
      
      .compact-day h2 {
        font-size: 14px;
        font-weight: 600;
        color: #1e40af;
        margin-bottom: 10px;
        padding: 8px 12px;
        background: #f0f9ff;
        border-radius: 6px;
      }
      
      .compact-activities {
        space-y: 8px;
      }
      
      .compact-activity {
        display: flex;
        gap: 10px;
        margin-bottom: 8px;
        padding: 8px;
        background: #fafafa;
        border-radius: 4px;
      }
      
      .activity-time {
        width: 40px;
        font-size: 10px;
        font-weight: 500;
        color: #3b82f6;
        flex-shrink: 0;
      }
      
      .activity-details {
        flex: 1;
      }
      
      .activity-icon {
        margin-right: 6px;
      }
      
      .activity-name {
        font-weight: 500;
        font-size: 11px;
      }
      
      .activity-location {
        font-size: 10px;
        color: #666;
        margin-top: 2px;
      }
      
      .compact-footer {
        text-align: center;
        margin-top: 30px;
        font-size: 10px;
        color: #999;
      }
      
      @media print {
        .compact-day { page-break-inside: avoid; }
      }
    `
  }

  /**
   * Generate travel documents PDF (passport-style format)
   */
  async generateTravelDocumentsPDF(
    trip: TripWithActivities,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    const browser = await this.initialize()
    const page = await browser.newPage()

    try {
      await page.setViewport({ width: 800, height: 1200 })
      const htmlContent = this.generateTravelDocumentsHTML(trip, options)
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'a4',
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        printBackground: true
      })

      return pdfBuffer
    } finally {
      await page.close()
    }
  }

  private generateTravelDocumentsHTML(
    trip: TripWithActivities,
    options: PDFExportOptions = {}
  ): string {
    const essentialActivities = trip.activities.filter(activity => 
      ['ACCOMMODATION', 'TRANSPORTATION'].includes(activity.type)
    )

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${trip.title} - Travel Documents</title>
    <style>
        ${this.getTravelDocumentStyles()}
    </style>
</head>
<body>
    <div class="travel-document">
        <div class="document-header">
            <div class="passport-style-header">
                <h1>TRAVEL ITINERARY</h1>
                <div class="trip-code">TR-${trip.id.slice(-6).toUpperCase()}</div>
            </div>
            <div class="traveler-info">
                <div class="info-row">
                    <span class="label">DESTINATION:</span>
                    <span class="value">${trip.destination.toUpperCase()}</span>
                </div>
                <div class="info-row">
                    <span class="label">DATES:</span>
                    <span class="value">${format(new Date(trip.startDate), 'dd MMM yyyy').toUpperCase()} - ${format(new Date(trip.endDate), 'dd MMM yyyy').toUpperCase()}</span>
                </div>
                <div class="info-row">
                    <span class="label">TRAVELERS:</span>
                    <span class="value">${trip.travelers}</span>
                </div>
            </div>
        </div>

        <div class="essential-info">
            <h2>ESSENTIAL INFORMATION</h2>
            ${essentialActivities.map(activity => `
                <div class="essential-item">
                    <div class="item-type">${activity.type}</div>
                    <div class="item-details">
                        <div class="item-name">${activity.name}</div>
                        ${activity.location ? `<div class="item-location">${activity.location}</div>` : ''}
                        ${activity.startTime ? `<div class="item-time">${format(new Date(activity.startTime), 'dd MMM yyyy HH:mm')}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${options.includeEmergencyInfo ? this.generateEmergencyDocumentSection(trip.destination) : ''}

        <div class="document-footer">
            <div class="generated-info">
                Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} UTC<br>
                Terra Voyage - AI Travel Planning
            </div>
        </div>
    </div>
</body>
</html>
    `
  }

  private generateEmergencyDocumentSection(destination: string): string {
    return `
    <div class="emergency-section">
        <h2>EMERGENCY CONTACTS</h2>
        <div class="emergency-grid">
            <div class="emergency-item">
                <div class="emergency-label">LOCAL EMERGENCY</div>
                <div class="emergency-value">Check local emergency numbers</div>
            </div>
            <div class="emergency-item">
                <div class="emergency-label">EMBASSY</div>
                <div class="emergency-value">Contact your embassy in ${destination}</div>
            </div>
            <div class="emergency-item">
                <div class="emergency-label">TRAVEL INSURANCE</div>
                <div class="emergency-value">Keep insurance details accessible</div>
            </div>
        </div>
    </div>
    `
  }

  private getTravelDocumentStyles(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Courier New', monospace;
        background: #f5f5f5;
      }
      
      .travel-document {
        background: white;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        min-height: 297mm;
        position: relative;
      }
      
      .document-header {
        border: 3px solid #000;
        padding: 20px;
        margin-bottom: 30px;
      }
      
      .passport-style-header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 15px;
        margin-bottom: 15px;
      }
      
      .passport-style-header h1 {
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 3px;
      }
      
      .trip-code {
        font-size: 14px;
        font-weight: bold;
        margin-top: 10px;
        letter-spacing: 2px;
      }
      
      .traveler-info {
        space-y: 8px;
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .label {
        font-weight: bold;
        width: 40%;
      }
      
      .value {
        text-align: right;
        width: 55%;
      }
      
      .essential-info {
        margin-bottom: 30px;
      }
      
      .essential-info h2 {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 20px;
        text-decoration: underline;
      }
      
      .essential-item {
        border: 1px solid #ccc;
        margin-bottom: 15px;
        padding: 15px;
        background: #fafafa;
      }
      
      .item-type {
        font-size: 12px;
        font-weight: bold;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .item-name {
        font-size: 16px;
        font-weight: bold;
        margin: 5px 0;
      }
      
      .item-location, .item-time {
        font-size: 14px;
        color: #333;
        margin: 3px 0;
      }
      
      .emergency-section {
        border: 2px solid #ff0000;
        padding: 20px;
        margin: 30px 0;
        background: #fff8f8;
      }
      
      .emergency-section h2 {
        color: #ff0000;
        font-size: 18px;
        text-align: center;
        margin-bottom: 20px;
        text-decoration: underline;
      }
      
      .emergency-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 15px;
      }
      
      .emergency-item {
        border: 1px solid #ff9999;
        padding: 10px;
        background: white;
      }
      
      .emergency-label {
        font-weight: bold;
        font-size: 12px;
        color: #cc0000;
        text-transform: uppercase;
      }
      
      .emergency-value {
        font-size: 14px;
        margin-top: 5px;
      }
      
      .document-footer {
        position: absolute;
        bottom: 20mm;
        left: 20mm;
        right: 20mm;
        text-align: center;
        font-size: 10px;
        color: #666;
        border-top: 1px solid #ccc;
        padding-top: 10px;
      }
      
      @media print {
        .travel-document { margin: 0; }
        .document-footer { position: fixed; bottom: 15mm; }
      }
    `
  }
}

// Singleton instance
export const pdfGenerator = new PDFGenerator()