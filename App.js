import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, Switch, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { open } from './db';
const store = require('./store');
const B = require('./billing');
const { CAFE, TABLES } = require('./menu');
const R = n => '₹' + (n || 0);
const METHODS = ['Cash', 'UPI', 'Card', 'Other'];
const Chip = ({ t, on, sel }) => (
  <TouchableOpacity onPress={on} style={[s.chip, sel && s.chipOn]}><Text style={[s.chipT, sel && { color: '#fff' }]}>{t}</Text></TouchableOpacity>);

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const [A, setA] = useState(null), [tab, setTab] = useState('tables'), [ord, setOrd] = useState(null), [msg, setMsg] = useState('');
  const [initErr, setInitErr] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { open().then(setA).catch(e => { console.error('Database open error:', e); setInitErr(e.message || String(e)); }); }, []);
  if (initErr) return <View style={s.c}><Text style={[s.load, { color: '#b3261e' }]}>Database Error: {initErr}</Text></View>;
  if (!A) return <View style={s.c}><Text style={s.load}>Loading…</Text></View>;

  const handleEraseAll = () => {
    Alert.alert(
      'Erase All Data',
      'Are you sure you want to permanently erase all entered orders, payments, and billing data? All tables will be freed and dashboard reset to ₹0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await store.clearData(A);
              setOrd(null);
              setTab('tables');
              setMsg('✅ All entered data erased! Database is fresh and clean.');
              setRefreshKey(k => k + 1);
              Alert.alert('Database Cleared', 'All previous transaction data has been permanently erased.');
            } catch (err) {
              Alert.alert('Error', err.message || String(err));
            }
          },
        },
      ]
    );
  };

  const body = ord ? <Order key={`ord-${refreshKey}`} A={A} {...ord} done={m => { setOrd(null); setMsg(m || ''); }} />
    : tab === 'tables' ? <Tables key={`tbl-${refreshKey}`} A={A} msg={msg} pick={setOrd} />
    : tab === 'dash' ? <Dash key={`dash-${refreshKey}`} A={A} /> : <History key={`hist-${refreshKey}`} A={A} pick={setOrd} onEraseAll={handleEraseAll} />;

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);

  return (
    <View style={s.c}>
      <StatusBar barStyle="light-content" backgroundColor="#6b1d12" />
      <View style={[s.top, { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 24) + 6 }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => { setTab('tables'); setOrd(null); setMsg(''); }} style={s.topBrand}>
          <Text style={s.title}>{CAFE.name}</Text>
          <Text style={s.sub}>{CAFE.address}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={s.clearHeaderBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleEraseAll}>
            <Text style={s.clearHeaderBtnText}>🗑️ Erase Data</Text>
          </TouchableOpacity>
          {(tab !== 'tables' || ord) && (
            <TouchableOpacity
              style={[s.homeBtn, { marginLeft: 8 }]}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              onPress={() => { setTab('tables'); setOrd(null); setMsg(''); }}>
              <Text style={s.homeBtnText}>⌂ Tables</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={{ flex: 1 }}>{body}</View>
      {!ord && (
        <View style={[s.tabs, { paddingBottom: bottomInset + 10 }]}>
          {[
            ['tables', '🍽️ Tables'],
            ['dash', '📊 Dashboard'],
            ['hist', '📜 History'],
          ].map(([k, l]) => (
            <TouchableOpacity
              key={k}
              style={[s.tab, tab === k && s.tabActive]}
              hitSlop={{ top: 14, bottom: 16, left: 12, right: 12 }}
              activeOpacity={0.7}
              onPress={() => { setTab(k); setMsg(''); }}>
              <Text style={[s.tabT, tab === k && s.tabOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function Tables({ A, msg, pick }) {
  const [openO, setOpenO] = useState({});
  useEffect(() => { store.listOrders(A, true).then(r => { const m = {}; r.forEach(o => (m[o.table_no] = o)); setOpenO(m); }); }, []);
  return (
    <ScrollView contentContainerStyle={[s.grid, { paddingBottom: 50 }]}>
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      {[...Array(TABLES)].map((_, i) => { const n = i + 1, o = openO[n];
        return (<TouchableOpacity key={n} style={[s.tbl, o && s.busy]} onPress={() => pick({ table: n, id: o ? o.id : null })}>
          <Text style={s.tn}>Table {n}</Text><Text style={s.ts}>{o ? `Due ${R(o.final - o.paid)}` : 'Free'}</Text></TouchableOpacity>); })}
    </ScrollView>);
}

function Order({ A, table, id, done }) {
  const [menu, setMenu] = useState([]), [cat, setCat] = useState(null), [cart, setCart] = useState({});
  const [d, setD] = useState(''), [fEdit, setFEdit] = useState(null), [over, setOver] = useState(false);
  const [rec, setRec] = useState(''), [method, setMethod] = useState('Cash'), [paidBefore, setPB] = useState(0);
  useEffect(() => {
    store.getMenu(A).then(m => { setMenu(m); setCat(m[0].category); });
    if (id) store.loadOrder(A, id).then(o => { const c = {}; o.items.forEach(i => (c[i.name] = i)); setCart(c); setD(o.discount ? String(o.discount) : ''); setPB(o.paid); });
  }, []);
  const items = Object.values(cart), original = B.orderTotal(items), discount = B.num(d), final = original - discount;
  const err = B.validate({ original, discount, allowOver: over, paidBefore, received: B.num(rec), hasItems: items.length > 0 });
  const balance = final - paidBefore - B.num(rec);
  const add = (m, q = 1) => { setFEdit(null); setCart(c => { const n = { ...c }, cur = n[m.name] || { name: m.name, price: m.price, qty: 0 }; const qty = cur.qty + q; if (qty <= 0) delete n[m.name]; else n[m.name] = { ...cur, qty }; return n; }); };
  const setFinal = t => { setFEdit(t); setD(t === '' ? '' : String(original - B.num(t))); };
  const save = async () => {
    if (err) return Alert.alert('Check', err);
    try {
      const r = await store.saveOrder(A, { id, table, items, discount, allowOver: over, amount: B.num(rec), method });
      done(r.status === 'paid' ? `Table ${table}: ${R(r.final)} paid. Table is free.` : `Table ${table}: saved, balance ${R(r.balance)} pending.`);
    } catch (e) { Alert.alert('Not saved', e.message); }
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 10, paddingBottom: 60 }}>
      <View style={s.row}>
        <TouchableOpacity style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={() => done()}>
          <Text style={s.back}>‹ Back to Tables</Text>
        </TouchableOpacity>
        <Text style={s.h}>Table {table}{id ? `  (${id})` : ''}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{[...new Set(menu.map(m => m.category))].map(c => <Chip key={c} t={c} sel={c === cat} on={() => setCat(c)} />)}</ScrollView>
      <View style={s.menuWrap}>{menu.filter(m => m.category === cat).map(m =>
        <TouchableOpacity key={m.name} style={s.item} onPress={() => add(m)}><Text style={s.itN}>{m.name}</Text><Text style={s.itP}>{R(m.price)}</Text></TouchableOpacity>)}</View>
      <Text style={s.h2}>Order</Text>
      {items.length === 0 && <Text style={s.mute}>Tap items above to add</Text>}
      {items.map(i => (<View key={i.name} style={s.cartRow}>
        <View style={{ flex: 1 }}><Text style={s.itN}>{i.name}</Text><Text style={s.mute}>{R(i.price)} × {i.qty} = {R(i.price * i.qty)}</Text></View>
        <TouchableOpacity style={s.qb} onPress={() => add(i, -1)}><Text style={s.qt}>−</Text></TouchableOpacity><Text style={s.qn}>{i.qty}</Text>
        <TouchableOpacity style={s.qb} onPress={() => add(i, 1)}><Text style={s.qt}>+</Text></TouchableOpacity></View>))}
      <View style={s.panel}>
        <View style={s.line}><Text style={s.lbl}>Original Amount</Text><Text style={s.big}>{R(original)}</Text></View>
        <View style={s.line}><Text style={s.lbl}>Discount</Text><TextInput style={s.inp} keyboardType="numeric" value={d} onChangeText={t => { setFEdit(null); setD(t); }} placeholder="0" /></View>
        <View style={s.line}><Text style={s.lbl}>Final Amount</Text><TextInput style={[s.inp, s.final]} keyboardType="numeric" value={fEdit !== null ? fEdit : String(final)} onChangeText={setFinal} /></View>
        {discount < 0 && <View style={s.line}><Text style={s.lbl}>Authorize extra charge</Text><Switch value={over} onValueChange={setOver} /></View>}
        {paidBefore > 0 && <View style={s.line}><Text style={s.lbl}>Already received</Text><Text style={s.big}>{R(paidBefore)}</Text></View>}
        <View style={s.line}><Text style={s.lbl}>Amount received</Text><TextInput style={s.inp} keyboardType="numeric" value={rec} onChangeText={setRec} placeholder="0" />
          <TouchableOpacity onPress={() => setRec(String(Math.max(0, final - paidBefore)))}><Text style={s.link}>Full</Text></TouchableOpacity></View>
        <View style={s.row}>{METHODS.map(m => <Chip key={m} t={m} sel={m === method} on={() => setMethod(m)} />)}</View>
        <View style={s.line}><Text style={s.lbl}>Balance after this payment</Text><Text style={[s.big, { color: balance > 0 ? '#b3261e' : '#1b7f3b' }]}>{R(balance)}</Text></View>
        {err && items.length > 0 ? <Text style={s.err}>{err}</Text> : null}
        <TouchableOpacity style={[s.save, err && { opacity: 0.4 }]} onPress={save}><Text style={s.saveT}>Save</Text></TouchableOpacity>
      </View>
    </ScrollView>);
}

function Dash({ A }) {
  const [f, setF] = useState('day');
  const [data, setData] = useState(null);

  useEffect(() => {
    const { from, to } = B.range(f, new Date());
    Promise.all([
      store.dashboard(A, from, to),
      store.dailyTrend(A, from, to),
      store.topItems(A, from, to, 5),
      store.categoryBreakdown(A, from, to),
    ]).then(([dash, trend, top, cats]) => {
      setData({ dash, trend, top, cats, from, to });
    }).catch(console.error);
  }, [f]);

  if (!data) {
    return (
      <View style={[s.c, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={s.mute}>Loading analytics…</Text>
      </View>
    );
  }

  const { dash, trend, top, cats } = data;
  const maxTrendRev = Math.max(...trend.map(t => t.revenue), 1);
  const catColors = ['#16A34A', '#2563EB', '#D97706', '#9333EA', '#DC2626', '#0891B2', '#4B5563'];

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 70 }} showsVerticalScrollIndicator={false}>
      {/* Date Range Selector */}
      <View style={s.rangeBar}>
        {[
          ['day', 'Today'],
          ['week', 'This week'],
          ['month', 'This month'],
        ].map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.rangePill, f === k && s.rangePillActive]}
            onPress={() => setF(k)}>
            <Text style={[s.rangeText, f === k && s.rangeTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hero Revenue Card */}
      <View style={s.heroRevCard}>
        <Text style={s.heroRevSub}>TOTAL REVENUE COLLECTED</Text>
        <Text style={s.heroRevAmount}>{R(dash.received)}</Text>
        <View style={s.heroRevDivider} />
        <View style={s.heroRevRow}>
          <View style={s.heroRevStat}>
            <Text style={s.heroRevStatLbl}>Gross Billed</Text>
            <Text style={s.heroRevStatVal}>{R(dash.original)}</Text>
          </View>
          <View style={s.heroRevStat}>
            <Text style={s.heroRevStatLbl}>Discounts</Text>
            <Text style={[s.heroRevStatVal, { color: '#FBBF24' }]}>−{R(dash.discount)}</Text>
          </View>
          <View style={s.heroRevStat}>
            <Text style={s.heroRevStatLbl}>Net Billed</Text>
            <Text style={s.heroRevStatVal}>{R(dash.final)}</Text>
          </View>
        </View>
        {dash.outstanding > 0 && (
          <View style={s.heroOutstandingBadge}>
            <Text style={s.heroOutstandingText}>⚠️ Outstanding Due: {R(dash.outstanding)}</Text>
          </View>
        )}
      </View>

      {/* Daily Revenue Trend Chart */}
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <Text style={s.chartTitle}>📈 Daily Revenue Trend</Text>
          <Text style={s.chartSub}>
            {trend.length === 1 ? 'Today' : `${trend.length} days`}
          </Text>
        </View>

        {trend.length === 1 ? (
          <View style={s.singleDayBox}>
            <View style={s.singleDayCol}>
              <Text style={s.singleDayLbl}>Today's Revenue</Text>
              <Text style={s.singleDayVal}>{R(trend[0].revenue)}</Text>
            </View>
            <View style={s.singleDayDivider} />
            <View style={s.singleDayCol}>
              <Text style={s.singleDayLbl}>Orders Placed</Text>
              <Text style={s.singleDayVal}>{trend[0].orders}</Text>
            </View>
          </View>
        ) : (
          <View style={s.trendChartWrap}>
            <View style={s.trendBarsContainer}>
              {trend.map((t, idx) => {
                const heightPct = Math.max(Math.round((t.revenue / maxTrendRev) * 100), t.revenue > 0 ? 8 : 2);
                const isMax = t.revenue > 0 && t.revenue === maxTrendRev;
                const dNum = t.date.slice(8);
                const showLabel = trend.length <= 7 || idx % 4 === 0 || idx === trend.length - 1;

                return (
                  <View key={t.date} style={s.trendBarCol}>
                    <View style={s.trendBarSlot}>
                      {t.revenue > 0 && (
                        <Text style={s.trendBarAmountText}>
                          {t.revenue >= 1000 ? `${Math.round(t.revenue / 1000)}k` : t.revenue}
                        </Text>
                      )}
                      <View
                        style={[
                          s.trendBar,
                          { height: `${heightPct}%` },
                          isMax && s.trendBarMax,
                          t.revenue === 0 && s.trendBarZero,
                        ]}
                      />
                    </View>
                    <Text style={s.trendDateLabel}>
                      {showLabel ? dNum : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.chartLegend}>Day of month (calendar days including zero sales)</Text>
          </View>
        )}
      </View>

      {/* Category Sales Distribution */}
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>🍕 Category Distribution</Text>
        {cats.length === 0 ? (
          <Text style={s.emptyChartText}>No menu sales in this period</Text>
        ) : (
          <View style={{ marginTop: 8 }}>
            {/* Multi-color Proportional Progress Bar */}
            <View style={s.catProgressBar}>
              {cats.map((c, i) => (
                <View
                  key={c.category}
                  style={{
                    flex: Math.max(c.pct, 2),
                    backgroundColor: catColors[i % catColors.length],
                    height: 12,
                  }}
                />
              ))}
            </View>

            {/* Category Breakdown Rows */}
            <View style={{ marginTop: 12 }}>
              {cats.map((c, i) => (
                <View key={c.category} style={s.catRow}>
                  <View style={s.catRowLeft}>
                    <View
                      style={[
                        s.catDot,
                        { backgroundColor: catColors[i % catColors.length] },
                      ]}
                    />
                    <Text style={s.catName}>{c.category}</Text>
                    <Text style={s.catQtyText}>({c.qty} items)</Text>
                  </View>
                  <View style={s.catRowRight}>
                    <Text style={s.catTotalText}>{R(c.total)}</Text>
                    <View style={s.catPctBadge}>
                      <Text style={s.catPctText}>{c.pct}%</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Top Performing Menu Items */}
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>⭐ Top Selling Items</Text>
        {top.length === 0 ? (
          <Text style={s.emptyChartText}>No items sold yet in this period</Text>
        ) : (
          <View style={{ marginTop: 8 }}>
            {top.map((item, idx) => {
              const maxItemQty = Math.max(...top.map(x => x.qty), 1);
              const fillPct = Math.round((item.qty / maxItemQty) * 100);

              return (
                <View key={item.name} style={s.topItemRow}>
                  <View style={s.topItemHeader}>
                    <View style={s.topItemRankBadge}>
                      <Text style={s.topItemRankText}>#{idx + 1}</Text>
                    </View>
                    <Text style={s.topItemName}>{item.name}</Text>
                    <View style={s.topItemRight}>
                      <Text style={s.topItemQty}>{item.qty} sold</Text>
                      <Text style={s.topItemTotal}>{R(item.total)}</Text>
                    </View>
                  </View>
                  <View style={s.topItemProgressTrack}>
                    <View style={[s.topItemProgressBar, { width: `${fillPct}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Payment Collections Grid */}
      <Text style={[s.chartTitle, { marginVertical: 10, marginLeft: 4 }]}>💵 Payment Method Breakdown</Text>
      <View style={s.payGrid}>
        {[
          ['Cash', dash.cash, '💵', '#16A34A'],
          ['UPI', dash.upi, '📱', '#2563EB'],
          ['Card', dash.card, '💳', '#9333EA'],
          ['Other', dash.other, '🏷️', '#4B5563'],
        ].map(([method, amount, icon, color]) => (
          <View key={method} style={s.payCard}>
            <View style={s.payCardHeader}>
              <Text style={{ fontSize: 16 }}>{icon}</Text>
              <Text style={s.payCardTitle}>{method}</Text>
            </View>
            <Text style={[s.payCardAmount, { color }]}>{R(amount)}</Text>
          </View>
        ))}
      </View>

      {/* Order Status Summary */}
      <View style={s.statusSummaryRow}>
        <View style={s.statusSummaryBox}>
          <Text style={s.statusSummaryVal}>{dash.completed}</Text>
          <Text style={s.statusSummaryLbl}>✅ Completed Orders</Text>
        </View>
        <View style={s.statusSummaryBox}>
          <Text style={[s.statusSummaryVal, { color: dash.pending > 0 ? '#DC2626' : '#16A34A' }]}>
            {dash.pending}
          </Text>
          <Text style={s.statusSummaryLbl}>⏳ Pending Tables</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function History({ A, pick, onEraseAll }) {
  const [list, setList] = useState([]), [sel, setSel] = useState(null);
  useEffect(() => { store.listOrders(A, false).then(setList); }, []);

  const handleClear = () => {
    if (onEraseAll) {
      onEraseAll();
      return;
    }
    Alert.alert(
      'Erase All Data',
      'Are you sure you want to permanently erase all previous orders, payments, and transaction history? Tables will be freed and dashboard reset to ₹0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await store.clearData(A);
              setList([]);
              Alert.alert('Database Cleared', 'All previous transaction data has been permanently erased.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#777' }}>
            {list.length === 0 ? 'No transactions' : `${list.length} Transaction${list.length > 1 ? 's' : ''}`}
          </Text>
          <TouchableOpacity onPress={handleClear} style={{ backgroundColor: '#fee2e2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' }}>
            <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '800' }}>🗑️ Erase All Data</Text>
          </TouchableOpacity>
        </View>
        {list.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📜</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#6b1d12' }}>No transactions recorded</Text>
            <Text style={[s.mute, { marginTop: 4, textAlign: 'center' }]}>The database is clean and fresh with 0 previous orders.</Text>
          </View>
        ) : (
          list.map(o => (
            <TouchableOpacity key={o.id} style={s.hRow} onPress={() => store.loadOrder(A, o.id).then(setSel)}>
              <View style={{ flex: 1 }}><Text style={s.itN}>{o.id} · Table {o.table_no}</Text><Text style={s.mute}>{o.created_at}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={s.itN}>{R(o.final)}</Text><Text style={{ color: o.status === 'paid' ? '#1b7f3b' : '#b3261e' }}>{o.status === 'paid' ? 'Paid' : `Due ${R(o.final - o.paid)}`}</Text></View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <Modal visible={!!sel} animationType="slide" onRequestClose={() => setSel(null)}>
        {sel && <ScrollView style={{ padding: 14, marginTop: 30 }}>
          <Text style={s.h}>{sel.id} · Table {sel.table_no}</Text><Text style={s.mute}>{sel.created_at}{sel.closed_at ? `  → closed ${sel.closed_at}` : ''}</Text>
          {sel.items.map((i, k) => <View key={k} style={s.line}><Text style={s.itN}>{i.name} ({R(i.price)} × {i.qty})</Text><Text style={s.itN}>{R(i.price * i.qty)}</Text></View>)}
          <View style={s.line}><Text style={s.lbl}>Original</Text><Text style={s.big}>{R(sel.original)}</Text></View>
          <View style={s.line}><Text style={s.lbl}>Discount</Text><Text style={s.big}>{R(sel.discount)}</Text></View>
          <View style={s.line}><Text style={s.lbl}>Final</Text><Text style={s.big}>{R(sel.final)}</Text></View>
          <View style={s.line}><Text style={s.lbl}>Received</Text><Text style={s.big}>{R(sel.paid)}</Text></View>
          <View style={s.line}><Text style={s.lbl}>Balance</Text><Text style={s.big}>{R(sel.final - sel.paid)}</Text></View>
          <Text style={s.h2}>Payments</Text>
          {sel.payments.length === 0 && <Text style={s.mute}>None yet</Text>}
          {sel.payments.map((p, k) => <View key={k} style={s.line}><Text style={s.itN}>{p.paid_at} · {p.method}</Text><Text style={s.itN}>{R(p.amount)}</Text></View>)}
          {sel.status === 'open' && <TouchableOpacity style={s.save} onPress={() => { const o = sel; setSel(null); pick({ table: o.table_no, id: o.id }); }}><Text style={s.saveT}>Add payment / edit</Text></TouchableOpacity>}
          <TouchableOpacity style={[s.save, { backgroundColor: '#666' }]} onPress={() => setSel(null)}><Text style={s.saveT}>Close</Text></TouchableOpacity>
        </ScrollView>}
      </Modal>
    </View>);
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#fff8f0' }, load: { margin: 80, fontSize: 18 },
  top: { backgroundColor: '#6b1d12', paddingBottom: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBrand: { flex: 1 },
  title: { color: '#ffc928', fontSize: 21, fontWeight: '800' }, sub: { color: '#fff', fontSize: 11 },
  homeBtn: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 201, 40, 0.6)' },
  homeBtnText: { color: '#ffc928', fontSize: 13, fontWeight: '700' },
  clearHeaderBtn: { backgroundColor: '#b91c1c', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#fca5a5' },
  clearHeaderBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#e8dbcb',
    backgroundColor: '#ffffff',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  tab: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, borderRadius: 12 },
  tabActive: { backgroundColor: '#fbece8' },
  tabT: { color: '#777', fontWeight: '600', fontSize: 14 },
  tabOn: { color: '#6b1d12', fontWeight: '800', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 }, msg: { width: '100%', backgroundColor: '#e3f5e8', padding: 10, margin: 4, borderRadius: 8, color: '#145c2a' },
  tbl: { width: '30%', margin: '1.5%', paddingVertical: 22, borderRadius: 12, backgroundColor: '#dff3e4', alignItems: 'center' }, busy: { backgroundColor: '#fbd9d5' },
  tn: { fontWeight: '800', fontSize: 16 }, ts: { marginTop: 4, color: '#444' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginVertical: 6 },
  backBtn: { backgroundColor: '#fbece8', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 12, borderWidth: 1, borderColor: '#f0d7a7' },
  back: { fontSize: 14, color: '#6b1d12', fontWeight: '700' },
  h: { fontSize: 18, fontWeight: '800' }, h2: { fontSize: 16, fontWeight: '800', marginTop: 12 }, mute: { color: '#777', fontSize: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#eee', marginRight: 6, marginVertical: 4 }, chipOn: { backgroundColor: '#6b1d12' }, chipT: { fontWeight: '600' },
  menuWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  item: { width: '48%', margin: '1%', padding: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f0d7a7' }, itN: { fontWeight: '600', fontSize: 14, flexShrink: 1 }, itP: { color: '#6b1d12', fontWeight: '800' },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee' },
  qb: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffc928', alignItems: 'center', justifyContent: 'center' }, qt: { fontSize: 20, fontWeight: '800' }, qn: { width: 30, textAlign: 'center', fontWeight: '800' },
  panel: { marginTop: 14, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0d7a7' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }, lbl: { fontSize: 15, flex: 1 }, big: { fontSize: 18, fontWeight: '800' },
  inp: { width: 110, borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 8, fontSize: 18, textAlign: 'right', backgroundColor: '#fffdf5' }, final: { borderColor: '#6b1d12', borderWidth: 2, fontWeight: '800' },
  link: { color: '#6b1d12', fontWeight: '800', marginLeft: 10 }, err: { color: '#b3261e', marginVertical: 4 },
  save: { backgroundColor: '#1b7f3b', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 }, saveT: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cards: { flexDirection: 'row', flexWrap: 'wrap' }, card: { width: '48%', margin: '1%', padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f0d7a7' },
  hRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },

  // Dashboard Styles
  rangeBar: { flexDirection: 'row', backgroundColor: '#EDE0D4', borderRadius: 12, padding: 4, marginBottom: 14 },
  rangePill: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  rangePillActive: { backgroundColor: '#6b1d12' },
  rangeText: { fontSize: 13, fontWeight: '700', color: '#777' },
  rangeTextActive: { color: '#fff', fontWeight: '800' },

  heroRevCard: {
    backgroundColor: '#38160E',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroRevSub: { color: '#E5D5C8', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  heroRevAmount: { color: '#FBBF24', fontSize: 36, fontWeight: '900', marginVertical: 6 },
  heroRevDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 10 },
  heroRevRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroRevStat: { flex: 1 },
  heroRevStatLbl: { color: '#CBB2A3', fontSize: 11, fontWeight: '600' },
  heroRevStatVal: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
  heroOutstandingBadge: { backgroundColor: 'rgba(220, 38, 38, 0.25)', padding: 8, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#DC2626' },
  heroOutstandingText: { color: '#FCA5A5', fontSize: 12, fontWeight: '800', textAlign: 'center' },

  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE5D9',
    shadowColor: '#38160E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartTitle: { fontSize: 15, fontWeight: '800', color: '#38160E' },
  chartSub: { fontSize: 12, color: '#888', fontWeight: '600' },
  chartLegend: { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 8 },
  emptyChartText: { color: '#888', fontSize: 13, fontStyle: 'italic', marginVertical: 10, textAlign: 'center' },

  singleDayBox: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  singleDayCol: { flex: 1, alignItems: 'center' },
  singleDayDivider: { width: 1, height: 34, backgroundColor: '#EEE' },
  singleDayLbl: { fontSize: 12, color: '#777', fontWeight: '600' },
  singleDayVal: { fontSize: 20, fontWeight: '900', color: '#16A34A', marginTop: 2 },

  trendChartWrap: { marginTop: 4 },
  trendBarsContainer: { flexDirection: 'row', height: 130, alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 16 },
  trendBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', marginHorizontal: 1 },
  trendBarSlot: { width: '85%', height: '80%', justifyContent: 'flex-end', alignItems: 'center' },
  trendBarAmountText: { fontSize: 9, fontWeight: '700', color: '#6b1d12', marginBottom: 2 },
  trendBar: { width: '100%', backgroundColor: '#F59E0B', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  trendBarMax: { backgroundColor: '#16A34A' },
  trendBarZero: { backgroundColor: '#DDD', height: 2 },
  trendDateLabel: { fontSize: 9, color: '#666', marginTop: 4, fontWeight: '600' },

  catProgressBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#EEE', marginVertical: 6 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#F5F0EA' },
  catRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  catName: { fontSize: 13, fontWeight: '700', color: '#333' },
  catQtyText: { fontSize: 11, color: '#888', marginLeft: 6 },
  catRowRight: { flexDirection: 'row', alignItems: 'center' },
  catTotalText: { fontSize: 13, fontWeight: '800', color: '#38160E', marginRight: 8 },
  catPctBadge: { backgroundColor: '#F3E9DF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catPctText: { fontSize: 10, fontWeight: '800', color: '#6b1d12' },

  topItemRow: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F5F0EA' },
  topItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  topItemRankBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F3E9DF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  topItemRankText: { fontSize: 11, fontWeight: '800', color: '#6b1d12' },
  topItemName: { fontSize: 13, fontWeight: '700', color: '#333', flex: 1 },
  topItemRight: { flexDirection: 'row', alignItems: 'center' },
  topItemQty: { fontSize: 11, color: '#888', marginRight: 8, fontWeight: '600' },
  topItemTotal: { fontSize: 13, fontWeight: '800', color: '#38160E' },
  topItemProgressTrack: { height: 4, backgroundColor: '#F0E8DF', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  topItemProgressBar: { height: 4, backgroundColor: '#D97706', borderRadius: 2 },

  payGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  payCard: { width: '48.5%', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EFE5D9' },
  payCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  payCardTitle: { fontSize: 12, fontWeight: '700', color: '#777', marginLeft: 6 },
  payCardAmount: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  statusSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  statusSummaryBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginHorizontal: 3, borderWidth: 1, borderColor: '#EFE5D9', alignItems: 'center' },
  statusSummaryVal: { fontSize: 20, fontWeight: '900', color: '#38160E' },
  statusSummaryLbl: { fontSize: 11, fontWeight: '700', color: '#777', marginTop: 2 },
});
