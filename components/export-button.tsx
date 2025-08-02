'use client'

import { Button } from '@/components/ui/button'
import { ExportDialog } from './export-dialog'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  tripId: string
  tripTitle: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ExportButton({ 
  tripId, 
  tripTitle, 
  variant = 'outline',
  size = 'default',
  className = ''
}: ExportButtonProps) {
  return (
    <ExportDialog tripId={tripId} tripTitle={tripTitle}>
      <Button variant={variant} size={size} className={className}>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
    </ExportDialog>
  )
}

// Quick export buttons for specific formats
export function PDFExportButton({ tripId, tripTitle, className = '' }: Omit<ExportButtonProps, 'variant' | 'size'>) {
  const handlePDFExport = async () => {
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tripId, 
          options: {
            includeWeather: true,
            includeEmergencyInfo: true,
            format: 'A4',
            orientation: 'portrait',
            theme: 'modern'
          }
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tripTitle.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('PDF export error:', error)
    }
  }

  return (
    <Button onClick={handlePDFExport} variant="outline" size="sm" className={className}>
      PDF
    </Button>
  )
}

export function CalendarExportButton({ tripId, className = '' }: Omit<ExportButtonProps, 'variant' | 'size' | 'tripTitle'>) {
  const handleCalendarExport = async () => {
    try {
      const response = await fetch('/api/export/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tripId, 
          format: 'ical',
          options: {
            timezone: 'UTC',
            includeDescription: true,
            includeLocation: true
          }
        })
      })

      if (!response.ok) throw new Error('Calendar export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `itinerary.ics`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Calendar export error:', error)
    }
  }

  return (
    <Button onClick={handleCalendarExport} variant="outline" size="sm" className={className}>
      Calendar
    </Button>
  )
}