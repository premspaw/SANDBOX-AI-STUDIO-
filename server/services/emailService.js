/**
 * ZeroLens AI Studio — Automated Email Service
 * 
 * Sends automated transactional emails from: support@zerolens.in
 * 
 * Supported Providers:
 * 1. Resend (Set RESEND_API_KEY in .env) — Recommended (fastest, most reliable)
 * 2. SMTP (Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env)
 * 3. Graceful fallback: Logs formatted email payload to console if credentials are not yet configured.
 */

import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.SUPPORT_EMAIL || 'ZeroLens AI <support@zerolens.in>';

// Hostinger SMTP Transporter (smtp.hostinger.com:465)
let smtpTransporter = null;

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || 'support@zerolens.in';
  const pass = process.env.SMTP_PASS || process.env.HOSTINGER_EMAIL_PASS;

  if (!pass) return null;

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465 SSL, false for 587 TLS
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return smtpTransporter;
}

/**
 * Universal email dispatcher
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[EMAIL_SERVICE] Cannot send email: recipient "to" is missing.');
    return { success: false, error: 'Recipient missing' };
  }

  // 1. Send via Hostinger SMTP if configured
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text: text || subject
      });
      console.log(`[EMAIL_SERVICE:Hostinger_SMTP] ✅ Delivered email to ${to} (Subject: "${subject}") — ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[EMAIL_SERVICE:Hostinger_SMTP] SMTP Error:', err.message);
    }
  }

  // 2. Send via Resend API if API Key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html,
          text: text || subject
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[EMAIL_SERVICE:Resend] Error response:', data);
        return { success: false, error: data };
      }

      console.log(`[EMAIL_SERVICE:Resend] ✅ Sent email to ${to} (Subject: "${subject}") — ID: ${data.id}`);
      return { success: true, id: data.id };
    } catch (err) {
      console.error('[EMAIL_SERVICE:Resend] Network/fetch error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback / Dev Mode
  console.log(`[EMAIL_SERVICE:Mock] ✉️ [From: ${FROM_EMAIL}] -> [To: ${to}]`);
  console.log(`[EMAIL_SERVICE:Mock] Subject: "${subject}"`);
  console.log(`[EMAIL_SERVICE:Mock] (Add SMTP_PASS to .env to deliver live emails via smtp.hostinger.com)`);
  return { success: true, mocked: true };
}

/**
 * 1. Welcome Email (Triggered upon new user signup / first login)
 */
export async function sendWelcomeEmail({ email, name, shortsBalance = 50 }) {
  const displayName = name ? name.split(' ')[0] : 'Creator';
  const subject = `Welcome to ZeroLens AI Studio 🎬 (${shortsBalance} Free Shorts Credited)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ZeroLens AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060608; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060608; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #0c0d12; border: 1px solid #1e2029; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Cyber Accent Top Stripe -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #c8f135 0%, #00f2fe 50%, #9d4edd 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 24px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; line-height: 1;">
                      ZERO<span style="color: #c8f135;">LENS</span>
                    </div>
                    <div style="margin-top: 6px; font-size: 10px; font-family: monospace; color: #8e92a4; text-transform: uppercase; letter-spacing: 1.5px;">
                      Autonomous Cinema & UGC AI Studio
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 4px 10px; background: rgba(200, 241, 53, 0.1); border: 1px solid rgba(200, 241, 53, 0.35); border-radius: 20px; font-size: 9.5px; font-weight: 800; color: #c8f135; font-family: monospace; letter-spacing: 1px;">
                      ⚡ v2.5 STUDIO
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: left;">
              <div style="display: inline-block; padding: 4px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 10px; font-weight: 700; color: #c8f135; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">
                ✓ Account Initialized
              </div>
              <h1 style="margin: 0 0 14px 0; font-size: 26px; font-weight: 900; color: #ffffff; line-height: 1.25; letter-spacing: -0.5px;">
                Welcome to the Studio, ${displayName}! 🎬
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.65; color: #a4a8ba;">
                Your creative suite is unlocked. To get you creating right away, we've deposited complimentary high-speed rendering credits into your wallet.
              </p>

              <!-- Neon Lime Credit Balance Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(200, 241, 53, 0.12) 0%, rgba(12, 13, 18, 0.8) 100%); border: 1px solid rgba(200, 241, 53, 0.4); border-radius: 16px; margin-bottom: 28px; box-shadow: inset 0 0 30px rgba(200, 241, 53, 0.05);">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #c8f135; display: block; margin-bottom: 8px;">
                      ⚡ Welcome Shorts Balance
                    </span>
                    <div style="font-size: 38px; font-weight: 900; color: #ffffff; font-family: -apple-system, monospace; letter-spacing: -1px; line-height: 1;">
                      ${shortsBalance} <span style="font-size: 18px; color: #c8f135; font-weight: 700;">Shorts</span>
                    </div>
                    <span style="font-size: 11px; color: #8e92a4; display: block; margin-top: 8px; font-family: monospace;">
                      100% Unlocked · Instant Access to All AI Engines
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Capabilities Matrix -->
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #8e92a4; margin-bottom: 14px;">
                What you can build right now:
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 10px 14px; background: #13141c; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; margin-bottom: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">🎬</td>
                        <td>
                          <div style="font-size: 13px; font-weight: 800; color: #ffffff;">Cinema Studio</div>
                          <div style="font-size: 11.5px; color: #8e92a4; margin-top: 2px;">Generate cinematic 1080p clips with Seedance 2.5 Pro & Google Veo 3.1.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="padding: 10px 14px; background: #13141c; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">📱</td>
                        <td>
                          <div style="font-size: 13px; font-weight: 800; color: #ffffff;">Viral UGC Studio</div>
                          <div style="font-size: 11.5px; color: #8e92a4; margin-top: 2px;">One-click multi-shot commercials, talking head creators, and product ads.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="padding: 10px 14px; background: #13141c; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">👤</td>
                        <td>
                          <div style="font-size: 13px; font-weight: 800; color: #ffffff;">Avatar & Persona Studio</div>
                          <div style="font-size: 11.5px; color: #8e92a4; margin-top: 2px;">Consistent AI virtual influencers, voice personas, and brand models.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://zerolens.in" style="display: block; width: 85%; background: #c8f135; color: #000000; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; padding: 16px 24px; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(200, 241, 53, 0.35);">
                      Launch ZeroLens Studio →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #6a6e82; line-height: 1.6; text-align: center;">
                Need help or custom team seats? Contact our founder team anytime at <a href="mailto:support@zerolens.in" style="color: #c8f135; text-decoration: none; font-weight: 700;">support@zerolens.in</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #08080b; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size: 11px; color: #525566; line-height: 1.6;">
              <span style="font-weight: 800; color: #8e92a4;">ZEROLENS AI STUDIO</span> · Bangalore, India<br/>
              Support: <a href="mailto:support@zerolens.in" style="color: #8e92a4; text-decoration: none;">support@zerolens.in</a> · <a href="https://zerolens.in" style="color: #8e92a4; text-decoration: none;">zerolens.in</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, html });
}

export async function sendPaymentSuccessEmail({
  email,
  name,
  planName = 'Top-Up',
  amountPaid = 0,
  creditsAdded = 0,
  newBalance = 0,
  transactionId = 'N/A'
}) {
  const displayName = name ? name.split(' ')[0] : 'Creator';
  const subject = `Payment Confirmed: ${creditsAdded.toLocaleString()} Shorts Credited to Your Account ⚡`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt — ZeroLens AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060608; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060608; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #0c0d12; border: 1px solid #1e2029; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.85);">
          
          <!-- Cyber Accent Top Stripe -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #c8f135 0%, #00f2fe 50%, #9d4edd 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 24px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; line-height: 1;">
                      ZERO<span style="color: #c8f135;">LENS</span>
                    </div>
                    <div style="margin-top: 6px; font-size: 10px; font-family: monospace; color: #8e92a4; text-transform: uppercase; letter-spacing: 1.5px;">
                      Official Payment Receipt
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 5px 12px; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 20px; font-size: 10px; font-weight: 800; color: #34d399; font-family: monospace; letter-spacing: 1px;">
                      ✓ PAID
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: left;">
              <div style="display: inline-block; padding: 4px 10px; background: rgba(200, 241, 53, 0.1); border: 1px solid rgba(200, 241, 53, 0.3); border-radius: 8px; font-size: 10px; font-weight: 700; color: #c8f135; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">
                ⚡ Credits Added Successfully
              </div>
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 900; color: #ffffff; line-height: 1.3;">
                Thank you for your purchase, ${displayName}!
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a4a8ba;">
                Your payment was processed successfully. Your account has been credited with <strong>${Number(creditsAdded).toLocaleString()} Shorts</strong> and your new balance is immediately active.
              </p>

              <!-- Receipt Table Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111219; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; margin-bottom: 28px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e92a4; font-size: 12.5px;">Plan / Package</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-weight: 800; text-align: right; font-size: 13px;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e92a4; font-size: 12.5px;">Amount Paid</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-weight: 800; text-align: right; font-size: 13px;">₹${Number(amountPaid).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e92a4; font-size: 12.5px;">Shorts Credited</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #c8f135; font-weight: 900; font-family: monospace; text-align: right; font-size: 15px;">+${Number(creditsAdded).toLocaleString()} ⚡</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e92a4; font-size: 12.5px;">Updated Wallet Balance</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-weight: 800; font-family: monospace; text-align: right; font-size: 14px;">${Number(newBalance).toLocaleString()} ⚡</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; color: #8e92a4; font-size: 12.5px;">Payment Reference ID</td>
                  <td style="padding: 14px 20px; color: #72768a; font-family: monospace; font-size: 11px; text-align: right;">${transactionId}</td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://zerolens.in" style="display: block; width: 85%; background: #c8f135; color: #000000; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; padding: 16px 24px; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(200, 241, 53, 0.35);">
                      Open Studio & Generate →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #6a6e82; line-height: 1.6; text-align: center;">
                For GST invoice queries or custom tax breakdown, contact our accounts desk anytime at <a href="mailto:support@zerolens.in" style="color: #c8f135; text-decoration: none; font-weight: 700;">support@zerolens.in</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #08080b; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size: 11px; color: #525566; line-height: 1.6;">
              <span style="font-weight: 800; color: #8e92a4;">ZEROLENS AI STUDIO</span> · Bangalore, India<br/>
              Support: <a href="mailto:support@zerolens.in" style="color: #8e92a4; text-decoration: none;">support@zerolens.in</a> · <a href="https://zerolens.in" style="color: #8e92a4; text-decoration: none;">zerolens.in</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, html });
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentSuccessEmail
};
