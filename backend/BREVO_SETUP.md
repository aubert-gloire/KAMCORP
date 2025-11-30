# Brevo Email Setup Guide

Your app has been migrated from Gmail SMTP to **Brevo** (formerly Sendinblue) for sending 2FA emails.

## Why Brevo?

- ✅ **Free forever**: 300 emails/day (9,000/month)
- ✅ **No credit card required**
- ✅ **No domain needed**: Can send to any email address
- ✅ **Works on Render**: API-based (no SMTP port blocking)
- ✅ **Fast & reliable**: Purpose-built for transactional emails

## Setup Instructions

### 1. Create a Free Brevo Account

1. Go to [https://app.brevo.com/account/register](https://app.brevo.com/account/register)
2. Sign up with your email (use `saintblacked@gmail.com` or any email)
3. Verify your email address
4. Complete the onboarding (skip any upgrade prompts - free tier is perfect)

### 2. Get Your API Key

1. Log into your Brevo dashboard
2. Go to **Settings** → **SMTP & API** → **API Keys**
   - Direct link: [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)
3. Click **"Generate a new API key"**
4. Name it: `KAMCORP 2FA`
5. Copy the API key (it will only be shown once!)

### 3. Update Your .env File

Replace the placeholder in your `.env` file:

```env
# Brevo (formerly Sendinblue) API for 2FA Email Service
BREVO_API_KEY=xkeysib-your_actual_api_key_here
BREVO_SENDER_EMAIL=noreply@kamcorp.com
BREVO_SENDER_NAME=KAMCORP
```

**Note**: You can use any sender email/name you want. Brevo doesn't require domain verification for small volumes on the free tier.

### 4. Verify the Sender Email (Recommended)

To avoid spam issues:

1. In Brevo dashboard, go to **Senders & IPs** → **Senders**
2. Add your sender email (`noreply@kamcorp.com` or use your actual email)
3. Verify it by clicking the confirmation link sent to that email

**Tip**: For testing, you can use your verified personal email as the sender.

### 5. Test the Setup

Restart your backend server and try logging in as an admin user. The 2FA code should now be sent via Brevo!

```bash
cd backend
npm start
```

## Deployment on Render

Add these environment variables in your Render dashboard:

```
BREVO_API_KEY=xkeysib-your_actual_api_key_here
BREVO_SENDER_EMAIL=noreply@kamcorp.com
BREVO_SENDER_NAME=KAMCORP
```

That's it! No SMTP ports needed, so it works perfectly on Render.

## Monitoring

- Check your email stats: [https://app.brevo.com/statistics/email](https://app.brevo.com/statistics/email)
- View sent emails: [https://app.brevo.com/email/campaign/list](https://app.brevo.com/email/campaign/list)

## Troubleshooting

### Emails not sending?

1. Check if your API key is correct in `.env`
2. Verify your sender email in Brevo dashboard
3. Check the backend console logs for detailed error messages
4. Ensure you haven't exceeded the daily limit (300 emails/day)

### Still in development mode?

If `BREVO_API_KEY` is not set, the app will log 2FA codes to the console instead of sending emails. This is useful for local testing.

## Free Tier Limits

- **300 emails/day** (9,000/month)
- Unlimited contacts
- Email support
- No credit card required
- Never expires

Need more? Upgrade to paid plans starting at $17/month for 10,000 emails/month.
