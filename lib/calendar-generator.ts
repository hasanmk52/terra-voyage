// Calendar generator disabled stub
// Minimal stub that preserves the exported symbol `calendarGenerator`.

export interface Activity {
  id?: string;
  name?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  description?: string;
  location?: string;
  [key: string]: any;
}

export interface TripWithActivities {
  id?: string;
  title?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  activities?: Activity[];
  user?: { name?: string | null; email?: string };
  [key: string]: any;
}

class DisabledCalendarGenerator {
  generateGoogleCalendarUrl(_activity: Activity, _timezone = "UTC") {
    throw new Error("Calendar export disabled");
  }

  generateOutlookCalendarUrl(_activity: Activity, _timezone = "UTC") {
    throw new Error("Calendar export disabled");
  }

  generateAppleCalendarEvent(_activity: Activity, _timezone = "UTC") {
    throw new Error("Calendar export disabled");
  }

  async generateiCal(_trip: TripWithActivities, _options?: any) {
    throw new Error("Calendar export disabled");
  }
}

export const calendarGenerator = new DisabledCalendarGenerator();
