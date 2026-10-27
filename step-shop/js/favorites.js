// ფავორიტები: ინახება localStorage-ში (შესულ მომხმარებელს საკუთარი სია აქვს)
import { currentUser } from './auth.js';

const key = () => `step_favs_${currentUser()?.id ?? 'guest'}`;

export function getFavs() {
  try {
    return new Set(JSON.parse(localStorage.getItem(key())) || []);
  } catch {
    return new Set();
  }
}

export const isFav = (id) => getFavs().has(id);

// აბრუნებს true-ს, თუ პროდუქტი ახლა ფავორიტია
export function toggleFav(id) {
  const favs = getFavs();
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  localStorage.setItem(key(), JSON.stringify([...favs]));
  return favs.has(id);
}
