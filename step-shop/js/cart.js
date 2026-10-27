// კალათა: ყოველ მომხმარებელს საკუთარი კალათა აქვს (localStorage-ში, userId-ით).
// ფუნქციები userId-ს პარამეტრად იღებს, ამიტომ უავტორიზაციოდ კალათა არ არსებობს.
const key = (uid) => `step_cart_${uid}`;

export function getCart(uid) {
  try {
    return JSON.parse(localStorage.getItem(key(uid))) || [];
  } catch {
    return [];
  }
}

function save(uid, items) {
  localStorage.setItem(key(uid), JSON.stringify(items));
  window.dispatchEvent(new Event('cart:change')); // header-ის ნიშნაკის განახლებისთვის
}

export const cartCount = (uid) => getCart(uid).reduce((sum, i) => sum + i.qty, 0);

export function addItem(uid, product) {
  const items = getCart(uid);
  const item = items.find((i) => i.id === product.id);
  const have = item ? item.qty : 0;
  if (have + 1 > product.stock) throw new Error('მარაგში მეტი აღარ არის');
  if (item) item.qty += 1;
  else items.push({ id: product.id, qty: 1 });
  save(uid, items);
}

export function setQty(uid, id, qty) {
  const items = getCart(uid);
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.qty = qty;
  save(uid, items.filter((i) => i.qty > 0));
}

export function removeItem(uid, id) {
  save(uid, getCart(uid).filter((i) => i.id !== id));
}

export function clearCart(uid) {
  save(uid, []);
}

// შეკვეთების ისტორია
const ordersKey = (uid) => `step_orders_${uid}`;
export const getOrders = (uid) => JSON.parse(localStorage.getItem(ordersKey(uid)) || '[]');
export function addOrder(uid, order) {
  const orders = getOrders(uid);
  orders.push(order);
  localStorage.setItem(ordersKey(uid), JSON.stringify(orders));
}
