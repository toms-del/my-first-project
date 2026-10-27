import { createProduct, updateProduct, deleteProduct, getProduct, loadProducts } from './api.js';
import { requireAuth } from './auth.js';
import { renderLayout, toast, toEmbedUrl, h, money } from './ui.js';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/webp', 'image/avif'];

const user = requireAuth('sell');
const form = document.getElementById('product-form');
const preview = document.getElementById('preview');
const fileInput = document.getElementById('image');
const submitBtn = document.getElementById('submit-btn');
const myList = document.getElementById('my-list');
const editId = new URLSearchParams(location.search).get('id');

let imageData = null; // ახალი სურათი (dataURL) ან არსებული გზა

async function init() {
  const products = await loadProducts();
  document.getElementById('brands').replaceChildren(
    ...[...new Set(products.map((p) => p.brand))].map((b) => h('option', { value: b }))
  );

  if (editId) {
    const product = await getProduct(editId);
    if (!product || product.owner !== user.id) {
      toast('ამ პროდუქტის რედაქტირება არ შეგიძლიათ', 'error');
      setTimeout(() => (location.href = 'sell.html'), 1000);
      return;
    }
    document.getElementById('form-title').textContent = 'პროდუქტის რედაქტირება';
    submitBtn.textContent = 'შენახვა';
    form.elements.name.value = product.name;
    form.elements.brand.value = product.brand;
    form.elements.category.value = product.category;
    form.elements.condition.value = product.condition;
    form.elements.price.value = product.price;
    form.elements.stock.value = product.stock;
    form.elements.description.value = product.description;
    form.elements.video.value = product.video || '';
    imageData = product.image;
    showPreview(product.image);
  }
  renderMine(products);
}

// ---------- ჩემი განცხადებები (READ + DELETE) ----------
function renderMine(products) {
  const mine = products.filter((p) => p.owner === user.id).sort((a, b) => b.id - a.id);
  if (mine.length === 0) {
    myList.replaceChildren(h('p', { class: 'muted' }, 'ჯერ არცერთი პროდუქტი არ გაქვთ დამატებული.'));
    return;
  }
  myList.replaceChildren(
    ...mine.map((p) =>
      h('article', { class: 'my-item' },
        h('img', { src: p.image, alt: p.name, width: '80', height: '60' }),
        h('div', { class: 'my-info' },
          h('strong', {}, p.name),
          h('span', { class: 'muted small' }, `${money(p.price)} · მარაგში: ${p.stock}`)
        ),
        h('a', { class: 'btn btn-small btn-outline', href: `sell.html?id=${p.id}` }, '✏️'),
        h('button', {
          class: 'btn btn-small btn-danger',
          'aria-label': `${p.name}-ის წაშლა`,
          onclick: () => onDelete(p),
        }, '🗑️')
      )
    )
  );
}

async function onDelete(product) {
  if (!confirm(`ნამდვილად გსურთ „${product.name}“-ის წაშლა?`)) return;
  try {
    await deleteProduct(product.id);
    toast('პროდუქტი წაიშალა', 'success');
    if (String(product.id) === editId) {
      location.href = 'sell.html';
      return;
    }
    renderMine(await loadProducts());
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- სურათი ----------
function showPreview(src) {
  preview.src = src;
  preview.hidden = false;
}

function setError(field, message) {
  const el = document.querySelector(`[data-error="${field}"]`);
  if (el) el.textContent = message;
}

// ტიპისა და ზომის შემოწმება, შემდეგ დაპატარავება canvas-ით
async function processImage(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('დაშვებულია მხოლოდ WEBP ან AVIF ფორმატი');
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`ფაილი ძალიან დიდია (${(file.size / 1024 / 1024).toFixed(2)} MB). მაქსიმუმია 2 MB`);
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.8);
}

fileInput.addEventListener('change', async () => {
  setError('image', '');
  const file = fileInput.files[0];
  if (!file) return;
  try {
    imageData = await processImage(file);
    showPreview(imageData);
  } catch (err) {
    fileInput.value = '';
    setError('image', err.message);
    toast(err.message, 'error');
  }
});

// ---------- ვალიდაცია და შენახვა (CREATE / UPDATE) ----------
function validate() {
  document.querySelectorAll('[data-error]').forEach((el) => (el.textContent = ''));
  let ok = true;
  const fail = (field, msg) => { setError(field, msg); ok = false; };
  const f = form.elements;

  if (f.name.value.trim().length < 3) fail('name', 'სახელი მინიმუმ 3 სიმბოლოა');
  if (!f.brand.value.trim()) fail('brand', 'მიუთითეთ ბრენდი');
  if (!f.category.value) fail('category', 'აირჩიეთ კატეგორია');
  if (!f.condition.value) fail('condition', 'აირჩიეთ მდგომარეობა');
  if (!(Number(f.price.value) > 0)) fail('price', 'ფასი 0-ზე მეტი უნდა იყოს');
  const stock = Number(f.stock.value);
  if (!Number.isInteger(stock) || stock < 0) fail('stock', 'მარაგი მთელი და არაუარყოფითი რიცხვია');
  if (f.description.value.trim().length < 20) fail('description', 'აღწერა მინიმუმ 20 სიმბოლოა');
  if (f.video.value.trim() && !toEmbedUrl(f.video.value.trim())) {
    fail('video', 'დაშვებულია მხოლოდ YouTube ან Vimeo ბმული');
  }
  if (!imageData) fail('image', 'ატვირთეთ სურათი (WEBP ან AVIF, მაქს. 2 MB)');
  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;
  const f = form.elements;

  const data = {
    name: f.name.value.trim(),
    brand: f.brand.value.trim(),
    category: f.category.value,
    condition: f.condition.value,
    price: Math.round(Number(f.price.value) * 100) / 100,
    stock: Number(f.stock.value),
    description: f.description.value.trim(),
    video: f.video.value.trim(),
    image: imageData,
  };

  submitBtn.disabled = true;
  try {
    if (editId) {
      await updateProduct(editId, data);
      toast('ცვლილებები შენახულია', 'success');
    } else {
      await createProduct({ ...data, owner: user.id });
      toast('პროდუქტი დაემატა', 'success');
    }
    setTimeout(() => (location.href = 'sell.html'), 800);
  } catch (err) {
    toast(err.message, 'error');
    submitBtn.disabled = false;
  }
});

if (user) {
  renderLayout('sell.html');
  init();
}
