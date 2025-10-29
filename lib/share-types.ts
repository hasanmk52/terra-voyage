// Minimal types for the share-generator stub

export interface TripWithActivities {
  id: string;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  activities?: any[];
  user?: { name?: string | null; email?: string };
}

export interface ShareOptions {
  expiresInDays?: number;
  allowComments?: boolean;
  showContactInfo?: boolean;
  showBudget?: boolean;
  password?: string;
}
