/* ==========================================================================
   MACCALISTER FAMILY — ADMIN.JS
   ========================================================================== */

Session.requireAuthOrRedirect();

const user = Session.user();
if (!user || user.role !== "admin") {
  window.location.href = "dashboard.html";
}

async function loadSessions() {
  try {
    const res = await callApi("getActiveUsers", { token: Session.token() });
    renderSessions(res.sessions || []);
  } catch (err) {
    handleAuthError(err);
  }
}

async function loadLogs() {
  try {
    const res = await callApi("getLogs", { token: Session.token(), limit: 40 });
    renderLogs(res.logs || []);
  } catch (err) {
    handleAuthError(err);
  }
}

function handleAuthError(err) {
  if (String(err.message).includes("SESSION")) {
    Session.clear();
    window.location.href = "index.html";
  } else {
    console.error(err);
  }
}

function renderSessions(sessions) {
  const body = document.getElementById("sessionsBody");
  if (!sessions.length) {
    body.innerHTML = `<tr><td colspan="9" style="color: var(--ink-faint);">Немає активних сесій.</td></tr>`;
    return;
  }
  body.innerHTML = sessions
    .map((s) => {
      const online = s.online;
      return `
      <tr>
        <td>${escapeHtml(s.login)}</td>
        <td><span class="tag-role">${escapeHtml(s.role)}</span></td>
        <td>${escapeHtml(s.ip)}</td>
        <td>${escapeHtml(s.browser)}</td>
        <td>${escapeHtml(s.device)}</td>
        <td>${escapeHtml(s.createdAt)}</td>
        <td>${escapeHtml(s.lastActivity)}</td>
        <td>
          <span class="status-pill ${online ? "status-online" : "status-offline"}">
            <span class="status-dot"></span>${online ? "Online" : "Offline"}
          </span>
        </td>
        <td><button class="btn-danger" data-session-id="${s.sessionId}">Вигнати</button></td>
      </tr>`;
    })
    .join("");

  body.querySelectorAll("button[data-session-id]").forEach((btn) => {
    btn.addEventListener("click", () => kickSession(btn.dataset.sessionId, btn));
  });
}

async function kickSession(sessionId, btn) {
  if (!confirm("Завершити цю сесію?")) return;
  btn.disabled = true;
  btn.textContent = "...";
  try {
    await callApi("killSession", { token: Session.token(), sessionId });
    await loadSessions();
    await loadLogs();
  } catch (err) {
    alert("Помилка: " + err.message);
    btn.disabled = false;
    btn.textContent = "Вигнати";
  }
}

function renderLogs(logs) {
  const body = document.getElementById("logsBody");
  if (!logs.length) {
    body.innerHTML = `<tr><td colspan="6" style="color: var(--ink-faint);">Подій ще немає.</td></tr>`;
    return;
  }
  body.innerHTML = logs
    .map(
      (l) => `
      <tr>
        <td>${escapeHtml(l.date)}</td>
        <td>${escapeHtml(l.time)}</td>
        <td>${escapeHtml(l.login)}</td>
        <td>${escapeHtml(l.description)}</td>
        <td>${escapeHtml(l.ip)}</td>
        <td>${escapeHtml(l.browser)}</td>
      </tr>`
    )
    .join("");
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await callApi("logout", { token: Session.token() }); } catch (e) {}
  Session.clear();
  window.location.href = "index.html";
});

loadSessions();
loadLogs();
setInterval(loadSessions, 5000);
setInterval(loadLogs, 8000);
