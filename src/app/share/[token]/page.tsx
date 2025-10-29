import { notFound } from "next/navigation";
import { MapPin, Calendar, Users, DollarSign, Clock } from "lucide-react";

interface SharedTripPageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    password?: string;
  }>;
}

export default async function SharedTripPage({
  params,
  searchParams,
}: SharedTripPageProps) {
  // Sharing is disabled in this build — render a friendly message instead of
  // attempting to fetch or render shared trip data.
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sharing Disabled
        </h1>
        <p className="text-gray-700 mb-6">
          Public sharing of itineraries has been disabled in this build. If you
          need to enable sharing for testing, re-enable the feature in
          configuration or contact the maintainers.
        </p>
      </div>
    </div>
  );
}
