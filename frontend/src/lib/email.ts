import * as brevo from '@getbrevo/brevo';

const brevoApiInstance = new brevo.TransactionalEmailsApi();
(brevoApiInstance.authentications as any)['apiKey'].apiKey = process.env.BREVO_API_KEY;

const isBrevoConfigured = !!process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@kamcorp.com';
const senderName = process.env.BREVO_SENDER_NAME || 'KAMCORP';

export const generate2FACode = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const send2FACode = async (email: string, code: string, userName: string): Promise<boolean> => {
  try {
    if (!isBrevoConfigured) {
      console.log(`\n🔑 2FA CODE (dev mode) → ${email} | Code: ${code}\n`);
      return true;
    }

    const htmlContent = `
      <!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;margin:0;padding:40px 20px;">
        <div style="max-width:600px;margin:auto;background:linear-gradient(135deg,#1e1b4b,#4c1d95);border-radius:16px;padding:40px;text-align:center;">
          <h1 style="color:#fff;margin:0 0 8px;">KAMCORP</h1>
          <p style="color:#cbd5e1;margin:0 0 30px;">Hi ${userName}, your verification code is:</p>
          <div style="border:2px solid #8b5cf6;border-radius:12px;padding:20px;margin:0 0 20px;">
            <p style="color:#fff;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;font-family:monospace;">${code}</p>
          </div>
          <p style="color:#94a3b8;font-size:13px;">Expires in <strong style="color:#fbbf24;">10 minutes</strong>.</p>
        </div>
      </body></html>`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email, name: userName }];
    sendSmtpEmail.subject = 'Your KAMCORP Login Verification Code';
    sendSmtpEmail.htmlContent = htmlContent;

    await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error('Send 2FA email error:', error);
    return false;
  }
};
