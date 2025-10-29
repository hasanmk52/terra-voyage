import { randomBytes, createHash } from "crypto";
import { db } from "./db";

export interface AffiliatePartner {
  id: string;
  name: string;
  type: "flight" | "activity" | "car_rental" | "insurance";
  baseUrl: string;
  commissionRate: number;
  trackingParams: Record<string, string>;
  isActive: boolean;
  apiKey?: string;
  partnerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateLink {
  id: string;
  partnerId: string;
  originalUrl: string;
  trackingUrl: string;
  clickId: string;
  metadata: {
    tripId?: string;
    activityId?: string;
    userId?: string;
    productType: "flight" | "activity" | "car_rental" | "insurance";
    productId: string;
    price: number;
    currency: string;
    searchParams: Record<string, any>;
  };
  createdAt: Date;
  expiresAt?: Date;
}

export interface AffiliateClick {
  id: string;
  linkId: string;
  clickId: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  timestamp: Date;
  converted: boolean;
  conversionValue?: number;
  conversionCurrency?: string;
  conversionDate?: Date;
}

export interface CommissionRecord {
  id: string;
  partnerId: string;
  linkId: string;
  clickId: string;
  userId?: string;
  bookingReference: string;
  commissionAmount: number;
  commissionCurrency: string;
  bookingValue: number;
  bookingCurrency: string;
  commissionRate: number;
  status: "pending" | "confirmed" | "paid" | "rejected";
  bookingDate: Date;
  confirmationDate?: Date;
  paymentDate?: Date;
  notes?: string;
}

class AffiliateSystem {
  private partners: Map<string, AffiliatePartner> = new Map();

  constructor() {
    this.initializePartners();
  }

  private async initializePartners() {
    // Initialize default affiliate partners
    const defaultPartners: Omit<
      AffiliatePartner,
      "id" | "createdAt" | "updatedAt"
    >[] = [
      {
        name: "Skyscanner",
        type: "flight",
        baseUrl: "https://www.skyscanner.com",
        commissionRate: 0.02, // 2%
        trackingParams: {
          affiliateid: "terravoyage_001",
        },
        isActive: true,
        partnerId: "skyscanner",
      },
      // Amadeus partner entry removed — flight integrations are not supported in this codebase
    ];

    // Store partners in memory (in production, load from database)
    defaultPartners.forEach((partner) => {
      const partnerId = `partner_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const fullPartner: AffiliatePartner = {
        id: partnerId,
        ...partner,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.partners.set(partnerId, fullPartner);
    });
  }

  /**
   * Generate affiliate tracking link
   */
  async generateAffiliateLink(
    productType: "flight" | "activity" | "car_rental" | "insurance",
    productData: {
      productId: string;
      originalUrl: string;
      price: number;
      currency: string;
      searchParams: Record<string, any>;
      tripId?: string;
      activityId?: string;
      userId?: string;
    }
  ): Promise<AffiliateLink | null> {
    try {
      // Find the best partner for this product type
      const partner = this.getBestPartner(productType);
      if (!partner) {
        console.warn(`No active affiliate partner found for ${productType}`);
        return null;
      }

      // Generate unique click ID
      const clickId = this.generateClickId();

      // Build tracking URL
      const trackingUrl = this.buildTrackingUrl(
        partner,
        productData.originalUrl,
        clickId,
        productData.searchParams
      );

      // Create affiliate link record
      const affiliateLink: AffiliateLink = {
        id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        partnerId: partner.id,
        originalUrl: productData.originalUrl,
        trackingUrl,
        clickId,
        metadata: {
          tripId: productData.tripId,
          activityId: productData.activityId,
          userId: productData.userId,
          productType,
          productId: productData.productId,
          price: productData.price,
          currency: productData.currency,
          searchParams: productData.searchParams,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      // Store link in database (mock for now)
      await this.storeLinkRecord(affiliateLink);

      console.log(
        `Generated affiliate link: ${affiliateLink.id} for ${partner.name}`
      );
      return affiliateLink;
    } catch (error) {
      console.error("Error generating affiliate link:", error);
      return null;
    }
  }

  /**
   * Track affiliate click
   */
  async trackClick(
    linkId: string,
    clickData: {
      userId?: string;
      ipAddress: string;
      userAgent: string;
      referrer?: string;
    }
  ): Promise<string | null> {
    try {
      // Get link record
      const link = await this.getLinkRecord(linkId);
      if (!link) {
        console.warn(`Affiliate link not found: ${linkId}`);
        return null;
      }

      // Check if link is expired
      if (link.expiresAt && link.expiresAt < new Date()) {
        console.warn(`Affiliate link expired: ${linkId}`);
        return null;
      }

      // Create click record
      const clickRecord: AffiliateClick = {
        id: `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        linkId,
        clickId: link.clickId,
        userId: clickData.userId,
        ipAddress: clickData.ipAddress,
        userAgent: clickData.userAgent,
        referrer: clickData.referrer,
        timestamp: new Date(),
        converted: false,
      };

      // Store click record
      await this.storeClickRecord(clickRecord);

      console.log(`Tracked click: ${clickRecord.id} for link ${linkId}`);
      return link.trackingUrl;
    } catch (error) {
      console.error("Error tracking affiliate click:", error);
      return null;
    }
  }

  /**
   * Record commission from conversion
   */
  async recordCommission(
    clickId: string,
    conversionData: {
      bookingReference: string;
      bookingValue: number;
      bookingCurrency: string;
      bookingDate: Date;
      userId?: string;
    }
  ): Promise<CommissionRecord | null> {
    try {
      // Find click record
      const clickRecord = await this.getClickByClickId(clickId);
      if (!clickRecord) {
        console.warn(`Click record not found for clickId: ${clickId}`);
        return null;
      }

      // Get affiliate link
      const link = await this.getLinkRecord(clickRecord.linkId);
      if (!link) {
        console.warn(`Affiliate link not found: ${clickRecord.linkId}`);
        return null;
      }

      // Get partner
      const partner = this.partners.get(link.partnerId);
      if (!partner) {
        console.warn(`Partner not found: ${link.partnerId}`);
        return null;
      }

      // Calculate commission
      const commissionAmount =
        conversionData.bookingValue * partner.commissionRate;

      // Create commission record
      const commission: CommissionRecord = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        partnerId: partner.id,
        linkId: link.id,
        clickId,
        userId: conversionData.userId,
        bookingReference: conversionData.bookingReference,
        commissionAmount,
        commissionCurrency: conversionData.bookingCurrency,
        bookingValue: conversionData.bookingValue,
        bookingCurrency: conversionData.bookingCurrency,
        commissionRate: partner.commissionRate,
        status: "pending",
        bookingDate: conversionData.bookingDate,
      };

      // Store commission record
      await this.storeCommissionRecord(commission);

      // Update click record as converted
      await this.updateClickRecord(clickRecord.id, {
        converted: true,
        conversionValue: conversionData.bookingValue,
        conversionCurrency: conversionData.bookingCurrency,
        conversionDate: conversionData.bookingDate,
      });

      console.log(
        `Recorded commission: ${commission.id} - $${commissionAmount.toFixed(
          2
        )}`
      );
      return commission;
    } catch (error) {
      console.error("Error recording commission:", error);
      return null;
    }
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(
    partnerId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalCommissions: number;
    totalRevenue: number;
    partnerBreakdown: Array<{
      partnerId: string;
      partnerName: string;
      clicks: number;
      conversions: number;
      commissions: number;
      revenue: number;
    }>;
  }> {
    try {
      // Mock implementation - in production, query from database
      const stats = {
        totalClicks: 1250,
        totalConversions: 47,
        conversionRate: 3.76,
        totalCommissions: 892.5,
        totalRevenue: 22312.5,
        partnerBreakdown: Array.from(this.partners.values()).map((partner) => ({
          partnerId: partner.id,
          partnerName: partner.name,
          clicks: Math.floor(Math.random() * 500) + 100,
          conversions: Math.floor(Math.random() * 20) + 5,
          commissions: Math.random() * 500 + 50,
          revenue: Math.random() * 5000 + 1000,
        })),
      };

      return stats;
    } catch (error) {
      console.error("Error getting affiliate stats:", error);
      throw error;
    }
  }

  /**
   * Get commission records
   */
  async getCommissions(
    filters: {
      partnerId?: string;
      status?: CommissionRecord["status"];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    commissions: CommissionRecord[];
    total: number;
    totalAmount: number;
  }> {
    try {
      // Mock implementation - in production, query from database with filters
      const mockCommissions: CommissionRecord[] = [
        {
          id: "comm_1",
          partnerId: "partner_1",
          linkId: "link_1",
          clickId: "click_1",
          bookingReference: "BK123456789",
          commissionAmount: 45.5,
          commissionCurrency: "USD",
          bookingValue: 1137.5,
          bookingCurrency: "USD",
          commissionRate: 0.04,
          status: "confirmed",
          bookingDate: new Date("2024-01-15"),
          confirmationDate: new Date("2024-01-20"),
        },
        {
          id: "comm_2",
          partnerId: "partner_2",
          linkId: "link_2",
          clickId: "click_2",
          bookingReference: "FL987654321",
          commissionAmount: 25.75,
          commissionCurrency: "USD",
          bookingValue: 1030.0,
          bookingCurrency: "USD",
          commissionRate: 0.025,
          status: "pending",
          bookingDate: new Date("2024-01-18"),
        },
      ];

      return {
        commissions: mockCommissions,
        total: mockCommissions.length,
        totalAmount: mockCommissions.reduce(
          (sum, comm) => sum + comm.commissionAmount,
          0
        ),
      };
    } catch (error) {
      console.error("Error getting commissions:", error);
      throw error;
    }
  }

  /**
   * Update commission status
   */
  async updateCommissionStatus(
    commissionId: string,
    status: CommissionRecord["status"],
    notes?: string
  ): Promise<boolean> {
    try {
      // In production, update in database
      console.log(`Updated commission ${commissionId} status to ${status}`);
      return true;
    } catch (error) {
      console.error("Error updating commission status:", error);
      return false;
    }
  }

  // Private helper methods

  private getBestPartner(productType: string): AffiliatePartner | null {
    const activePartners = Array.from(this.partners.values()).filter(
      (partner) => partner.isActive && partner.type === productType
    );

    if (activePartners.length === 0) return null;

    // Return partner with highest commission rate
    return activePartners.reduce((best, current) =>
      current.commissionRate > best.commissionRate ? current : best
    );
  }

  private generateClickId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString("hex");
    return `${timestamp}_${random}`;
  }

  private buildTrackingUrl(
    partner: AffiliatePartner,
    originalUrl: string,
    clickId: string,
    searchParams: Record<string, any>
  ): string {
    // All affiliate links now redirect to external partner URLs.
    const url = new URL(originalUrl);

    // Add partner tracking parameters
    Object.entries(partner.trackingParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Add our tracking parameters
    url.searchParams.set("click_id", clickId);
    url.searchParams.set("ref", "terravoyage");

    return url.toString();
  }

  private async storeLinkRecord(link: AffiliateLink): Promise<void> {
    // In production, store in database
    console.log(`Stored affiliate link: ${link.id}`);
  }

  private async getLinkRecord(linkId: string): Promise<AffiliateLink | null> {
    // In production, query from database
    // Mock implementation
    return {
      id: linkId,
      partnerId: "partner_1",
      originalUrl: "https://www.skyscanner.com/transport/flights/example",
      trackingUrl: "https://www.skyscanner.com/transport/flights/example?affid=123&click_id=abc",
      clickId: "abc123",
      metadata: {
        productType: "flight",
        productId: "flight_123",
        price: 200,
        currency: "USD",
        searchParams: {},
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  private async storeClickRecord(click: AffiliateClick): Promise<void> {
    // In production, store in database
    console.log(`Stored click record: ${click.id}`);
  }

  private async getClickByClickId(
    clickId: string
  ): Promise<AffiliateClick | null> {
    // In production, query from database
    // Mock implementation
    return {
      id: "click_1",
      linkId: "link_1",
      clickId,
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      timestamp: new Date(),
      converted: false,
    };
  }

  private async updateClickRecord(
    clickId: string,
    updates: Partial<AffiliateClick>
  ): Promise<void> {
    // In production, update in database
    console.log(`Updated click record: ${clickId}`);
  }

  private async storeCommissionRecord(
    commission: CommissionRecord
  ): Promise<void> {
    // In production, store in database
    console.log(`Stored commission record: ${commission.id}`);
  }

  /**
   * Get all active partners
   */
  getActivePartners(): AffiliatePartner[] {
    return Array.from(this.partners.values()).filter(
      (partner) => partner.isActive
    );
  }

  /**
   * Get partner by ID
   */
  getPartner(partnerId: string): AffiliatePartner | null {
    return this.partners.get(partnerId) || null;
  }

  /**
   * Add or update partner
   */
  setPartner(partner: AffiliatePartner): void {
    this.partners.set(partner.id, partner);
  }
}

// Singleton instance
export const affiliateSystem = new AffiliateSystem();
