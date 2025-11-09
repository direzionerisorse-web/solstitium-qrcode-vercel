/* =========================================================
  SOLSTITIUM — CHECK-IN MANAGER (API, Vercel)
  • Autenticazione con codice manager 8008
  • Trova prenotazione via qr_url esatta
  • Aggiorna stato='ARRIVATO' + checkin_at=now()
  • Invia notifica Telegram
========================================================= */

import { createClient } from '@supabase/supabase-js';

// 🟡 Helper — invio messaggio Telegram
async function notifyTelegram(text) {
  try {
    const bot = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!bot || !chat) {
      console.log('⚠️ Telegram non configurato');
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text }),
    });

    if (!response.ok) {
      console.warn('⚠️ Telegram error:', await response.text());
    } else {
      console.log('✅ Telegram inviato');
    }
  } catch (err) {
    console.error('❌ Telegram error:', err.message);
  }
}

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🔍 Parametri ricevuti:', req.query);

    const { managerCode, file } = req.query || {};

    // 🔐 Autenticazione semplice
    if (managerCode !== '8008') {
      console.warn('❌ Codice manager non valido:', managerCode);
      return res.status(403).json({ success: false, message: 'Accesso negato' });
    }

    if (!file) {
      console.error('❌ Parametro file mancante');
      return res.status(400).json({ success: false, message: 'Parametro file mancante' });
    }

    // ⚙️ Supabase client (service role)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variabili Supabase mancanti!');
      return res.status(500).json({
        success: false,
        message: 'Errore configurazione server'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔎 Recupera prenotazione con ricerca ESATTA
    const qrUrl = `${supabaseUrl}/storage/v1/object/public/qrcodes/${file}.png`;
    console.log('🔎 Ricerca qr_url:', qrUrl);

    const { data: pren, error } = await supabase
      .from('prenotazioni')
      .select('*')
      .eq('qr_url', qrUrl)
      .maybeSingle();

    if (error) {
      console.error('❌ Errore query Supabase:', error);
      throw error;
    }

    if (!pren) {
      console.warn('❌ Prenotazione non trovata');
      return res.status(404).json({ success: false, message: 'Prenotazione non trovata' });
    }

    console.log('✅ Prenotazione trovata:', pren.nome);

    // 🕓 Aggiorna check-in
    const nowIso = new Date().toISOString();
    console.log('📝 Aggiornamento check-in per ID:', pren.id);

    const { error: upErr } = await supabase
      .from('prenotazioni')
      .update({ stato: 'ARRIVATO', checkin_at: nowIso })
      .eq('id', pren.id);

    if (upErr) {
      console.error('❌ Errore update Supabase:', upErr);
      throw upErr;
    }

    console.log('✅ Check-in aggiornato');

    // 💬 Notifica Telegram
    const tMsg = `✅ Check-in\n👤 ${pren.nome}\n🕓 ${pren.ora} 🍽 Tavolo ${pren.tavolo || '?'} 👥 ${pren.pax || '-'}`;
    await notifyTelegram(tMsg);

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
    return res.status(500).json({
      success: false,
      message: 'Errore durante il check-in'
    });
  }
}
