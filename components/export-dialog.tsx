'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Download, 
  FileText, 
  Calendar, 
  Share2, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface ExportDialogProps {
  tripId: string
  tripTitle: string
  children: React.ReactNode
}

type ExportFormat = 'pdf' | 'calendar' | 'share'
type ExportStatus = 'idle' | 'loading' | 'success' | 'error'

export function ExportDialog({ tripId, tripTitle, children }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ExportFormat>('pdf')
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [exportUrl, setExportUrl] = useState<string>('')

  // PDF Export Options
  const [pdfOptions, setPdfOptions] = useState({
    includeWeather: true,
    includeMap: false,
    includeEmergencyInfo: true,
    format: 'A4' as 'A4' | 'Letter',
    orientation: 'portrait' as 'portrait' | 'landscape',
    theme: 'modern' as 'modern' | 'classic' | 'minimal'
  })

  // Calendar Export Options
  const [calendarOptions, setCalendarOptions] = useState({
    format: 'ical' as 'ical' | 'google' | 'outlook',
    timezone: 'UTC',
    includeDescription: true,
    includeLocation: true,
    reminderMinutes: [15, 60]
  })

  // Share Options
  const [shareOptions, setShareOptions] = useState({
    expiresInDays: 30,
    allowComments: false,
    showContactInfo: false,
    showBudget: false,
    password: ''
  })

  const handlePDFExport = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, options: pdfOptions })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tripTitle.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setStatus('success')
      toast.success('PDF exported successfully!')
      
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 2000)

    } catch (error) {
      setStatus('error')
      toast.error('Failed to export PDF')
      console.error('PDF export error:', error)
    }
  }

  const handleCalendarExport = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/export/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, format: calendarOptions.format, options: calendarOptions })
      })

      if (!response.ok) {
        throw new Error('Calendar export failed')
      }

      if (calendarOptions.format === 'ical') {
        // Download .ics file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${tripTitle.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.ics`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setStatus('success')
        toast.success('Calendar file downloaded!')
      } else {
        // Handle Google/Outlook URLs
        const data = await response.json()
        if (data.urls && data.urls.length > 0) {
          // Open first URL (or show list of URLs)
          window.open(data.urls[0].url, '_blank')
          setStatus('success')
          toast.success(`Opening ${calendarOptions.format} Calendar...`)
        } else if (data.url) {
          window.open(data.url, '_blank')
          setStatus('success')
          toast.success(`Opening ${calendarOptions.format} Calendar...`)
        }
      }

      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 2000)

    } catch (error) {
      setStatus('error')
      toast.error('Failed to export calendar')
      console.error('Calendar export error:', error)
    }
  }

  const handleShareExport = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, options: shareOptions })
      })

      if (!response.ok) {
        throw new Error('Share creation failed')
      }

      const data = await response.json()
      setExportUrl(data.shareUrl)
      setStatus('success')
      toast.success('Shareable link created!')

    } catch (error) {
      setStatus('error')
      toast.error('Failed to create shareable link')
      console.error('Share creation error:', error)
    }
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(exportUrl)
    toast.success('Link copied to clipboard!')
  }

  const renderPDFOptions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pdf-format">Paper Size</Label>
          <Select 
            value={pdfOptions.format} 
            onValueChange={(value: 'A4' | 'Letter') => 
              setPdfOptions(prev => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="Letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="pdf-orientation">Orientation</Label>
          <Select 
            value={pdfOptions.orientation} 
            onValueChange={(value: 'portrait' | 'landscape') => 
              setPdfOptions(prev => ({ ...prev, orientation: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="pdf-theme">Theme</Label>
        <Select 
          value={pdfOptions.theme} 
          onValueChange={(value: 'modern' | 'classic' | 'minimal') => 
            setPdfOptions(prev => ({ ...prev, theme: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modern">Modern</SelectItem>
            <SelectItem value="classic">Classic</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="include-weather"
            checked={pdfOptions.includeWeather}
            onCheckedChange={(checked) => 
              setPdfOptions(prev => ({ ...prev, includeWeather: checked }))
            }
          />
          <Label htmlFor="include-weather">Include weather forecast</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="include-map"
            checked={pdfOptions.includeMap}
            onCheckedChange={(checked) => 
              setPdfOptions(prev => ({ ...prev, includeMap: checked }))
            }
          />
          <Label htmlFor="include-map">Include maps</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="include-emergency"
            checked={pdfOptions.includeEmergencyInfo}
            onCheckedChange={(checked) => 
              setPdfOptions(prev => ({ ...prev, includeEmergencyInfo: checked }))
            }
          />
          <Label htmlFor="include-emergency">Include emergency information</Label>
        </div>
      </div>

      <Button 
        onClick={handlePDFExport} 
        disabled={status === 'loading'}
        className="w-full"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </>
        )}
      </Button>
    </div>
  )

  const renderCalendarOptions = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="calendar-format">Calendar Format</Label>
        <Select 
          value={calendarOptions.format} 
          onValueChange={(value: 'ical' | 'google' | 'outlook') => 
            setCalendarOptions(prev => ({ ...prev, format: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ical">iCal (.ics file)</SelectItem>
            <SelectItem value="google">Google Calendar</SelectItem>
            <SelectItem value="outlook">Outlook Calendar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select 
          value={calendarOptions.timezone} 
          onValueChange={(value) => 
            setCalendarOptions(prev => ({ ...prev, timezone: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="America/New_York">Eastern Time</SelectItem>
            <SelectItem value="America/Chicago">Central Time</SelectItem>
            <SelectItem value="America/Denver">Mountain Time</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            <SelectItem value="Europe/London">London</SelectItem>
            <SelectItem value="Europe/Paris">Paris</SelectItem>
            <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="include-description"
            checked={calendarOptions.includeDescription}
            onCheckedChange={(checked) => 
              setCalendarOptions(prev => ({ ...prev, includeDescription: checked }))
            }
          />
          <Label htmlFor="include-description">Include activity descriptions</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="include-location"
            checked={calendarOptions.includeLocation}
            onCheckedChange={(checked) => 
              setCalendarOptions(prev => ({ ...prev, includeLocation: checked }))
            }
          />
          <Label htmlFor="include-location">Include locations</Label>
        </div>
      </div>

      <Button 
        onClick={handleCalendarExport} 
        disabled={status === 'loading'}
        className="w-full"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Exported!
          </>
        ) : (
          <>
            <Calendar className="w-4 h-4 mr-2" />
            Export to Calendar
          </>
        )}
      </Button>
    </div>
  )

  const renderShareOptions = () => (
    <div className="space-y-4">
      {status === 'success' && exportUrl ? (
        <div className="space-y-3">
          <Label>Shareable Link</Label>
          <div className="flex space-x-2">
            <Input value={exportUrl} readOnly className="flex-1" />
            <Button onClick={copyShareUrl} variant="outline">
              Copy
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Anyone with this link can view your itinerary
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="expires-in">Expires in (days)</Label>
            <Select 
              value={shareOptions.expiresInDays.toString()} 
              onValueChange={(value) => 
                setShareOptions(prev => ({ ...prev, expiresInDays: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="0">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="password">Password (optional)</Label>
            <Input
              id="password"
              type="password"
              value={shareOptions.password}
              onChange={(e) => setShareOptions(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Leave empty for no password"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="allow-comments"
                checked={shareOptions.allowComments}
                onCheckedChange={(checked) => 
                  setShareOptions(prev => ({ ...prev, allowComments: checked }))
                }
              />
              <Label htmlFor="allow-comments">Allow comments</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-contact"
                checked={shareOptions.showContactInfo}
                onCheckedChange={(checked) => 
                  setShareOptions(prev => ({ ...prev, showContactInfo: checked }))
                }
              />
              <Label htmlFor="show-contact">Show contact information</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-budget"
                checked={shareOptions.showBudget}
                onCheckedChange={(checked) => 
                  setShareOptions(prev => ({ ...prev, showBudget: checked }))
                }
              />
              <Label htmlFor="show-budget">Show budget information</Label>
            </div>
          </div>

          <Button 
            onClick={handleShareExport} 
            disabled={status === 'loading'}
            className="w-full"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Link...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Create Shareable Link
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export "{tripTitle}"</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pdf' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'calendar' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'share' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'pdf' && renderPDFOptions()}
          {activeTab === 'calendar' && renderCalendarOptions()}
          {activeTab === 'share' && renderShareOptions()}
        </div>

        {status === 'error' && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Export failed. Please try again.</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}