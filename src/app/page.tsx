"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { HeroSection } from "@/components/landing/hero-section";
import { SampleItineraries } from "@/components/landing/sample-itineraries";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  const router = useRouter();

  const handleStartPlanning = () => {
    // Go directly to trip creation page
    router.push("/plan");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <HeroSection onStartPlanning={handleStartPlanning} />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Sample Itineraries Section */}
      <SampleItineraries />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Footer */}
      <Footer />
    </div>
  );
}
