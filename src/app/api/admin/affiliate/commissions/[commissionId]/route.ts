import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { affiliateSystem } from '@/lib/affiliate-system'
import { z } from 'zod'

const updateCommissionSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'paid', 'rejected']),
  notes: z.string().optional()
})

interface RouteParams {
  params: {
    commissionId: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { commissionId } = params
    const body = await request.json()
    const updates = updateCommissionSchema.parse(body)

    // Update commission status
    const success = await affiliateSystem.updateCommissionStatus(
      commissionId,
      updates.status,
      updates.notes
    )

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Commission not found or update failed'
      }, { status: 404 })
    }

    console.log(`Updated commission ${commissionId} status to ${updates.status}`)

    return NextResponse.json({
      success: true,
      message: 'Commission status updated successfully'
    })

  } catch (error) {
    console.error('Error updating commission:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid update data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update commission'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { commissionId } = params

    // Get specific commission details
    const commission = await affiliateSystem.getCommissionById(commissionId)

    if (!commission) {
      return NextResponse.json({
        success: false,
        error: 'Commission not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      commission: {
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
        notes: commission.notes
      }
    })

  } catch (error) {
    console.error('Error fetching commission:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch commission details'
    }, { status: 500 })
  }
}