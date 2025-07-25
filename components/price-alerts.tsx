'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Bell, 
  BellRing, 
  Plus, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Plane, 
  Hotel,
  Calendar,
  DollarSign,
  Target,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface PriceAlert {
  id: string
  type: 'flight' | 'hotel'
  title: string
  searchParams: any
  targetPrice: number
  currentPrice: number
  isActive: boolean
  createdAt: string
  lastChecked: string
  alertsSent: number
  priceChange?: {
    percentage: number
    direction: 'up' | 'down'
  }
}

interface CreateAlertForm {
  type: 'flight' | 'hotel'
  targetPrice: number
  searchParams: any
  title: string
}

interface PriceAlertsProps {
  className?: string
}

export function PriceAlerts({ className = '' }: PriceAlertsProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  const [createForm, setCreateForm] = useState<CreateAlertForm>({
    type: 'flight',
    targetPrice: 0,
    searchParams: {},
    title: ''
  })

  // Load user's price alerts
  const loadAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricing/alerts')
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.alerts)
      } else {
        toast.error('Failed to load price alerts')
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
      toast.error('Failed to load price alerts')
    } finally {
      setLoading(false)
    }
  }

  // Create new price alert
  const createAlert = async () => {
    if (!createForm.title || createForm.targetPrice <= 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/pricing/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Price alert created successfully!')
        setDialogOpen(false)
        setCreateForm({
          type: 'flight',
          targetPrice: 0,
          searchParams: {},
          title: ''
        })
        loadAlerts()
      } else {
        toast.error(data.error || 'Failed to create price alert')
      }
    } catch (error) {
      console.error('Error creating alert:', error)
      toast.error('Failed to create price alert')
    } finally {
      setCreating(false)
    }
  }

  // Delete price alert
  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/pricing/alerts/${alertId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Price alert deleted')
        setAlerts(alerts.filter(alert => alert.id !== alertId))
      } else {
        toast.error('Failed to delete price alert')
      }
    } catch (error) {
      console.error('Error deleting alert:', error)
      toast.error('Failed to delete price alert')
    }
  }

  // Toggle alert active status
  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/pricing/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      })

      const data = await response.json()
      
      if (data.success) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, isActive } : alert
        ))
        toast.success(`Alert ${isActive ? 'activated' : 'paused'}`)
      } else {
        toast.error('Failed to update alert')
      }
    } catch (error) {
      console.error('Error updating alert:', error)
      toast.error('Failed to update alert')
    }
  }

  // Format search params for display
  const formatSearchParams = (type: string, params: any): string => {
    if (type === 'flight') {
      return `${params.origin} → ${params.destination}, ${format(new Date(params.departureDate), 'MMM d')}`
    } else {
      return `${params.destination}, ${format(new Date(params.checkinDate), 'MMM d')} - ${format(new Date(params.checkoutDate), 'MMM d')}`
    }
  }

  // Calculate price change percentage
  const calculatePriceChange = (current: number, target: number): { percentage: number; direction: 'up' | 'down' } => {
    const percentage = Math.abs(((current - target) / target) * 100)
    const direction = current > target ? 'up' : 'down'
    return { percentage, direction }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const renderCreateAlertDialog = () => (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Price Alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
          <DialogDescription>
            Get notified when prices drop below your target price
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="alert-title">Alert Name</Label>
            <Input
              id="alert-title"
              placeholder="e.g., NYC to LA Spring Trip"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="target-price">Target Price ($)</Label>
            <Input
              id="target-price"
              type="number"
              placeholder="Enter your target price"
              value={createForm.targetPrice || ''}
              onChange={(e) => setCreateForm(prev => ({ ...prev, targetPrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          
          <div className="text-sm text-gray-500">
            <p>💡 Tip: Set up your search first, then create an alert from the results page for more specific tracking.</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={createAlert} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Alert'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const renderAlertCard = (alert: PriceAlert) => {
    const priceChange = calculatePriceChange(alert.currentPrice, alert.targetPrice)
    const isPriceBelow = alert.currentPrice <= alert.targetPrice
    
    return (
      <Card key={alert.id} className={`transition-all ${isPriceBelow ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                {alert.type === 'flight' ? (
                  <Plane className="w-5 h-5" />
                ) : (
                  <Hotel className="w-5 h-5" />
                )}
                {alert.title}
                {!alert.isActive && (
                  <Badge variant="secondary">Paused</Badge>
                )}
                {isPriceBelow && (
                  <Badge className="bg-green-500">
                    <Target className="w-3 h-3 mr-1" />
                    Target Reached!
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {formatSearchParams(alert.type, alert.searchParams)}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleAlert(alert.id, !alert.isActive)}
                className={alert.isActive ? 'text-orange-600' : 'text-green-600'}
              >
                {alert.isActive ? (
                  <BellRing className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteAlert(alert.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Target Price:</span>
                <span className="font-semibold">${alert.targetPrice.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Current Price:</span>
                <span className="font-semibold">${alert.currentPrice.toFixed(2)}</span>
                {alert.currentPrice > 0 && (
                  <div className="flex items-center gap-1">
                    {priceChange.direction === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    )}
                    <span 
                      className={`text-xs ${priceChange.direction === 'up' ? 'text-red-500' : 'text-green-500'}`}
                    >
                      {priceChange.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Created:</span>
                <span className="text-sm">{format(new Date(alert.createdAt), 'MMM d, yyyy')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Alerts Sent:</span>
                <span className="text-sm">{alert.alertsSent}</span>
              </div>
            </div>
          </div>
          
          {alert.lastChecked && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">
                Last checked: {format(new Date(alert.lastChecked), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Price Alerts</h2>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-32 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Price Alerts</h2>
          <p className="text-gray-600">Get notified when prices drop</p>
        </div>
        {renderCreateAlertDialog()}
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">No Price Alerts Yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first price alert to get notified when prices drop
            </p>
            {renderCreateAlertDialog()}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alerts.map(renderAlertCard)}
        </div>
      )}

      <div className="text-center pt-8">
        <p className="text-sm text-gray-500">
          Price alerts are checked every few hours. You'll receive notifications when your target price is reached.
        </p>
      </div>
    </div>
  )
}