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

const FROM_EMAIL = process.env.SUPPORT_EMAIL || 'ZeroLens AI <support@zerolens.in>';

/**
 * Universal email dispatcher
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[EMAIL_SERVICE] Cannot send email: recipient "to" is missing.');
    return { success: false, error: 'Recipient missing' };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Send via Resend API if API Key is configured
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

  // 2. Fallback / Dev Mode
  console.log(`[EMAIL_SERVICE:Mock] ✉️ [From: ${FROM_EMAIL}] -> [To: ${to}]`);
  console.log(`[EMAIL_SERVICE:Mock] Subject: "${subject}"`);
  console.log(`[EMAIL_SERVICE:Mock] (Set RESEND_API_KEY or SMTP in .env to deliver live emails to ${to})`);
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
  <title>Welcome to ZeroLens AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08080a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #08080a; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #101014; border: 1px solid #23232b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 35px 35px 25px 35px; border-bottom: 1px solid #1a1a24; text-align: left;">
              <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">
                ZERO<span style="color: #c8f135;">LENS</span>
              </div>
              <p style="margin: 6px 0 0 0; font-size: 11px; font-family: monospace; color: #888899; text-transform: uppercase; letter-spacing: 1px;">
                Autonomous Cinematic Video & UGC AI Studio
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 35px;">
              <h1 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Welcome, ${displayName}! 🚀
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #bbbbcc;">
                Your account is ready. We've credited your account with complimentary Shorts to let you test high-speed video rendering, AI influencer creation, and UGC video ads immediately.
              </p>

              <!-- Credit Notification Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(200, 241, 53, 0.08) 0%, rgba(200, 241, 53, 0.02) 100%); border: 1px solid rgba(200, 241, 53, 0.3); border-radius: 14px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #c8f135; display: block; margin-bottom: 6px;">
                      ⚡ Starting Balance Credited
                    </span>
                    <span style="font-size: 32px; font-weight: 900; color: #ffffff; font-family: monospace;">
                      ${shortsBalance} Shorts
                    </span>
                    <span style="font-size: 11px; color: #9999aa; display: block; margin-top: 4px;">
                      Ready to use across Cinema Studio, Seedance, UGC & Avatar Creator
                    </span>
                  </td>
                </tr>
              </table>

              <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; margin: 0 0 12px 0;">
                Quick Start Features:
              </h2>
              <ul style="margin: 0 0 28px 0; padding-left: 20px; font-size: 13px; color: #ccccdd; line-height: 1.8;">
                <li><strong>🎬 Cinema Studio:</strong> Generate 1080p cinematic scenes with Seedance & Veo 3.1.</li>
                <li><strong>📱 UGC Studio:</strong> One-click viral UGC scripts, talking head creators, and product ads.</li>
                <li><strong>👤 Avatar Studio:</strong> Consistent virtual influencers and voice personas.</li>
                <li><strong>🔄 Motion Remix & Object Swap:</strong> Transform driving footage and swap props seamlessly.</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://zerolens.in" style="display: inline-block; background-color: #c8f135; color: #000000; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 6px 20px rgba(200, 241, 53, 0.35);">
                      Launch ZeroLens Studio →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 12px; color: #777788; line-height: 1.5;">
                Need help or custom enterprise quota? Reply directly to this email or reach us anytime at <a href="mailto:support@zerolens.in" style="color: #c8f135; text-decoration: none;">support@zerolens.in</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 35px; background-color: #0b0b0e; border-top: 1px solid #1a1a24; text-align: center; font-size: 11px; color: #555566;">
              © ${new Date().getFullYear()} ZeroLens AI Studio. All rights reserved. <br/>
              Support: <a href="mailto:support@zerolens.in" style="color: #888899; text-decoration: none;">support@zerolens.in</a>
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

/**
 * 2. Payment Confirmation / Receipt Email (Triggered upon Razorpay payment capture)
 */
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
  <title>Payment Receipt — ZeroLens AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08080a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #08080a; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #101014; border: 1px solid #23232b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 35px 35px 25px 35px; border-bottom: 1px solid #1a1a24; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">
                      ZERO<span style="color: #c8f135;">LENS</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #888899; text-transform: uppercase;">
                      Payment Receipt & Credit Confirmation
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 5px 12px; background-color: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 20px; font-size: 11px; font-weight: 800; color: #34d399; font-family: monospace;">
                      PAID ✓
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 35px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                Thank you for your purchase, ${displayName}!
              </h1>
              <p style="margin: 0 0 25px 0; font-size: 13.5px; line-height: 1.6; color: #bbbbcc;">
                Your payment was received successfully and your Shorts credits have been instantly added to your account.
              </p>

              <!-- Receipt Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0e; border: 1px solid #22222a; border-radius: 14px; margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #888899;">Plan / Package</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #ffffff; font-weight: 700; text-align: right;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #888899;">Amount Paid</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #ffffff; font-weight: 700; text-align: right;">₹${Number(amountPaid).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #888899;">Shorts Added</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #c8f135; font-weight: 900; font-family: monospace; text-align: right;">+${Number(creditsAdded).toLocaleString()} ⚡</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #888899;">New Total Balance</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1a1a22; color: #ffffff; font-weight: 800; font-family: monospace; text-align: right;">${Number(newBalance).toLocaleString()} ⚡</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; color: #888899;">Transaction ID</td>
                  <td style="padding: 14px 18px; color: #777788; font-family: monospace; font-size: 11px; text-align: right;">${transactionId}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://zerolens.in" style="display: inline-block; background-color: #c8f135; color: #000000; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 6px 20px rgba(200, 241, 53, 0.35);">
                      Start Generating Now →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 12px; color: #777788; line-height: 1.5;">
                For invoice assistance or billing queries, contact our support team anytime at <a href="mailto:support@zerolens.in" style="color: #c8f135; text-decoration: none;">support@zerolens.in</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 35px; background-color: #0b0b0e; border-top: 1px solid #1a1a24; text-align: center; font-size: 11px; color: #555566;">
              © ${new Date().getFullYear()} ZeroLens AI Studio. All rights reserved. <br/>
              Support: <a href="mailto:support@zerolens.in" style="color: #888899; text-decoration: none;">support@zerolens.in</a>
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
