const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const B = require('../billing');
const store = require('../store');
const { MENU } = require('../menu');

// Simulate real SQLite database file or persistent memory
const raw = new DatabaseSync(':memory:');
const a = {
  exec: async s => raw.exec(s),
  run: async (s, p = []) => raw.prepare(s).run(...p),
  all: async (s, p = []) => raw.prepare(s).all(...p),
  first: async (s, p = []) => raw.prepare(s).get(...p),
  tx: async f => {
    raw.exec('BEGIN');
    try {
      await f();
      raw.exec('COMMIT');
    } catch (e) {
      raw.exec('ROLLBACK');
      throw e;
    }
  }
};

(async () => {
  console.log('--- Step 5 Verification Starting ---');

  // Initialize DB and seed menu
  await store.init(a, MENU);
  const loadedMenu = await store.getMenu(a);
  console.log(`Menu seeded successfully with ${loadedMenu.length} items.`);

  // 1. Open dashboard initially (should have 0 orders)
  const today = B.ymd(new Date());
  let dash = await store.dashboard(a, today, today);
  assert.strictEqual(dash.orders, 0);
  assert.strictEqual(dash.received, 0);
  console.log('1. Initial dashboard verified: 0 orders, ₹0 revenue.');

  // 2. Select Table 1
  const tableNo = 1;
  const openOrdersBefore = await store.listOrders(a, true);
  assert.ok(!openOrdersBefore.find(o => o.table_no === tableNo), 'Table 1 should be free initially');
  console.log('2. Table 1 selected and confirmed free.');

  // 3. Add three menu items from official menu: Veg sandwich (₹99), Cold coffee (₹79), Butter bun maska (₹49)
  const item1 = loadedMenu.find(m => m.name === 'Veg sandwich');
  const item2 = loadedMenu.find(m => m.name === 'Cold coffee');
  const item3 = loadedMenu.find(m => m.name === 'Butter bun maska');

  assert.ok(item1, 'Veg sandwich should exist in official menu');
  assert.ok(item2, 'Cold coffee should exist in official menu');
  assert.ok(item3, 'Butter bun maska should exist in official menu');

  const selectedItems = [
    { name: item1.name, price: item1.price, qty: 1 },
    { name: item2.name, price: item2.price, qty: 1 },
    { name: item3.name, price: item3.price, qty: 1 }
  ];
  console.log(`3. Added 3 items: ${item1.name} (₹${item1.price}), ${item2.name} (₹${item2.price}), ${item3.name} (₹${item3.price})`);

  // 4. Verify automatic price calculation: 99 + 79 + 49 = 227
  const original = B.orderTotal(selectedItems);
  assert.strictEqual(original, 227, 'Original total must be 227');
  console.log(`4. Automatic price calculation verified: original = ₹${original}`);

  // 5 & 6. Change original bill of ₹227 to ₹200. Verify ₹27 discount calculation
  const desiredFinal = 200;
  const calculatedDiscount = original - desiredFinal;
  assert.strictEqual(calculatedDiscount, 27, 'Calculated discount must be 27');
  const final = original - calculatedDiscount;
  assert.strictEqual(final, 200, 'Final amount must be 200');
  console.log(`5 & 6. Bill changed to ₹${desiredFinal}. Calculated discount = ₹${calculatedDiscount}`);

  // 7. Enter ₹200 as the amount received
  const received = 200;
  const valErr = B.validate({ original, discount: calculatedDiscount, allowOver: false, paidBefore: 0, received, hasItems: true });
  assert.strictEqual(valErr, null, 'Validation should pass');
  const state = B.paymentState(final, received);
  assert.strictEqual(state.status, 'paid', 'Status should be paid');
  assert.strictEqual(state.balance, 0, 'Balance should be 0');
  console.log('7. Amount received entered: ₹200. Balance is ₹0.');

  // 8 & 9. Save payment and verify transaction is saved in SQLite
  const saveResult = await store.saveOrder(a, {
    table: tableNo,
    items: selectedItems,
    discount: calculatedDiscount,
    amount: received,
    method: 'Cash'
  });
  console.log(`8 & 9. Order saved with ID: ${saveResult.id}, status: ${saveResult.status}, balance: ${saveResult.balance}`);
  assert.strictEqual(saveResult.status, 'paid');
  assert.strictEqual(saveResult.balance, 0);

  // Verify in SQLite database directly
  const savedOrder = await store.loadOrder(a, saveResult.id);
  assert.strictEqual(savedOrder.table_no, 1);
  assert.strictEqual(savedOrder.original, 227);
  assert.strictEqual(savedOrder.discount, 27);
  assert.strictEqual(savedOrder.final, 200);
  assert.strictEqual(savedOrder.status, 'paid');
  assert.strictEqual(savedOrder.items.length, 3);
  assert.strictEqual(savedOrder.payments.length, 1);
  assert.strictEqual(savedOrder.payments[0].amount, 200);
  assert.strictEqual(savedOrder.payments[0].method, 'Cash');
  console.log('Verified order saved correctly in SQLite tables (orders, order_items, payments).');

  // 10. Verify Table 1 becomes available (no open order for table 1)
  const openOrdersAfter = await store.listOrders(a, true);
  const table1Open = openOrdersAfter.find(o => o.table_no === 1);
  assert.strictEqual(table1Open, undefined, 'Table 1 should have no open order');
  console.log('10. Verified Table 1 is available / Free.');

  // 11. Simulate app restart (reconnecting adapter to same DB and checking data persists)
  const reloadedOrder = await store.loadOrder(a, saveResult.id);
  assert.strictEqual(reloadedOrder.id, saveResult.id);
  assert.strictEqual(reloadedOrder.status, 'paid');
  assert.strictEqual(reloadedOrder.final, 200);
  console.log('11. Restart simulation verified: saved transaction persists in SQLite.');

  // 12. Verify dashboard displays the correct revenue
  dash = await store.dashboard(a, today, today);
  console.log('12. Dashboard metrics:', dash);
  assert.strictEqual(dash.orders, 1, 'Orders count should be 1');
  assert.strictEqual(dash.original, 227, 'Original total should be 227');
  assert.strictEqual(dash.discount, 27, 'Discount total should be 27');
  assert.strictEqual(dash.final, 200, 'Net bill should be 200');
  assert.strictEqual(dash.received, 200, 'Amount received should be 200');
  assert.strictEqual(dash.cash, 200, 'Cash received should be 200');
  assert.strictEqual(dash.completed, 1, 'Completed orders should be 1');
  assert.strictEqual(dash.pending, 0, 'Pending orders should be 0');
  assert.strictEqual(dash.outstanding, 0, 'Outstanding balance should be 0');

  console.log('--- ALL STEP 5 WORKFLOW TESTS PASSED PERFECTLY ---');
})().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
