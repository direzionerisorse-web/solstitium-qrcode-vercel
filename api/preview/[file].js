export default async function handler(req, res) {
  try {
    const { file } = req.query;
    if (!file) return res.status(400).send("Missing file parameter");

    const QR_URL = `https://srnlpifcanveusghgqaa.supabase.co/storage/v1/object/public/qrcodes/${encodeURIComponent(file)}`;

    const title = "🎟️ Solstitium Check-in QR";
    const description = "Mostra questo QR all’ingresso per completare il tuo check-in Solstitium.";

    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="${QR_URL}" />
        <meta property="og:url" content="https://solstitium-qrcode-vercel.vercel.app/api/preview/${encodeURIComponent(file)}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#d4af37" />
        <meta http-equiv="refresh" content="1;url=https://direzionerisorse-web.github.io/solstitium-qrcode/qrcode.html?file=${encodeURIComponent(file)}" />
      </head>
      <body style="background:#000;color:#d4af37;font-family:Poppins,sans-serif;text-align:center;padding:50px">
        <h1>Solstitium Check-in QR</h1>
        <img src="${QR_URL}" width="260" style="border-radius:16px;box-shadow:0 0 25px rgba(212,175,55,0.5)" />
        <p>Reindirizzamento automatico al QR interattivo...</p>
      </body>
      </html>`;
    
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}
