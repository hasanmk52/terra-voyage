import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { priceCacheManager } from '@/lib/price-cache'
import { z } from 'zod'

const updateAlertSchema = z.object({
  isActive: z.boolean().optional(),
  targetPrice: z.number().positive().optional()
})

interface RouteParams {
  params: {
    alertId: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = params
    const body = await request.json()
    const updates = updateAlertSchema.parse(body)

    // Update the price alert
    const success = await priceCacheManager.updatePriceAlert(alertId, updates)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Price alert not found or update failed'
      }, { status: 404 })
    }

    console.log(`Updated price alert ${alertId} for user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Price alert updated successfully'
    })

  } catch (error) {
    console.error('Error updating price alert:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid update data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update price alert'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = params

    // Delete the price alert
    const success = await priceCacheManager.deletePriceAlert(alertId, session.user.id)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Price alert not found or deletion failed'
      }, { status: 404 })
    }

    console.log(`Deleted price alert ${alertId} for user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Price alert deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting price alert:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete price alert'
    }, { status: 500 })
  }
}