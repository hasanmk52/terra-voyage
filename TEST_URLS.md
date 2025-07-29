# Test URLs for TerraVoyage

## Main Pages
- **Home**: http://localhost:3000
- **Trip Planning**: http://localhost:3000/plan
- **Sample Trip Details**: http://localhost:3000/trip/sample-paris-trip

## Features to Test

### 1. Trip Planning Flow
1. Go to http://localhost:3000
2. Click "Start Planning" 
3. Complete the form with:
   - **Destination**: Try typing "Paris" (uses real Google Places API)
   - **Dates**: Select any future dates
   - **Travelers**: Select number of travelers
   - **Budget**: Set budget amount
   - **Interests**: Choose interests
   - **Preferences**: Set travel preferences
4. Submit form → Should redirect to trip details page

### 2. Weather Integration Testing  
1. Go to http://localhost:3000/trip/sample-paris-trip
2. **Weather Panel**: Clean, sleek weather sidebar on the right
3. **Toggle Weather**: Click "Weather for Paris, France" / "Hide Weather" button
4. **Weather Features**:
   - **Current Weather**: Real-time weather conditions for Paris with temperature, feels like, wind, humidity, and visibility
   - **Trip Summary**: Overview showing rainy days, average temperature, and trip duration
   - **Smart Recommendations**: Automatic suggestions for rain gear or outdoor activities
   - **Daily Forecast**: Expandable detailed forecast for each day of the trip
   - **Location Context**: Clear indication that weather is for "Paris, France"

### 3. Google Places API Testing
1. In trip planning form at http://localhost:3000/plan
2. **Destination Search**: Start typing city names
   - With API key: Should show real cities from Google Places
   - Without API key: Should show mock cities
3. **Console**: Check browser console for API status logs

### 4. Weather API Testing  
- **Command Line**: `WEATHER_API_KEY="6d6fa1a29acd6989f9e71d4e6f695c2a" npx tsx scripts/test-weather.ts`
- **Google Maps**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyBpWO-x91LnpXv82kQJscj8LWJTlUQgcvA" npx tsx scripts/test-google-maps.ts`

## Expected Results

### ✅ Working Features:
- **Weather API**: Real weather data from OpenWeatherMap with proper error handling
- **Google Places API**: Real destination search using new Places API
- **Weather UI**: Clean, modern weather sidebar with current conditions and forecasts
- **Location Awareness**: Weather data specifically for the trip destination (Paris, France)
- **Fallback System**: Graceful fallback to mock data on API failures
- **Smart UI**: Collapsible detailed forecast, visual weather indicators, and contextual recommendations

### 🎯 Demo Flow:
1. Start at home page
2. Plan a trip (test destination autocomplete with Google Places API)
3. View trip details at `/trip/sample-paris-trip`
4. Click "Weather for Paris, France" to see the sleek weather sidebar
5. Explore current weather conditions, trip summary, and smart recommendations
6. Click "Show Daily Forecast" to see detailed weather for each day
7. Toggle weather panel on/off to see the responsive layout

**Weather Location**: The weather sidebar shows data specifically for **Paris, France** as indicated in the mock trip destination. The location is clearly displayed in both the sidebar header and the toggle button.

All integrations are production-ready with proper error handling and beautiful UI!