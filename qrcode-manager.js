/* =========================================================
💎 SOLSTITIUM QR CHECK-IN MANAGER — v4.0
• Mostra anteprima dettagli PRIMA di confermare il check-in
• Conferma manuale (clic), nessuna azione automatica sul cliente
• Badge dorato, UX TOP, notifiche Telegram, sicurezza
========================================================= */

// --- Config ---
const SUPABASE_URL = "https://srnlpifcanveusghgqaa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybmxwaWZjYW52ZXVzZ2hncWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjM0MjUsImV4cCI6MjA3NjczOTQyNX0.isY5dL5MIkL6tiIM3yKIkirpCYoOt9AliM1hs_nQEFs";
const TELEGRAM_BOT_TOKEN = "7578879852:AAENCFfDGha7cqqzFoYogtwhtqtb56rmY40";
const TELEGRAM_CHAT_ID = "-4806269233";
const MANAGER_KEY = "SLS_MGR_AUTH_PERM";

// --- Inizializzazione Supabase ---
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const params = new URLSearchParams(window.location.search);
const file = params.get("file");
const mgrCode = params.get("mgr");

// --- Elementi UI ---
const wrapper = document.getElementById("wrapper");
const messageBox = document.getElementById("message");

// --- Badge manager ---
function renderManagerBadge() {
  if (document.getElementById("managerBadge")) return;
  const badge = document.createElement("div");
  badge.id = "managerBadge";
  badge.textContent = "👑 Manager attivo";
  badge.style.cssText = `
    position:fixed;top:16px;right:16px;background:#111;
    color:#d4af37;padding:6px 12px;border-radius:12px;
    font-family:Poppins,sans-serif;font-size:0.86rem;
    box-shadow:0 0 8px rgba(212,175,55,0.55);z-index:9999;
  `;
  document.body.appendChild(badge);
}

// --- Telegram sender ---
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
  } catch (e) {}
}

// --- Messaggi/loader/status ---
function showMessage(html) {
  wrapper.innerHTML = `
    <div style="text-align:center;color:#d4af37;padding:40px;max-width:410px;">
      ${html}
    </div>`;
}

// --- Autenticazione manager ---
function isManagerPerm() {
  return localStorage.getItem(MANAGER_KEY) === "true";
}
function storeManagerPerm() {
  localStorage.setItem(MANAGER_KEY, "true");
}

// --- Avvio sessione manager da ?mgr=8008 oppure da localStorage ---
function ensureManager() {
  if (mgrCode === "8008") {
    storeManagerPerm();
    renderManagerBadge();
    return true;
  }
  if (isManagerPerm()) {
    renderManagerBadge();
    return true;
  }
  return false;
}

// --- Recupera la prenotazione solo per ANTEPRIMA ---
async function fetchPrenotazione(file) {
  const { data, error } = await supabase
    .from("prenotazioni")
    .select("id, nome, tavolo, pax, ora, data, stato, checkin_at")
    .ilike("qr_url", `%${file}%`)
    .single();
  if (error || !data) throw new Error("Prenotazione non trovata");
  return data;
}

// --- Registra il check-in via API Vercel ---
async function confermaCheckin(prenotazione) {
  showMessage(`<p>⏳ Registrazione in corso...</p>`);
  try {
    const url = `/api/checkinConfirm?managerCode=8008&file=${encodeURIComponent(params.get("file"))}`;
    const response = await fetch(url, { method: "POST" });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    showMessage(`
      <h2 style="color:#00e676;">✔️ CHECK-IN <br> REGISTRATO</h2>
      <div style="margin-bottom:6px;font-size:1.2em;color:#ffd766;">
        <b>${data.nome}</b>
      </div>
      <p>${prenotazione.data} — ${prenotazione.ora}</p>
      <p>${prenotazione.pax || 0} pax — Tavolo ${prenotazione.tavolo || "-"}</p>
      <button id="newCheckinBtn" style="margin-top:24px;padding:14px 30px;font-size:1.1em;border-radius:9px;border:none;background:#222;color:#ffd766;cursor:pointer;font-weight:600;">
        Nuovo check-in
      </button>
    `);

    document.getElementById("newCheckinBtn").onclick = () => window.location.reload();
    renderManagerBadge();
  } catch (err) {
    showMessage("<h2 style='color:red;'>Errore durante la registrazione</h2><p>Riprova.</p>");
    renderManagerBadge();
  }
}


  // Notifica Telegram
  await sendTelegram(`✅ Check-in: ${nome}\nTavolo: ${tavolo || "-"}\nOra: ${oraNow}\nPax: ${pax || 0}`);

  // Feedback finale manager
  showMessage(`
    <h2 style="color:#00e676;">✔️ CHECK-IN <br> REGISTRATO</h2>
    <div style="margin-bottom:6px;font-size:1.2em;color:#ffd766;">
      <b>${nome}</b>
    </div>
    <p>${prenotazione.data} — ${prenotazione.ora}</p>
    <p>${pax || 0} pax — Tavolo ${tavolo || "-"}</p>
    <button id="newCheckinBtn" style="margin-top:24px;padding:14px 30px;font-size:1.1em;border-radius:9px;border:none;background:#222;color:#ffd766;cursor:pointer;font-weight:600;">
      Nuovo check-in
    </button>
  `);

  document.getElementById("newCheckinBtn").onclick = () => window.location.reload();
  renderManagerBadge();
}

/* ========== INIT FLOW ========== */
(async () => {
  if (!file) {
    showMessage("<h2>⚠️ QR non valido</h2><p>Manca il parametro ?file=...</p>");
    return;
  }

  const isManager = ensureManager();

  // STEP 1: PRIMA verifico che la prenotazione esista!
  let pren = null;
  try {
    pren = await fetchPrenotazione(file);
  } catch (e) {
    showMessage("<h2 style='color:red;'>Prenotazione non trovata</h2>");
    return;
  }

  // Se è già arrivato, blocca!
  if (pren.checkin_at) {
    showMessage(`
      <h2 style="color:#ffd766;">⚠️ Check-in già registrato!</h2>
      <div style="margin:10px 0;"><b>${pren.nome}</b></div>
      <div>${pren.data} — ${pren.ora} &bull; Tav. ${pren.tavolo || "-"}</div>
      <div>Arrivato alle ${new Date(pren.checkin_at).toLocaleTimeString("it-IT", {hour:'2-digit',minute:'2-digit'})}</div>
    `);
    renderManagerBadge();
    return;
  }

  // STEP 2: CLIENTE: non autenticato, solo mostra QR e istruzioni
  if (!isManager) {
    showMessage(`
      <h2>🔒 QR riservato al sistema Solstitium</h2>
      <p>Mostralo al personale per il check-in.</p>
      <img src="https://srnlpifcanveusghgqaa.supabase.co/storage/v1/object/public/qrcodes/${file}"
          alt="QR" style="width:240px;height:240px;border-radius:12px;margin-top:20px;">
    `);
    return;
  }

  // STEP 3: MANAGER - mostra ANTEPRIMA + bottone conferma
  showMessage(`
    <h2 style="color:#ffd766;">Conferma check-in</h2>
    <div style="margin-bottom:6px;font-size:1.2em;color:#ffd766;">
      <b>${pren.nome}</b>
    </div>
    <div>${pren.data} — ${pren.ora}</div>
    <div>${pren.pax || 0} pax — Tavolo ${pren.tavolo || "-"}</div>
    <button id="confirmCheckinBtn" style="margin-top:28px;padding:16px 36px;font-size:1.15em;border-radius:10px;border:none;background:#ffd766;color:#111;cursor:pointer;font-weight:700;">
      ✔️ Conferma check-in
    </button>
  `);
  document.getElementById("confirmCheckinBtn").onclick = async () => {
    try {
      await confermaCheckin(pren);
    } catch (err) {
      showMessage("<h2 style='color:red;'>Errore durante la registrazione</h2><p>Riprova.</p>");
    }
  };

  renderManagerBadge();
})();
