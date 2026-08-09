const nodemailer = require("nodemailer");

// ─────────────────────────────────────────────
// Email Transporter (production-ready)
// ─────────────────────────────────────────────
// Supports Gmail, Outlook, or any SMTP provider.
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env

let transporter;

const getTransporter = () => {
   if (transporter) return transporter;

   const host = process.env.SMTP_HOST;
   const port = parseInt(process.env.SMTP_PORT || "587", 10);
   const user = process.env.SMTP_USER;
   const pass = process.env.SMTP_PASS;

   if (!host || !user || !pass) {
      console.warn("⚠️  SMTP not configured — emails will be logged to console only.");
      console.warn("   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env");
      return null;
   }

   transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: { user, pass },
   });

   return transporter;
};

// ─────────────────────────────────────────────
// Send Password Reset Email
// ─────────────────────────────────────────────
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
   const transport = getTransporter();
   const fromName = process.env.SMTP_FROM_NAME || "7 Wheel";
   const fromEmail = process.env.SMTP_USER || "noreply@7wheel.com";

   const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: "🔐 Reset Your 7 Wheel Password",
      html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a12; border-radius: 16px; overflow: hidden; border: 1px solid #1f1f30;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 32px; text-align: center;">
          <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: white; margin-bottom: 12px;">
            7
          </div>
          <h1 style="color: white; font-size: 22px; margin: 0; font-weight: 700;">Password Reset Request</h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px; color: #cbd5e1;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            We received a request to reset your password for your <strong style="color: white;">7 Wheel</strong> account.
          </p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Click the button below to set a new password. This link will expire in <strong style="color: #fbbf24;">1 hour</strong>.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
              Reset My Password
            </a>
          </div>

          <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 16px;">
            If you didn't request this, you can safely ignore this email — your password won't be changed.
          </p>

          <!-- Fallback link -->
          <div style="background: #111118; border-radius: 10px; padding: 14px; border: 1px solid #1f1f30; margin-top: 20px;">
            <p style="font-size: 11px; color: #64748b; margin: 0 0 6px;">If the button doesn't work, copy and paste this link:</p>
            <p style="font-size: 11px; color: #8b5cf6; word-break: break-all; margin: 0;">${resetUrl}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #1f1f30; padding: 20px 32px; text-align: center;">
          <p style="font-size: 11px; color: #475569; margin: 0;">
            &copy; ${new Date().getFullYear()} 7 Wheel Central Hub. All rights reserved.
          </p>
        </div>
      </div>
    `,
      text: `Reset your 7 Wheel password by visiting this link: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
   };

   // If SMTP is configured, send the real email
   if (transport) {
      try {
         const info = await transport.sendMail(mailOptions);
         console.log(`📧 Password reset email sent to ${toEmail} (messageId: ${info.messageId})`);
         return { sent: true };
      } catch (err) {
         console.error("❌ Failed to send password reset email:", err.message);
         // Fall through to console log as fallback
      }
   }

   // Fallback: log to console if SMTP is not configured or email fails
   console.log("─────────────────────────────────────");
   console.log("🔑 PASSWORD RESET (email not sent — SMTP not configured)");
   console.log(`   User: ${toEmail}`);
   console.log(`   Link: ${resetUrl}`);
   console.log("─────────────────────────────────────");
   return { sent: false };
};

module.exports = { sendPasswordResetEmail };
