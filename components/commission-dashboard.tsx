'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface CommissionStats {
  totalCommissions: number
  totalRevenue: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
  averageCommission: number
  pendingCommissions: number
  paidCommissions: number
}

interface PartnerStats {
  partnerId: string
  partnerName: string
  clicks: number
  conversions: number
  commissions: number
  revenue: number
  conversionRate: number
}

interface Commission {
  id: string
  partnerId: string
  partnerName: string
  bookingReference: string
  bookingValue: number
  commissionAmount: number
  commissionRate: number
  currency: string
  status: 'pending' | 'confirmed' | 'paid' | 'rejected'
  bookingDate: string
  confirmationDate?: string
  paymentDate?: string
  userId?: string
  productType: 'flight' | 'hotel' | 'activity'
}

interface CommissionDashboardProps {
  className?: string
  isAdmin?: boolean
}

export function CommissionDashboard({ className = '', isAdmin = false }: CommissionDashboardProps) {
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [partnerStats, setPartnerStats] = useState<PartnerStats[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')
  const [statusFilter, setStatusFilter] = useState('all')
  const [partnerFilter, setPartnerFilter] = useState('all')

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [statsResponse, commissionsResponse] = await Promise.all([
        fetch(`/api/admin/affiliate/stats?days=${timeRange}`),
        fetch(`/api/admin/affiliate/commissions?status=${statusFilter}&partner=${partnerFilter}&days=${timeRange}`)
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
        setPartnerStats(statsData.partnerBreakdown || [])
      }

      if (commissionsResponse.ok) {
        const commissionsData = await commissionsResponse.json()
        setCommissions(commissionsData.commissions || [])
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Update commission status
  const updateCommissionStatus = async (commissionId: string, status: Commission['status']) => {
    try {
      const response = await fetch(`/api/admin/affiliate/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setCommissions(prev => prev.map(commission => 
          commission.id === commissionId 
            ? { ...commission, status, ...(status === 'confirmed' && { confirmationDate: new Date().toISOString() }) }
            : commission
        ))
        toast.success(`Commission ${status}`)
      } else {
        toast.error('Failed to update commission status')
      }
    } catch (error) {
      console.error('Error updating commission:', error)
      toast.error('Failed to update commission')
    }
  }

  // Export commissions data
  const exportCommissions = async () => {
    try {
      const response = await fetch(`/api/admin/affiliate/export?format=csv&status=${statusFilter}&partner=${partnerFilter}&days=${timeRange}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `commissions_${format(new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Export downloaded')
      } else {
        toast.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [timeRange, statusFilter, partnerFilter])

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const getStatusIcon = (status: Commission['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Commission['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'paid': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && !stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Commission Dashboard</h2>
          <p className="text-gray-600">Track affiliate performance and revenue</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {isAdmin && (
            <Button variant="outline" onClick={exportCommissions}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(stats.averageCommission)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.totalConversions} bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalConversions} / {stats.totalClicks} clicks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.pendingCommissions)}</div>
              <p className="text-xs text-muted-foreground">
                Paid: {formatCurrency(stats.paidCommissions)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Partner Performance */}
      {partnerStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Performance</CardTitle>
            <CardDescription>Commission performance by affiliate partner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {partnerStats.map(partner => (
                <div key={partner.partnerId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{partner.partnerName}</h4>
                    <p className="text-sm text-gray-600">
                      {partner.clicks} clicks • {partner.conversions} conversions • {partner.conversionRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(partner.commissions)}</div>
                    <div className="text-sm text-gray-500">from {formatCurrency(partner.revenue)} revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Recent Commissions</CardTitle>
              <CardDescription>Track individual commission records</CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  {partnerStats.map(partner => (
                    <SelectItem key={partner.partnerId} value={partner.partnerId}>
                      {partner.partnerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Booking Value</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map(commission => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <div className="font-medium">{commission.bookingReference}</div>
                      {commission.userId && (
                        <div className="text-sm text-gray-500">User: {commission.userId.slice(0, 8)}...</div>
                      )}
                    </TableCell>
                    <TableCell>{commission.partnerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {commission.productType}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(commission.bookingValue, commission.currency)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(commission.commissionAmount, commission.currency)}</div>
                      <div className="text-sm text-gray-500">
                        {(commission.commissionRate * 100).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(commission.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(commission.status)}
                          {commission.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(commission.bookingDate), 'MMM d, yyyy')}
                      </div>
                      {commission.confirmationDate && (
                        <div className="text-xs text-gray-500">
                          Confirmed: {format(new Date(commission.confirmationDate), 'MMM d')}
                        </div>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {commission.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCommissionStatus(commission.id, 'confirmed')}
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCommissionStatus(commission.id, 'rejected')}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {commission.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCommissionStatus(commission.id, 'paid')}
                            >
                              <DollarSign className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {commissions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No commissions found for the selected filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}