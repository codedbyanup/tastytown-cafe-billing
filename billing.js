// Pure billing rules (whole rupees). No I/O, fully unit-tested.
const num = v => (String(v).trim() === '' ? 0 : Math.round(Number(v)));
const orderTotal = items => items.reduce((s, i) => s + i.price * i.qty, 0);
function validate({ original, discount, allowOver = false, paidBefore = 0, received = 0, hasItems = true }) {
  if (!hasItems) return 'Add at least one item';
  if (Number.isNaN(discount) || Number.isNaN(received)) return 'Enter valid numbers';
  if (received < 0) return 'Amount received cannot be negative';
  const final = original - discount;
  if (final < 0) return 'Final amount cannot be negative';
  if (discount < 0 && !allowOver) return 'Final is above the bill. Switch on "Authorize extra charge" to allow';
  if (final < paidBefore) return `Final is below ₹${paidBefore} already received`;
  if (received > final - paidBefore) return `Received is more than the balance of ₹${final - paidBefore}`;
  return null;
}
const paymentState = (final, paid) => ({ balance: Math.max(0, final - paid), status: paid >= final ? 'paid' : 'open' });
const p2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const stamp = d => `${ymd(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
function range(filter, now) {
  const to = ymd(now); let from = to;
  if (filter === 'week') { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); from = ymd(d); }
  if (filter === 'month') from = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  return { from, to };
}
module.exports = { num, orderTotal, validate, paymentState, ymd, stamp, range };
