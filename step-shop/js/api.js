// პროდუქტების CRUD: პირველად მონაცემებს fetch-ით ვტვირთავთ JSON ფაილიდან,
// შემდეგ ყველა ცვლილება ინახება localStorage-ში.
const KEY = 'step_products';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function persist(products) {
  try {
    localStorage.setItem(KEY, JSON.stringify(products));
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      throw new Error('მეხსიერება გაივსო. სცადეთ უფრო პატარა სურათი.');
    }
    throw err;
  }
}

// READ (ყველა)
const SEED_VERSION = '3'; // როცა data/products.json-ში ახალ პროდუქტებს ვამატებთ, ვზრდით

async function fetchSeed() {
  const res = await fetch('data/products.json');
  if (!res.ok) throw new Error(`მონაცემების ჩატვირთვა ვერ მოხერხდა (${res.status})`);
  return res.json();
}

export async function loadProducts() {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    await sleep(200); // ვაჩვენოთ loading მდგომარეობა
    const products = JSON.parse(saved);
    // ძველი ვერსიით შენახულ მონაცემებს ახალი საწყისი პროდუქტები ემატება (მომხმარებლის ცვლილებები რჩება)
    if (localStorage.getItem(KEY + '_v') !== SEED_VERSION) {
      const seed = await fetchSeed();
      const taken = new Set(products.map((p) => p.id));
      const fresh = seed.filter((p) => !taken.has(p.id));
      if (fresh.length) {
        products.push(...fresh);
        persist(products);
      }
      localStorage.setItem(KEY + '_v', SEED_VERSION);
    }
    return products;
  }
  const data = await fetchSeed();
  persist(data);
  localStorage.setItem(KEY + '_v', SEED_VERSION);
  return data;
}

// READ (ერთი)
export async function getProduct(id) {
  const products = await loadProducts();
  return products.find((p) => p.id === Number(id)) ?? null;
}

// CREATE
export async function createProduct(data) {
  const products = await loadProducts();
  const nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const product = { ...data, id: nextId, createdAt: Date.now() };
  products.push(product);
  persist(products);
  return product;
}

// UPDATE
export async function updateProduct(id, data) {
  const products = await loadProducts();
  const index = products.findIndex((p) => p.id === Number(id));
  if (index === -1) throw new Error('პროდუქტი ვერ მოიძებნა');
  products[index] = { ...products[index], ...data, id: Number(id) };
  persist(products);
  return products[index];
}

// DELETE
export async function deleteProduct(id) {
  const products = await loadProducts();
  const filtered = products.filter((p) => p.id !== Number(id));
  if (filtered.length === products.length) throw new Error('პროდუქტი ვერ მოიძებნა');
  persist(filtered);
}

// მარაგის შემცირება ერთი ოპერაციით: ჯერ ყველაფერს ვამოწმებთ, მერე ვინახავთ,
// ამიტომ შეკვეთა ან მთლიანად სრულდება, ან საერთოდ არა.
export async function decreaseStock(items) {
  const products = await loadProducts();
  for (const { id, qty } of items) {
    const product = products.find((p) => p.id === id);
    if (!product) throw new Error('პროდუქტი აღარ არსებობს');
    if (product.stock < qty) {
      throw new Error(`„${product.name}“ საკმარისი რაოდენობით აღარ არის მარაგში (დარჩა ${product.stock})`);
    }
  }
  for (const { id, qty } of items) {
    products.find((p) => p.id === id).stock -= qty;
  }
  persist(products);
}

// მონაცემების საწყისზე დაბრუნება
export function resetProducts() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(KEY + '_v');
}
