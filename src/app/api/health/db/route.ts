import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Test database connection
    await db.$connect();

    // Test basic query to verify schema
    const userCount = await db.user.count();
    const tripCount = await db.trip.count();

    // Test if all tables exist by checking a few key models
    const tables = {
      users: userCount,
      trips: tripCount,
      activities: await db.activity.count(),
      days: await db.day.count(),
      collaborations: await db.collaboration.count(),
      comments: await db.comment.count(),
      votes: await db.vote.count(),
      invitations: await db.invitation.count(),
      notifications: await db.notification.count(),
      itineraryData: await db.itineraryData.count(),
      sharedTrips: await db.sharedTrip.count(),
    };

    await db.$disconnect();

    return NextResponse.json({
      status: "healthy",
      database: {
        connected: true,
        tables,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
