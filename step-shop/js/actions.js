import { currentUser, goLogin, currentPage } from './auth.js';
import { addItem } from './cart.js';
import { openCheckout } from './checkout.js';
import { toast } from './ui.js';

// სიტუაციები, როცა მომხმარებელი პროდუქტს ვერ იყიდის/დაამატებს
function guard(product, loginReason) {
  const user = currentUser();
  if (!user) {
    toast(loginReason === 'buy'
      ? 'საყიდლად ჯერ შედით სისტემაში'
      : 'კალათაში დასამატებლად ჯერ შედით სისტემაში', 'error');
    const next = currentPage();
    setTimeout(() => goLogin(next, loginReason), 1100);
    return null;
  }
  if (product.owner === user.id) {
    toast('საკუთარი პროდუქტის ყიდვა არ შეიძლება', 'error');
    return null;
  }
  if (product.stock <= 0) {
    toast('პროდუქტი ამოიწურა', 'error');
    return null;
  }
  return user;
}

// "კალათაში დამატება": უავტორიზაციო მომხმარებელი login გვერდზე გადადის
export function handleAdd(product) {
  const user = guard(product, 'cart');
  if (!user) return false;
  try {
    addItem(user.id, product);
    toast(`„${product.name}“ დაემატა კალათაში`, 'success');
    return true;
  } catch (err) {
    toast(err.message, 'error');
    return false;
  }
}

// "ყიდვა": პირდაპირ შეკვეთის ფორმა (კალათის გარეშე)
export function handleBuy(product, onDone) {
  const user = guard(product, 'buy');
  if (!user) return false;
  openCheckout([{ product, qty: 1 }], { onDone: onDone ?? (() => location.reload()) });
  return true;
}
