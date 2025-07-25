import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { affiliateSystem } from '@/lib/affiliate-system'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin (in production, check user role)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const exportFormat = searchParams.get('format') || 'csv'
    const status = searchParams.get('status')
    const partnerId = searchParams.get('partner')
    const days = parseInt(searchParams.get('days') || '30')

    // Get commission data
    const result = await affiliateSystem.getCommissions({
      partnerId: partnerId && partnerId !== 'all' ? partnerId : undefined,
      status: status && status !== 'all' ? status as any : undefined,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      limit: 1000 // Export up to 1000 records
    })

    if (exportFormat === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Commission ID',
        'Partner ID',
        'Booking Reference',
        'Booking Value',
        'Commission Amount',
        'Commission Rate',
        'Currency',
        'Status',
        'Booking Date',
        'Confirmation Date',
        'Payment Date',
        'User ID',
        'Notes'
      ]

      const csvRows = result.commissions.map(commission => [
        commission.id,
        commission.partnerId,
        commission.bookingReference,
        commission.bookingValue.toString(),
        commission.commissionAmount.toString(),
        (commission.commissionRate * 100).toFixed(2) + '%',
        commission.commissionCurrency,
        commission.status,
        format(commission.bookingDate, 'yyyy-MM-dd HH:mm:ss'),
        commission.confirmationDate ? format(commission.confirmationDate, 'yyyy-MM-dd HH:mm:ss') : '',
        commission.paymentDate ? format(commission.paymentDate, 'yyyy-MM-dd HH:mm:ss') : '',
        commission.userId || '',
        commission.notes || ''
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="commissions_${format(new Date(), 'yyyy-MM-dd')}.csv"`
        }
      })
    }

    if (exportFormat === 'json') {
      // Generate JSON export
      const jsonData = {
        exportDate: new Date().toISOString(),
        period: {
          days,
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        filters: {
          status: status || 'all',
          partnerId: partnerId || 'all'
        },
        summary: {
          totalCommissions: result.total,
          totalAmount: result.totalAmount
        },
        commissions: result.commissions.map(commission => ({
          id: commission.id,
          partnerId: commission.partnerId,
          bookingReference: commission.bookingReference,
          bookingValue: commission.bookingValue,
          commissionAmount: commission.commissionAmount,
          commissionRate: commission.commissionRate,
          currency: commission.commissionCurrency,
          status: commission.status,
          bookingDate: commission.bookingDate.toISOString(),
          confirmationDate: commission.confirmationDate?.toISOString(),
          paymentDate: commission.paymentDate?.toISOString(),
          userId: commission.userId,
          notes: commission.notes
        }))
      }

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="commissions_${format(new Date(), 'yyyy-MM-dd')}.json"`
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Unsupported export format'
    }, { status: 400 })

  } catch (error) {
    console.error('Error exporting commissions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to export commission data'
    }, { status: 500 })
  }
}