/* =========================================================
  SOLSTITIUM — CHECK-IN MANAGER (API, Vercel)
  • Autenticazione con codice manager 8008
  • Trova la prenotazione via qr_id oppure via nome file (?file=...)
  • Aggiorna stato='ARRIVATO' + checkin_at=now()
  • Invia notifica Telegram (breve)
========================================================= */

import { createClient } from '@supabase/supabase-js';

// 🟡 Helper — invio messaggio Telegram
async function notifyTelegram(text) {
  try {
    const bot = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!bot || !chat) return;

    await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text }),
    });
  } catch (_) {}
}

export default async function handler(req, res) {
  try {
    const { managerCode, qrId, file } = req.query || {};

    // 🔐 Autenticazione semplice
    if (managerCode !== '8008') {
      return res.status(403).json({ success: false, message: 'Accesso negato' });
    }

    // ⚙️ Supabase client (service role)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 🔎 Recupera prenotazione
    let pren = null;

    if (qrId) {
      const { data, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('qr_id', qrId)
        .maybeSingle();
      if (error) throw error;
      pren = data;
    } else if (file) {
      const { data, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .ilike('qr_url', `%${file}%`)
        .maybeSingle();
      if (error) throw error;
      pren = data;
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Parametro mancante (qrId o file)' });
    }

    if (!pren) {
      return res
        .status(404)
        .json({ success: false, message: 'Prenotazione non trovata' });
    }

    // 🕓 Aggiorna check-in
    const nowIso = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('prenotazioni')
      .update({ stato: 'ARRIVATO', checkin_at: nowIso })
      .eq('id', pren.id);

    if (upErr) throw upErr;

    // 💬 Notifica Telegram breve
    const breve =
      `✅ Check-in\n` +
      `👤 ${pren.nome ?? '-'}\n` +
      `🕓 ${pren.ora ?? '-'}  🍽 Tavolo ${pren.tavolo ?? '?'}  👥 ${pren.pax ?? '-'}`;
    await notifyTelegram(breve);

    return res.status(200).json({
      success: true,
      message: 'Check-in effettuato',
      nome: pren.nome,
      tavolo: pren.tavolo,
      ora: pren.ora,
      pax: pren.pax,
    });
  } catch (err) {
    console.error('❌ API checkinConfirm error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Errore durante il check-in' });
  }
}
