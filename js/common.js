/* ==========================================================================
   MACCALISTER FAMILY — COMMON UTILITIES
   Підключається на кожній сторінці ДО інших скриптів.
   ========================================================================== */

/* -------------------------------------------------------------------------
   1. НАЛАШТУВАННЯ. Встав сюди URL свого розгорнутого Apps Script Web App.
   Береться після деплою (Deploy -> New deployment -> Web app) —
   виглядає як https://script.google.com/macros/s/XXXXXXX/exec
   ------------------------------------------------------------------------- */
const API_URL = "https://script.google.com/macros/s/AKfycbwE5mH9QvkeMUx_zWknK4-pasTx9Qf9bo8VFLO6oOrAPgWKTd371KxGFW5ENW73Vj_luw/exec";

/* -------------------------------------------------------------------------
   2. SVG-герб родини (спрощена версія логотипу: щит + M + корона + лаври)
   Вставляється у будь-який елемент з data-crest.
   ------------------------------------------------------------------------- */
const CREST_SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e6197e"/>
      <stop offset="100%" stop-color="#5a1a63"/>
    </linearGradient>
  </defs>
  <path d="M60 40 L140 40 L140 110 Q140 150 100 170 Q60 150 60 110 Z"
        fill="url(#shieldGrad)" stroke="#ff5fb0" stroke-width="3"/>
  <path d="M100 10 L106 24 L120 16 L114 32 L128 30 L116 40 L100 34 L84 40 L72 30 L86 32 L80 16 L94 24 Z"
        fill="#e6197e"/>
  <text x="100" y="105" text-anchor="middle" font-family="Georgia, serif" font-weight="700"
        font-size="52" fill="#f3e9ee" stroke="#ff5fb0" stroke-width="1">M</text>
</svg>`;

function paintCrests() {
  document.querySelectorAll("[data-crest]").forEach((el) => {
    el.innerHTML = CREST_SVG;
  });
}
document.addEventListener("DOMContentLoaded", paintCrests);

/* -------------------------------------------------------------------------
   3. Обгортка для звернень до Apps Script.
   ВАЖЛИВО: Content-Type навмисно "text/plain", щоб браузер НЕ робив
   CORS preflight (OPTIONS) — Apps Script Web App його не обробляє.
   Тіло — звичайний JSON-рядок, Apps Script сам розпарсить його як JSON.
   ------------------------------------------------------------------------- */
async function callApi(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) {
    throw new Error("Мережева помилка: " + res.status);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

/* -------------------------------------------------------------------------
   4. Локальне сховище сесії (Session Token + метадані користувача)
   ------------------------------------------------------------------------- */
const Session = {
  save(token, user) {
    localStorage.setItem("mf_token", token);
    localStorage.setItem("mf_user", JSON.stringify(user));
  },
  token() {
    return localStorage.getItem("mf_token");
  },
  user() {
    try {
      return JSON.parse(localStorage.getItem("mf_user"));
    } catch (e) {
      return null;
    }
  },
  clear() {
    localStorage.removeItem("mf_token");
    localStorage.removeItem("mf_user");
  },
  requireAuthOrRedirect() {
    if (!Session.token()) {
      window.location.href = "index.html";
    }
  },
};

/* -------------------------------------------------------------------------
   4b. Публічна IP-адреса.
   ВАЖЛИВО: Google Apps Script Web App НЕ передає IP клієнта на бекенд —
   такого поля немає в об'єкті події doPost. Тому IP визначаємо на
   фронтенді через безкоштовний сервіс ipify і просто передаємо рядком
   разом із запитом (як і будь-яке інше поле форми).
   ------------------------------------------------------------------------- */
async function getPublicIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "невідомо";
  } catch (e) {
    return "невідомо";
  }
}

/* -------------------------------------------------------------------------
   5. Дані для заголовку "Браузер / Пристрій", які надсилаємо на бекенд —
   для повідомлення в Telegram та таблиці Sessions.
   ------------------------------------------------------------------------- */
function detectClientInfo() {
  const ua = navigator.userAgent;
  let browser = "Невідомо";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("OPR")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("OPR")) browser = "Opera";

  let device = "Десктоп";
  if (/Android/i.test(ua)) device = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS";
  else if (/Mobi/i.test(ua)) device = "Мобільний";

  return { browser, device };
}
