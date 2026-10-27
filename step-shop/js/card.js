import { h, money } from './ui.js';
import { handleAdd, handleBuy } from './actions.js';
import { currentUser } from './auth.js';
import { isFav, toggleFav } from './favorites.js';

// ფავორიტის გულის ღილაკი (გამოიყენება ბარათზეც და დეტალების ფანჯარაზეც)
export function favButton(product, { onChange } = {}) {
  const btn = h('button', { class: 'fav', type: 'button' });
  const paint = () => {
    const on = isFav(product.id);
    btn.textContent = on ? '♥' : '♡';
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'ფავორიტებიდან ამოღება' : 'ფავორიტებში დამატება');
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFav(product.id);
    paint();
    onChange?.();
  });
  paint();
  return btn;
}

// პროდუქტის ბარათი (გამოიყენება მთავარ და კატალოგის გვერდზე)
export function productCard(product, { onOpen, onFavChange, onBought } = {}) {
  const img = h('img', {
    src: product.image,
    alt: product.name,
    loading: 'lazy',
    width: '800',
    height: '600',
  });
  img.addEventListener('error', () => {
    img.src = 'img/placeholder.webp';
  }, { once: true });

  const user = currentUser();
  const own = user && product.owner === user.id;
  const soldOut = product.stock <= 0;
  const blocked = soldOut || own;

  return h('article', { class: 'card' },
    h('div', { class: 'card-img' },
      img,
      h('span', { class: `badge ${product.condition === 'ახალი' ? 'new' : 'used'}` }, product.condition),
      favButton(product, { onChange: onFavChange })
    ),
    h('div', { class: 'card-body' },
      h('p', { class: 'muted small' }, `${product.brand} · ${product.category}`),
      h('h3', {}, product.name),
      h('p', { class: 'price' }, money(product.price)),
      h('p', { class: `stock small ${soldOut ? 'out' : ''}` }, soldOut ? 'ამოიწურა' : `მარაგში: ${product.stock}`),
      h('div', { class: 'card-actions' },
        h('button', {
          class: 'btn btn-small',
          disabled: blocked,
          onclick: () => handleBuy(product, onBought),
        }, soldOut ? 'ამოიწურა' : own ? 'თქვენია' : 'ყიდვა'),
        h('button', {
          class: 'btn btn-small btn-outline',
          disabled: blocked,
          'aria-label': 'კალათაში დამატება',
          title: 'კალათაში დამატება',
          onclick: () => handleAdd(product),
        }, '🛒'),
        h('button', {
          class: 'btn btn-small btn-outline',
          onclick: () => (onOpen ? onOpen(product) : (location.href = `products.html?open=${product.id}`)),
        }, 'დეტალები')
      )
    )
  );
}
