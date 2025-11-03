/* =========================================================
💎 SOLSTITIUM QR CHECK-IN MANAGER — v3.0
• Gestione duale cliente / manager (codice 8008)
• Aggiornamento Supabase e notifica Telegram
• Badge dorato persistente “👑 Manager attivo”
========================================================= */

const SUPABASE_URL = "https://srnlpifcanveusghgqaa.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybmxwaWZjYW52ZXVzZ2hncWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjM0MjUsImV4cCI6MjA3NjczOTQyNX0.isY5dL5MIkL6tiIM3yKIkirpCYoOt9AliM1hs_nQEFs";

const TELEGRAM_BOT_TOKEN = "7578879852:AAENCFfDGha7cqqzFoYogtwhtqtb56rmY40";
const TELEGRAM_CHAT_ID = "-4806269233";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const wrapper = document.getElementById("wrapper");
const messageBox = document.getElementById("message");
const checkinBox = document.getElementById("checkin");
const params = new URLSearchParams(window.location.search);
const file = params.get("file");
const mgrCode = params.get("mgr");
const MANAGER_KEY = "SLS_MGR_AUTH_PERM";

/* ---------- FUNZIONI BASE ---------- */

// Mostra un messaggio elegante
function showMessage(html) {
  wrapper.innerHTML = `
    <div style="text-align:center;color:#d4af37;padding:40px;max-width:400px;">
      ${html}
    </div>`;
}

// Badge manager
function renderManagerBadge() {
  const badge = document.createElement("div");
  badge.id = "managerBadge";
  badge.textContent = "👑 Manager attivo";
  badge.style.cssText = `
    position:fixed;top:15px;right:15px;background:#111;
    color:#d4af37;padding:6px 12px;border-radius:12px;
    font-family:Poppins,sans-serif;font-size:0.85rem;
    box-shadow:0 0 8px rgba(212,175,55,0.6);z-index:9999;
  `;
  document.body.appendChild(badge);
}

// Telegram sender
async function sendTelegram(text) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      }
    );
    console.log("💬 Telegram inviato:", text);
  } catch (err) {
    console.warn("⚠️ Errore Telegram:", err);
  }
}

/* ---------- LOGIN MANAGER ---------- */

async function initManagerAuth() {
  if (mgrCode === "8008") {
    localStorage.setItem(MANAGER_KEY, "true");
    showMessage("<h2>👑 Modalità manager attivata</h2><p>Puoi chiudere questa pagina.</p>");
    renderManagerBadge();
    return true;
  }
  if (localStorage.getItem(MANAGER_KEY) === "true") {
    renderManagerBadge();
    return true;
  }
  return false;
}

/* ---------- CHECK-IN LOGIC ---------- */

async function fetchPrenotazione(file) {
  const { data, error } = await supabase
    .from("prenotazioni")
    .select("*")
    .ilike("qr_url", `%${file}%`)
    .single();
  if (error || !data) throw new Error("Prenotazione non trovata");
  return data;
}

async function registraCheckin(p) {
  const { id, nome, tavolo, pax, ora } = p;
  const oraNow = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  // Aggiorna Supabase
  const { error } = await supabase
    .from("prenotazioni")
    .update({
      stato: "ARRIVATO",
      checkin_at: new Date().toISOString(),
      checkin_by: "8008",
    })
    .eq("id", id);

  if (error) throw error;

  // Telegram
  const msg = `✅ Check-in: ${nome} — Tav. ${tavolo || "-"} — ${oraNow} — ${pax || 0} pax`;
  await sendTelegram(msg);

  // Messaggio visivo
  showMessage(`
    <h2 style="color:#00c851;">✅ Check-in registrato</h2>
    <p><b>${nome}</b></p>
    <p>${pax || 0} pax — Tavolo ${tavolo || "-"}</p>
    <p>🕒 ${oraNow}</p>
  `);
}

/* ---------- AVVIO ---------- */

(async () => {
  if (!file) {
    showMessage("<h2>⚠️ QR non valido</h2><p>Manca il parametro ?file=...</p>");
    return;
  }

  const isManager = await initManagerAuth();

  try {
    const prenotazione = await fetchPrenotazione(file);

    if (!isManager) {
      // Cliente → mostra QR e messaggio
      showMessage(`
        <h2>🔒 QR riservato al sistema Solstitium</h2>
        <p>Mostralo al personale per il check-in.</p>
        <img src="https://srnlpifcanveusghgqaa.supabase.co/storage/v1/object/public/qrcodes/${file}" 
             alt="QR" style="width:240px;height:240px;border-radius:12px;margin-top:20px;">
      `);
      return;
    }

    // Manager → registra check-in
    await registraCheckin(prenotazione);

  } catch (err) {
    console.warn("❌ Errore:", err);
    showMessage(`<h2 style="color:red;">Prenotazione non trovata</h2>`);
  }
})();
