export default async function handler(req, res) {
  // Set CORS headers – allow production site and localhost dev
  const allowedOrigins = [
    "https://ims-bice-five.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const origin = req.headers.origin || "";
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, html, from } = req.body || {};
    const apiKey =
      process.env.RESEND_API_KEY ||
      process.env.VITE_RESEND_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "RESEND_API_KEY is not configured in environment variables.",
      });
    }

    if (!to) {
      return res.status(400).json({ error: "Recipient email is required." });
    }

    const recipientList = Array.isArray(to) ? to : [to];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from || "Carbon & Whale IMS <onboarding@resend.dev>",
        to: recipientList,
        subject: subject || "Carbon & Whale Notification",
        html: html || "<p>Notification from Carbon & Whale IMS</p>",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
