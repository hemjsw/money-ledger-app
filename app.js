/* Money Ledger phone app. Reads the overview the PC pushes to the Google Sheet and shows it
   in the Slip Ledger "Gamer Red" look. This file holds no financial data. */
(function () {
'use strict';

var TH_M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var INCOME = ['เงินเดือน', 'รายได้อื่น'];
var SAVE = 'ออม/ลงทุน', SHARE = 'รับคืนค่าหาร';
var COL = {
  'ค่างวดรถ': '#FF3346', 'ค่าเช่าที่พัก': '#C8202F', 'บิล/ค่าบริการ': '#FF8A96', 'ช้อปปิ้ง': '#FFB020',
  'อาหารและเครื่องดื่ม': '#F97316', 'เดินทาง': '#22D3EE', 'โอนให้บุคคล': '#A78BFA', 'เติมเงิน e-Wallet': '#60A5FA',
  'บันเทิง': '#F472B6', 'สุขภาพ': '#34D399', 'ครอบครัว': '#FACC15', 'อื่น ๆ': '#8A8A9A', 'ไม่แน่ใจ': '#6B6B7A',
  'รับคืนค่าหาร': '#22D3EE', 'เงินเดือน': '#22D3EE', 'รายได้อื่น': '#22D3EE', 'ออม/ลงทุน': '#34D399'
};
var ICON = {
  'ค่างวดรถ': '<path d="M4 15v-3l2-5h12l2 5v3"/><path d="M4 15h16v3H4z"/><path d="M7 18v2M17 18v2"/>',
  'ค่าเช่าที่พัก': '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  'บิล/ค่าบริการ': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
  'ช้อปปิ้ง': '<path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  'อาหารและเครื่องดื่ม': '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-2 6 0 8v10"/>',
  'เดินทาง': '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-5l3-5h9l4 5h2v5h-2M9 17h6"/>',
  'โอนให้บุคคล': '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
  'เติมเงิน e-Wallet': '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z"/>',
  'บันเทิง': '<rect x="3" y="8" width="18" height="10" rx="4"/><path d="M8 11v4M6 13h4"/><circle cx="16" cy="12" r=".8" fill="currentColor"/><circle cx="17.5" cy="14.5" r=".8" fill="currentColor"/>',
  'สุขภาพ': '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M12 10v5M9.5 12.5h5"/>',
  'ครอบครัว': '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3 19c.6-3 2.5-5 5-5s4.4 2 5 5M11 19c.6-3 2.5-5 5-5s4.4 2 5 5"/>',
  'อื่น ๆ': '<circle cx="7" cy="7" r="1.6" fill="currentColor"/><circle cx="17" cy="7" r="1.6" fill="currentColor"/><circle cx="7" cy="17" r="1.6" fill="currentColor"/><circle cx="17" cy="17" r="1.6" fill="currentColor"/>',
  'ไม่แน่ใจ': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".7" fill="currentColor"/>',
  'รับคืนค่าหาร': '<path d="M4 8h14l-3-3M20 16H6l3 3"/>'
};
var TABS = [['home', 'ภาพรวม'], ['recur', 'ประจำ'], ['check', 'ต้องเช็ก']];

var D = null;            // payload: {generated, per: {YYYY-MM: {category: signed baht}}, fresh: [[label, date]], check: [...]}
var UI = {tab: 'home', m: null, anim: true, err: '', sub: null, answered: {}, toast: ''};  // sub: {t:'list', cat} | {t:'recur', k}
// OAuth "Web application" client from the money-ledger Google Cloud project (public by design, not a secret)
var CLIENT_ID = '127920884653-ns804fdeufu8qhjqula316uvho4bdba0.apps.googleusercontent.com';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
function fmt(n) { var a = Math.abs(n), f = Math.abs(a % 1) > 0.004; return (n < 0 ? '-' : '') + '฿' + a.toLocaleString('en-US', {minimumFractionDigits: f ? 2 : 0, maximumFractionDigits: f ? 2 : 0}); }
function fmt0(n) { return (n < 0 ? '-' : '') + '฿' + Math.round(Math.abs(n)).toLocaleString('en-US'); }
function thMonth(m) { return TH_M[+m.slice(5) - 1] + ' ' + (+m.slice(0, 4) + 543); }
function thShort(d) { return +d.slice(8) + ' ' + TH_M[+d.slice(5, 7) - 1]; }
function icon(cat, size) {
  var px = Math.round(size * 0.62);
  return '<span class="ci" style="color:' + (COL[cat] || '#8A8A9A') + ';width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 24 24" width="' + px + '" height="' + px +
    '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[cat] || ICON['อื่น ๆ']) + '</svg></span>';
}
function months() { return Object.keys(D.per).sort(); }
function monthEnd(m) { var d = new Date(+m.slice(0, 4), +m.slice(5), 0); return m + '-' + String(d.getDate()).padStart(2, '0'); }

/* one month's numbers: spend is positive money out (shares paid back reduce it) */
function summary(m) {
  var c = D.per[m] || {}, inc = 0, save = 0, spend = 0, cats = {}, share = 0;
  Object.keys(c).forEach(function (k) {
    var v = c[k];
    if (INCOME.indexOf(k) >= 0) inc += v;
    else if (k === SAVE) save -= v;
    else { spend -= v; if (k === SHARE) share = v; else cats[k] = -v; }
  });
  return {inc: inc, save: save, spend: spend, left: inc - spend - save, cats: cats, share: share,
          salary: c['เงินเดือน'] || 0, other: c['รายได้อื่น'] || 0};
}
/* accounts whose latest statement stops before the month ends */
function lagging(m) {
  var end = monthEnd(m);
  return D.fresh.filter(function (f) { return f[1] && f[1] < end && f[1] >= m + '-01'; });
}

function homeView() {
  var ml = months(), m = UI.m, i = ml.indexOf(m), s = summary(m);
  var prevM = i > 0 ? ml[i - 1] : null, p = prevM ? summary(prevM) : null;
  var lag = lagging(m), today = new Date().toISOString().slice(0, 7);
  var partial = m >= today ? 'เดือนนี้ยังไม่จบ ตัวเลขจะเพิ่มขึ้นเรื่อย ๆ' :
    lag.length ? 'ยังไม่ครบ: ' + lag.map(function (f) { return esc(f[0].split(' (')[0]) + ' ถึง ' + thShort(f[1]); }).join(', ') : '';

  var cats = Object.keys(s.cats).filter(function (k) { return s.cats[k] > 0; }).sort(function (a, b) { return s.cats[b] - s.cats[a]; });
  var gross = cats.reduce(function (t, k) { return t + s.cats[k]; }, 0);
  var track = cats.map(function (k) { return '<div style="flex:' + s.cats[k] + ' 1 0px;background:' + COL[k] + '"></div>'; }).join('');
  var legend = cats.map(function (k) {
    return '<button class="li link" data-act="cat" data-cat="' + esc(k) + '" aria-label="ดูรายการหมวด ' + esc(k) + '">' + icon(k, 26) + '<span class="nm">' + esc(k) +
      '</span><span class="mono">' + fmt0(s.cats[k]) + '</span><span class="pc mono">' + Math.round(s.cats[k] / gross * 100) + '%</span><span class="chev">›</span></button>';
  }).join('') + (s.share ? '<div class="li sub">' + icon(SHARE, 26) + '<span class="nm">หักเงินคืนค่าหาร</span><span class="mono">-' + fmt0(s.share) + '</span><span class="pc"></span></div>' : '');

  var six = ml.slice(Math.max(0, i - 5), i + 1);
  var vals = six.map(function (x) { var t = summary(x); return [t.inc, t.spend]; });
  var mx = Math.max.apply(null, vals.map(function (v) { return Math.max(v[0], v[1]); }).concat([1]));
  var bars = six.map(function (x, j) {
    return '<div class="g' + (x === m ? ' on' : '') + '" title="' + thMonth(x) + '"><i class="in" style="height:' + Math.round(vals[j][0] / mx * 130) +
      'px"></i><i class="out" style="height:' + Math.round(vals[j][1] / mx * 130) + 'px"></i></div>';
  }).join('');
  var lbls = six.map(function (x) { return '<span' + (x === m ? ' class="on"' : '') + '>' + TH_M[+x.slice(5) - 1] + '</span>'; }).join('');

  var deltas = '<div class="muted">ยังไม่มีเดือนก่อนให้เทียบ</div>';
  if (p) {
    var keys = {}; Object.keys(s.cats).concat(Object.keys(p.cats)).forEach(function (k) { keys[k] = 1; });
    var rows = Object.keys(keys).map(function (k) { var c = s.cats[k] || 0, o = p.cats[k] || 0; return {k: k, c: c, d: c - o}; })
      .filter(function (r) { return Math.abs(r.d) >= 1; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 6);
    deltas = rows.map(function (r) {
      return '<div class="delta"><span>' + icon(r.k, 22) + esc(r.k) + '</span><span><span class="mono muted" style="margin-right:10px">' + fmt0(r.c) +
        '</span><span class="mono ' + (r.d >= 0 ? 'up' : 'down') + '">' + (r.d >= 0 ? '+' : '-') + fmt0(Math.abs(r.d)).replace('-', '') + '</span></span></div>';
    }).join('');
  }
  var spendChip = p && p.spend > 0 ? (s.spend >= p.spend ? '<span class="chip">รายจ่าย +' : '<span class="chip cy">รายจ่าย ') +
    ((s.spend - p.spend) / p.spend * 100).toFixed(0) + '% vs ' + TH_M[+prevM.slice(5) - 1] + '</span>' : '';

  return header('MONEY LEDGER', 'ภาพรวม') +
    '<section class="hero' + (s.left < 0 ? ' neg' : '') + '"><div><div class="lb">' + (s.left < 0 ? 'ใช้เกินรายรับ' : 'เหลือเก็บเดือนนี้') + '</div>' +
      '<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="big ' + (s.left < 0 ? 'neg' : 'pos') + '" data-v="' + s.left + '">' + fmt0(s.left) + '</span>' + spendChip + '</div></div>' +
      '<div class="split"><div><div class="k">รายรับ</div><div class="v pos">' + fmt0(s.inc) + '</div></div><div><div class="k">รายจ่าย</div><div class="v neg">' + fmt0(s.spend) +
      '</div></div><div><div class="k">ออม/ลงทุน</div><div class="v">' + fmt0(s.save) + '</div></div></div>' +
      '<div class="kv muted"><span>เงินเดือน ' + fmt0(s.salary) + '</span><span>รายได้อื่น ' + fmt0(s.other) + '</span></div></section>' +
    (partial ? '<div class="note">' + partial + '</div>' : '') +
    '<section class="card"><div class="hd"><h2>รายจ่ายแยกหมวด</h2><span class="muted" style="font-size:12px">แตะหมวดเพื่อดูรายการ</span></div>' + (gross > 0 ? '<div class="track" role="img" aria-label="สัดส่วนรายจ่ายตามหมวด">' + track + '</div><div class="legend">' + legend + '</div>' : '<div class="muted">ยังไม่มีรายจ่าย</div>') + '</section>' +
    '<section class="card"><div class="hd"><h2>จ่ายก้อนใหญ่สุด</h2><button class="lnk" data-act="cat" data-cat="">ดูทั้งหมด ›</button></div>' +
      (spendOf(m, null).slice(0, 5).map(rowHTML).join('') || '<div class="muted">ยังไม่มีรายจ่าย</div>') + '</section>' +
    '<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2>รายรับ vs รายจ่าย</h2><div class="keys"><span><b style="background:var(--cyan)"></b>รับ</span><span><b style="background:var(--r1)"></b>จ่าย</span></div></div>' +
      '<div class="bars" role="img" aria-label="รายรับและรายจ่ายย้อนหลัง">' + bars + '</div><div class="bl">' + lbls + '</div></section>' +
    '<section class="card"><h2>เปลี่ยนจากเดือนก่อน</h2>' + deltas + '</section>' +
    '<section class="card"><h2>ข้อมูลล่าสุด</h2>' + D.fresh.map(function (f) { return '<div class="kv"><span class="muted">' + esc(f[0]) + '</span><span class="mono">' + esc(f[1]) + '</span></div>'; }).join('') +
      '<div class="kv muted"><span>อัปเดตจากคอม</span><span class="mono">' + esc(D.generated.replace('T', ' ')) + '</span></div></section>';
}

/* ---------- transaction lists ---------- */
var CLEAN = [
  [/^ชำระเงิน (K PLUS|MAKE by KBank|EDC\/K SHOP\/MYQR) เพื่อชำระ /, ''], [/^โอนเงิน (K PLUS|MAKE by KBank) /, ''],
  [/^รับโอนเงิน .*?จาก /, 'รับจาก '], [/^หักบัญชี Online Direct Debit /, 'ตัดบัญชี '], [/Ref X\w+ /g, ''], [/\s*\(ชื่อบัญชี:.*$/, ''],
  [/~.*$/, ''], [/\s*\((IORS|NMPS|BS)[A-Z0-9]*\)/, ''],  // KTB transaction codes
  [/\[NAME\] \[OWNER\]/g, '••• (ครอบครัว)'], [/(นางสาว|นาย|นาง|น\.ส\.)?\s*\[OWNER\](\s*\[OWNER\])?/g, 'บัญชีตัวเอง'], [/\[NAME\]/g, '•••']
];
function clean(s) { CLEAN.forEach(function (r) { s = s.replace(r[0], r[1]); }); return s.trim(); }
function inMonth(m) { return D.txns.filter(function (t) { return t[0].slice(0, 7) === m; }); }
/* money out of the month (cat null = every spending category), biggest first */
function spendOf(m, cat) {
  return inMonth(m).filter(function (t) {
    return cat ? t[3] === cat : t[4] < 0 && INCOME.indexOf(t[3]) < 0 && t[3] !== SAVE;
  }).sort(function (a, b) { return a[4] - b[4]; });
}
function rowHTML(t) {
  return '<div class="item">' + icon(t[3], 34) + '<div class="body"><div class="nm">' + esc(clean(t[2])) + '</div><div class="meta">' +
    esc(thShort(t[0]) + ' · ' + t[1]) + '</div></div><div class="amt' + (t[4] > 0 ? ' pos' : '') + '">' + (t[4] > 0 ? '+' : '') + fmt(Math.abs(t[4])) + '</div></div>';
}
function back(label) { return '<button class="back" data-act="back">‹ ' + label + '</button>'; }

function listView(cat) {
  var m = UI.m, rows = spendOf(m, cat), total = rows.reduce(function (s, t) { return s + t[4]; }, 0);
  return back(UI.tab === 'recur' ? 'ประจำ' : 'ภาพรวม') +
    '<div class="topbar"><div style="display:flex;gap:10px;align-items:center;min-width:0">' + (cat ? icon(cat, 40) : '') + '<div style="min-width:0"><div class="eyebrow">' +
    esc(thMonth(m)) + '</div><h1>' + esc(cat || 'รายจ่ายทั้งหมด') + '</h1></div></div></div>' +
    '<div class="card"><div class="kv"><span class="muted">รวม ' + rows.length + ' รายการ</span><span class="mono" style="font-weight:700;font-size:18px">' +
    fmt0(Math.abs(total)) + '</span></div></div>' + (rows.map(rowHTML).join('') || '<div class="card muted">ไม่มีรายการ</div>');
}

/* ---------- recurring ---------- */
function median(a) { if (!a.length) return 0; a = a.slice().sort(function (x, y) { return x - y; }); var h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; }
function recurGroups(m) {
  var g = {}, today = new Date().toISOString().slice(0, 7);
  D.txns.forEach(function (t) {
    var x = g[t[5]] || (g[t[5]] = {k: t[5], cat: t[3], months: {}, items: []});
    x.months[t[0].slice(0, 7)] = (x.months[t[0].slice(0, 7)] || 0) + t[4];
    x.items.push(t);
  });
  return Object.keys(g).map(function (k) { return g[k]; }).filter(function (x) {
    var ms = Object.keys(x.months);
    return ms.length >= 2 && ms.some(function (y) { return y <= m; });
  }).map(function (x) {
    var cur = x.months[m] || 0, ms = Object.keys(x.months), before = ms.filter(function (y) { return y < m; });
    var amts = x.items.map(function (t) { return Math.abs(t[4]); });
    var perMonth = {}; x.items.forEach(function (t) { perMonth[t[0].slice(0, 7)] = (perMonth[t[0].slice(0, 7)] || 0) + 1; });
    // fixed = a bill/instalment: at most 2 payments a month, all within 15% of each other
    x.fixed = Math.max.apply(null, ms.map(function (y) { return perMonth[y]; })) <= 2 && Math.max.apply(null, amts) <= Math.min.apply(null, amts) * 1.15;
    var sign = x.items[0][4] < 0 ? -1 : 1;
    x.typ = x.fixed ? sign * median(amts) : median(ms.filter(function (y) { return y !== m; }).map(function (y) { return x.months[y]; }));
    x.cur = cur; x.n = ms.length;
    var a = Math.abs(cur), ta = Math.abs(x.typ);
    if (!cur) x.flag = m >= today ? 'wait' : before.length && x.fixed && ta >= 200 ? 'missing' : 'none';
    else if (x.fixed) x.flag = a - ta > Math.max(ta * 0.1, 20) ? 'high' : ta - a > Math.max(ta * 0.1, 20) ? 'low' : '';
    else x.flag = a > ta * 1.5 && a - ta >= 500 ? 'high' : '';
    return x;
  });
}
var FLAG = {high: ['chip', 'สูงกว่าปกติ'], low: ['chip cy', 'ต่ำกว่าปกติ'], missing: ['chip am', 'เดือนนี้ไม่มี'], wait: ['chip mu', 'ยังไม่ตัด']};
function recurRow(x) {
  var f = FLAG[x.flag], diff = Math.abs(x.cur) - Math.abs(x.typ);
  return '<button class="item link" data-act="recur" data-key="' + esc(x.k) + '">' + icon(x.cat, 34) + '<div class="body"><div class="nm">' + esc(clean(x.k)) + '</div><div class="meta">' + (x.fixed ? 'ปกติครั้งละ ' : 'ปกติเดือนละ ') +
    fmt0(Math.abs(x.typ)) + ' · มี ' + x.n + ' เดือน</div>' + (f ? '<div style="margin-top:4px"><span class="' + f[0] + '">' + f[1] +
    (x.flag === 'high' || x.flag === 'low' ? ' ' + (diff > 0 ? '+' : '-') + fmt0(Math.abs(diff)) : '') + '</span></div>' : '') +
    '</div><div class="amt' + (x.cur > 0 ? ' pos' : '') + '">' + (x.cur ? fmt0(Math.abs(x.cur)) : '–') + '</div></button>';
}
function recurView() {
  var all = recurGroups(UI.m).filter(function (x) { return x.flag !== 'none'; });
  var by = function (a, b) { return Math.abs(b.typ) - Math.abs(a.typ); };
  var odd = /high|low|missing/;
  var out = all.filter(function (x) { return x.typ < 0; });
  var flagged = out.filter(function (x) { return odd.test(x.flag); }).sort(by);
  var fixed = out.filter(function (x) { return x.fixed && !odd.test(x.flag); }).sort(by);
  var often = out.filter(function (x) { return !x.fixed && !odd.test(x.flag); }).sort(by);
  var inc = all.filter(function (x) { return x.typ > 0; }).sort(by);
  var fixedSum = out.filter(function (x) { return x.fixed; }).reduce(function (s, x) { return s + Math.abs(x.typ); }, 0);
  return header('RECURRING', 'รายการประจำ') +
    '<div class="card"><span class="muted">ค่าใช้จ่ายคงที่ต่อเดือน (บิล ค่างวด ค่าเช่า ประกัน)</span><span class="big" style="font-size:28px">' + fmt0(fixedSum) +
    '</span><div class="meta">นับผู้รับที่จ่ายซ้ำมากกว่า 1 เดือน · ยอดคงที่ เตือนเมื่อเปลี่ยนเกิน 10% · จ่ายบ่อย เตือนเมื่อสูงกว่าปกติ 50% ขึ้นไป</div></div>' +
    (flagged.length ? '<h2 class="sec">ยอดแปลกเดือนนี้ <span class="badge">' + flagged.length + '</span></h2>' + flagged.map(recurRow).join('') :
      '<div class="card"><b>ไม่มียอดแปลก</b><span class="muted">รายการประจำเดือนนี้ใกล้เคียงปกติทั้งหมด</span></div>') +
    (fixed.length ? '<h2 class="sec">ยอดคงที่</h2>' + fixed.map(recurRow).join('') : '') +
    (often.length ? '<h2 class="sec">จ่ายบ่อย (ยอดไม่คงที่)</h2>' + often.map(recurRow).join('') : '') +
    (inc.length ? '<h2 class="sec">เงินเข้าประจำ</h2>' + inc.map(recurRow).join('') : '');
}
function recurDetail(k) {
  var x = recurGroups(UI.m).filter(function (g) { return g.k === k; })[0];
  if (!x) return back('ประจำ') + '<div class="card muted">ไม่พบรายการ</div>';
  var ms = Object.keys(x.months).sort(), mx = Math.max.apply(null, ms.map(function (y) { return Math.abs(x.months[y]); }).concat([1]));
  var bars = ms.map(function (y) {
    var v = Math.abs(x.months[y]);
    return '<div class="hb' + (y === UI.m ? ' on' : '') + '"><span class="thm">' + thMonth(y) + '</span><i style="width:' + Math.max(2, Math.round(v / mx * 100)) +
      '%"></i><span class="mono">' + fmt0(v) + '</span></div>';
  }).join('');
  return back('ประจำ') + '<div class="topbar"><div style="display:flex;gap:10px;align-items:center;min-width:0">' + icon(x.cat, 40) +
    '<div style="min-width:0"><div class="eyebrow">' + esc(x.cat) + '</div><h1 style="font-size:20px;overflow-wrap:anywhere">' + esc(clean(x.k)) + '</h1></div></div></div>' +
    '<div class="card"><div class="hd"><h2>ยอดแต่ละเดือน</h2><span class="muted" style="font-size:12px">ปกติ ' + fmt0(Math.abs(x.typ)) + '</span></div>' + bars + '</div>' +
    '<h2 class="sec">ทุกครั้งที่จ่าย</h2>' + x.items.map(rowHTML).join('');
}

function header(eyebrow, title) {
  var ml = months(), i = ml.indexOf(UI.m);
  return '<div class="topbar"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1></div><div class="mnav">' +
    '<button data-act="mprev" aria-label="เดือนก่อนหน้า"' + (i <= 0 ? ' disabled' : '') + '>‹</button><span class="thm" style="min-width:84px;text-align:center">' + thMonth(UI.m) +
    '</span><button data-act="mnext" aria-label="เดือนถัดไป"' + (i >= ml.length - 1 ? ' disabled' : '') + '>›</button></div></div>';
}

function checkView() {
  var rows = D.check;
  var list = rows.length ? rows.map(function (r) {
    var id = r[6], done = UI.answered[id];
    var opts = '<option value="">เลือกหมวดที่ถูก…</option>' + (D.cats || []).map(function (c) { return '<option' + (c === r[3] ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    return '<div class="item col"><div class="row">' + icon(done || r[3], 36) + '<div class="body"><div class="nm">' + esc(clean(r[2])) + '</div><div class="meta">' + esc(thShort(r[0]) + ' · ' + r[1]) +
      '</div><div class="meta">ตอนนี้: ' + esc(r[3]) + ' · ' + esc(r[5]) + '</div></div><div class="amt' + (r[4] > 0 ? ' pos' : '') + '">' + fmt(r[4]) + '</div></div>' +
      (done ? '<div class="ok">✓ บันทึกเป็น "' + esc(done) + '" แล้ว · มีผลตอนคอมรันรอบถัดไป</div>' :
        '<div class="row"><select id="ans-' + id + '" aria-label="หมวดที่ถูกของรายการนี้">' + opts + '</select><button class="btn red" data-act="answer" data-id="' + id + '">บันทึก</button></div>') + '</div>';
  }).join('') : '<div class="card"><b>ไม่มีอะไรค้าง</b><span class="muted">ทุกรายการมีหมวดแล้ว</span></div>';
  return '<div><div class="eyebrow">TO CHECK</div><h1>ต้องเช็ก</h1></div>' +
    (rows.length ? '<div class="meta">เลือกหมวดแล้วกดบันทึก ถ้าหมวดเดิมถูกอยู่แล้วก็กดบันทึกเพื่อยืนยัน ร้านเดิมครั้งหน้าระบบจะจัดให้เอง</div>' : '') + list;
}

function countUp() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var el = document.querySelector('.big[data-v]'); if (!el) return;
  var v = +el.dataset.v, t0 = performance.now();
  (function step(t) {
    var p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt0(p < 1 ? v * e : v);
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

function render() {
  var app = document.getElementById('app'), tabs = document.getElementById('tabs');
  if (!D) { app.innerHTML = '<div><div class="eyebrow">MONEY LEDGER</div><h1>ภาพรวม</h1></div><div class="card">' + (UI.err || 'กำลังโหลด…') + '</div>'; tabs.innerHTML = ''; return; }
  var anim = UI.anim; UI.anim = false;
  app.innerHTML = UI.sub ? (UI.sub.t === 'list' ? listView(UI.sub.cat) : recurDetail(UI.sub.k)) :
    UI.tab === 'check' ? checkView() : UI.tab === 'recur' ? recurView() : homeView();
  app.className = anim ? 'enter' : '';
  if (anim) Array.prototype.forEach.call(app.children, function (c, i) { c.style.animationDelay = Math.min(i, 9) * 45 + 'ms'; });
  tabs.innerHTML = TABS.map(function (t) {
    var badge = t[0] === 'check' && D.check.length ? '<span class="badge">' + D.check.length + '</span>' : '';
    return '<button data-act="tab" data-tab="' + t[0] + '"' + (UI.tab === t[0] ? ' aria-current="page"' : '') + '><i></i><span>' + t[1] + badge + '</span></button>';
  }).join('');
  if (UI.toast) app.insertAdjacentHTML('beforeend', '<div class="toast" role="status">' + esc(UI.toast) + '</div>');
  if (anim) countUp();
}

document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  var ml = D ? months() : [], i = ml.indexOf(UI.m);
  var a = b.dataset.act, top = false;
  if (a === 'tab') { UI.tab = b.dataset.tab; UI.sub = null; top = true; }
  else if (a === 'mprev' && i > 0) UI.m = ml[i - 1];
  else if (a === 'mnext' && i < ml.length - 1) UI.m = ml[i + 1];
  else if (a === 'cat') { UI.y = window.scrollY; UI.sub = {t: 'list', cat: b.dataset.cat || null}; top = true; }
  else if (a === 'recur') { UI.y = window.scrollY; UI.sub = {t: 'recur', k: b.dataset.key}; top = true; }
  else if (a === 'back') { UI.sub = null; }
  UI.anim = true;
  render();
  window.scrollTo(0, top ? 0 : a === 'back' ? UI.y || 0 : window.scrollY);
});

function load(payload) {
  D = payload; UI.err = '';
  var ml = months(), today = new Date().toISOString().slice(0, 7);
  // open on the latest finished month; the running month is one tap away
  if (!UI.m || ml.indexOf(UI.m) < 0) UI.m = ml.filter(function (m) { return m < today; }).pop() || ml[ml.length - 1];
  UI.anim = true; render();
}

/* ---------- Google: sign in, read the hidden app_data tab, write ต้องเช็ก answers ---------- */
var SCOPE = 'https://www.googleapis.com/auth/drive.file';  // only files this app's project created (the Sheet)
var API = 'https://sheets.googleapis.com/v4/spreadsheets/';
var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
var store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
};
var tokenClient = null;

// one-time setup link from the PC: .../#sheet=<id>  (kept on this phone only)
(function () {
  var m = location.hash.match(/sheet=([\w-]{20,})/);
  if (m) { store.set('ml.sheet', m[1]); history.replaceState(null, '', location.pathname); }
})();
window.addEventListener('hashchange', function () { if (/sheet=/.test(location.hash)) location.reload(); });
function sheetId() { return store.get('ml.sheet'); }
function token() { var t = store.get('ml.token'), exp = +store.get('ml.exp') || 0; return t && Date.now() < exp - 60000 ? t : null; }

function gapi(path, opts) {
  opts = opts || {};
  return fetch(API + sheetId() + path, {method: opts.method || 'GET', headers: {'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'},
    body: opts.body ? JSON.stringify(opts.body) : undefined}).then(function (r) {
    if (r.status === 401) { store.set('ml.token', null); throw new Error('signin'); }
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  });
}
function fetchData() {
  UI.err = 'กำลังโหลดจาก Google Sheet…'; render();
  return gapi('/values/app_data!A:A').then(function (j) {
    load(JSON.parse((j.values || []).map(function (r) { return r[0]; }).join('')));
  }).catch(function (e) { showGate(e.message === 'signin' ? '' : 'โหลดไม่สำเร็จ (' + e.message + ') ลองเข้าสู่ระบบใหม่'); });
}
function showGate(msg) {
  D = null;
  UI.err = (msg ? '<div class="msg-err">' + esc(msg) + '</div>' : '') +
    '<p>เข้าสู่ระบบ Google ด้วยบัญชีเดียวกับชีต "รายรับรายจ่าย Swim" แอปจะอ่านได้เฉพาะชีตนั้น</p>' +
    '<button class="btn red" data-act="signin">เข้าสู่ระบบด้วย Google</button>';
  render();
}
function signIn() {
  if (!window.google || !google.accounts) { showGate('โหลดระบบล็อกอินของ Google ไม่ได้ ตรวจเน็ตแล้วลองใหม่'); return; }
  tokenClient = tokenClient || google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPE,
    callback: function (r) {
      if (r.error || !r.access_token) { showGate('เข้าสู่ระบบไม่สำเร็จ'); return; }
      store.set('ml.token', r.access_token); store.set('ml.exp', String(Date.now() + r.expires_in * 1000));
      fetchData();
    }
  });
  tokenClient.requestAccessToken({prompt: ''});
}
/* write the picked category into ต้องเช็ก column G of the row whose hidden id (column H) matches */
function saveAnswer(id, cat) {
  if (LOCAL) return Promise.resolve();  // preview: nothing to write to
  return gapi('/values/' + encodeURIComponent('ต้องเช็ก!H2:H')).then(function (j) {
    var rows = (j.values || []).map(function (r) { return String(r[0]); }), i = rows.indexOf(String(id));
    if (i < 0) throw new Error('ไม่พบรายการในชีต');
    return gapi('/values/' + encodeURIComponent('ต้องเช็ก!G' + (i + 2)) + '?valueInputOption=RAW', {method: 'PUT', body: {values: [[cat]]}});
  });
}

document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'signin') { e.stopImmediatePropagation(); signIn(); }
  else if (b.dataset.act === 'setsheet') {
    e.stopImmediatePropagation();
    var v = (document.getElementById('sheetLink') || {}).value || '', id = (v.match(/\/d\/([\w-]{20,})/) || v.match(/^([\w-]{20,})$/) || [])[1];
    if (!id) { alertMsg('ลิงก์ไม่ถูกต้อง ต้องเป็นลิงก์ของ Google Sheets'); return; }
    store.set('ml.sheet', id);
    if (token()) fetchData(); else showGate('');
  }
  else if (b.dataset.act === 'answer') {
    e.stopImmediatePropagation();
    var id = b.dataset.id, sel = document.getElementById('ans-' + id);
    if (!sel || !sel.value) return;
    b.disabled = true; b.textContent = 'กำลังบันทึก…';
    saveAnswer(id, sel.value).then(function () { UI.answered[id] = sel.value; render(); })
      .catch(function (err) { b.disabled = false; b.textContent = 'บันทึก'; alertMsg(err.message === 'signin' ? 'หมดเวลาล็อกอิน กดเข้าสู่ระบบใหม่' : err.message); });
  }
}, true);
function alertMsg(t) { UI.toast = t; render(); setTimeout(function () { UI.toast = ''; render(); }, 3500); }

render();
if (LOCAL) {
  // Local preview reads data.local.json (made on the PC, never uploaded).
  fetch('data.local.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(load)
    .catch(function () { UI.err = 'ไม่พบ data.local.json'; render(); });
} else if (!sheetId()) {
  UI.err = '<p>ตั้งค่าครั้งแรก: เปิดชีต "รายรับรายจ่าย Swim" ในแอป Google Sheets → แชร์ → คัดลอกลิงก์ แล้ววางที่นี่</p>' +
    '<input class="pw" id="sheetLink" type="url" inputmode="url" autocomplete="off" placeholder="https://docs.google.com/spreadsheets/d/…" aria-label="ลิงก์ชีต">' +
    '<button class="btn red" data-act="setsheet">บันทึก</button>';
  render();
} else if (token()) fetchData();
else showGate('');

if ('serviceWorker' in navigator && !LOCAL) navigator.serviceWorker.register('sw.js');
})();
