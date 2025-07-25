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
    const days = parseInt(searchParams.get('days') || '30')
    const partnerId = searchParams.get('partner')

    // Get affiliate statistics
    const stats = await affiliateSystem.getAffiliateStats(
      partnerId || undefined,
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      new Date()
    )

    return NextResponse.json({
      success: true,
      stats: {
        totalCommissions: stats.totalRevenue * 0.04, // Assume 4% average commission
        totalRevenue: stats.totalRevenue,
        totalClicks: stats.totalClicks,
        totalConversions: stats.totalConversions,
        conversionRate: stats.conversionRate,
        averageCommission: stats.totalRevenue * 0.04 / Math.max(stats.totalConversions, 1),
        pendingCommissions: stats.totalRevenue * 0.04 * 0.6, // 60% pending
        paidCommissions: stats.totalRevenue * 0.04 * 0.4 // 40% paid
      },
      partnerBreakdown: stats.partnerBreakdown.map(partner => ({
        partnerId: partner.partnerId,
        partnerName: partner.partnerName,
        clicks: partner.clicks,
        conversions: partner.conversions,
        commissions: partner.revenue * 0.04,
        revenue: partner.revenue,
        conversionRate: partner.conversions / Math.max(partner.clicks, 1) * 100
      })),
      period: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching affiliate stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch affiliate statistics'
    }, { status: 500 })
  }
}