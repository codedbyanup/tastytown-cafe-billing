// All database logic. `a` is an adapter {exec, run, all, first, tx} (expo-sqlite in the app, node:sqlite in tests).
const { SCHEMA } = require('./schema');
const B = require('./billing');
const WITH_PAID = `SELECT o.*, COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id=o.id),0) AS paid FROM orders o`;

async function init(a, menu) {
  await a.exec(SCHEMA);
  const r = await a.first('SELECT COUNT(*) c FROM menu');
  if (!r.c) for (const m of menu) await a.run('INSERT INTO menu(category,name,price) VALUES(?,?,?)', [m.category, m.name, m.price]);
}
const getMenu = a => a.all('SELECT category,name,price FROM menu ORDER BY id');
const listOrders = (a, onlyOpen) =>
  a.all(`${WITH_PAID} ${onlyOpen ? "WHERE o.status='open'" : ''} ORDER BY o.created_at DESC, o.id DESC LIMIT 300`);

async function loadOrder(a, id) {
  const o = await a.first(`${WITH_PAID} WHERE o.id=?`, [id]);
  o.items = await a.all('SELECT name,price,qty FROM order_items WHERE order_id=? ORDER BY id', [id]);
  o.payments = await a.all('SELECT amount,method,paid_at FROM payments WHERE order_id=? ORDER BY id', [id]);
  return o;
}

// p: {id?, table, items:[{name,price,qty}], discount, allowOver, amount, method}
async function saveOrder(a, p, now = new Date()) {
  const items = p.items.filter(i => i.qty > 0);
  const original = B.orderTotal(items), discount = p.discount || 0, received = p.amount || 0;
  let paidBefore = 0;
  if (p.id) paidBefore = (await a.first('SELECT COALESCE(SUM(amount),0) s FROM payments WHERE order_id=?', [p.id])).s;
  const err = B.validate({ original, discount, allowOver: p.allowOver, paidBefore, received, hasItems: items.length > 0 });
  if (err) throw new Error(err);
  const final = original - discount, ts = B.stamp(now);
  const { status, balance } = B.paymentState(final, paidBefore + received);
  let id = p.id;
  await a.tx(async () => {
    if (!id) {
      const day = ts.slice(0, 10);
      const c = (await a.first('SELECT COUNT(*) c FROM orders WHERE date(created_at)=?', [day])).c;
      id = `TT-${day.replace(/-/g, '')}-${String(c + 1).padStart(3, '0')}`;
      await a.run('INSERT INTO orders(id,table_no,created_at,original,discount,final,status) VALUES(?,?,?,?,?,?,?)', [id, p.table, ts, original, discount, final, 'open']);
    } else await a.run('UPDATE orders SET original=?,discount=?,final=? WHERE id=?', [original, discount, final, id]);
    await a.run('DELETE FROM order_items WHERE order_id=?', [id]);
    for (const i of items) await a.run('INSERT INTO order_items(order_id,name,price,qty) VALUES(?,?,?,?)', [id, i.name, i.price, i.qty]);
    if (received > 0) await a.run('INSERT INTO payments(order_id,amount,method,paid_at) VALUES(?,?,?,?)', [id, received, p.method, ts]);
    await a.run('UPDATE orders SET status=?, closed_at=? WHERE id=?', [status, status === 'paid' ? ts : null, id]);
  });
  return { id, status, balance, final };
}

// Every figure comes from saved rows in the date range; nothing is hardcoded.
async function dashboard(a, from, to) {
  const t = await a.first(`SELECT COUNT(*) n, COALESCE(SUM(original),0) original, COALESCE(SUM(discount),0) discount, COALESCE(SUM(final),0) final FROM orders WHERE date(created_at) BETWEEN ? AND ?`, [from, to]);
  const m = await a.all(`SELECT method, COALESCE(SUM(amount),0) total FROM payments WHERE date(paid_at) BETWEEN ? AND ? GROUP BY method`, [from, to]);
  const s = await a.all(`SELECT status, COUNT(*) n FROM orders WHERE date(created_at) BETWEEN ? AND ? GROUP BY status`, [from, to]);
  const o = await a.first(`SELECT COALESCE(SUM(final - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id=o.id),0)),0) due FROM orders o WHERE status='open' AND date(created_at) BETWEEN ? AND ?`, [from, to]);
  const by = k => (m.find(x => x.method === k) || { total: 0 }).total;
  const cnt = k => (s.find(x => x.status === k) || { n: 0 }).n;
  return { orders: t.n, original: t.original, discount: t.discount, final: t.final,
    received: m.reduce((x, y) => x + y.total, 0), cash: by('Cash'), upi: by('UPI'), card: by('Card'), other: by('Other'),
    completed: cnt('paid'), pending: cnt('open'), outstanding: o.due };
}

// Returns one row per calendar day in [from, to] (inclusive), including days with zero sales.
// Revenue = sum of actual payments recorded on that day.
async function dailyTrend(a, from, to) {
  const pRows = await a.all(
    `SELECT date(paid_at) AS day, COALESCE(SUM(amount), 0) AS revenue FROM payments WHERE date(paid_at) BETWEEN ? AND ? GROUP BY date(paid_at)`,
    [from, to]
  );
  const oRows = await a.all(
    `SELECT date(created_at) AS day, COUNT(*) AS orders FROM orders WHERE date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)`,
    [from, to]
  );
  const pMap = {}, oMap = {};
  pRows.forEach(r => { pMap[r.day] = r.revenue; });
  oRows.forEach(r => { oMap[r.day] = r.orders; });

  const result = [];
  const [sy, sm, sd] = from.split('-').map(Number);
  const [ey, em, ed] = to.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  while (cur <= end) {
    const key = B.ymd(cur);
    result.push({
      date: key,
      revenue: pMap[key] || 0,
      orders: oMap[key] || 0
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// Top selling menu items by quantity in the given date range.
async function topItems(a, from, to, limit = 5) {
  return a.all(
    `SELECT i.name, COALESCE(SUM(i.qty), 0) AS qty, COALESCE(SUM(i.price * i.qty), 0) AS total
     FROM order_items i
     JOIN orders o ON o.id = i.order_id
     WHERE date(o.created_at) BETWEEN ? AND ?
     GROUP BY i.name
     ORDER BY qty DESC, total DESC
     LIMIT ?`,
    [from, to, limit]
  );
}

// Sales distribution by category in the given date range.
async function categoryBreakdown(a, from, to) {
  const rows = await a.all(
    `SELECT m.category, COALESCE(SUM(i.qty), 0) AS qty, COALESCE(SUM(i.price * i.qty), 0) AS total
     FROM order_items i
     JOIN orders o ON o.id = i.order_id
     JOIN menu m ON m.name = i.name
     WHERE date(o.created_at) BETWEEN ? AND ?
     GROUP BY m.category
     ORDER BY total DESC`,
    [from, to]
  );
  const grandTotal = rows.reduce((acc, r) => acc + r.total, 0);
  return rows.map(r => ({
    category: r.category,
    qty: r.qty,
    total: r.total,
    pct: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0
  }));
}

// Erases all recorded transactions (orders, items, payments), returning tables and dashboard to fresh state.
async function clearData(a) {
  await a.run('DELETE FROM payments');
  await a.run('DELETE FROM order_items');
  await a.run('DELETE FROM orders');
}

module.exports = { init, getMenu, listOrders, loadOrder, saveOrder, dashboard, dailyTrend, topItems, categoryBreakdown, clearData };
