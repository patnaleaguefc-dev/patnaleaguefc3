/* ====== CONFIG ====== */
const API_BASE = "https://patnaleaguefc-backend.onrender.com"; // <-- your backend URL
const CASHFREE_APP_ID = "YOUR_CASHFREE_APP_ID"; // <-- from Cashfree Dashboard (sandbox/live)

/* ====== UTIL ====== */
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function getParam(name){ return new URLSearchParams(location.search).get(name); }
function setLocal(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function getLocal(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch{ return null; } }

/* ====== REGISTER PAGE BEHAVIOR ====== */
function initRegister(){
  const regSection = qs("#reg-section");
  const already = qs("#already-registered");
  const nameOut = qs("#reg-team-name");

  const saved = getLocal("plfc_registration");
  if(saved?.teamName){
    nameOut.textContent = saved.teamName;
    already.classList.remove("hidden");
    regSection.classList.add("hidden");
    return;
  }

  const payBtn = qs("#pay-button");
  const form = qs("#reg-form");

  payBtn?.addEventListener("click", async () => {
    // simple validation
    const fd = new FormData(form);
    const team = {
      teamName: (fd.get("teamName")||"").trim(),
      captainName: (fd.get("captainName")||"").trim(),
      phone: (fd.get("phone")||"").trim(),
      email: (fd.get("email")||"").trim(),
      playersCount: Number(fd.get("playersCount")||0)
    };
    if(!team.teamName || !team.captainName || !/^\d{10}$/.test(team.phone) || !team.email || team.playersCount<7 || team.playersCount>11){
      alert("Please fill all fields correctly (phone = 10 digits, players 7–11).");
      return;
    }

    // create order on backend (Cashfree)
    let orderRes;
    try{
      const res = await fetch(`${API_BASE}/api/order`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ amount: 2899, team }) // Cashfree takes INR in rupees, not paise
      });
      orderRes = await res.json();
      if(!res.ok) throw new Error(orderRes?.message || "Order creation failed");
    }catch(e){
      alert("Could not create payment order. Please try again.");
      console.error(e);
      return;
    }

    // invoke Cashfree checkout
    const cashfree = new Cashfree({ mode: "sandbox" }); // use "production" when live
    cashfree.checkout({
      paymentSessionId: orderRes.paymentSessionId, // comes from backend
      redirectTarget: "_self" // open in same window
    });
  });
}

/* ====== THANKS PAGE ====== */
function initThanks(){
  const el = qs("#thanks-team");
  const team = getParam("team") || getLocal("plfc_registration")?.teamName || "Your Team";
  el && (el.textContent = team);
}

/* ====== TEAMS PAGE ====== */
async function initTeams(){
  const grid = qs("#team-grid");
  try{
    const res = await fetch(`${API_BASE}/api/teams`);
    const { teams=[] } = await res.json();
    if(!teams.length){ grid.innerHTML = `<p class="muted">No teams yet — be the first to register!</p>`; return; }
    grid.innerHTML = teams.map(t => `
      <div class="team-card lift">
        <div class="team-title">⚽ ${escapeHtml(t.teamName)}</div>
        <div class="team-meta">Captain: ${escapeHtml(t.captainName || "-")} • Code: ${escapeHtml(t.code || "—")}</div>
      </div>
    `).join("");
  }catch(e){
    console.error(e);
    grid.innerHTML = `<p class="muted">Couldn’t load teams. Try again later.</p>`;
  }
}
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ====== ON LOAD ====== */
document.addEventListener("DOMContentLoaded", () => {
  if(location.pathname.endsWith("register.html")) initRegister();
  if(location.pathname.endsWith("thanks.html")) initThanks();
  if(location.pathname.endsWith("teams.html")) initTeams();
});
