import { upsert, isConfigured } from "../lib/supabase.js";

const PLANS = new Set(["free", "standard", "premium"]);
const PLATFORMS = new Set(["slack", "teams", "both"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clip = (v, n = 300) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};

  // Honeypot: bots fill hidden fields. Pretend success.
  if (body.company_website) return res.status(200).json({ ok: true });

  const email = clip(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });

  if (!isConfigured()) {
    console.error("Signup storage not configured; lost signup for", email);
    return res.status(500).json({ error: "Sign-ups are temporarily unavailable. Please try again soon." });
  }

  const fields = {
    plan: PLANS.has(body.plan) ? body.plan : "",
    platform: PLATFORMS.has(body.platform) ? body.platform : "",
    role: clip(body.role, 80),
    company_size: clip(body.companySize, 40),
    pain: clip(body.pain, 1000),
    source: clip(body.source, 100),
    referrer: clip(body.referrer, 300),
    // Only ever upgrade hero -> full; the column defaults to 'hero' on insert.
    step: body.step === "full" ? "full" : "",
  };

  // Upsert: the hero form saves just the email, the full form adds details later.
  // Only non-empty fields are sent, so a later submit never blanks earlier answers,
  // and created_at keeps its insert-time default.
  const row = { email, updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) if (v) row[k] = v;

  try {
    await upsert("signups", row, "email");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Signup save failed", email, err);
    return res.status(500).json({ error: "Couldn't save your sign-up. Please try again." });
  }
}

function safeParse(s) {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}
