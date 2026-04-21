// Client Resend centralisé. Graceful si RESEND_API_KEY absent (log only).
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM_EMAIL ?? "Gouv-API <no-reply@example.com>";

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function isMailerConfigured(): boolean {
  return Boolean(apiKey);
}

export interface SendMailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(args: SendMailArgs): Promise<
  { success: true; id: string } | { success: false; error: string }
> {
  const c = getClient();
  if (!c) {
    console.log(`[mailer] skip (no RESEND_API_KEY) → ${args.subject}`);
    return { success: false, error: "RESEND_API_KEY absent" };
  }
  try {
    const res = await c.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true, id: res.data?.id ?? "" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

// === Templates ===

export function relanceDormantHtml(opts: {
  userName: string;
  prospects: Array<{ denomination: string; siren: string; daysSinceLastContact: number }>;
  appUrl: string;
}): string {
  const rows = opts.prospects
    .map(
      (p) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">
        <a href="${opts.appUrl}/prospects/${p.siren}" style="color:#6366f1;">${escape(p.denomination)}</a>
      </td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:right; color:#6b7280;">
        ${p.daysSinceLastContact}j
      </td>
    </tr>`
    )
    .join("");
  return layout(`
    <h2 style="margin:0 0 8px; font-size:18px;">Bonjour ${escape(opts.userName)},</h2>
    <p style="margin:0 0 16px; color:#4b5563;">
      ${opts.prospects.length} prospect${opts.prospects.length > 1 ? "s" : ""} dans votre pipeline n&apos;${opts.prospects.length > 1 ? "ont" : "a"} pas été relancé${opts.prospects.length > 1 ? "s" : ""} depuis plus de 30 jours.
    </p>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      ${rows}
    </table>
  `);
}

export function bodaccAlertHtml(opts: {
  userName: string;
  events: Array<{
    denomination: string;
    siren: string;
    type: string;
    date: Date;
  }>;
  appUrl: string;
}): string {
  const items = opts.events
    .map(
      (e) => `
    <li style="margin:8px 0; padding:10px; border:1px solid #fca5a5; border-radius:6px; background:#fef2f2;">
      <a href="${opts.appUrl}/prospects/${e.siren}" style="color:#991b1b; font-weight:600;">${escape(e.denomination)}</a>
      <br><span style="color:#7f1d1d; font-size:13px;">${escape(e.type)} — ${e.date.toLocaleDateString("fr-FR")}</span>
    </li>`
    )
    .join("");
  return layout(`
    <h2 style="margin:0 0 8px; font-size:18px;">Alertes BODACC</h2>
    <p style="margin:0 0 16px; color:#4b5563;">
      ${opts.events.length} événement${opts.events.length > 1 ? "s" : ""} à surveiller sur vos prospects :
    </p>
    <ul style="list-style:none; padding:0; margin:0;">${items}</ul>
  `);
}

function layout(body: string): string {
  return `
<!doctype html><html><head><meta charset="utf-8"><title>Gouv-API</title></head>
<body style="margin:0; padding:24px; background:#f9fafb; font-family:-apple-system,system-ui,sans-serif;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:24px;">
    ${body}
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
    <p style="margin:0; font-size:12px; color:#9ca3af;">Gouv-API — Opale Acquisition</p>
  </div>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
