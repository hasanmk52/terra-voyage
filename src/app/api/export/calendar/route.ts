import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Calendar export is disabled — return 410 Gone.
  return NextResponse.json(
    { error: "Calendar export is disabled" },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({
    message: "Calendar Export API",
    endpoints: {
      "POST /api/export/calendar":
        "Generate calendar export for trip or individual activity",
    },
    formats: ["ical", "google", "outlook"],
    examples: {
      "Full trip iCal": {
        tripId: "trip-id",
        format: "ical",
      },
      "Single activity Google Calendar": {
        tripId: "trip-id",
        activityId: "activity-id",
        format: "google",
      },
    },
  });
}
