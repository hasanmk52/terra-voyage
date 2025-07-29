# Vercel Deployment Guide

## Environment Variables Setup

### Required Environment Variables

Add these environment variables in your Vercel project dashboard:

#### Google Maps API (Required for destination search)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-google-maps-api-key
```
- Get this from: https://console.cloud.google.com/google/maps-apis/credentials
- Make sure you have enabled: Places API (New), Geocoding API, Maps JavaScript API
- Important: This must be a **public** API key since it's used client-side

#### Mapbox (Required for interactive maps)
```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-public-token
```
- Get this from: https://account.mapbox.com/access-tokens/
- Important: Must start with `pk.` (public token), not `sk.` (secret token)

#### Weather API (Optional)
```
WEATHER_API_KEY=your-openweathermap-api-key
```
- Get this from: https://openweathermap.org/api

#### AI Service (Optional)
```
GEMINI_API_KEY=your-gemini-api-key
```
- Get this from: https://aistudio.google.com/app/apikey

#### Mock Configuration (Important!)
```
USE_MOCKS=false
NEXT_PUBLIC_USE_MOCKS=false
```

## Common Issues and Solutions

### 1. "Failed to search destinations" Error

**Cause**: Missing or invalid Google Maps API key

**Solutions**:
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in Vercel dashboard
- Ensure the API key has sufficient permissions (Places API enabled)
- Check that the API key works by testing it in your browser:
  ```
  https://places.googleapis.com/v1/places:searchText
  ```
- Make sure billing is enabled in Google Cloud Console

### 2. Map Shows Error About Invalid Token

**Cause**: Missing or invalid Mapbox token

**Solutions**:
- Verify `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set correctly
- Ensure token starts with `pk.` (not `sk.`)
- Create a new public token if needed

### 3. Still Using Mock Data Despite API Keys

**Cause**: Mock configuration overriding real APIs

**Solutions**:
- Ensure `USE_MOCKS=false` and `NEXT_PUBLIC_USE_MOCKS=false`
- Check that environment variable names match exactly
- Redeploy after changing environment variables

## Debugging Steps

### 1. Enable Debug Panel
Add `?debug` to any URL to see API status:
```
https://your-vercel-domain.com/?debug
```

### 2. Check Browser Console
Open browser developer tools and look for:
- API errors in Console tab
- Network failures in Network tab
- Service configuration logs

### 3. Test API Keys Manually

#### Test Google Maps API:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: YOUR_API_KEY" \
  -d '{"textQuery":"Paris","maxResultCount":1}' \
  "https://places.googleapis.com/v1/places:searchText"
```

#### Test Mapbox Token:
```bash
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/paris.json?access_token=YOUR_TOKEN"
```

## Deployment Checklist

- [ ] Google Maps API key added to Vercel environment variables
- [ ] Places API, Geocoding API, and Maps JavaScript API enabled in Google Cloud
- [ ] Mapbox public token (pk.*) added to Vercel environment variables  
- [ ] USE_MOCKS and NEXT_PUBLIC_USE_MOCKS set to false
- [ ] Project redeployed after environment variable changes
- [ ] Debug panel shows all APIs as working (?debug in URL)

## API Limits and Billing

### Google Maps API
- Free tier: $200 credit monthly (covers ~40,000 requests)
- Places API cost: $17 per 1,000 requests
- Enable billing to avoid API failures

### Mapbox
- Free tier: 50,000 map loads monthly
- Additional usage: $5 per 1,000 map loads

### OpenWeatherMap
- Free tier: 1,000 API calls daily
- Additional usage: $15 per 100,000 calls monthly

## Contact Support

If issues persist:
1. Check the debug panel output (?debug in URL)
2. Review browser console for specific error messages
3. Verify API keys work in manual testing
4. Contact TerraVoyage support with debug information