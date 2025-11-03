// /api/preview/[file].js
// Solstitium — QR Preview Endpoint (Vercel) FINAL 2025
// - OG meta per anteprima WhatsApp/Telegram con immagine reale del QR
// - Pagina dark-gold di transizione
// - Redirect automatico a GitHub Pages (qrcode.html?file=...)
// - Cache leggera per performance

export default async function handler(req, res) {
  try {
    const { file } = req.query;

    // 1) Validazione parametro
    if (!file || typeof file !== "string") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end("Missing or invalid `file` parameter");
    }

    // 2) Costruisci URL immagine su Supabase (PUBBLICA)
    const QR_URL = `https://srnlpifcanveusghgqaa.supabase.co/storage/v1/object/public/qrcodes/${encodeURIComponent(file)}`;

    // 3) Target finale (UI dark-gold su GitHub Pages)
    const TARGET = `https://direzionerisorse-web.github.io/solstitium-qrcode/qrcode.html?file=${encodeURIComponent(file)}`;

    // 4) OG Meta + HTML dark-gold con redirect 1s
    const title = "🎟️ Solstitium Check-in QR";
    const description = "Mostra questo QR all’ingresso per completare il tuo check-in Solstitium.";

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

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Theme -->
  <meta name="theme-color" content="#d4af37" />

  <!-- Redirect after 1s -->
  <meta http-equiv="refresh" content="1;url=${TARGET}" />
  <style>
    html,body{height:100%;margin:0}
    body{display:flex;align-items:center;justify-content:center;background:#000;color:#d4af37;font-family:Poppins,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;text-align:center}
    .card{max-width:520px;padding:28px;border-radius:20px;background:#0b0b0b;box-shadow:0 0 25px rgba(212,175,55,.25)}
    img{width:260px;height:260px;border-radius:16px;display:block;margin:0 auto 14px;box-shadow:0 0 25px rgba(212,175,55,.45)}
    h1{font-size:22px;margin:6px 0 8px;text-shadow:0 0 6px rgba(212,175,55,.35)}
    p{margin:6px 0 0;color:#cfcfcf;font-size:14px}
    a{color:#ffd766}
    small{display:block;margin-top:10px;color:#9c9c9c}
  </style>
</head>
<body>
  <div class="card">
    <img src="${QR_URL}" alt="Solstitium QR Code" />
    <h1>Solstitium Check-in QR</h1>
    <p>Reindirizzamento automatico al QR interattivo…</p>
    <small>Se non avviene entro 2 secondi, <a href="${TARGET}">clicca qui</a>.</small>
  </div>
</body>
</html>`;

    // 5) Intestazioni utili (cache + content type)
    res.statusCode = 200;
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300"); // 1m browser, 5m edge
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(html);
  } catch (err) {
    console.error("Preview error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Server error");
  }
}
