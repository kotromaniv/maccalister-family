/* ==========================================================================
   MACCALISTER FAMILY — AUTH.JS (тільки для index.html)
   ========================================================================== */

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const waitingScreen = document.getElementById("waitingScreen");
const deniedScreen = document.getElementById("deniedScreen");

let pollTimer = null;
let currentRequestId = null;

// Якщо токен вже є і він валідний — одразу на дашборд
(async function checkExisting() {
  const token = Session.token();
  if (!token) return;
  try {
    const res = await callApi("validateToken", { token });
    if (res.valid) window.location.href = "dashboard.html";
    else Session.clear();
  } catch (e) {
    Session.clear();
  }
})();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  loginBtn.disabled = true;
  loginBtn.textContent = "Перевірка...";

  const login = document.getElementById("login").value.trim();
  const password = document.getElementById("password").value;
  const { browser, device } = detectClientInfo();
  const ip = await getPublicIp();

  try {
    // Пароль хешується і на клієнті (SHA-256), і додатково перевіряється
    // на сервері порівнянням з хешем у Users. Сирий пароль по мережі не йде.
    const passwordHash = await sha256Hex(password);

    const res = await callApi("login", {
      login,
      passwordHash,
      browser,
      device,
      ip,
    });

    // res: { requestId, botUsername }
    currentRequestId = res.requestId;
    document.getElementById("botHint").textContent = res.botUsername || "ваш_бот";
    loginForm.style.display = "none";
    waitingScreen.style.display = "block";
    startPolling();
  } catch (err) {
    loginError.textContent = err.message || "Невірний логін або пароль";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Увійти";
  }
});

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await callApi("checkStatus", { requestId: currentRequestId });
      // res.status: "Pending" | "Approved" | "Denied"
      if (res.status === "Approved") {
        clearInterval(pollTimer);
        Session.save(res.token, res.user);
        window.location.href = "dashboard.html";
      } else if (res.status === "Denied") {
        clearInterval(pollTimer);
        waitingScreen.style.display = "none";
        deniedScreen.style.display = "block";
      }
      // Pending -> просто чекаємо далі
    } catch (err) {
      // мережева похибка одного разу — не зупиняємо polling
      console.warn("polling error", err);
    }
  }, 1000); // приблизно раз на секунду, як у ТЗ
}

document.getElementById("cancelWaitBtn").addEventListener("click", () => {
  clearInterval(pollTimer);
  waitingScreen.style.display = "none";
  loginForm.style.display = "block";
  loginForm.reset();
});

document.getElementById("backToLoginBtn").addEventListener("click", () => {
  deniedScreen.style.display = "none";
  loginForm.style.display = "block";
  loginForm.reset();
});

/* SHA-256 у браузері через Web Crypto API */
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
