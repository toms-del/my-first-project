// ავტორიზაცია: მომხმარებლები და სესია ინახება localStorage-ში.
// შენიშვნა: ეს სასწავლო მაგალითია - რეალურ პროექტში ავტორიზაცია სერვერზე კეთდება.
const USERS_KEY = 'step_users';
const SESSION_KEY = 'step_session';

async function hash(text) {
  if (!window.crypto?.subtle) return btoa(unescape(encodeURIComponent(text)));
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

function startSession(user) {
  const session = { id: user.id, name: user.name, email: user.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export async function register(name, email, password) {
  name = name.trim();
  email = email.trim().toLowerCase();
  if (name.length < 2) throw new Error('სახელი მინიმუმ 2 სიმბოლო უნდა იყოს');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ელფოსტა არასწორია');
  if (password.length < 6) throw new Error('პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');

  const users = getUsers();
  if (users.some((u) => u.email === email)) throw new Error('ამ ელფოსტით მომხმარებელი უკვე არსებობს');

  const user = { id: Date.now(), name, email, password: await hash(password) };
  users.push(user);
  saveUsers(users);
  return startSession(user);
}

export async function login(email, password) {
  email = email.trim().toLowerCase();
  const user = getUsers().find((u) => u.email === email);
  if (!user || user.password !== (await hash(password))) {
    throw new Error('ელფოსტა ან პაროლი არასწორია');
  }
  return startSession(user);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// მიმდინარე გვერდი query-ით (მუშაობს Netlify-ს "pretty URLs"-ზეც)
export function currentPage() {
  let page = location.pathname.split('/').pop() || 'index.html';
  if (!page.includes('.')) page += '.html';
  return page + location.search;
}

// login გვერდზე გადამისამართება; შესვლის შემდეგ მომხმარებელი უკან დაბრუნდება
export function goLogin(next = currentPage(), reason = '') {
  const params = new URLSearchParams({ next });
  if (reason) params.set('reason', reason);
  location.href = `login.html?${params}`;
}

// დაცული გვერდისთვის: თუ შესული არაა, login-ზე გადავამისამართებთ
export function requireAuth(reason = '') {
  const user = currentUser();
  if (!user) {
    const params = new URLSearchParams({ next: currentPage() });
    if (reason) params.set('reason', reason);
    location.replace(`login.html?${params}`);
  }
  return user;
}
