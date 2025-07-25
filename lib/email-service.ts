import { InvitationData, generateInvitationUrl } from './collaboration-types'

export class EmailService {
  
  // Send invitation email
  async sendInvitationEmail(invitation: InvitationData): Promise<boolean> {
    try {
      const invitationUrl = generateInvitationUrl(invitation.token)
      
      // In a real application, you would use a service like SendGrid, Resend, or AWS SES
      // For now, we'll log the email content and return success
      
      const emailContent = {
        to: invitation.email,
        subject: `You're invited to collaborate on "${invitation.tripTitle}"`,
        html: this.generateInvitationEmailTemplate(invitation, invitationUrl),
        text: this.generateInvitationEmailText(invitation, invitationUrl)
      }

      // Log for development
      console.log('=== INVITATION EMAIL ===')
      console.log(`To: ${emailContent.to}`)
      console.log(`Subject: ${emailContent.subject}`)
      console.log(`URL: ${invitationUrl}`)
      console.log('========================')

      // TODO: Implement actual email sending
      // await this.sendEmail(emailContent)

      return true
    } catch (error) {
      console.error('Failed to send invitation email:', error)
      return false
    }
  }

  // Send notification email
  async sendNotificationEmail(
    email: string,
    subject: string,
    content: string,
    tripId?: string
  ): Promise<boolean> {
    try {
      const emailContent = {
        to: email,
        subject,
        html: this.generateNotificationEmailTemplate(subject, content, tripId),
        text: content
      }

      // Log for development
      console.log('=== NOTIFICATION EMAIL ===')
      console.log(`To: ${emailContent.to}`)
      console.log(`Subject: ${emailContent.subject}`)
      console.log(`Content: ${content}`)
      console.log('===========================')

      // TODO: Implement actual email sending
      // await this.sendEmail(emailContent)

      return true
    } catch (error) {
      console.error('Failed to send notification email:', error)
      return false
    }
  }

  // Generate HTML email template for invitations
  private generateInvitationEmailTemplate(invitation: InvitationData, invitationUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trip Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .trip-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .trip-title {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin: 0 0 10px 0;
        }
        .invitation-details {
            margin: 20px 0;
        }
        .invitation-details p {
            margin: 8px 0;
        }
        .role-badge {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .cta-button {
            display: inline-block;
            background: #48bb78;
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.2s;
        }
        .cta-button:hover {
            background: #38a169;
        }
        .decline-link {
            color: #a0aec0;
            text-decoration: none;
            font-size: 14px;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
        }
        .message {
            background: #edf2f7;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌍 Trip Invitation</h1>
            <p>You're invited to collaborate on a travel adventure!</p>
        </div>
        
        <div class="content">
            <p>Hi there!</p>
            
            <p><strong>${invitation.invitedBy.name || invitation.invitedBy.email}</strong> has invited you to collaborate on their upcoming trip.</p>
            
            <div class="trip-card">
                <div class="trip-title">${invitation.tripTitle}</div>
                <div class="invitation-details">
                    <p><strong>Your role:</strong> <span class="role-badge">${invitation.role.toLowerCase()}</span></p>
                    <p><strong>Invited by:</strong> ${invitation.invitedBy.name || invitation.invitedBy.email}</p>
                    <p><strong>Expires:</strong> ${invitation.expiresAt.toLocaleDateString()}</p>
                </div>
            </div>
            
            ${invitation.message ? `
            <div class="message">
                <strong>Personal message:</strong><br>
                "${invitation.message}"
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="cta-button">Accept Invitation</a>
            </div>
            
            <p style="text-align: center;">
                <a href="${invitationUrl.replace('/invite/', '/invite/decline/')}" class="decline-link">
                    Decline invitation
                </a>
            </p>
            
            <p style="font-size: 14px; color: #718096;">
                This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}. 
                If you don't have a Terra Voyage account, you'll be prompted to create one.
            </p>
        </div>
        
        <div class="footer">
            <p>Terra Voyage - AI-Powered Travel Planning</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  // Generate plain text email for invitations
  private generateInvitationEmailText(invitation: InvitationData, invitationUrl: string): string {
    return `
Trip Invitation - ${invitation.tripTitle}

Hi there!

${invitation.invitedBy.name || invitation.invitedBy.email} has invited you to collaborate on their upcoming trip "${invitation.tripTitle}".

Your role: ${invitation.role.toLowerCase()}
Invited by: ${invitation.invitedBy.name || invitation.invitedBy.email}
Expires: ${invitation.expiresAt.toLocaleDateString()}

${invitation.message ? `Personal message: "${invitation.message}"` : ''}

To accept this invitation, visit:
${invitationUrl}

To decline, visit:
${invitationUrl.replace('/invite/', '/invite/decline/')}

This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}.

Terra Voyage - AI-Powered Travel Planning
    `.trim()
  }

  // Generate HTML template for notifications
  private generateNotificationEmailTemplate(subject: string, content: string, tripId?: string): string {
    const tripUrl = tripId ? `${process.env.NEXTAUTH_URL}/trip/${tripId}` : ''
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #718096;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${subject}</h1>
        </div>
        
        <div class="content">
            <p>${content}</p>
            
            ${tripUrl ? `
            <div style="text-align: center;">
                <a href="${tripUrl}" class="cta-button">View Trip</a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>Terra Voyage - AI-Powered Travel Planning</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  // TODO: Implement actual email sending with your preferred service
  // private async sendEmail(emailData: {
  //   to: string
  //   subject: string
  //   html: string
  //   text: string
  // }): Promise<boolean> {
  //   // Implementation depends on your email service
  //   // Examples:
  //   
  //   // For SendGrid:
  //   // const msg = {
  //   //   to: emailData.to,
  //   //   from: process.env.FROM_EMAIL,
  //   //   subject: emailData.subject,
  //   //   text: emailData.text,
  //   //   html: emailData.html,
  //   // }
  //   // await sgMail.send(msg)
  //   
  //   // For Resend:
  //   // await resend.emails.send({
  //   //   from: process.env.FROM_EMAIL,
  //   //   to: emailData.to,
  //   //   subject: emailData.subject,
  //   //   html: emailData.html,
  //   // })
  //   
  //   return true
  // }
}

export const emailService = new EmailService()

// Convenience function
export async function sendInvitationEmail(invitation: InvitationData): Promise<boolean> {
  return emailService.sendInvitationEmail(invitation)
}