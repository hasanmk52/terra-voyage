# TerraVoyage: AI-Powered Travel Planner

**Live Demo**: [https://terra-voyage-bmsk31d9e-hasan-kagalwalas-projects.vercel.app/](https://terra-voyage-bmsk31d9e-hasan-kagalwalas-projects.vercel.app/)

TerraVoyage is a modern, AI-powered travel planning application that creates personalized multi-day travel itineraries with intelligent recommendations and beautiful design. Built with Next.js 15, it features a hybrid architecture that seamlessly switches between mock and real services based on API key availability.

---

## ✨ Current Features

### 🤖 AI-Powered Planning
- **Google Gemini API**: Intelligent itinerary generation
- **Personalized Recommendations**: Tailored to user preferences and travel style
- **Multi-Day Planning**: Complete trip itineraries with activities, dining, and attractions

### 🗺️ Interactive Maps & Navigation
- **Real Mapbox Integration**: Interactive maps with custom markers
- **Google Places Autocomplete**: Smart destination search
- **Route Planning**: Optimized paths between activities
- **Activity Clustering**: Clean map display for dense areas

### 🌤️ Weather-Aware Planning
- **OpenWeatherMap Integration**: Real-time weather data
- **Smart Recommendations**: Weather-appropriate activities
- **10-Day Forecasts**: Plan with confidence

### 💾 Flexible Data Storage
- **PostgreSQL Database**: Production-ready with Neon cloud hosting
- **Smart Fallbacks**: Automatic mock data when database unavailable
- **Secure Environment**: Single `.env.local` configuration

### 🎨 Modern User Experience
- **No Authentication Required**: Start planning immediately
- **Responsive Design**: Mobile-first, works on all devices
- **TailwindCSS + Shadcn UI**: Beautiful, accessible components
- **Progressive Enhancement**: Features enable as APIs are configured

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **Shadcn UI** for components

### Backend & APIs
- **PostgreSQL** (Neon cloud hosting)
- **Prisma ORM** for database management
- **Google Gemini API** for AI generation
- **Mapbox GL JS** for interactive maps
- **Google Places API** for location search
- **OpenWeatherMap API** for weather data

### Architecture
- **Hybrid Mock/Real Services**: Automatic switching based on API availability
- **Secure Environment Management**: Single `.env.local` file approach
- **Type-Safe API Routes**: Full-stack TypeScript
- **Progressive Enhancement**: Works with minimal setup, better with more APIs

---

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repo-url>
cd terra-voyage
npm install
```

### 2. Environment Setup
```bash
# Copy template to local environment file
cp .env.example .env.local

# Edit .env.local with your API keys (see API Keys section below)
nano .env.local
```

### 3. Database Setup (Optional)
```bash
# Test your environment setup
npm run test:env

# Initialize database with sample data
npm run db:push
npm run db:seed
```

### 4. Development
```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 API Keys & Services

TerraVoyage works with minimal setup but gets better with more APIs configured:

| Service | Status | Variable | Required | Get From |
|---------|--------|----------|----------|----------|
| **AI Generation** | ✅ Real | `GEMINI_API_KEY` | Recommended | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **Database** | ✅ Real | `DATABASE_URL` | Optional | [Neon](https://neon.tech) (free tier) |
| **Maps** | ✅ Real | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Recommended | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| **Interactive Maps** | ✅ Real | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Recommended | [Mapbox](https://account.mapbox.com/access-tokens/) |
| **Weather** | ✅ Real | `WEATHER_API_KEY` | Optional | [OpenWeatherMap](https://openweathermap.org/api) |

### Service Behavior
- **With APIs configured**: Full functionality with real data
- **Without APIs**: Automatic fallback to mock data
- **Mixed setup**: Real services where configured, mocks elsewhere

---

## 🧪 Testing & Validation

```bash
# Test environment configuration
npm run test:env

# Test database connection
npm run db:test

# Build for production
npm run build

# Run linting
npm run lint
```

---

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── page.tsx        # Landing page
│   └── ...             # Other pages
├── components/         # Reusable UI components
│   ├── forms/          # Trip planning forms
│   ├── maps/           # Map components
│   ├── itinerary/      # Itinerary display
│   └── ui/             # Base UI components
├── lib/                # Business logic & services
│   ├── selective-mocks.ts  # Mock/real service switching
│   ├── ai-service.ts       # AI integration
│   ├── mapbox-config.ts    # Map configuration
│   └── ...
├── prisma/             # Database schema & seeds
└── scripts/            # Utility scripts
```

---

## 🚀 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/terra-voyage)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push

### Environment Variables for Production
```bash
# Required for AI features
GEMINI_API_KEY=your_gemini_api_key

# Recommended for full functionality
DATABASE_URL=your_postgresql_url
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
WEATHER_API_KEY=your_weather_api_key
```

---

## 🔒 Security Features

- ✅ **Environment Security**: Single `.env.local` file, git-ignored
- ✅ **Input Validation**: Zod schemas for all user inputs
- ✅ **SQL Injection Prevention**: Prisma ORM with type safety
- ✅ **Rate Limiting**: Basic frequency limits on API endpoints
- ✅ **Data Privacy**: Only public trips accessible without authentication
- ✅ **No Credential Exposure**: Secure environment variable handling

---

---

## 🛣️ Roadmap

### Current Status (v1.0)
- ✅ AI-powered itinerary generation
- ✅ Interactive maps and weather
- ✅ Real database integration
- ✅ Responsive design and UX
- ✅ Security hardening

### Future Enhancements
- 🔮 **Authentication System**: NextAuth.js integration for user accounts
- 🔮 **Real-time Collaboration**: Share and edit trips with friends
- 🔮 **Advanced Booking**: Direct booking integration with travel APIs
- 🔮 **Mobile App**: React Native companion app
- 🔮 **Premium Features**: Advanced AI, priority support

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and code of conduct.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**TerraVoyage** - Making travel planning intelligent, beautiful, and accessible.