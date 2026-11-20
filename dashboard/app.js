// Token Radar's page: the board, its filters and its detail view, from window.RADAR.
// No fetch and no network: data.js carries the whole dataset. The farm plan is derived here
// from the row's own record (category, chains, TVL, age) with the same rules lib/model.ts uses,
// so the page and board.json can never drift apart.

const DATA = window.RADAR || null;

const $ = (id) => document.getElementById(id);
const els = {
  asOf: $('asOf'), statTotal: $('statTotal'), statRows: $('statRows'), statWatch: $('statWatch'),
  statLive: $('statLive'), q: $('q'), category: $('category'), chain: $('chain'),
  minTvl: $('minTvl'), sort: $('sort'), watchlistOnly: $('watchlistOnly'),
  tabPre: $('tabPre'), tabLive: $('tabLive'), count: $('count'),
  board: $('board'), liveTable: $('liveTable'), rows: $('rows'), liveRows: $('liveRows'),
  empty: $('empty'), resetFilters: $('resetFilters'),
  footAsOf: $('footAsOf'), footRows: $('footRows'),
  detail: $('detail'), closeDetail: $('closeDetail'), detailRank: $('detailRank'),
  detailName: $('detailName'), detailSub: $('detailSub'), detailWhy: $('detailWhy'),
  detailRisks: $('detailRisks'), detailModel: $('detailModel'), detailSteps: $('detailSteps'),
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtUsd = (n) => {
  if (!Number.isFinite(n)) return 'n/a';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const fmtPct = (n) => n === null || n === undefined ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtAge = (d) => d === null || d === undefined ? '—' : d >= 365 ? `${(d / 365).toFixed(1)}y` : `${d}d`;
const fmtRatio = (n) => n === null || n === undefined ? '—' : `${(n * 100).toFixed(1)}¢`;

// --- farm plan: the same derivation lib/model.ts uses, from the row's own record ---
function capitalFor(row) {
  if (row.tvl_usd >= 5e9) return 250;
  if (row.tvl_usd >= 1e9) return 150;
  if (row.tvl_usd >= 1e8) return 100;
  return 50;
}
function holdDaysFor(age) { return age === null ? 30 : age < 180 ? 60 : age < 365 ? 45 : 30; }
function actionFor(row, capital, chain) {
  const c = (row.category || '').toLowerCase();
  const name = row.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}
function farmSteps(row) {
  const chain = row.chains.length ? row.chains[0] : 'its main chain';
  const capital = capitalFor(row);
  const hold = holdDaysFor(row.age_days);
  const steps = [
    { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
    { text: `Open ${row.name}'s own site from its DefiLlama page and check whether it runs a points or rewards program before you deposit.`, cost: 'nothing to check', time: '10 minutes' },
    { text: actionFor(row, capital, chain), cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`, time: '15 minutes to set up' },
    { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: 'Write the wallet, the dates and every transaction in a farm log, and unwind in tranches instead of all at once.', cost: 'nothing but the log', time: '5 minutes' },
  ];
  return steps.map((s) => ({ text: s.text, cost: s.cost, time: s.time }));
}

// --- state from the hash, so a filtered view or a detail is a link ---
function stateFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  return {
    q: h.get('q') || '',
    category: h.get('category') || '',
    chain: h.get('chain') || '',
    minTvl: Number(h.get('min-tvl') || 0),
    watchlist: h.get('watchlist') === '1',
    sort: h.get('sort') || 'rank',
    tab: h.get('tab') === 'live' ? 'live' : 'pre',
    p: h.get('p') || '',
  };
}
function stateToHash(s) {
  const h = new URLSearchParams();
  if (s.q) h.set('q', s.q);
  if (s.category) h.set('category', s.category);
  if (s.chain) h.set('chain', s.chain);
  if (s.minTvl) h.set('min-tvl', String(s.minTvl));
  if (s.watchlist) h.set('watchlist', '1');
  if (s.sort !== 'rank') h.set('sort', s.sort);
  if (s.tab === 'live') h.set('tab', 'live');
  if (s.p) h.set('p', s.p);
  const next = `#${h.toString()}`;
  if (location.hash !== next) history.replaceState(null, '', next || '#');
}

let state = stateFromHash();

// The board.json carries the watchlist flag implicitly: rows 1..watchlist_size are the watchlist
// only when the snapshot's watchlist is exactly the board's first rows — it is not. So the page
// marks a row as watchlist when its slug is in the snapshot's watchlist, which data.js records
// in `watchlist` (filled by the program when it writes data.js).
const watchlist = new Set(DATA && DATA.watchlist ? DATA.watchlist : []);

function filteredRows() {
  let rows = DATA.rows.slice();
  if (state.watchlist) rows = rows.filter((r) => watchlist.has(r.slug));
  if (state.category) rows = rows.filter((r) => r.category === state.category);
  if (state.chain) rows = rows.filter((r) => r.chains.includes(state.chain));
  if (state.minTvl) rows = rows.filter((r) => r.tvl_usd >= state.minTvl);
  if (state.q) {
    const q = state.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.slug.includes(q) || (r.category || '').toLowerCase().includes(q));
  }
  const key = state.sort;
  if (key === 'tvl') rows.sort((a, b) => b.tvl_usd - a.tvl_usd);
  else if (key === 'growth') rows.sort((a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9));
  else if (key === 'efficiency') rows.sort((a, b) => b.implied_per_tvl - a.implied_per_tvl);
  else if (key === 'age') rows.sort((a, b) => (b.age_days ?? -1) - (a.age_days ?? -1));
  else rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

function rankClass(rank) { return rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : ''; }
function maxImplied() { return DATA.rows.length ? Math.max(...DATA.rows.map((r) => r.implied_value_usd)) : 1; }

function renderBoard() {
  const rows = filteredRows();
  const max = maxImplied();
  els.rows.innerHTML = rows.map((r) => {
    const g = r.change_7d;
    const cls = g === null ? '' : g >= 0 ? 'pos' : 'neg';
    const wl = watchlist.has(r.slug);
    return `<tr data-slug="${esc(r.slug)}" data-selected="${state.p === r.slug}">
      <td><span class="rank ${rankClass(r.rank)}">${r.rank}</span></td>
      <td><span class="name"><b>${esc(r.name)}</b><span class="sub">${esc(r.category || 'Uncategorized')} · ${esc(r.chains.slice(0, 3).join(', ') || '—')}</span></span></td>
      <td class="num">${fmtUsd(r.tvl_usd)}</td>
      <td class="num ${cls}">${fmtPct(g)}</td>
      <td class="num">${fmtAge(r.age_days)}</td>
      <td class="num"><span class="implied">${fmtUsd(r.implied_value_usd)}<span class="bar"><i style="width:${Math.max(2, Math.round((r.implied_value_usd / max) * 100))}%"></i></span></span></td>
      <td class="num">${fmtRatio(r.implied_per_tvl)}</td>
      <td><span class="pill${wl ? '' : ' early'}">${wl ? 'Watchlist' : 'Early radar'}</span></td>
    </tr>`;
  }).join('');
  els.count.textContent = `${rows.length} of ${DATA.rows.length} protocols`;
  els.empty.hidden = rows.length > 0;
  els.board.hidden = state.tab === 'live' || rows.length === 0;
  els.liveTable.hidden = state.tab !== 'live';
  if (state.tab === 'live') renderLive();
  els.tabPre.setAttribute('aria-pressed', String(state.tab === 'pre'));
  els.tabLive.setAttribute('aria-pressed', String(state.tab === 'live'));
}

function renderLive() {
  els.liveRows.innerHTML = DATA.live.map((r) => {
    const g = r.change_7d;
    const cls = g === null ? '' : g >= 0 ? 'pos' : 'neg';
    return `<tr data-slug="${esc(r.slug)}">
      <td><span class="name"><b>${esc(r.name)}</b><span class="sub">${esc(r.category || 'Uncategorized')} · ${esc(r.chains.slice(0, 3).join(', ') || '—')}</span></span></td>
      <td class="num">${fmtUsd(r.tvl_usd)}</td>
      <td class="num">${r.mcap_usd ? fmtUsd(r.mcap_usd) : '—'}</td>
      <td class="num ${cls}">${fmtPct(g)}</td>
    </tr>`;
  }).join('');
}

function openDetail(slug) {
  const row = DATA.rows.find((r) => r.slug === slug);
  if (!row) return;
  const wl = watchlist.has(row.slug);
  els.detailRank.textContent = `#${row.rank} · ${wl ? 'Watchlist' : 'Early radar'} · ${row.category || 'Uncategorized'}`;
  els.detailName.textContent = row.name;
  els.detailSub.textContent = `${row.chains.join(', ') || '—'} · TVL ${fmtUsd(row.tvl_usd)} · 7d ${fmtPct(row.change_7d)} · listed ${row.listed_at || 'unknown'}`;
  els.detailWhy.textContent = row.why;
  if (row.risk_flags.length) {
    els.detailRisks.hidden = false;
    els.detailRisks.innerHTML = row.risk_flags.map((f) => `<span>${esc(f)}</span>`).join('');
  } else {
    els.detailRisks.hidden = true;
    els.detailRisks.innerHTML = '';
  }
  const m = row;
  els.detailModel.innerHTML = [
    ['TVL', fmtUsd(row.tvl_usd)],
    ['Base multiple', '× 0.25'],
    ['Base value', fmtUsd(row.tvl_usd * 0.25)],
    ['7-day change', fmtPct(row.change_7d)],
    ['Growth multiplier', `× ${m.growth_multiplier.toFixed(4)}`],
    ['Maturity multiplier', `× ${m.maturity_multiplier.toFixed(4)}`],
    ['Implied value', fmtUsd(row.implied_value_usd)],
  ].map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  els.detailSteps.innerHTML = farmSteps(row).map((s) => `<li><b>${esc(s.text)}</b><span class="cost">Cost: ${esc(s.cost)} · Time: ${esc(s.time)}</span></li>`).join('');
  els.detail.showModal();
  state.p = slug;
  stateToHash(state);
  renderBoard();
}

function closeDetail() {
  if (els.detail.open) els.detail.close();
  if (state.p) { state.p = ''; stateToHash(state); renderBoard(); }
}

function fillOptions() {
  const cats = [...new Set(DATA.rows.map((r) => r.category).filter(Boolean))].sort();
  els.category.innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const chains = [...new Set(DATA.rows.flatMap((r) => r.chains))].sort();
  els.chain.innerHTML = '<option value="">All chains</option>' + chains.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function syncControls() {
  els.q.value = state.q;
  els.category.value = state.category;
  els.chain.value = state.chain;
  els.minTvl.value = String(state.minTvl);
  els.sort.value = state.sort;
  els.watchlistOnly.checked = state.watchlist;
}

function readControls() {
  state.q = els.q.value.trim();
  state.category = els.category.value;
  state.chain = els.chain.value;
  state.minTvl = Number(els.minTvl.value);
  state.sort = els.sort.value;
  state.watchlist = els.watchlistOnly.checked;
  stateToHash(state);
  renderBoard();
}

function init() {
  if (!DATA || !Array.isArray(DATA.rows)) {
    document.body.innerHTML = '<main class="shell"><p>Token Radar could not load its data (data.js is missing or unreadable).</p></main>';
    return;
  }
  els.asOf.textContent = `snapshot ${DATA.as_of}`;
  els.statTotal.textContent = fmtUsd(DATA.total_implied_usd);
  els.statRows.textContent = String(DATA.board_size);
  els.statWatch.textContent = `${DATA.watchlist_size} / ${DATA.watchlist_size}`;
  els.statLive.textContent = String(DATA.live_size);
  els.footAsOf.textContent = DATA.as_of;
  els.footRows.textContent = String(DATA.board_size);
  fillOptions();
  syncControls();
  renderBoard();
  if (state.p) openDetail(state.p);

  els.q.addEventListener('input', readControls);
  els.category.addEventListener('change', readControls);
  els.chain.addEventListener('change', readControls);
  els.minTvl.addEventListener('change', readControls);
  els.sort.addEventListener('change', readControls);
  els.watchlistOnly.addEventListener('change', readControls);
  els.tabPre.addEventListener('click', () => { state.tab = 'pre'; stateToHash(state); renderBoard(); });
  els.tabLive.addEventListener('click', () => { state.tab = 'live'; stateToHash(state); renderBoard(); });
  els.resetFilters.addEventListener('click', () => {
    state = { q: '', category: '', chain: '', minTvl: 0, watchlist: false, sort: 'rank', tab: 'pre', p: '' };
    syncControls(); stateToHash(state); renderBoard();
  });
  els.rows.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.dataset.slug);
  });
  els.closeDetail.addEventListener('click', closeDetail);
  els.detail.addEventListener('close', () => { if (state.p) { state.p = ''; stateToHash(state); renderBoard(); } });
  els.detail.addEventListener('click', (e) => { if (e.target === els.detail) closeDetail(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.detail.open) closeDetail(); });
  window.addEventListener('hashchange', () => {
    state = stateFromHash();
    syncControls();
    renderBoard();
    if (state.p) openDetail(state.p); else if (els.detail.open) els.detail.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
