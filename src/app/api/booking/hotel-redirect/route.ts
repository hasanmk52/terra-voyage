import { NextRequest, NextResponse } from 'next/server'
import { affiliateSystem } from '@/lib/affiliate-system'
import { headers } from 'next/headers'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    // Use mock redirect if enabled
    if (useMocks) {
      await simulateDelay('booking')
      
      const { searchParams } = new URL(request.url)
      
      // Extract basic parameters for mock tracking
      const destination = searchParams.get('destination') || 'Paris'
      const checkin = searchParams.get('checkin') || '2024-06-15'
      const checkout = searchParams.get('checkout') || '2024-06-20'
      const guests = searchParams.get('guests') || '2'
      const hotelId = searchParams.get('hotel_id')
      
      // Mock affiliate tracking
      const linkId = searchParams.get('link_id')
      if (linkId) {
        // Simulate click tracking
        console.log(`Mock tracking: Hotel search for ${destination} from ${checkin} to ${checkout} for ${guests} guests${hotelId ? ` (Hotel ID: ${hotelId})` : ''}`)
      }
      
      // Redirect to a demo booking page
      const mockUrl = new URL('https://www.booking.com/searchresults.html')
      mockUrl.searchParams.set('ss', destination)
      mockUrl.searchParams.set('checkin', checkin)
      mockUrl.searchParams.set('checkout', checkout)
      mockUrl.searchParams.set('group_adults', guests)
      mockUrl.searchParams.set('source', 'terra-voyage-demo')
      
      if (hotelId) {
        mockUrl.searchParams.set('hotel_id', hotelId)
      }
      
      return NextResponse.redirect(mockUrl.toString())
    }
    
    const { searchParams } = new URL(request.url)
    const headersList = headers()
    
    // Extract tracking parameters
    const clickId = searchParams.get('click_id')
    const partnerId = searchParams.get('partner_id')
    const linkId = searchParams.get('link_id')
    const hotelId = searchParams.get('hotel_id')
    
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

    // Handle mock redirect for development
    if (searchParams.get('mock') === 'true') {
      return NextResponse.redirect('https://www.booking.com')
    }

    // Build the destination URL based on partner
    let redirectUrl = 'https://www.booking.com'
    
    // Get booking parameters
    const checkin = searchParams.get('checkin')
    const checkout = searchParams.get('checkout')
    const adults = searchParams.get('adults') || '2'
    const children = searchParams.get('children') || '0'
    const rooms = searchParams.get('rooms') || '1'
    
    // Build Booking.com URL
    if (hotelId && checkin && checkout) {
      const checkinDate = format(new Date(checkin), 'yyyy-MM-dd')
      const checkoutDate = format(new Date(checkout), 'yyyy-MM-dd')
      
      redirectUrl = `https://www.booking.com/hotel/us/hotel-${hotelId}.html?` +
        `checkin=${checkinDate}&` +
        `checkout=${checkoutDate}&` +
        `group_adults=${adults}&` +
        `group_children=${children}&` +
        `no_rooms=${rooms}&` +
        `selected_currency=USD`
    } else if (checkin && checkout) {
      // Generic hotel search
      const checkinDate = format(new Date(checkin), 'yyyy-MM-dd')
      const checkoutDate = format(new Date(checkout), 'yyyy-MM-dd')
      
      redirectUrl = `https://www.booking.com/searchresults.html?` +
        `checkin=${checkinDate}&` +
        `checkout=${checkoutDate}&` +
        `group_adults=${adults}&` +
        `group_children=${children}&` +
        `no_rooms=${rooms}&` +
        `selected_currency=USD`
    }

    // Add affiliate tracking parameters
    const finalUrl = new URL(redirectUrl)
    
    // Add Terra Voyage affiliate ID (replace with your actual affiliate ID)
    finalUrl.searchParams.set('aid', '1234567') // Your Booking.com affiliate ID
    finalUrl.searchParams.set('label', 'terravoyage')
    
    // Add click tracking
    if (clickId) {
      finalUrl.searchParams.set('click_id', clickId)
    }
    if (partnerId) {
      finalUrl.searchParams.set('partner_ref', partnerId)
    }

    // Add UTM parameters for tracking
    finalUrl.searchParams.set('utm_source', 'terravoyage')
    finalUrl.searchParams.set('utm_medium', 'affiliate')
    finalUrl.searchParams.set('utm_campaign', 'hotel_booking')

    console.log(`Hotel redirect: ${linkId || 'direct'} -> ${finalUrl.toString()}`)

    // Redirect to the booking site
    return NextResponse.redirect(finalUrl.toString())

  } catch (error) {
    console.error('Hotel redirect error:', error)
    
    // Fallback redirect
    return NextResponse.redirect('https://www.booking.com')
  }
}

export async function POST() {
  return NextResponse.json({ 
    error: 'Method not allowed' 
  }, { status: 405 })
}