import { renderLayout, toast, h } from './ui.js';
import { resetProducts } from './api.js';

renderLayout('about.html');

// ---------- BOM: ინფორმაცია ბრაუზერზე ----------
const info = document.getElementById('bom-info');

function renderInfo() {
  const rows = [
    ['ენა (navigator.language)', navigator.language],
    ['ონლაინ (navigator.onLine)', navigator.onLine ? 'დიახ ✅' : 'არა ❌'],
    ['ფანჯრის ზომა (window.innerWidth)', `${innerWidth} × ${innerHeight} px`],
    ['ეკრანი (screen)', `${screen.width} × ${screen.height} px`],
    ['მისამართი (location.href)', location.href],
    ['ისტორია (history.length)', String(history.length)],
    ['ბრაუზერის პლატფორმა', navigator.userAgentData?.platform || navigator.platform || '—'],
  ];
  info.replaceChildren(
    ...rows.map(([k, v]) => h('div', { class: 'info-row' }, h('dt', {}, k), h('dd', {}, v)))
  );
}
renderInfo();
['resize', 'online', 'offline'].forEach((evt) => addEventListener(evt, renderInfo));
addEventListener('online', () => toast('ინტერნეტი აღდგა', 'success'));
addEventListener('offline', () => toast('ინტერნეტი გაითიშა', 'error'));

document.getElementById('btn-back').addEventListener('click', () => history.back());

// გეოლოკაცია (async + Promise)
document.getElementById('btn-geo').addEventListener('click', async (e) => {
  const out = document.getElementById('geo-out');
  if (!('geolocation' in navigator)) {
    out.textContent = 'თქვენი ბრაუზერი გეოლოკაციას არ უჭერს მხარს';
    return;
  }
  e.currentTarget.disabled = true;
  out.textContent = 'მიმდინარეობს ძებნა...';
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
    );
    out.textContent = `განედი: ${pos.coords.latitude.toFixed(4)}, გრძედი: ${pos.coords.longitude.toFixed(4)}`;
  } catch {
    out.textContent = 'ადგილმდებარეობის მიღება ვერ მოხერხდა';
  } finally {
    e.currentTarget.disabled = false;
  }
});

// მონაცემების საწყისზე დაბრუნება
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('ყველა დამატებული/შეცვლილი პროდუქტი წაიშლება. გავაგრძელოთ?')) {
    resetProducts();
    toast('მონაცემები დაბრუნდა საწყის მდგომარეობაში', 'success');
  }
});

// ---------- კონტაქტის ფორმა: fetch POST ----------
const form = document.getElementById('contact-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type=submit]');
  const result = document.getElementById('contact-result');
  const payload = { name: form.name.value.trim(), email: form.email.value.trim(), message: form.message.value.trim() };

  if (payload.message.length < 10) {
    result.textContent = 'შეტყობინება მინიმუმ 10 სიმბოლო უნდა იყოს';
    return;
  }

  btn.disabled = true;
  result.textContent = 'იგზავნება...';
  try {
    // სატესტო API (რეალურად არსად ინახება)
    const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`სერვერის შეცდომა (${res.status})`);
    const data = await res.json();
    result.textContent = `✅ შეტყობინება გაიგზავნა (ტესტური ID: ${data.id})`;
    form.reset();
  } catch (err) {
    result.textContent = `❌ ვერ გაიგზავნა: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});
