/* ==========================================================================
   MACCALISTER FAMILY — DASHBOARD.JS
   ========================================================================== */

Session.requireAuthOrRedirect();

const IDLE_LIMIT_MS = 30 * 60 * 1000;   // 30 хвилин без активності — автовихід
const HEARTBEAT_MS = 30 * 1000;         // heartbeat кожні ~30 секунд

let lastUserActivity = Date.now();
let heartbeatTimer = null;
let idleCheckTimer = null;

function markActivity() {
  lastUserActivity = Date.now();
}
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) =>
  window.addEventListener(evt, markActivity, { passive: true })
);

async function init() {
  const user = Session.user();
  if (!user) { window.location.href = "index.html"; return; }

  document.getElementById("userLoginLabel").textContent = user.login;
  document.getElementById("userRoleLabel").textContent = user.role;
  document.getElementById("userNameHero").textContent = user.login;
  document.getElementById("infoLogin").textContent = user.login;
  document.getElementById("infoRole").textContent = user.role;
  document.getElementById("infoLoginTime").textContent = user.loginTime || "—";
  document.getElementById("infoIp").textContent = user.ip || "—";
  document.getElementById("infoBrowser").textContent = user.browser || "—";
  document.getElementById("infoDevice").textContent = user.device || "—";
  document.getElementById("infoToken").textContent = maskToken(Session.token());

  if (user.role === "admin") {
    document.getElementById("adminLink").style.display = "inline";
  }

  await sendHeartbeat(); // одразу перше оновлення
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
  idleCheckTimer = setInterval(checkIdle, 5000);
}

function maskToken(t) {
  if (!t) return "—";
  return t.slice(0, 8) + "…" + t.slice(-6);
}

async function sendHeartbeat() {
  try {
    const res = await callApi("heartbeat", { token: Session.token() });
    if (res.lastActivity) {
      document.getElementById("infoLastActivity").textContent = res.lastActivity;
    }
  } catch (err) {
    // Токен більше не дійсний — швидше за все, сесію вбив адмін
    if (String(err.message).includes("SESSION_KILLED")) {
      showKickModal();
    } else if (String(err.message).includes("SESSION_EXPIRED")) {
      showIdleModal();
    }
  }
}

function checkIdle() {
  if (Date.now() - lastUserActivity > IDLE_LIMIT_MS) {
    clearInterval(heartbeatTimer);
    clearInterval(idleCheckTimer);
    callApi("logout", { token: Session.token() }).catch(() => {});
    showIdleModal();
  }
}

function showKickModal() {
  clearInterval(heartbeatTimer);
  clearInterval(idleCheckTimer);
  Session.clear();
  document.getElementById("kickModal").classList.add("open");
}
document.getElementById("kickOkBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

function showIdleModal() {
  Session.clear();
  document.getElementById("idleModal").classList.add("open");
}
document.getElementById("idleOkBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  clearInterval(heartbeatTimer);
  clearInterval(idleCheckTimer);
  try {
    await callApi("logout", { token: Session.token() });
  } catch (e) { /* ігноруємо — все одно виходимо локально */ }
  Session.clear();
  window.location.href = "index.html";
});

init();
