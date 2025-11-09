/* =========================================================
💎 SOLSTITIUM QR CHECK-IN MANAGER — v3.2
• Bottone "Scansiona QR" nella home
• Scanner QR integrato con ZXing
• Anteprima prima di confermare
• Registra via API Vercel
• Manager mode permanente
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

// ===== Scanner QR Modal =====
function openQRScanner() {
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    position: "fixed", top: "0", left: "0",
    width: "100%", height: "100%",
    background: "rgba(0,0,0,0.95)", zIndex: 10000,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column"
  });

  modal.innerHTML = `
    <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <button style="position:absolute;top:20px;right:20px;background:#d4af37;color:#111;border:none;
        border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:700;z-index:10001;">✕ Chiudi</button>
      <div id="scanner-container" style="width:320px;height:320px;border:3px solid #d4af37;
        border-radius:16px;overflow:hidden;background:#000;margin:0 auto;">
        <video id="qr-video" style="width:100%;height:100%;object-fit:cover;"></video>
      </div>
      <p style="color:#d4af37;margin-top:20px;font-size:0.95rem;text-align:center;">Posiziona il QR nel frame</p>
    </div>`;

  document.body.appendChild(modal);

  // Close button
  const closeBtn = modal.querySelector("button");
  closeBtn.onclick = () => modal.remove();

  // Carica ZXing
  const script = document.createElement("script");
  script.src = "https://unpkg.com/@zxing/library@latest/umd/index.min.js";
  script.onload = () => {
    const video = document.getElementById("qr-video");
    const codeReader = new ZXing.BrowserMultiFormatReader();
    
    codeReader.decodeFromVideoDevice(undefined, video, (result, err) => {
      if (result) {
        const qrText = result.getText();
        console.log("QR scanned:", qrText);
        
        // Estrai il nome file dal QR
        const fileFromQR = qrText.split("file=")[1]?.split("&")[0];
        if (fileFromQR) {
          modal.remove();
          window.location.href = `?file=${fileFromQR}&mgr=8008`;
        }
      }
    });
  };
  document.head.appendChild(script);
}

// ===== MAIN LOGIC =====
async function initCheckin() {
  if (!file && isManager()) {
    // ===== HOME SCREEN CON BOTTONE SCANNER =====
    msgBox.innerHTML = `<p style="color:#d4af37;font-size:1.1rem;font-weight:600;">📱 Check-in Manager</p>`;
    box.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <button id="scanBtn" style="padding:16px 40px;background:#d4af37;color:#111;
          border:none;border-radius:14px;cursor:pointer;font-weight:700;font-size:1.1rem;
          box-shadow:0 0 20px rgba(212,175,55,0.4);transition:all 0.3s;">
          📱 SCANSIONA QR
        </button>
        <p style="color:#999;margin-top:20px;font-size:0.9rem;">Clicca per scansionare un nuovo check-in</p>
      </div>`;
    
    document.getElementById("scanBtn").onclick = openQRScanner;
    
    // Effetto hover
    document.getElementById("scanBtn").onmouseover = function() {
      this.style.background = "#ffd766";
      this.style.boxShadow = "0 0 30px rgba(212,175,55,0.6)";
    };
    document.getElementById("scanBtn").onmouseout = function() {
      this.style.background = "#d4af37";
      this.style.boxShadow = "0 0 20px rgba(212,175,55,0.4)";
    };

    mountExitButton();
    showManagerBadge();
    return;
  }

  if (!file) {
    msgBox.innerHTML = `<p class="warn">⚠️ QR non valido</p>`;
    return;
  }

  const qrUrl = `${SUPABASE_URL}/storage/v1/object/public/qrcodes/${file}.png`;

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
    const qrUrlExact = `${SUPABASE_URL}/storage/v1/object/public/qrcodes/${file}.png`;
    const { data: pren, error } = await supabase
      .from("prenotazioni")
      .select("*")
      .eq("qr_url", qrUrlExact)
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
        <img src="${qrUrl}" alt="QR" style="width:150px;height:150px;border-radius:8px;margin:15px 0;">
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
          <button onclick="location.href='?mgr=8008'" 
            style="margin-top:20px;padding:10px 20px;background:#222;color:#ffd766;
            border:1px solid #444;border-radius:8px;cursor:pointer;">
            📱 Nuovo check-in
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
