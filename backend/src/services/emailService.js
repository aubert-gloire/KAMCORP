import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Create Gmail transporter
const createTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.warn('⚠️  Gmail credentials not configured. 2FA codes will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
};

const transporter = createTransporter();

/**
 * Send 2FA verification code email
 */
export const send2FACode = async (email, code, userName) => {
  try {
    // If no transporter configured, log the code to console (development mode)
    if (!transporter) {
      console.log('\n🔑 2FA CODE (Gmail not configured - using console):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 To: ${email}`);
      console.log(`👤 User: ${userName}`);
      console.log(`🔢 Code: ${code}`);
      console.log('⏰ Expires: 10 minutes');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true; // Simulate success
    }

    const mailOptions = {
      from: `"KAMCORP" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your KAMCORP Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 10px;">KAMCORP</h1>
                        <p style="color: #cbd5e1; font-size: 14px; margin: 0;">Inventory Management System</p>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 20px 40px;">
                        <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 30px; text-align: center;">
                          <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 20px;">Hi ${userName},</p>
                          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
                            Your verification code for logging into KAMCORP is:
                          </p>
                          
                          <!-- Code Box -->
                          <div style="background-color: rgba(255, 255, 255, 0.15); border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; margin: 0 0 30px;">
                            <p style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                              ${code}
                            </p>
                          </div>
                          
                          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
                            This code will expire in <strong style="color: #fbbf24;">10 minutes</strong>.<br>
                            If you didn't request this code, please ignore this email.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px 40px; text-align: center;">
                        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                          This is an automated message from KAMCORP.<br>
                          Please do not reply to this email.
                        </p>
                        <p style="color: #475569; font-size: 11px; margin: 15px 0 0;">
                          © 2024 KAMCORP. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 2FA email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Send 2FA email error:', error);
    return false;
  }
};

/**
 * Generate 6-digit OTP code
 */
export const generate2FACode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
