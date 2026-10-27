import { loadProducts } from './api.js';
import { currentUser } from './auth.js';
import { renderLayout, h, toEmbedUrl, debounce, money, reveal, shareLink } from './ui.js';
import { productCard, favButton } from './card.js';
import { handleAdd, handleBuy } from './actions.js';
import { getFavs } from './favorites.js';

renderLayout('products.html');

const els = {
  grid: document.getElementById('grid'),
  count: document.getElementById('count'),
  search: document.getElementById('f-search'),
  category: document.getElementById('f-category'),
  brand: document.getElementById('f-brand'),
  condition: document.getElementById('f-condition'),
  price: document.getElementById('f-price'),
  priceOut: document.getElementById('f-price-out'),
  stock: document.getElementById('f-stock'),
  fav: document.getElementById('f-fav'),
  sort: document.getElementById('f-sort'),
  reset: document.getElementById('f-reset'),
  dialog: document.getElementById('detail'),
};

let products = [];
let maxPrice = 0;

// ---------- ჩატვირთვა ----------
async function init() {
  // ?open=ID უნდა წავიკითხოთ render()-მდე, რადგან render URL-ს ანახლებს
  const openId = new URLSearchParams(location.search).get('open');

  showSkeleton();
  try {
    products = await loadProducts();
  } catch (err) {
    els.grid.replaceChildren(
      h('div', { class: 'error-box' },
        h('p', {}, `⚠️ ${err.message}`),
        h('button', { class: 'btn btn-small', onclick: init }, 'თავიდან ცდა')
      )
    );
    return;
  }
  fillSelect(els.category, 'category');
  fillSelect(els.brand, 'brand');

  // ფასის სლაიდერის მაქსიმუმი მონაცემებიდან
  maxPrice = Math.ceil(Math.max(...products.map((p) => p.price), 100) / 100) * 100;
  els.price.max = maxPrice;

  readUrlParams();
  render();

  if (openId) {
    const product = products.find((p) => p.id === Number(openId));
    if (product) openDetail(product);
  }
}

// ყიდვის შემდეგ მარაგის ახალი მონაცემებით გადახატვა
async function refresh() {
  products = await loadProducts();
  render();
}

function showSkeleton() {
  els.grid.replaceChildren(...Array.from({ length: 6 }, () => h('div', { class: 'card skeleton' })));
}

function fillSelect(select, field) {
  const values = [...new Set(products.map((p) => p[field]))].sort((a, b) => a.localeCompare(b, 'ka'));
  select.replaceChildren(
    h('option', { value: '' }, 'ყველა'),
    ...values.map((v) => h('option', { value: v }, v))
  );
}

// ფილტრის საწყისი მნიშვნელობები URL-იდან (BOM: location.search)
function readUrlParams() {
  const params = new URLSearchParams(location.search);
  els.search.value = params.get('q') ?? '';
  els.category.value = params.get('category') ?? '';
  els.brand.value = params.get('brand') ?? '';
  els.condition.value = params.get('condition') ?? '';
  els.price.value = params.get('max') ?? maxPrice;
  els.stock.checked = params.get('stock') === '1';
  els.fav.checked = params.get('fav') === '1';
  els.sort.value = params.get('sort') ?? 'newest';
}

// URL განახლება გვერდის გადატვირთვის გარეშე (BOM: history)
function syncUrl() {
  const params = new URLSearchParams();
  if (els.search.value.trim()) params.set('q', els.search.value.trim());
  if (els.category.value) params.set('category', els.category.value);
  if (els.brand.value) params.set('brand', els.brand.value);
  if (els.condition.value) params.set('condition', els.condition.value);
  if (Number(els.price.value) < maxPrice) params.set('max', els.price.value);
  if (els.stock.checked) params.set('stock', '1');
  if (els.fav.checked) params.set('fav', '1');
  if (els.sort.value !== 'newest') params.set('sort', els.sort.value);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

// ---------- ფილტრი + დალაგება ----------
function getFiltered() {
  const q = els.search.value.trim().toLowerCase();
  const max = Number(els.price.value);
  const favs = getFavs();

  const result = products.filter((p) =>
    (!q || `${p.name} ${p.brand} ${p.description}`.toLowerCase().includes(q)) &&
    (!els.category.value || p.category === els.category.value) &&
    (!els.brand.value || p.brand === els.brand.value) &&
    (!els.condition.value || p.condition === els.condition.value) &&
    p.price <= max &&
    (!els.stock.checked || p.stock > 0) &&
    (!els.fav.checked || favs.has(p.id))
  );

  const sorters = {
    'newest': (a, b) => b.id - a.id,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'name-asc': (a, b) => a.name.localeCompare(b.name),
  };
  return result.sort(sorters[els.sort.value]);
}

// ---------- რენდერი ----------
function render() {
  els.priceOut.textContent = money(els.price.value);
  const list = getFiltered();
  els.count.textContent = `ნაპოვნია: ${list.length}`;
  syncUrl();

  if (list.length === 0) {
    els.grid.replaceChildren(h('div', { class: 'empty' },
      els.fav.checked ? '♡ ფავორიტები ჯერ არ გაქვთ. დააჭირეთ გულს პროდუქტზე.' : '😕 ამ პარამეტრებით პროდუქტი ვერ მოიძებნა'));
    return;
  }
  const cards = list.map((p) => productCard(p, {
    onOpen: openDetail,
    onFavChange: () => els.fav.checked && render(), // ფავორიტების რეჟიმში ბარათი მაშინვე ქრება
    onBought: refresh,
  }));
  els.grid.replaceChildren(...cards);
  reveal(cards);
}

// ---------- დეტალების ფანჯარა ----------
function openDetail(product) {
  const user = currentUser();
  const embed = toEmbedUrl(product.video);
  const own = user && product.owner === user.id;
  const soldOut = product.stock <= 0;
  const blocked = soldOut || own;
  const url = new URL(`products.html?open=${product.id}`, location.href).href;

  els.dialog.replaceChildren(
    h('button', { class: 'dialog-close', 'aria-label': 'დახურვა', onclick: () => els.dialog.close() }, '✕'),
    h('img', { class: 'dialog-img', src: product.image, alt: product.name }),
    h('div', { class: 'dialog-body' },
      h('p', { class: 'muted small' }, `${product.brand} · ${product.category} · ${product.condition}`),
      h('h2', {}, product.name),
      h('p', { class: 'price big' }, money(product.price)),
      h('p', { class: `stock ${soldOut ? 'out' : ''}` }, soldOut ? 'ამოიწურა' : `მარაგში: ${product.stock} ცალი`),
      h('p', {}, product.description),
      embed
        ? h('div', { class: 'video' },
            h('iframe', {
              src: embed,
              title: `${product.name} - ვიდეო`,
              loading: 'lazy',
              allowfullscreen: '',
              allow: 'accelerometer; encrypted-media; picture-in-picture',
            }))
        : null,
      h('div', { class: 'row gap wrap' },
        h('button', {
          class: 'btn',
          disabled: blocked,
          onclick: () => {
            els.dialog.close();
            handleBuy(product, refresh);
          },
        }, soldOut ? 'ამოიწურა' : own ? 'თქვენი პროდუქტია' : '⚡ ყიდვა'),
        h('button', {
          class: 'btn btn-outline',
          disabled: blocked,
          onclick: () => handleAdd(product),
        }, '🛒 კალათაში'),
        favButton(product, { onChange: () => els.fav.checked && render() }),
        h('button', { class: 'btn btn-outline btn-small', onclick: () => shareLink(product.name, url) }, '🔗 გაზიარება'),
        own ? h('a', { class: 'btn btn-outline btn-small', href: `sell.html?id=${product.id}` }, '✏️ რედაქტირება') : null
      ),
      user ? null : h('p', { class: 'muted small' }, 'ყიდვისთვის საჭიროა ', h('a', { href: 'login.html' }, 'შესვლა'), ' ან ', h('a', { href: 'register.html' }, 'რეგისტრაცია'))
    )
  );
  els.dialog.showModal();
}

els.dialog.addEventListener('click', (e) => {
  if (e.target === els.dialog) els.dialog.close(); // ფონზე დაკლიკებით დახურვა
});

// ---------- ივენთები ----------
els.search.addEventListener('input', debounce(render, 250));
els.price.addEventListener('input', render);
[els.category, els.brand, els.condition, els.stock, els.fav, els.sort].forEach((el) => el.addEventListener('change', render));
els.reset.addEventListener('click', () => {
  els.search.value = '';
  els.category.value = '';
  els.brand.value = '';
  els.condition.value = '';
  els.price.value = maxPrice;
  els.stock.checked = false;
  els.fav.checked = false;
  els.sort.value = 'newest';
  render();
});

init();
