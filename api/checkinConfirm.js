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
  // Abilita CORS (importante per le richieste dal frontend)
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

    const { managerCode, qrId, file } = req.query || {};

    // 🔐 Autenticazione semplice
    if (managerCode !== '8008') {
      console.warn('❌ Codice manager non valido:', managerCode);
      return res.status(403).json({ success: false, message: 'Accesso negato' });
    }

    // ⚙️ Supabase client (service role)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variabili Supabase mancanti!');
      console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
      console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
      return res.status(500).json({
        success: false,
        message: 'Errore configurazione server (variabili mancanti)'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔎 Recupera prenotazione
    let pren = null;

    if (qrId) {
      console.log('🔎 Ricerca per qrId:', qrId);
      const { data, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('qr_id', qrId)
        .maybeSingle();

      if (error) {
        console.error('❌ Errore query Supabase (qrId):', error);
        throw error;
      }
      pren = data;
      console.log('✅ Prenotazione trovata:', pren ? '✅' : '❌');
    } else if (file) {
      console.log('🔎 Ricerca per file:', file);
      const { data, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .ilike('qr_url', `%${file}%`)
        .maybeSingle();

      if (error) {
        console.error('❌ Errore query Supabase (file):', error);
        throw error;
      }
      pren = data;
      console.log('✅ Prenotazione trovata:', pren ? '✅' : '❌');
    } else {
      console.error('❌ Parametri mancanti (qrId e file)');
      return res
        .status(400)
        .json({ success: false, message: 'Parametro mancante (qrId o file)' });
    }

    if (!pren) {
      console.warn('❌ Prenotazione non trovata');
      return res
        .status(404)
        .json({ success: false, message: 'Prenotazione non trovata' });
    }

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
    console.error('   Stack:', err.stack);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Errore durante il check-in',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
}
