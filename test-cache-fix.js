// Test script to verify cache invalidation works
// Run this after creating a new trip to test the fix

const { apiClient } = require("./lib/api-client.ts");

async function testCacheInvalidation() {
  console.log("Testing cache invalidation...");

  try {
    // First, get trips (this will cache the result)
    console.log("1. Fetching trips (should cache)...");
    const trips1 = await apiClient.getTrips();
    console.log(`   Found ${trips1.trips.length} trips`);

    // Create a new trip
    console.log("2. Creating a new trip...");
    const newTrip = await apiClient.createTrip({
      title: "Test Trip",
      destination: "Test Destination",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 1000,
      travelers: 2,
      generateItinerary: false,
    });
    console.log(`   Created trip with ID: ${newTrip.trip.id}`);

    // Immediately get trips again (should bypass cache due to invalidation)
    console.log("3. Fetching trips again (should bypass cache)...");
    const trips2 = await apiClient.getTrips();
    console.log(`   Found ${trips2.trips.length} trips`);

    // Check if the new trip appears
    const newTripInList = trips2.trips.find(
      (trip) => trip.id === newTrip.trip.id
    );
    if (newTripInList) {
      console.log("✅ SUCCESS: New trip appears in the list immediately!");
    } else {
      console.log("❌ FAILED: New trip does not appear in the list");
    }

    // Clean up - delete the test trip
    console.log("4. Cleaning up test trip...");
    await apiClient.deleteTrip(newTrip.trip.id);
    console.log("   Test trip deleted");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testCacheInvalidation();
