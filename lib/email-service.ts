
export class EmailService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EMAIL_API_KEY || "";
  }

  async sendInvitationEmail(params: {
    to: string;
    invitedBy: string;
    tripName: string;
    inviteLink: string;
  }) {
    if (useMocks) {
      await simulateDelay("email");
      mockEmailQueue.push({
        to: params.to,
        subject: `${params.invitedBy} invited you to collaborate on "${params.tripName}"`,
        body: `You've been invited to collaborate on the trip "${params.tripName}". Click here to join: ${params.inviteLink}`,
        sentAt: new Date(),
      });
      console.log("Mock email sent:", {
        type: "invitation",
        to: params.to,
        tripName: params.tripName,
      });
      return true;
    }

    // Real API implementation here
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: { email: "noreply@terravoyage.com" },
        subject: `${params.invitedBy} invited you to collaborate on "${params.tripName}"`,
        content: [
          {
            type: "text/html",
            value: `You've been invited to collaborate on the trip "${params.tripName}". Click here to join: ${params.inviteLink}`,
          },
        ],
      }),
    });

    return response.ok;
  }

  async sendNotificationEmail(params: {
    to: string;
    subject: string;
    body: string;
  }) {
    if (useMocks) {
      await simulateDelay("email");
      mockEmailQueue.push({
        to: params.to,
        subject: params.subject,
        body: params.body,
        sentAt: new Date(),
      });
      console.log("Mock email sent:", {
        type: "notification",
        to: params.to,
        subject: params.subject,
      });
      return true;
    }

    // Real API implementation here
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: { email: "noreply@terravoyage.com" },
        subject: params.subject,
        content: [
          {
            type: "text/html",
            value: params.body,
          },
        ],
      }),
    });

    return response.ok;
  }

  // Helper method to get the mock email queue (for testing/development)
  getMockEmailQueue() {
    return useMocks ? mockEmailQueue : [];
  }
}

export const emailService = new EmailService();

// Convenience function
export async function sendInvitationEmail(invitation: {
  to: string;
  invitedBy: string;
  tripName: string;
  inviteLink: string;
}): Promise<boolean> {
  return emailService.sendInvitationEmail(invitation);
}
