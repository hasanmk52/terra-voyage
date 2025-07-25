'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plane, 
  Hotel, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  ExternalLink,
  Heart,
  Share2,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface FlightResult {
  id: string
  price: {
    total: string
    currency: string
    base: string
  }
  itineraries: Array<{
    duration: string
    segments: Array<{
      departure: {
        iataCode: string
        at: string
      }
      arrival: {
        iataCode: string
        at: string
      }
      carrierCode: string
      number: string
      duration: string
      stops: number
    }>
  }>
  bookingUrl: string
  affiliateLinkId?: string
  validatingAirlineCodes: string[]
}

interface HotelResult {
  id: string
  name: string
  description: string
  address: {
    street: string
    city: string
    country: string
  }
  images: Array<{
    url: string
    description: string
  }>
  rating: {
    stars: number
    score: number
    reviewCount: number
  }
  facilities: string[]
  price: {
    total: string
    currency: string
    perNight: string
  }
  availability: {
    available: boolean
    roomsLeft: number
  }
  cancellation: {
    freeCancellation: boolean
  }
  bookingUrl: string
  affiliateLinkId?: string
}

interface PriceComparisonProps {
  type: 'flight' | 'hotel'
  searchParams?: any
  onSearch?: (params: any) => void
  className?: string
}

export function PriceComparison({ type, searchParams, onSearch, className = '' }: PriceComparisonProps) {
  const [results, setResults] = useState<(FlightResult | HotelResult)[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'duration'>('price')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 })
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  
  // Search form state
  const [searchForm, setSearchForm] = useState({
    // Flight fields
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    adults: 2,
    travelClass: 'ECONOMY',
    
    // Hotel fields
    hotelDestination: '',
    checkinDate: '',
    checkoutDate: '',
    rooms: 1,
    
    // Common
    children: 0
  })

  const searchPrices = async (params?: any) => {
    setLoading(true)
    try {
      const searchData = params || (type === 'flight' ? {
        type: 'flight',
        origin: searchForm.origin,
        destination: searchForm.destination,
        departureDate: searchForm.departureDate,
        returnDate: searchForm.returnDate,
        adults: searchForm.adults,
        children: searchForm.children,
        travelClass: searchForm.travelClass
      } : {
        type: 'hotel',
        destination: searchForm.hotelDestination,
        checkinDate: searchForm.checkinDate,
        checkoutDate: searchForm.checkoutDate,
        adults: searchForm.adults,
        children: searchForm.children,
        rooms: searchForm.rooms
      })

      const response = await fetch('/api/pricing/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        toast.success(`Found ${data.count} results`)
        
        if (onSearch) {
          onSearch(searchData)
        }
      } else {
        toast.error(data.error || 'Search failed')
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search prices')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return parseFloat(a.price.total) - parseFloat(b.price.total)
      case 'rating':
        if ('rating' in a && 'rating' in b) {
          return b.rating.score - a.rating.score
        }
        return 0
      case 'duration':
        if ('itineraries' in a && 'itineraries' in b) {
          const aDuration = parseDuration(a.itineraries[0]?.duration || '')
          const bDuration = parseDuration(b.itineraries[0]?.duration || '')
          return aDuration - bDuration
        }
        return 0
      default:
        return 0
    }
  })

  // Filter by price range
  const filteredResults = sortedResults.filter(result => {
    const price = parseFloat(result.price.total)
    return price >= priceRange.min && price <= priceRange.max
  })

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(id)) {
      newFavorites.delete(id)
    } else {
      newFavorites.add(id)
    }
    setFavorites(newFavorites)
  }

  const openBookingUrl = (result: FlightResult | HotelResult) => {
    window.open(result.bookingUrl, '_blank')
  }

  const shareResult = (result: FlightResult | HotelResult) => {
    if (navigator.share) {
      navigator.share({
        title: `Great ${type} deal found!`,
        text: `Check out this ${type} for $${result.price.total}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const renderSearchForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'flight' ? <Plane className="w-5 h-5" /> : <Hotel className="w-5 h-5" />}
          Search {type === 'flight' ? 'Flights' : 'Hotels'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {type === 'flight' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin">From</Label>
                  <Input
                    id="origin"
                    placeholder="JFK, LAX, etc."
                    value={searchForm.origin}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, origin: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="destination">To</Label>
                  <Input
                    id="destination"
                    placeholder="JFK, LAX, etc."
                    value={searchForm.destination}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, destination: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departure">Departure</Label>
                  <Input
                    id="departure"
                    type="date"
                    value={searchForm.departureDate}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, departureDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="return">Return (optional)</Label>
                  <Input
                    id="return"
                    type="date"
                    value={searchForm.returnDate}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, returnDate: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="hotel-destination">Destination</Label>
                <Input
                  id="hotel-destination"
                  placeholder="New York, Paris, Tokyo..."
                  value={searchForm.hotelDestination}
                  onChange={(e) => setSearchForm(prev => ({ ...prev, hotelDestination: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkin">Check-in</Label>
                  <Input
                    id="checkin"
                    type="date"
                    value={searchForm.checkinDate}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, checkinDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="checkout">Check-out</Label>
                  <Input
                    id="checkout"
                    type="date"
                    value={searchForm.checkoutDate}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, checkoutDate: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="adults">Adults</Label>
              <Select 
                value={searchForm.adults.toString()} 
                onValueChange={(value) => setSearchForm(prev => ({ ...prev, adults: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="children">Children</Label>
              <Select 
                value={searchForm.children.toString()} 
                onValueChange={(value) => setSearchForm(prev => ({ ...prev, children: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0,1,2,3,4,5].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === 'flight' ? (
              <div>
                <Label htmlFor="class">Class</Label>
                <Select 
                  value={searchForm.travelClass} 
                  onValueChange={(value) => setSearchForm(prev => ({ ...prev, travelClass: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ECONOMY">Economy</SelectItem>
                    <SelectItem value="PREMIUM_ECONOMY">Premium Economy</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="FIRST">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="rooms">Rooms</Label>
                <Select 
                  value={searchForm.rooms.toString()} 
                  onValueChange={(value) => setSearchForm(prev => ({ ...prev, rooms: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => searchPrices()} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            `Search ${type === 'flight' ? 'Flights' : 'Hotels'}`
          )}
        </Button>
      </CardFooter>
    </Card>
  )

  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters & Sort
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="sort">Sort by</Label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price (Low to High)</SelectItem>
                {type === 'hotel' && <SelectItem value="rating">Rating (High to Low)</SelectItem>}
                {type === 'flight' && <SelectItem value="duration">Duration (Short to Long)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Price Range</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
              />
              <Input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || 1000 }))}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderFlightResult = (flight: FlightResult) => (
    <Card key={flight.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {flight.itineraries[0]?.segments[0]?.departure.iataCode} → {flight.itineraries[0]?.segments[0]?.arrival.iataCode}
            </CardTitle>
            <CardDescription>
              {flight.validatingAirlineCodes.join(', ')} • {flight.itineraries[0]?.segments[0]?.stops === 0 ? 'Direct' : `${flight.itineraries[0]?.segments[0]?.stops} stops`}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${parseFloat(flight.price.total).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">{flight.price.currency}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {flight.itineraries[0]?.duration.replace('PT', '').toLowerCase()}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(parseISO(flight.itineraries[0]?.segments[0]?.departure.at), 'MMM d, HH:mm')}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(flight.id)}
                className={favorites.has(flight.id) ? 'text-red-500' : ''}
              >
                <Heart className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shareResult(flight)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            
            <Button onClick={() => openBookingUrl(flight)}>
              Book Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderHotelResult = (hotel: HotelResult) => (
    <Card key={hotel.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{hotel.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(hotel.rating.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span>•</span>
              <span>{hotel.rating.score}/10 ({hotel.rating.reviewCount} reviews)</span>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${parseFloat(hotel.price.total).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">per night</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {hotel.address.street}, {hotel.address.city}
          </div>
          
          {hotel.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hotel.facilities.slice(0, 4).map(facility => (
                <Badge key={facility} variant="secondary" className="text-xs">
                  {facility}
                </Badge>
              ))}
              {hotel.facilities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{hotel.facilities.length - 4} more
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            {hotel.cancellation.freeCancellation && (
              <Badge variant="outline" className="text-green-600">
                Free Cancellation
              </Badge>
            )}
            {hotel.availability.roomsLeft <= 5 && (
              <Badge variant="destructive">
                Only {hotel.availability.roomsLeft} left
              </Badge>
            )}
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(hotel.id)}
                className={favorites.has(hotel.id) ? 'text-red-500' : ''}
              >
                <Heart className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shareResult(hotel)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            
            <Button onClick={() => openBookingUrl(hotel)}>
              Book Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Helper function to parse duration
  const parseDuration = (duration: string): number => {
    const matches = duration.match(/PT(\d+)H?(\d+)?M?/)
    if (!matches) return 0
    const hours = parseInt(matches[1] || '0')
    const minutes = parseInt(matches[2] || '0')
    return hours * 60 + minutes
  }

  // Load initial search if params provided
  useEffect(() => {
    if (searchParams) {
      searchPrices(searchParams)
    }
  }, [searchParams])

  return (
    <div className={`space-y-6 ${className}`}>
      {renderSearchForm()}
      
      {results.length > 0 && (
        <>
          {renderFilters()}
          
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {filteredResults.length} {type === 'flight' ? 'flights' : 'hotels'} found
            </h3>
            {results.length !== filteredResults.length && (
              <p className="text-sm text-gray-500">
                {results.length - filteredResults.length} filtered out
              </p>
            )}
          </div>
          
          <div className="grid gap-4">
            {filteredResults.map(result => 
              type === 'flight' 
                ? renderFlightResult(result as FlightResult)
                : renderHotelResult(result as HotelResult)
            )}
          </div>
          
          {filteredResults.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No results match your current filters</p>
                <Button 
                  variant="outline" 
                  onClick={() => setPriceRange({ min: 0, max: 1000 })}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {!loading && results.length === 0 && !searchParams && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 mb-4">
              {type === 'flight' ? (
                <Plane className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              ) : (
                <Hotel className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Find the best {type === 'flight' ? 'flight' : 'hotel'} deals
            </h3>
            <p className="text-gray-500 mb-4">
              Search and compare prices from multiple providers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}