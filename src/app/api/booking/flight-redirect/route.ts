import { NextRequest, NextResponse } from 'next/server'
import { affiliateSystem } from '@/lib/affiliate-system'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const headersList = headers()
    
    // Extract tracking parameters
    const clickId = searchParams.get('click_id')
    const partnerId = searchParams.get('partner_id')
    const linkId = searchParams.get('link_id')
    
    // Get client information
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     '127.0.0.1'
    const userAgent = headersList.get('user-agent') || ''
    const referrer = headersList.get('referer')

    // Track the click if we have a link ID
    if (linkId) {
      await affiliateSystem.trackClick(linkId, {
        ipAddress,
        userAgent,
        referrer: referrer || undefined
      })
    }

    // Build the destination URL
    const destinationParams = new URLSearchParams()
    
    // Copy relevant search parameters
    const relevantParams = [
      'origin', 'destination', 'departure', 'return', 
      'adults', 'children', 'class', 'price', 'currency'
    ]
    
    relevantParams.forEach(param => {
      const value = searchParams.get(param)
      if (value) {
        destinationParams.set(param, value)
      }
    })

    // Add affiliate tracking parameters
    if (clickId) {
      destinationParams.set('click_id', clickId)
    }
    if (partnerId) {
      destinationParams.set('partner_ref', partnerId)
    }

    // Determine redirect destination based on parameters
    let redirectUrl = 'https://www.google.com/flights'
    
    // If we have specific flight parameters, construct a more targeted URL
    const origin = searchParams.get('origin')
    const destination = searchParams.get('destination')
    const departure = searchParams.get('departure')
    const returnDate = searchParams.get('return')
    
    if (origin && destination && departure) {
      if (returnDate) {
        // Round-trip flight
        redirectUrl = `https://www.google.com/flights#flt=${origin}.${destination}.${departure}*${destination}.${origin}.${returnDate}`
      } else {
        // One-way flight
        redirectUrl = `https://www.google.com/flights#flt=${origin}.${destination}.${departure}`
      }
      
      // Add additional parameters
      const adults = searchParams.get('adults')
      if (adults && adults !== '1') {
        redirectUrl += `;c:${adults}`
      }
    }

    // Add tracking parameters to the final URL
    const finalUrl = new URL(redirectUrl)
    destinationParams.forEach((value, key) => {
      finalUrl.searchParams.set(key, value)
    })

    console.log(`Flight redirect: ${linkId || 'direct'} -> ${finalUrl.toString()}`)

    // Redirect to the booking site
    return NextResponse.redirect(finalUrl.toString())

  } catch (error) {
    console.error('Flight redirect error:', error)
    
    // Fallback redirect
    return NextResponse.redirect('https://www.google.com/flights')
  }
}

export async function POST() {
  return NextResponse.json({ 
    error: 'Method not allowed' 
  }, { status: 405 })
}