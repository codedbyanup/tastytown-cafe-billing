const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const B = require('../billing'), store = require('../store'), { MENU } = require('../menu');
const raw = new DatabaseSync(':memory:');
const a = { exec: async s => raw.exec(s), run: async (s, p = []) => raw.prepare(s).run(...p), all: async (s, p = []) => raw.prepare(s).all(...p), first: async (s, p = []) => raw.prepare(s).get(...p),
  tx: async f => { raw.exec('BEGIN'); try { await f(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } } };
const it = (name, price, qty = 1) => ({ name, price, qty });
const items220 = [it('Coffee', 80), it('Sandwich', 90), it('Brownie', 50)];
const now = new Date(2026, 10, 18, 13, 0, 0); // Wed 18 Nov 2026
(async () => {
  // pure rules
  assert.strictEqual(B.orderTotal(items220), 220);
  assert.strictEqual(B.orderTotal([it('x', 69, 3)]), 207);
  assert.ok(B.validate({ original: 220, discount: 230 }));                       // negative final
  assert.ok(B.validate({ original: 220, discount: -10 }));                       // above bill, not authorized
  assert.strictEqual(B.validate({ original: 220, discount: -10, allowOver: true }), null);
  assert.ok(B.validate({ original: 220, discount: 20, received: 201 }));         // over-receive
  assert.deepStrictEqual(B.range('week', now), { from: '2026-11-16', to: '2026-11-18' });
  assert.deepStrictEqual(B.range('month', now), { from: '2026-11-01', to: '2026-11-18' });
  await store.init(a, MENU);
  assert.strictEqual((await store.getMenu(a)).length, MENU.length);

  // New data functions on empty database
  const emptyTrend = await store.dailyTrend(a, '2026-11-16', '2026-11-18');
  assert.strictEqual(emptyTrend.length, 3);
  assert.deepStrictEqual(emptyTrend.map(d => d.revenue), [0, 0, 0]);
  assert.deepStrictEqual(emptyTrend.map(d => d.orders), [0, 0, 0]);
  assert.deepStrictEqual(await store.topItems(a, '2026-11-16', '2026-11-18'), []);
  assert.deepStrictEqual(await store.categoryBreakdown(a, '2026-11-16', '2026-11-18'), []);

  // Order 1: 220, discount 20, final 200, received 200 cash -> paid
  let r = await store.saveOrder(a, { table: 1, items: items220, discount: 20, amount: 200, method: 'Cash' }, now);
  assert.deepStrictEqual([r.final, r.status, r.balance], [200, 'paid', 0]);
  // Order 2: 220, discount 20, only 150 received by UPI -> open, balance 50
  const r2 = await store.saveOrder(a, { table: 2, items: items220, discount: 20, amount: 150, method: 'UPI' }, now);
  assert.deepStrictEqual([r2.status, r2.balance], ['open', 50]);
  // Order 3 (earlier this month, not this week): 100 fully paid by card
  await store.saveOrder(a, { table: 3, items: [it('Veg burger', 99), it('Aloo', 1)], discount: 0, amount: 100, method: 'Card' }, new Date(2026, 10, 3, 12));
  assert.strictEqual(r.id, 'TT-20261118-001'); assert.strictEqual(r2.id, 'TT-20261118-002');

  let d = await store.dashboard(a, '2026-11-18', '2026-11-18');
  assert.deepStrictEqual([d.orders, d.original, d.discount, d.final, d.received, d.cash, d.upi, d.card], [2, 440, 40, 400, 350, 200, 150, 0]);
  assert.deepStrictEqual([d.completed, d.pending, d.outstanding], [1, 1, 50]);
  let w = await store.dashboard(a, '2026-11-16', '2026-11-18'); assert.strictEqual(w.orders, 2);
  let m = await store.dashboard(a, '2026-11-01', '2026-11-18');
  assert.deepStrictEqual([m.orders, m.received, m.card, m.completed], [3, 450, 100, 2]);

  // over-receiving is rejected; later payment settles the balance and closes the order
  await assert.rejects(store.saveOrder(a, { id: r2.id, table: 2, items: items220, discount: 20, amount: 60, method: 'Cash' }, now));
  const r2b = await store.saveOrder(a, { id: r2.id, table: 2, items: items220, discount: 20, amount: 50, method: 'Card' }, now);
  assert.deepStrictEqual([r2b.status, r2b.balance], ['paid', 0]);
  d = await store.dashboard(a, '2026-11-18', '2026-11-18');
  assert.deepStrictEqual([d.received, d.card, d.completed, d.pending, d.outstanding], [400, 50, 2, 0, 0]);
  const full = await store.loadOrder(a, r2.id);
  assert.strictEqual(full.payments.length, 2); assert.strictEqual(full.items.length, 3);
  assert.strictEqual((await store.listOrders(a, true)).length, 0);
  assert.strictEqual((await store.listOrders(a, false)).length, 3);
  // authorized surcharge, and rejected empty cart
  const r4 = await store.saveOrder(a, { table: 4, items: [it('Veg Maggi', 59)], discount: -11, allowOver: true, amount: 0, method: 'Cash' }, now);
  assert.deepStrictEqual([r4.final, r4.status, r4.balance], [70, 'open', 70]);
  await assert.rejects(store.saveOrder(a, { table: 5, items: [], discount: 0, amount: 0, method: 'Cash' }, now));

  // Test new store functions (dailyTrend, topItems, categoryBreakdown) across day/week/month
  const dayR = B.range('day', now);
  const weekR = B.range('week', now);
  const monthR = B.range('month', now);

  // 1. Day range
  const dayTrend = await store.dailyTrend(a, dayR.from, dayR.to);
  assert.strictEqual(dayTrend.length, 1);
  assert.strictEqual(dayTrend[0].date, '2026-11-18');
  assert.strictEqual(dayTrend[0].revenue, 400); // 200 Cash (r) + 150 UPI (r2) + 50 Card (r2b)
  assert.strictEqual(dayTrend[0].orders, 3);    // r, r2, r4

  // 2. Week range (Mon 16 to Wed 18)
  const weekTrend = await store.dailyTrend(a, weekR.from, weekR.to);
  assert.strictEqual(weekTrend.length, 3);
  assert.deepStrictEqual(weekTrend.map(x => x.revenue), [0, 0, 400]);
  assert.deepStrictEqual(weekTrend.map(x => x.orders), [0, 0, 3]);

  // 3. Month range (Nov 01 to Nov 18)
  const monthTrend = await store.dailyTrend(a, monthR.from, monthR.to);
  assert.strictEqual(monthTrend.length, 18);
  const nov3 = monthTrend.find(x => x.date === '2026-11-03');
  assert.strictEqual(nov3.revenue, 100); // r3 paid 100 on Nov 3
  assert.strictEqual(nov3.orders, 1);
  const nov18 = monthTrend.find(x => x.date === '2026-11-18');
  assert.strictEqual(nov18.revenue, 400);
  assert.strictEqual(nov18.orders, 3);
  assert.strictEqual(monthTrend.reduce((s, x) => s + x.revenue, 0), 500);

  // 4. topItems
  const topDay = await store.topItems(a, dayR.from, dayR.to, 5);
  assert.ok(topDay.length >= 3);
  const coffee = topDay.find(x => x.name === 'Coffee');
  assert.strictEqual(coffee.qty, 2);
  assert.strictEqual(coffee.total, 160);

  const topMonthLimit2 = await store.topItems(a, monthR.from, monthR.to, 2);
  assert.strictEqual(topMonthLimit2.length, 2);

  // 5. categoryBreakdown
  const catsDay = await store.categoryBreakdown(a, dayR.from, dayR.to);
  assert.ok(catsDay.length > 0);
  const catTotalPct = catsDay.reduce((s, x) => s + x.pct, 0);
  assert.ok(catTotalPct >= 98 && catTotalPct <= 102); // rounded percentages sum ~100

  // 6. clearData
  await store.clearData(a);
  assert.strictEqual((await store.listOrders(a, false)).length, 0);
  const clearedDash = await store.dashboard(a, monthR.from, monthR.to);
  assert.strictEqual(clearedDash.orders, 0);
  assert.strictEqual(clearedDash.received, 0);

  console.log('ALL TESTS PASSED');
})().catch(e => { console.error(e); process.exit(1); });
