import { currentUser, logout } from './auth.js';
import { cartCount } from './cart.js';

// DOM ელემენტის შექმნის დამხმარე ფუნქცია
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child != null) el.append(child);
  }
  return el;
}

export const money = (n) => `${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₾`;

// სათაური (header) და ფუტერი ყველა გვერდისთვის
export function renderLayout(active) {
  applyTheme(localStorage.getItem('step_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  const user = currentUser();
  const links = [
    ['index.html', 'მთავარი'],
    ['products.html', 'პროდუქტები'],
    ['sell.html', 'გაყიდვა'],
    ['about.html', 'ჩვენ შესახებ'],
  ];
  if (user) links.splice(3, 0, ['orders.html', 'შეკვეთები']);

  const nav = h(
    'nav',
    { class: 'nav', id: 'nav', 'aria-label': 'მთავარი მენიუ' },
    links.map(([href, text]) => h('a', { href, class: href === active ? 'active' : '' }, text))
  );

  // კალათა + რაოდენობის ნიშნაკი
  const badge = h('span', { class: 'cart-badge', id: 'cart-badge', hidden: '' }, '0');
  const cartLink = h('a', { href: 'cart.html', class: 'icon-btn cart-link', 'aria-label': 'კალათა' }, '🛒', badge);
  const updateBadge = () => {
    const u = currentUser();
    const count = u ? cartCount(u.id) : 0;
    badge.textContent = count;
    badge.hidden = count === 0;
  };
  updateBadge();
  addEventListener('cart:change', updateBadge);
  addEventListener('storage', updateBadge);

  const userArea = user
    ? h(
        'div',
        { class: 'user-area' },
        h('span', { class: 'user-name' }, `👤 ${user.name}`),
        h('button', {
          class: 'btn btn-small btn-outline',
          onclick: () => {
            logout();
            toast('გამოხვედით სისტემიდან');
            setTimeout(() => (location.href = 'index.html'), 600);
          },
        }, 'გასვლა')
      )
    : h('div', { class: 'user-area' },
        h('a', { class: 'btn btn-small btn-outline', href: 'login.html' }, 'შესვლა'),
        h('a', { class: 'btn btn-small', href: 'register.html' }, 'რეგისტრაცია')
      );

  const themeBtn = h('button', {
    class: 'icon-btn',
    'aria-label': 'თემის შეცვლა',
    onclick: () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('step_theme', next);
    },
  }, '🌓');

  const burger = h('button', {
    class: 'burger',
    'aria-label': 'მენიუს გახსნა',
    'aria-expanded': 'false',
    onclick: (e) => {
      const open = nav.classList.toggle('open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    },
  }, '☰');

  document.getElementById('app-header').replaceChildren(
    h('div', { class: 'container header-inner' },
      h('a', { href: 'index.html', class: 'brand', 'aria-label': 'Step - მთავარი' },
        h('img', { src: 'img/logo.svg', alt: '', width: '30', height: '30' }),
        h('span', {}, 'Step')
      ),
      nav,
      h('div', { class: 'header-actions' }, themeBtn, cartLink, userArea, burger)
    )
  );

  document.getElementById('app-footer').replaceChildren(
    h('div', { class: 'container footer-inner' },
      h('p', {}, `© ${new Date().getFullYear()} Step`)
    )
  );
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// შეტყობინება ეკრანის კუთხეში
export function toast(message, type = 'info') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const item = h('div', { class: `toast ${type}` }, message);
  box.append(item);
  setTimeout(() => item.classList.add('hide'), 2800);
  setTimeout(() => item.remove(), 3300);
}

// YouTube / Vimeo ბმულიდან embed მისამართის მიღება
export function toEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    /* არასწორი URL */
  }
  return null;
}

// ბარათების გამოჩენა სქროლისას (IntersectionObserver)
export function reveal(elements) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08 });
  for (const el of elements) {
    el.classList.add('reveal');
    io.observe(el);
  }
}

// გაზიარება: Web Share API, ხოლო თუ არ არსებობს, ბმულის კოპირება
export async function shareLink(title, url) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast('ბმული დაკოპირდა', 'success');
    }
  } catch (err) {
    if (err.name !== 'AbortError') toast('გაზიარება ვერ მოხერხდა', 'error');
  }
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
