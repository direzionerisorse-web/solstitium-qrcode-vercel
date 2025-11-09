/* =========================================================
💎 SOLSTITIUM QR CHECK-IN MANAGER — v3.0 HYBRID
• Anteprima prima di confermare
• Registra via API Vercel
• Manager mode permanente
• Badge elegante + Esci button
• Telegram integrato
========================================================= */

const SUPABASE_URL = "https://srnlpifcanveusghgqaa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybmxwaWZjYW52ZXVzZ2hncWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjM0MjUsImV4cCI6MjA3NjczOTQyNX0.isY5dL5MIkL6tiIM3yKIkirpCYoOt9AliM1hs_nQEFs";
const TELEGRAM_TOKEN = "7578879852:AAENCFfDGha7cqqzFoYogtwhtqtb56rmY40";
const TELEGRAM_CHAT_ID = "-4806269233";
const MANAGER_CODE = "8008";
const MGR_FLAG_KEY = "SLS_MGR_AUTH_PERM";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const params = new URLSearchParams(location.search);
const file = params.get("file");
const mgr = params.get("mgr");

const msgBox = document.getElementById("message");
const box = document.getElementById("checkin");

// ===== Manager Session =====
function activateManagerSession() { localStorage.setItem(MGR_FLAG_KEY, "true"); }
function isManagerSession() { return localStorage.getItem(MGR_FLAG_KEY) === "true"; }
function clearManagerSession() { localStorage.removeItem(MGR_FLAG_KEY); }
function isManager() { return mgr === MANAGER_CODE || isManagerSession(); }

// ===== Badge visivo =====
function showManagerBadge() {
  if (!isManagerSession()) return;
  const badge = document.createElement("div");
  badge.textContent = "👑 Manager attivo";
  Object.assign(badge.style, {
    position: "fixed", top: "12px", right: "14px",
    background: "rgba(212,175,55,0.12)", color: "#d4af37",
    border: "1px solid rgba(212,175,55,0.35)", padding: "6px 12px",
    borderRadius: "10px", fontSize: "0.85rem", fontWeight: "600",
    zIndex: 9999, backdropFilter: "blur(4px)",
    boxShadow: "0 0 8px rgba(212,175,55,0.25)"
  });
  document.body.appendChild(badge);
}

// ===== Esci Manager Button =====
function mountExitButton() {
  if (!isManagerSession()) return;
  const btn = document.createElement("button");
  btn.textContent = "🔓 Esci manager";
  Object.assign(btn.style, {
    position: "fixed", right: "16px", bottom: "16px",
    background: "#222", color: "#ffd766", border: "1px solid #444",
    borderRadius: "12px", padding: "10px 14px", cursor: "pointer",
    zIndex: 9999, boxShadow: "0 0 12px rgba(212,175,55,0.35)"
  });
  btn.onclick = () => { clearManagerSession(); location.reload(); };
  document.body.appendChild(btn);
}

// ===== Telegram sender =====
async function notifyTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });
  } catch (e) { console.warn("Telegram error:", e); }
}

// ===== MAIN LOGIC =====
async function initCheckin() {
  if (!file) {
    msgBox.innerHTML = `<p class="warn">⚠️ QR non valido</p>`;
    return;
  }

  const qrUrl = `${SUPABASE_URL}/storage/v1/object/public/qrcodes/${file}`;

  // --- CLIENTE ---
  if (!isManager()) {
    msgBox.innerHTML = `<p style="color:#d4af37;">🔒 QR riservato a Solstitium</p>`;
    box.innerHTML = `<img src="${qrUrl}" alt="QR" 
      style="width:280px;height:280px;border-radius:16px;box-shadow:0 0 25px rgba(212,175,55,0.35);" />`;
    mountExitButton();
    showManagerBadge();
    return;
  }

  if (mgr === MANAGER_CODE) activateManagerSession();
  msgBox.innerHTML = `<p style="color:#d4af37;">⏳ Verifica...</p>`;

  try {
    const { data: pren, error } = await supabase
      .from("prenotazioni")
      .select("*")
      .ilike("qr_url", `%${file}%`)
      .maybeSingle();

    if (error || !pren) {
      msgBox.innerHTML = `<p style="color:red;">❌ Non trovato</p>`;
      mountExitButton();
      showManagerBadge();
      return;
    }

    if (pren.checkin_at) {
      const oraIT = new Date(pren.checkin_at).toLocaleTimeString("it-IT", 
        { hour: "2-digit", minute: "2-digit" });
      box.innerHTML = `<div style="text-align:center;color:#ffd766;">
        <p>⚠️ Già registrato</p>
        <p><b>${pren.nome}</b></p>
        <p>${pren.data} — ${pren.ora}</p>
        <p>Check-in: ${oraIT}</p></div>`;
      msgBox.innerHTML = "";
      mountExitButton();
      showManagerBadge();
      return;
    }

    // ===== MANAGER ANTEPRIMA =====
    msgBox.innerHTML = `<p style="color:#ffd766;">Conferma check-in</p>`;
    box.innerHTML = `
      <div style="text-align:center;color:#d4af37;padding:20px;">
        <p><b>${pren.nome}</b></p>
        <p>${pren.data} — ${pren.ora}</p>
        <p>${pren.pax || 0} pax · Tavolo ${pren.tavolo || "-"}</p>
        <button id="confirmBtn" style="margin-top:20px;padding:12px 30px;background:#ffd766;
          color:#111;border:none;border-radius:10px;cursor:pointer;font-weight:700;">
          ✔️ Conferma
        </button>
      </div>`;

    document.getElementById("confirmBtn").onclick = async () => {
      msgBox.innerHTML = `<p style="color:#d4af37;">⏳ Registrazione...</p>`;
      
      try {
        const res = await fetch(`/api/checkinConfirm?managerCode=8008&file=${encodeURIComponent(file)}`, 
          { method: "POST" });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);

        box.innerHTML = `<div style="text-align:center;color:#00e676;">
          <p>✔️ Registrato</p>
          <p><b>${data.nome}</b></p>
          <p>${pren.data} — ${pren.ora}</p>
          <p>${pren.pax || 0} pax · Tavolo ${data.tavolo || "-"}</p>
          <button onclick="location.reload()" 
            style="margin-top:20px;padding:10px 20px;background:#222;color:#ffd766;
            border:1px solid #444;border-radius:8px;cursor:pointer;">
            Nuovo check-in
          </button></div>`;
        msgBox.innerHTML = "";

        const tMsg = `💫 *${data.nome}* — Tav. ${data.tavolo || "-"} · ARRIVATO`;
        await notifyTelegram(tMsg);

      } catch (err) {
        msgBox.innerHTML = `<p style="color:red;">❌ Errore</p>`;
      }

      mountExitButton();
      showManagerBadge();
    };

    mountExitButton();
    showManagerBadge();

  } catch (err) {
    console.error("Errore:", err);
    msgBox.innerHTML = `<p style="color:red;">❌ Errore</p>`;
    mountExitButton();
    showManagerBadge();
  }
}

document.addEventListener("DOMContentLoaded", initCheckin);
