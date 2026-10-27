// login.js და register.js-ის საერთო ლოგიკა
import { currentUser } from './auth.js';
import { toast } from './ui.js';

const params = new URLSearchParams(location.search);

// ნებადართულია მხოლოდ ამ საიტის შიდა გვერდზე გადასვლა
export function getNext() {
  const next = params.get('next');
  return next && /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(next) ? next : 'products.html';
}

const notes = {
  cart: '🛒 კალათის გამოსაყენებლად ჯერ უნდა შეხვიდეთ სისტემაში.',
  sell: '💼 პროდუქტის გასაყიდად ჯერ უნდა შეხვიდეთ სისტემაში.',
  buy: '⚡ პროდუქტის საყიდლად ჯერ უნდა შეხვიდეთ სისტემაში.',
};

export function initAuthPage(switchLinkId) {
  // უკვე შესულს ამ გვერდებზე აღარ ვაჩერებთ
  if (currentUser()) location.replace(getNext());

  // ახსნა, რატომ მოხვდა მომხმარებელი აქ
  const note = document.getElementById('login-note');
  const text = notes[params.get('reason')];
  if (text) {
    note.textContent = text;
    note.hidden = false;
  }

  // next/reason პარამეტრები გადადის მეორე გვერდზეც
  const link = document.getElementById(switchLinkId);
  const keep = new URLSearchParams();
  for (const key of ['next', 'reason']) {
    if (params.get(key)) keep.set(key, params.get(key));
  }
  if ([...keep].length) link.href += `?${keep}`;
}

export async function submitAuth(form, action) {
  const btn = form.querySelector('button[type=submit]');
  const errorBox = form.querySelector('.form-error');
  errorBox.textContent = '';
  btn.disabled = true;
  try {
    await action();
    toast('წარმატებით შეხვედით', 'success');
    setTimeout(() => (location.href = getNext()), 600);
  } catch (err) {
    errorBox.textContent = err.message;
    btn.disabled = false;
  }
}
