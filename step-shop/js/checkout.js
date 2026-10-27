// შეკვეთის გაფორმება: მიტანის ფორმა (dialog), ვალიდაცია, ასინქრონული გადახდის სიმულაცია
import { currentUser } from './auth.js';
import { decreaseStock, sleep } from './api.js';
import { addOrder, clearCart } from './cart.js';
import { h, toast, money } from './ui.js';

// ქართული მობილური: 5XX XXX XXX (+995-ით ან მის გარეშე)
export const PHONE_RE = /^(\+?995)?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{3}$/;
const CITIES = ['თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი', 'გორი', 'ზუგდიდი', 'სხვა'];

export async function placeOrder(user, rows, delivery) {
  await sleep(900); // გადახდის დამუშავების სიმულაცია
  await decreaseStock(rows.map((r) => ({ id: r.product.id, qty: r.qty })));
  const order = {
    id: Date.now(),
    date: new Date().toISOString(),
    total: rows.reduce((sum, r) => sum + r.product.price * r.qty, 0),
    delivery,
    items: rows.map((r) => ({ id: r.product.id, name: r.product.name, qty: r.qty, price: r.product.price, image: r.product.image })),
  };
  addOrder(user.id, order);
  return order;
}

export const orderNumber = (order) => `#${String(order.id).slice(-6)}`;

/**
 * rows: [{ product, qty }]
 * fromCart: შეკვეთის შემდეგ კალათა იწმინდება
 * onDone: ვიძახებთ, როცა წარმატებული შეკვეთის შემდეგ ფანჯარა დაიხურება
 */
export function openCheckout(rows, { fromCart = false, onDone } = {}) {
  const user = currentUser();
  if (!user) return;

  // ერთი პროდუქტის პირდაპირი ყიდვისას რაოდენობის არჩევა შეიძლება
  const single = rows.length === 1 && !fromCart;
  const dialog = h('dialog', { class: 'dialog checkout' });
  let finished = null;

  const totalEl = h('strong', { class: 'price' }, '');
  const qtyInput = single
    ? h('input', { type: 'number', min: '1', max: String(rows[0].product.stock), value: '1', id: 'co-qty' })
    : null;

  const recalc = () => {
    if (single) {
      const q = Math.min(Math.max(Number(qtyInput.value) || 1, 1), rows[0].product.stock);
      rows[0].qty = q;
    }
    totalEl.textContent = money(rows.reduce((s, r) => s + r.product.price * r.qty, 0));
  };
  qtyInput?.addEventListener('input', recalc);

  const form = h('form', { class: 'form', novalidate: '' },
    h('div', { class: 'co-items' }, rows.map((r) =>
      h('div', { class: 'co-item' },
        h('img', { src: r.product.image, alt: '', width: '56', height: '42' }),
        h('div', {}, h('strong', {}, r.product.name), h('div', { class: 'muted small' }, `${money(r.product.price)}${single ? '' : ` × ${r.qty}`}`))
      )
    )),
    single ? h('label', { class: 'field' }, 'რაოდენობა', qtyInput) : null,

    h('div', { class: 'grid-2' },
      h('label', { class: 'field' }, 'სახელი და გვარი',
        h('input', { name: 'name', type: 'text', value: user.name, autocomplete: 'name' }),
        h('small', { class: 'error', 'data-error': 'name' })),
      h('label', { class: 'field' }, 'ტელეფონი',
        h('input', { name: 'phone', type: 'tel', placeholder: '5XX XXX XXX', autocomplete: 'tel' }),
        h('small', { class: 'error', 'data-error': 'phone' }))
    ),
    h('div', { class: 'grid-2' },
      h('label', { class: 'field' }, 'ქალაქი',
        h('select', { name: 'city' }, CITIES.map((c) => h('option', {}, c)))),
      h('label', { class: 'field' }, 'მისამართი',
        h('input', { name: 'address', type: 'text', placeholder: 'ქუჩა, სახლი, ბინა', autocomplete: 'street-address' }),
        h('small', { class: 'error', 'data-error': 'address' }))
    ),

    h('fieldset', { class: 'pay' },
      h('legend', {}, 'გადახდის მეთოდი'),
      h('label', { class: 'pay-opt' }, h('input', { type: 'radio', name: 'payment', value: 'cash', checked: '' }), 'ნაღდი ფული მიტანისას'),
      h('label', { class: 'pay-opt' }, h('input', { type: 'radio', name: 'payment', value: 'card' }), 'ბარათით (სატესტო, თანხა არ ჩამოიჭრება)')
    ),

    h('div', { class: 'info-row total' }, h('dt', {}, 'ჯამი'), h('dd', {}, totalEl)),
    h('p', { class: 'form-error', role: 'alert' }),
    h('div', { class: 'row gap' },
      h('button', { type: 'submit', class: 'btn', id: 'co-submit' }, 'შეკვეთის დადასტურება'),
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => dialog.close() }, 'გაუქმება')
    )
  );

  const setErr = (field, msg) => {
    const el = form.querySelector(`[data-error="${field}"]`);
    if (el) el.textContent = msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    form.querySelectorAll('[data-error]').forEach((el) => (el.textContent = ''));
    form.querySelector('.form-error').textContent = '';

    let ok = true;
    if (f.name.value.trim().length < 3) { setErr('name', 'მიუთითეთ სახელი და გვარი'); ok = false; }
    if (!PHONE_RE.test(f.phone.value.trim())) { setErr('phone', 'ფორმატი: 5XX XXX XXX'); ok = false; }
    if (f.address.value.trim().length < 5) { setErr('address', 'მიუთითეთ სრული მისამართი'); ok = false; }
    if (!ok) return;

    const btn = form.querySelector('#co-submit');
    btn.disabled = true;
    btn.textContent = '⏳ მუშავდება...';
    try {
      const order = await placeOrder(user, rows, {
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        city: f.city.value,
        address: f.address.value.trim(),
        payment: f.payment.value,
      });
      if (fromCart) clearCart(user.id);
      finished = order;
      toast('შეკვეთა გაფორმდა', 'success');
      dialog.replaceChildren(
        h('div', { class: 'dialog-body success-view' },
          h('h2', {}, '✅ შეკვეთა მიღებულია'),
          h('p', {}, `შეკვეთის ნომერი: ${orderNumber(order)}`),
          h('p', {}, `ჯამი: ${money(order.total)}`),
          h('p', { class: 'muted' }, `მიტანა: ${order.delivery.city}, ${order.delivery.address}`),
          h('div', { class: 'row gap wrap' },
            h('a', { class: 'btn', href: 'orders.html' }, 'ჩემი შეკვეთები'),
            h('button', { class: 'btn btn-outline', onclick: () => dialog.close() }, 'დახურვა')
          )
        )
      );
    } catch (err) {
      form.querySelector('.form-error').textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'შეკვეთის დადასტურება';
    }
  });

  dialog.append(
    h('button', { class: 'dialog-close', 'aria-label': 'დახურვა', onclick: () => dialog.close() }, '✕'),
    h('div', { class: 'dialog-body' }, h('h2', {}, 'შეკვეთის გაფორმება'), form)
  );
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (finished) onDone?.(finished);
  });

  recalc();
  document.body.append(dialog);
  dialog.showModal();
}
