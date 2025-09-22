// Enums for travel preferences and dietary restrictions

export enum DietaryRestriction {
  Vegetarian = "Vegetarian",
  Vegan = "Vegan",
  GlutenFree = "Gluten-Free",
  DairyFree = "Dairy-Free",
  NutFree = "Nut-Free",
  Halal = "Halal",
  Kosher = "Kosher",
  Keto = "Keto",
  Paleo = "Paleo",
  Other = "Other",
}

export enum TransportationType {
  Walking = "walking",
  Public = "public",
  RentalCar = "rental-car",
  Mixed = "mixed",
}

export enum AccommodationType {
  Budget = "budget",
  MidRange = "mid-range",
  Luxury = "luxury",
  Mixed = "mixed",
}

export enum TravelPace {
  Slow = "slow",
  Moderate = "moderate",
  Fast = "fast",
}
