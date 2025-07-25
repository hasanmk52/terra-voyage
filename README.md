# TerraVoyage: AI-Powered Travel Planner

TerraVoyage is a modern, AI-powered travel planning application that helps users create, customize, and manage personalized multi-day travel itineraries. It features a simplified, no-authentication experience with intelligent AI recommendations, beautiful design, and intuitive trip planning tools.

---

## 🚀 Features

- **AI-Powered Itinerary Generation**: Personalized, multi-day itineraries based on user preferences, budget, and interests.
- **Simplified User Experience**: No authentication required - start planning immediately with local storage for preferences.
- **Beautiful Modern Design**: Enhanced gradient logo, improved header styling, and intuitive navigation.
- **Smart Onboarding**: Optional onboarding flow to capture travel preferences without requiring accounts.
- **Interactive Maps**: Mapbox/Google Maps integration for routing, clustering, and activity visualization.
- **Weather Integration**: 10-day forecasts, weather-aware suggestions, and packing lists.
- **Export Capabilities**: PDF itineraries and calendar sync options.
- **Responsive UI**: Mobile-first design with modern aesthetics and smooth animations.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+, React 19+, TailwindCSS, Shadcn UI, Framer Motion, dnd-kit
- **Backend**: Next.js API routes, Mock implementations with real service interfaces
- **User Experience**: Simplified, no-authentication approach with local storage
- **AI**: Google Gemini API (real implementation for itinerary generation and recommendations)
- **Mock Services**: Database, Maps, Weather, Booking, Caching, PDF Export, Real-Time, Email, PWA
- **Future Integrations**: Ready for Prisma/PostgreSQL, Redis, Mapbox/Google Maps, OpenWeatherMap, Amadeus/Booking.com APIs

---

## 📦 Major Modules & Integrations

### ✅ Currently Implemented (Real Services)
- **AI Service**: Google Gemini API for intelligent itinerary and recommendation generation
- **Selective Mocking System**: Smart service routing between mock and real implementations

### 🎭 Mock Implementations (Ready for Real Service Integration)
- **Database Service**: Mock Prisma operations with PostgreSQL schema ready
- **Itinerary Service**: Mock trip planning with real AI integration
- **Collaboration Service**: Mock real-time group planning, invitations, and permissions
- **Comment & Voting Services**: Mock group feedback and decision-making features
- **Affiliate System**: Mock tracking for clicks, conversions, and commissions
- **Price Cache**: Mock flight/hotel price storage and alerts (Redis-ready)
- **Weather API**: Mock weather data with OpenWeatherMap integration ready
- **Booking Clients**: Mock Amadeus (flights) and Booking.com (hotels) with real API interfaces
- **PDF & Calendar Generators**: Mock export functionality (Puppeteer-ready)
- **Share Generator**: Mock secure trip sharing with access controls
- **Email Service**: Mock notifications (Nodemailer/SendGrid ready)
- **PWA Utils**: Mock offline support and installability

### 🔧 Easy Migration to Real Services
Each mock service maintains the same interface as its real counterpart. To enable real services, simply add the appropriate environment variables:
- `DATABASE_URL` → Enables PostgreSQL with Prisma
- `REDIS_URL` → Enables Redis caching
- `GOOGLE_MAPS_API_KEY` → Enables real maps
- `WEATHER_API_KEY` → Enables real weather data
- `AMADEUS_API_KEY` → Enables real flight booking
- `BOOKING_API_KEY` → Enables real hotel booking

---

## 🗄️ Database Schema (Prisma)

Currently using **mock database** with the following schema ready for PostgreSQL:

- **User**: Profile and preferences (currently stored locally, database-ready)
- **Trip**: Title, destination, dates, budget, status, activities
- **Activity**: Linked to trip, type, price, booking status
- **Collaboration**: Role-based access for shared trips
- **Comment/Vote**: For group planning and feedback
- **Invitation**: Token-based trip invites
- **Notification**: Collaboration and trip updates
- **SharedTrip**: Public sharing, view counts, access control

> **Note**: All database operations currently use mock implementations. Add `DATABASE_URL` to enable real PostgreSQL storage.

---

## 🔗 Example API Endpoint

```ts
// app/api/admin/affiliate/commissions/route.ts
export async function GET(request: NextRequest) {
  // ...
  // Returns commission records for admin analytics
}
```

---

## 🖥️ Getting Started

1. **Clone the repo:**
   ```bash
   git clone <repo-url>
   cd terra-voyage
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or yarn install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in API keys (Gemini, Mapbox, Weather API, etc.)
   - Authentication-related keys are no longer required
4. **Set up the database:**
   ```bash
   npx prisma db push
   npm run db:seed
   ```
5. **Run the development server:**

```bash
npm run dev
```

6. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

---

## 🧩 Project Structure

- `app/` — Next.js app directory (pages, API routes)
- `components/` — UI and feature components
- `lib/` — Core business logic, integrations, and services
- `prisma/` — Database schema and seed scripts
- `public/` — Static assets
- `.taskmaster/` — Task management and project docs

---

## 🚀 Deployment to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/terra-voyage&env=GEMINI_API_KEY&envDescription=Required%20environment%20variables&envLink=https://github.com/your-username/terra-voyage%23environment-variables)

### Manual Deployment

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Configure the build settings (Next.js should be auto-detected)

3. **Set Environment Variables in Vercel:**
   - Go to your project dashboard → Settings → Environment Variables
   - Add the following required variables:

   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   USE_MOCKS=false
   NEXT_PUBLIC_USE_MOCKS=false
   ```

   **Optional variables** (for extended functionality):
   ```
   GOOGLE_MAPS_API_KEY=your-google-maps-key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
   WEATHER_API_KEY=your-weather-api-key
   MAPBOX_ACCESS_TOKEN=your-mapbox-token
   DATABASE_URL=your-database-url (if using database)
   ```

4. **Deploy:**
   - Click "Deploy" and Vercel will build and deploy your app
   - Your app will be available at `https://your-project-name.vercel.app`

### Environment Variables Guide

- **GEMINI_API_KEY**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **USE_MOCKS/NEXT_PUBLIC_USE_MOCKS**: Set to `false` to use real AI (recommended for production)
- **GOOGLE_MAPS_API_KEY**: Optional, for enhanced maps functionality
- **WEATHER_API_KEY**: Optional, for real weather data
- **DATABASE_URL**: Optional, for persistence (uses mocks by default)

### Production Considerations

- **Minimal Setup**: The app works perfectly with just the **GEMINI_API_KEY** - all other services have sophisticated mock implementations
- **Smart Mocking**: Mock services are automatically disabled when real API keys are provided
- **AI-Powered**: Real Gemini AI responses provide intelligent, personalized trip planning
- **Scalable Architecture**: Each service can be upgraded from mock to real implementation independently
- **Production Ready**: Add analytics, monitoring, and error tracking as needed

### Current Service Status
- ✅ **AI Service**: Real (Google Gemini API)
- 🎭 **All Other Services**: Mock implementations (maps, weather, booking, database, etc.)
- 🔧 **Upgrade Path**: Add environment variables to enable real services progressively

---

## 📝 Future Opportunities

### Service Upgrades (Mock → Real)
- **Database**: PostgreSQL with Prisma ORM for data persistence
- **Caching**: Redis for improved performance and price tracking
- **Maps**: Mapbox/Google Maps for real routing and visualization
- **Weather**: OpenWeatherMap for accurate forecasts and packing suggestions
- **Booking**: Amadeus (flights) and Booking.com (hotels) for real bookings
- **Collaboration**: Socket.io for real-time group planning
- **PDF Export**: Puppeteer for professional itinerary documents
- **Email**: Nodemailer/SendGrid for notifications and sharing

### Feature Enhancements
- **Premium subscriptions** (Stripe integration, advanced AI, unlimited trips, priority support)
- **Mobile/offline app** (Enhanced PWA or native)
- **Deeper integrations** (restaurant/activity bookings, travel insurance)
- **Community/social features** (public itineraries, reviews, sharing)
- **Business analytics & admin dashboards**
- **Accessibility, internationalization, and compliance upgrades**

---
