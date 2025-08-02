require('dotenv').config({ path: '.env.local' })

async function testBasicAPIs() {
  console.log('🧪 Testing basic API functionality...\n')
  
  // Test Mapbox directly via fetch
  console.log('1. Testing Mapbox Geocoding API directly...')
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  console.log('Mapbox token exists:', !!mapboxToken)
  
  if (mapboxToken) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/Hyderabad,%20India.json?access_token=${mapboxToken}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center
          console.log('✅ Hyderabad coordinates:', { lat, lng })
          console.log('   Full name:', data.features[0].place_name)
        }
      } else {
        console.log('❌ Mapbox API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.log('   Error details:', errorText)
      }
    } catch (error) {
      console.log('❌ Mapbox fetch failed:', error.message)
    }
  }
  
  // Test Weather API directly
  console.log('\n2. Testing Weather API directly...')
  const weatherKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY
  console.log('Weather API key exists:', !!weatherKey)
  
  if (weatherKey) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=17.3850&lon=78.4867&appid=${weatherKey}&units=metric`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Weather for Hyderabad:', data.name, '-', data.weather[0].description)
        console.log('   Temperature:', data.main.temp + '°C')
      } else {
        console.log('❌ Weather API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.log('   Error details:', errorText)
      }
    } catch (error) {
      console.log('❌ Weather fetch failed:', error.message)
    }
  }
  
  // Test Gemini AI API
  console.log('\n3. Testing Gemini AI API...')
  const geminiKey = process.env.GEMINI_API_KEY
  console.log('Gemini API key exists:', !!geminiKey)
  
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Say "Hello" if you can respond.'
              }]
            }]
          })
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        const text = data.candidates[0].content.parts[0].text
        console.log('✅ Gemini AI response:', text.trim())
      } else {
        console.log('❌ Gemini API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.log('   Error details:', errorText)
      }
    } catch (error) {
      console.log('❌ Gemini fetch failed:', error.message)
    }
  }
  
  console.log('\n🎉 Basic API tests completed!')
}

testBasicAPIs().catch(console.error)