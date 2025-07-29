# TerraVoyage: AI-Powered Travel Planner

**Live Demo**: [https://terra-voyage-bmsk31d9e-hasan-kagalwalas-projects.vercel.app/](https://terra-voyage-bmsk31d9e-hasan-kagalwalas-projects.vercel.app/)

TerraVoyage is a modern, AI-powered travel planning application that helps users create personalized multi-day travel itineraries with intelligent AI recommendations and beautiful design.

---

## 🚀 Features

- **AI-Powered Itinerary Generation**: Personalized multi-day itineraries using Google Gemini API
- **No Authentication Required**: Start planning immediately with local storage
- **Modern Design**: Beautiful UI with responsive mobile-first design
- **Interactive Maps & Weather**: Route planning and weather-aware suggestions
- **Export Options**: PDF itineraries and calendar sync

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+, React 19+, TailwindCSS, Shadcn UI
- **AI**: Google Gemini API for intelligent itinerary generation
- **Architecture**: Mock services with real API interfaces, ready for production upgrades

---

## 🏗️ Architecture

- **Real AI Service**: Google Gemini API for itinerary generation
- **Mock Services**: Database, Maps, Weather, Booking, PDF Export (ready for real API integration)
- **Easy Upgrades**: Add environment variables to enable real services progressively

---

## 🗄️ Database

Currently uses mock implementations with PostgreSQL schema ready. Includes User, Trip, Activity, Collaboration, and SharedTrip models. Add `DATABASE_URL` to enable real storage.

---

## 🖥️ Getting Started

```bash
git clone <repo-url>
cd terra-voyage
npm install
```

Set up environment variables (copy `.env.example` to `.env`):
```bash
GEMINI_API_KEY=your-gemini-api-key
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧩 Project Structure

```
app/          # Next.js pages and API routes
components/   # UI components
lib/          # Services and business logic
prisma/       # Database schema
```

---

## 🚀 Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/terra-voyage&env=GEMINI_API_KEY)

1. Push to GitHub
2. Import to Vercel
3. Add `GEMINI_API_KEY` environment variable
4. Deploy

**Minimal Setup**: Works with just the Gemini API key. Other services use mock implementations.

---

## 🔮 Future Enhancements

- Upgrade mock services to real APIs (PostgreSQL, Redis, Maps, Weather, Booking)
- Premium subscriptions and mobile app
- Real-time collaboration and social features
- Enhanced export and booking capabilities

---
