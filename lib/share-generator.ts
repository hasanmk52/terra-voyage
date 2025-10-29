// Sharing disabled stub
// Keeps the same exported instance name so imports remain valid but throws
// clear errors or returns empty values.

import type { TripWithActivities, ShareOptions } from "./share-types";

export class ShareGenerator {
  async createShareableLink(
    _tripId: string,
    _userId: string,
    _options: ShareOptions = {}
  ): Promise<{ shareToken: string; shareUrl: string }> {
    throw new Error("Sharing has been disabled in this build");
  }

  async getSharedTrip(
    _shareToken: string,
    _password?: string
  ): Promise<TripWithActivities | null> {
    return null;
  }

  async revokeShareableLink(
    _tripId: string,
    _userId: string
  ): Promise<boolean> {
    throw new Error("Sharing has been disabled in this build");
  }

  async getShareStats(_tripId: string, _userId: string) {
    return null;
  }
}

export const shareGenerator = new ShareGenerator();
