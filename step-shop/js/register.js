import { register } from './auth.js';
import { renderLayout } from './ui.js';
import { initAuthPage, submitAuth } from './auth-page.js';

renderLayout('register.html');
initAuthPage('to-login');

const form = document.getElementById('register-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form.elements;
  if (f.password.value !== f.confirm.value) {
    form.querySelector('.form-error').textContent = 'პაროლები არ ემთხვევა';
    return;
  }
  submitAuth(form, () => register(f.name.value, f.email.value, f.password.value));
});
