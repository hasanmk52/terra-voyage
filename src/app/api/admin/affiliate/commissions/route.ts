import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { affiliateSystem } from '@/lib/affiliate-system'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin (in production, check user role)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const partnerId = searchParams.get('partner')
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get commission records
    const result = await affiliateSystem.getCommissions({
      partnerId: partnerId && partnerId !== 'all' ? partnerId : undefined,
      status: status && status !== 'all' ? status as any : undefined,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      limit,
      offset
    })

    // Transform commissions for frontend
    const transformedCommissions = result.commissions.map(commission => ({
      id: commission.id,
      partnerId: commission.partnerId,
      partnerName: getPartnerName(commission.partnerId),
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
      productType: getProductType(commission.partnerId)
    }))

    return NextResponse.json({
      success: true,
      commissions: transformedCommissions,
      total: result.total,
      totalAmount: result.totalAmount,
      pagination: {
        limit,
        offset,
        hasMore: result.total > offset + limit
      }
    })

  } catch (error) {
    console.error('Error fetching commissions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch commissions'
    }, { status: 500 })
  }
}

// Helper functions
function getPartnerName(partnerId: string): string {
  const partner = affiliateSystem.getPartner(partnerId)
  return partner?.name || 'Unknown Partner'
}

function getProductType(partnerId: string): 'flight' | 'activity' {
  const partner = affiliateSystem.getPartner(partnerId)
  return (partner?.type as 'flight' | 'activity' | undefined) || 'flight'
}
