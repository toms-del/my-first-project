import { loadProducts } from './api.js';
import { requireAuth } from './auth.js';
import { getCart, setQty, removeItem, clearCart } from './cart.js';
import { openCheckout, orderNumber } from './checkout.js';
import { renderLayout, h, toast, money } from './ui.js';

const user = requireAuth('cart'); // უავტორიზაციოს login-ზე გადავამისამართებთ
const root = document.getElementById('cart-root');

async function render() {
  const items = getCart(user.id);
  if (items.length === 0) return showEmpty();

  const products = await loadProducts();

  // წაშლილ პროდუქტებს კალათიდან ვაცილებთ
  const rows = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product) removeItem(user.id, item.id);
    else rows.push({ product, qty: Math.min(item.qty, Math.max(product.stock, 1)) });
  }
  if (rows.length === 0) return showEmpty();

  const total = rows.reduce((sum, r) => sum + r.product.price * r.qty, 0);
  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);

  root.replaceChildren(
    h('div', { class: 'cart-layout' },
      h('div', { class: 'cart-list' }, rows.map(rowEl)),
      h('aside', { class: 'panel cart-summary' },
        h('h2', {}, 'შეკვეთა'),
        h('div', { class: 'info-row' }, h('dt', {}, 'პროდუქტი'), h('dd', {}, `${totalQty} ცალი`)),
        h('div', { class: 'info-row total' }, h('dt', {}, 'ჯამი'), h('dd', {}, money(total))),
        h('button', { class: 'btn', id: 'checkout', onclick: () => checkout(rows) }, 'შეკვეთის გაფორმება'),
        h('button', {
          class: 'btn btn-outline',
          onclick: () => {
            if (confirm('გავასუფთავოთ კალათა?')) { clearCart(user.id); render(); }
          },
        }, 'კალათის გასუფთავება'),
        h('p', { class: 'muted small' }, 'გადახდა სატესტოა, რეალური თანხა არ ჩამოიჭრება.')
      )
    )
  );
}

function rowEl({ product, qty }) {
  const change = (next) => {
    if (next > product.stock) return toast('მარაგში მეტი აღარ არის', 'error');
    setQty(user.id, product.id, next);
    render();
  };
  return h('article', { class: 'cart-item' },
    h('img', { src: product.image, alt: product.name, width: '96', height: '72' }),
    h('div', { class: 'cart-info' },
      h('h3', {}, product.name),
      h('p', { class: 'muted small' }, `${product.brand} · ${money(product.price)}`),
      product.stock <= 0 ? h('p', { class: 'stock out small' }, 'ამოიწურა') : null
    ),
    h('div', { class: 'qty' },
      h('button', { 'aria-label': 'შემცირება', onclick: () => change(qty - 1) }, '−'),
      h('span', {}, String(qty)),
      h('button', { 'aria-label': 'გაზრდა', onclick: () => change(qty + 1) }, '+')
    ),
    h('strong', { class: 'line-total' }, money(product.price * qty)),
    h('button', {
      class: 'icon-btn',
      'aria-label': 'წაშლა',
      onclick: () => { removeItem(user.id, product.id); render(); },
    }, '🗑️')
  );
}

function showEmpty() {
  root.replaceChildren(
    h('div', { class: 'empty' },
      h('p', {}, '🛒 კალათა ცარიელია'),
      h('a', { class: 'btn', href: 'products.html' }, 'პროდუქტების ნახვა')
    )
  );
}

// შეკვეთის გაფორმება: იხსნება მიტანის ფორმა (js/checkout.js)
function checkout(rows) {
  openCheckout(rows, {
    fromCart: true,
    onDone: (order) => {
      root.replaceChildren(
        h('div', { class: 'empty success' },
          h('h2', {}, '✅ შეკვეთა მიღებულია'),
          h('p', {}, `შეკვეთის ნომერი: ${orderNumber(order)}`),
          h('p', {}, `ჯამი: ${money(order.total)}`),
          h('div', { class: 'row gap wrap', style: 'justify-content:center' },
            h('a', { class: 'btn', href: 'orders.html' }, 'ჩემი შეკვეთები'),
            h('a', { class: 'btn btn-outline', href: 'products.html' }, 'შოპინგის გაგრძელება')
          )
        )
      );
    },
  });
}

if (user) {
  renderLayout('cart.html');
  render();
}
