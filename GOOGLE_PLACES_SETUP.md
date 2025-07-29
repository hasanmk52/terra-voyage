# Google Places API (New) Setup Instructions

The project has been updated to use the **New Google Places API** instead of the legacy version.

## Required APIs to Enable in Google Cloud Console

1. **Places API (New)** - Main API for location services
2. **Maps JavaScript API** - For map display (if needed)
3. **Geocoding API** - For coordinate conversion (if needed)

## Steps to Enable:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable:
   - **Places API (New)** ✅ (Required)
   - **Maps JavaScript API** (Optional)
   - **Geocoding API** (Optional)

## API Key Configuration:

1. Navigate to "APIs & Services" > "Credentials"
2. Create a new API key or use existing one
3. Add the API key to your `.env.local`:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-actual-api-key-here"
   ```

## API Key Restrictions (Recommended):

1. **HTTP referrers**: Add your domain(s)
   - `localhost:3000/*` (for development)
   - `yourdomain.com/*` (for production)

2. **API restrictions**: Limit to only required APIs
   - Places API (New)
   - Maps JavaScript API (if using maps)

## Testing:

Run the test script to verify your setup:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-api-key" npx tsx scripts/test-google-maps.ts
```

## Expected Test Results:
- ✅ Destination Search API successful
- ✅ Place Details API successful  
- ✅ Nearby Attractions API successful

## New Places API Features Used:

1. **Text Search**: `/v1/places:searchText` - For destination autocomplete
2. **Place Details**: `/v1/places/{place_id}` - For detailed place information
3. **Nearby Search**: `/v1/places:searchNearby` - For finding attractions

## Fallback Behavior:

If the API key is missing or API calls fail, the system automatically falls back to mock data, ensuring the application continues to work for demonstration purposes.

## Pricing:

The New Places API has different pricing than the legacy version. Check [Google Places API Pricing](https://developers.google.com/maps/billing-and-pricing/pricing) for current rates.

## Migration Notes:

✅ **Completed**: Updated from legacy Autocomplete Service to New Places API
✅ **Completed**: Removed dependency on Google Maps JavaScript API loader
✅ **Completed**: Added comprehensive error handling and fallbacks
✅ **Completed**: Updated all three main functions (search, details, nearby)