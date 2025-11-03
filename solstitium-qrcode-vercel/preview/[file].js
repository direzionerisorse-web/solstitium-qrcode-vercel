// /api/preview/[file].js
// Solstitium — QR Preview Endpoint (Vercel) FINAL v2.3
// - Mostra Nome, Data, Ora, Pax
// - OG meta per WhatsApp/Telegram
// - Pagina dark-gold + redirect automatico a qrcode.html

export default async function handler(req, res) {
  try {
    const { file } = req.query;
    if (!file || typeof file !== "string") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end("Missing or invalid `file` parameter");
    }

    // =====================================================
    // 1️⃣ Estrai nome, data, ora, pax dal nome file
    // =====================================================
    // Esempio nome file: MarioRossi_2025-11-03_18-00-00_4pax.png
    const cleanName = file.replace(/\.[^.]+$/, ""); // rimuove .png
    const parts = cleanName.split("_");

    let nome = parts[0] || "Ospite";
    let data = parts[1] || "";
    let ora = parts[2] || "";
    let pax = parts[3] || "";

    // Decodifica eventuali spazi o caratteri
    nome = decodeURIComponent(nome).replace(/-/g, " ");
    data = data.replace(/-/g, "-");
    ora = ora.replace(/-/g, ":").slice(0, 5);
    pax = pax.replace(/pax/i, "").replace(/\D/g, "") || "";

    // Formatta data leggibile (es. 2025-11-03 → 3 Novembre 2025)
    const mesi = [
      "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ];
    let giornoLetto = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const d = new Date(data);
      giornoLetto = `${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
    }

    // =====================================================
    // 2️⃣ Costruisci URL immagine e redirect
    // =====================================================
    const QR_URL = `https://srnlpifcanveusghgqaa.supabase.co/storage/v1/object/public/qrcodes/${encodeURIComponent(file)}`;
    const TARGET = `https://direzionerisorse-web.github.io/solstitium-qrcode/qrcode.html?file=${encodeURIComponent(file)}`;

    const title = `🎟️ ${nome} — ${ora}${pax ? ` (${pax} pax)` : ""}`;
    const description = giornoLetto
      ? `Check-in Solstitium per ${nome}, il ${giornoLetto} alle ${ora}.`
      : "Mostra questo QR all’ingresso per completare il tuo check-in Solstitium.";

    // =====================================================
    // 3️⃣ HTML elegante dark-gold
    // =====================================================
    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${QR_URL}" />
  <meta property="og:url" content="https://solstitium-qrcode-vercel.vercel.app/api/preview/${encodeURIComponent(file)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#d4af37" />
  <meta http-equiv="refresh" content="1;url=${TARGET}" />

  <style>
    html,body{height:100%;margin:0}
    body{display:flex;align-items:center;justify-content:center;background:#000;color:#d4af37;font-family:Poppins,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;text-align:center}
    .card{max-width:520px;padding:28px;border-radius:20px;background:#0b0b0b;box-shadow:0 0 25px rgba(212,175,55,.25)}
    img{width:260px;height:260px;border-radius:16px;display:block;margin:0 auto 14px;box-shadow:0 0 25px rgba(212,175,55,.45)}
    h1{font-size:22px;margin:6px 0 8px;text-shadow:0 0 6px rgba(212,175,55,.35)}
    p{margin:6px 0 0;color:#cfcfcf;font-size:14px}
    a{color:#ffd766;text-decoration:none}
    small{display:block;margin-top:10px;color:#9c9c9c}
  </style>
</head>
<body>
  <div class="card">
    <img src="${QR_URL}" alt="Solstitium QR Code" />
    <h1>${nome}</h1>
    <p>📅 ${giornoLetto || data} — 🕒 ${ora}${pax ? ` — 👥 ${pax} pax` : ""}</p>
    <p style="margin-top:10px;">Reindirizzamento automatico al QR interattivo…</p>
    <small>Se non avviene entro 2 secondi, <a href="${TARGET}">clicca qui</a>.</small>
  </div>
</body>
</html>`;

    // =====================================================
    // 4️⃣ Intestazioni + cache
    // =====================================================
    res.statusCode = 200;
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(html);
  } catch (err) {
    console.error("Preview error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Server error");
  }
}
