import { loadProducts } from './api.js';
import { renderLayout, h, reveal } from './ui.js';
import { productCard } from './card.js';

renderLayout('index.html');

// ციფრის ანიმაცია setInterval-ით
function animateCount(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(target, current + step);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

async function init() {
  const featured = document.getElementById('featured');
  const chips = document.getElementById('category-chips');

  try {
    const products = await loadProducts();

    // ბოლოს დამატებული 4 პროდუქტი
    const latest = [...products].sort((a, b) => b.id - a.id).slice(0, 4);
    const cards = latest.map((p) => productCard(p));
    featured.replaceChildren(...cards);
    reveal(cards);

    const categories = [...new Set(products.map((p) => p.category))];
    chips.replaceChildren(
      ...categories.map((c) =>
        h('a', { class: 'chip', href: `products.html?category=${encodeURIComponent(c)}` }, c)
      )
    );

    animateCount(document.getElementById('stat-products'), products.length);
    animateCount(document.getElementById('stat-brands'), new Set(products.map((p) => p.brand)).size);
    animateCount(document.getElementById('stat-categories'), categories.length);
  } catch (err) {
    featured.replaceChildren(h('p', { class: 'error-box' }, `⚠️ ${err.message}`));
  }
}

init();
