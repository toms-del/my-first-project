import { login } from './auth.js';
import { renderLayout } from './ui.js';
import { initAuthPage, submitAuth } from './auth-page.js';

renderLayout('login.html');
initAuthPage('to-register');

const form = document.getElementById('login-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form.elements;
  submitAuth(form, () => login(f.email.value, f.password.value));
});
