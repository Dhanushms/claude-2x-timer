import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const AUDIENCE_ID    = process.env.RESEND_AUDIENCE_ID!;

// Using Resend's shared domain until dhanushms.com is verified in Resend → Domains
const FROM_EMAIL = "Claude Planner <onboarding@resend.dev>";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    // 1. Add contact to Resend Audience
    const contactRes = await fetch(
      `https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      }
    );

    // 422 = contact already exists in this audience
    if (contactRes.status === 422) {
      return NextResponse.json({ alreadySubscribed: true });
    }

    if (!contactRes.ok) {
      const err = await contactRes.json();
      console.error("Resend contact error:", err);
      return NextResponse.json({ error: "Could not save your email. Try again." }, { status: 500 });
    }

    // 2. Send confirmation email (only for new contacts)
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: "You're on the list ✓",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#059669,#10b981);padding:3px 0;"></td></tr>

        <tr><td style="padding:40px 36px;">

          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#52525b;">Claude 2x Planner</p>
          <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#fafafa;letter-spacing:-0.02em;">You're on the list.</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#a1a1aa;">
            We'll notify you the moment the next Claude usage promotion goes live — so you can take full advantage from day one.
          </p>

          <div style="height:1px;background:#27272a;margin-bottom:28px;"></div>

          <table cellpadding="0" cellspacing="0" width="100%" style="background:#09090b;border-radius:12px;border:1px solid #27272a;">
            <tr><td style="padding:22px 24px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#52525b;">What's next</p>
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#fafafa;">Claude 2x Planner V2</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">A smarter Claude companion — going beyond the promo window. Usage insights, streak tracking, and alerts for future promotions. You'll hear about it first.</p>
            </td></tr>
          </table>

          <div style="height:1px;background:#27272a;margin:28px 0;"></div>

          <p style="margin:0;font-size:13px;color:#52525b;line-height:1.6;">
            Made by <a href="https://dhanushms.com" style="color:#10b981;text-decoration:none;">Dhanush M S</a> ·
            <a href="https://claude.dhanushms.com" style="color:#10b981;text-decoration:none;">claude.dhanushms.com</a>
          </p>

        </td></tr>

        <tr><td style="padding:16px 36px;border-top:1px solid #27272a;">
          <p style="margin:0;font-size:11px;color:#3f3f46;">You signed up at claude.dhanushms.com. No spam, ever.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error("Resend email error:", err);
      // Contact was saved — still return success so UX isn't broken
    }

    return NextResponse.json({ success: true, newContact: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
