import { requireAuth } from './auth.js';
import { getOrders } from './cart.js';
import { orderNumber } from './checkout.js';
import { renderLayout, h, money } from './ui.js';

const user = requireAuth();

// თარიღის ფორმატირება ქართულ ლოკალში (Intl)
const fmt = new Intl.DateTimeFormat('ka-GE', { dateStyle: 'medium', timeStyle: 'short' });
const payLabel = { cash: 'ნაღდი ფული მიტანისას', card: 'ბარათით (სატესტო)' };

function orderCard(order) {
  const qty = order.items.reduce((s, i) => s + i.qty, 0);
  return h('article', { class: 'panel order' },
    h('div', { class: 'order-head' },
      h('div', {},
        h('h3', {}, `შეკვეთა ${orderNumber(order)}`),
        h('p', { class: 'muted small' }, fmt.format(new Date(order.date)))
      ),
      h('strong', { class: 'price' }, money(order.total))
    ),
    h('div', { class: 'order-items' }, order.items.map((i) =>
      h('div', { class: 'co-item' },
        h('img', { src: i.image || 'img/placeholder.webp', alt: '', width: '56', height: '42' }),
        h('div', {}, h('strong', {}, i.name), h('div', { class: 'muted small' }, `${money(i.price)} × ${i.qty}`))
      )
    )),
    order.delivery
      ? h('p', { class: 'muted small' }, `📍 ${order.delivery.city}, ${order.delivery.address} · 📞 ${order.delivery.phone} · ${payLabel[order.delivery.payment] ?? ''}`)
      : null,
    h('p', { class: 'muted small' }, `სულ ${qty} ცალი`)
  );
}

function render() {
  const root = document.getElementById('orders-root');
  const orders = getOrders(user.id).sort((a, b) => b.id - a.id);
  if (orders.length === 0) {
    root.replaceChildren(
      h('div', { class: 'empty' },
        h('p', {}, '📦 შეკვეთები ჯერ არ გაქვთ'),
        h('a', { class: 'btn', href: 'products.html' }, 'პროდუქტების ნახვა')
      )
    );
    return;
  }
  root.replaceChildren(...orders.map(orderCard));
}

if (user) {
  renderLayout('orders.html');
  render();
}
