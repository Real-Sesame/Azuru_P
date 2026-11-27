import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/black-han-sans/400.css';
import './styles/app.css';
import meta from './data/meta.json';
import characters from './data/characters.json';
import teams from './data/teams.json';
import guide from './data/guide.json';
import rules from './data/builder-rules.json';
import { buildParties, matchup } from './builder.js';

const DATA = { meta, characters, teams, guide, rules };
const BASE = import.meta.env.BASE_URL; // '/Azuru_P/'
const STORE = 'azurp-v1';
const SITE_NAME = meta.name;

// ---------- 도우미 ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = meta.labels;
const ELS = meta.elements;
const EL = Object.fromEntries(ELS.map(e => [e.id, e]));
const ALL = [...characters.list, characters.starborn];
const CH = Object.fromEntries(ALL.map(c => [c.id, c]));
const SRC = Object.fromEntries(meta.sources.map(s => [s.id, s]));
const href = p => BASE + p.replace(/^\//, '');
const el = id => EL[id] ? `<span class="el" style="--c:${EL[id].color}">${EL[id].name}</span>` : '';
const els = ids => (ids || []).map(el).join(' ');
const prof = c => `<span class="prof ${c.prof}">${L.prof[c.prof]}</span>`;
const conf = c => c ? `<span class="conf ${c}" title="정보 출처 신뢰도">${L.confidence[c]}</span>` : '';
const rar = n => n ? `<span class="rar r${n}">${n}★</span>` : '<span class="rar" title="등급 미확인">?★</span>';
const autoBadge = c => c.auto ? '<span class="chip warn" title="공식 사이트에서 자동 추가 · 검증 전">자동 추가</span>' : '';
const tier = t => t && t !== '-' ? `<span class="tier t-${t}">${t}</span>` : '';
const srcLinks = ids => (ids || []).map(id => SRC[id] ? `<a href="${esc(SRC[id].url)}" target="_blank" rel="noopener">${esc(SRC[id].name)}</a>` : '').filter(Boolean).join(' · ');
// 공식 이미지: tools/sync_official.py가 public/img/index.json에 목록을 적어 둠. 없으면 속성 색 이니셜
let IMGIDX = { chars: {} };
async function loadImages() {
  try { const r = await fetch(href('img/index.json'), { cache: 'no-cache' }); if (r.ok) IMGIDX = await r.json(); } catch (e) { /* 이미지 없음 */ }
}
const imgOf = (c, kind) => (IMGIDX.chars && IMGIDX.chars[c.id] && IMGIDX.chars[c.id][kind]) ? href(IMGIDX.chars[c.id][kind]) : '';
const pf = (c, big) => {
  const color = c.elements && c.elements[0] ? EL[c.elements[0]].color : 'var(--gold)';
  const src = imgOf(c, 'thumb');
  const inner = src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : `<span class="ini">${esc(c.name.slice(0, c.name.length > 3 ? 2 : 1))}</span>`;
  return `<div class="pf${big ? ' big' : ''}${src ? ' has-img' : ''}" style="--c:${color}">${inner}${c.rarity === 5 ? '<i class="r5"></i>' : ''}</div>`;
};
const markChips = (ids, cls = '') => (ids || []).length ? ids.map(e => `<span class="mk ${cls}" style="--c:${EL[e].color}">${EL[e].name}</span>`).join('') : '<span class="note">없음</span>';

// ---------- 상태 ----------
const defaults = { owned: characters.list.map(c => c.id), parties: 3, targets: ['', '', ''], mains: ['', '', ''], pinned: [null, null, null], kibo: false, rar: 'all' };
let state = structuredClone(defaults);
try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* 저장소 못 씀 */ }
state.owned = state.owned.filter(id => CH[id] && id !== 'starborn');
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* 무시 */ } };

// ---------- 홈 ----------
const views = {};
views.home = () => {
  const top = teams.list.filter(t => t.top);
  const free = guide.free.map(f => CH[f.id]).filter(Boolean);
  return `
  <div class="hero">
    <span class="chip acc">한국 정식 출시 ${esc(meta.updated)}</span>
    <h1>보유 캐릭터만 체크하면<br><em>각인이 맞는 3파티</em>를 자동으로</h1>
    <p class="note" style="margin:0">아주르 프로밀리아 파티 자동 편성 · 각인(조율 표식) 수급 · 원소 상성 · 캐릭터 도감</p>
    <div class="row"><a class="btn primary" href="${href('builder')}" data-link>⚡ 자동 편성</a><a class="btn" href="${href('elements')}" data-link>원소 · 각인 보기</a></div>
  </div>
  <div class="card notice">ⓘ ${esc(meta.dataBasis)}</div>

  <div class="sec-h"><h2>사용 순서</h2></div>
  <div class="card"><ol class="steps">
    <li><div><b>보유 캐릭터 체크</b><span class="note">파티 편성 화면의 보유 캐릭터에서 가진 캐릭터만 남깁니다. 주인공(성림자)은 항상 보유로 봅니다.</span></div></li>
    <li><div><b>파티 수 · 적 원소 고르기</b><span class="note">1~3파티를 겹치지 않게 짜고, 파티마다 상대할 적의 원소를 정하면 상성까지 반영합니다.</span></div></li>
    <li><div><b>교체 · 고정</b><span class="note">캐릭터 아래 칸으로 직접 바꾸면 그 파티는 고정되고 나머지 파티가 다시 계산됩니다.</span></div></li>
  </ol></div>

  <div class="sec-h"><h2>추천 편성</h2><a class="btn sm" href="${href('builder')}" data-link>내 캐릭터로 짜기</a></div>
  <div class="grid">${top.map(presetCard).join('')}</div>

  <div class="grid">
    <div class="card"><h3>무료로 얻는 캐릭터</h3><div class="mini-list">${free.map(c => `<a href="${href('character/' + c.id)}" data-link class="mini">${pf(c)}<span><b>${esc(c.name)}</b><span class="note">${esc(guide.free.find(f => f.id === c.id).how)}</span></span></a>`).join('')}</div></div>
    <div class="card"><h3>관측(뽑기)</h3><ul class="plain">${guide.gacha.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>
  </div>`;
};

function presetCard(t) {
  return `<div class="card team">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(t.name)}</h3><span>${el(t.element)} ${t.budget ? '<span class="chip ok">무과금</span>' : ''} ${conf(t.confidence)}</span></div>
    <div class="team-m">${t.members.map((id, i) => { const c = CH[id]; return `<a class="mem${i === 0 ? ' main' : ''}" href="${href('character/' + id)}" data-link>${pf(c)}<b>${esc(c.name)}</b><span class="slot">${i === 0 ? '메인 · ' : ''}${L.prof[c.prof]}</span></a>`; }).join('')}</div>
    <p class="note" style="margin:0">${esc(t.note)}</p>
    ${t.swaps && t.swaps.length ? `<div class="chips">${t.swaps.map(s => `<span class="chip">${esc(CH[s.out].name)} → ${esc(CH[s.in].name)}</span>`).join('')}</div>` : ''}
  </div>`;
}

// ---------- 파티 편성 ----------
const REASON = {
  breakerMain: () => '브레이커가 메인',
  twoDps: v => `메인급 딜러 ${v}명 겹침`,
  noSup: () => '서포터 없음',
  hc: () => '하이퍼캐리 구성',
  bal: () => '밸런스 구성',
  sustain: v => `생존: ${v.map(id => CH[id].name).join('·')}`,
  noSustain: () => '회복 · 보호막 없음',
  markAlly: v => `${EL[v[0]].name} 각인 ← ${v[1].map(id => CH[id].name).join('·')}`,
  markSelf: v => `${EL[v].name} 각인 자급만`,
  markKibo: v => `${EL[v].name} 각인은 키보로`,
  markOpt: v => `보조 ${EL[v].name} 각인 없음`,
  markMiss: v => `${EL[v].name} 각인 부족`,
  star: () => '성림자 각인 증폭',
  adv: v => `상성 우위(${EL[v].name})`,
  dis: v => `상성 열세(${EL[v].name})`,
  preset: v => `추천 편성: ${v}`
};
const MARK_ST = { ally: ['ok', '동료 공급'], self: ['warn', '자급'], kibo: ['warn', '키보'], miss: ['bad', '부족'] };

views.builder = (q) => {
  if (q.get('o')) { state.owned = q.get('o').split('.').filter(id => CH[id] && id !== 'starborn'); state.pinned = [null, null, null]; }
  if (q.get('p')) state.parties = Math.max(1, Math.min(3, +q.get('p') || 1));
  if (q.get('main') && CH[q.get('main')]) { const m = q.get('main'); state.mains[0] = m; state.pinned = [null, null, null]; if (m !== 'starborn' && !state.owned.includes(m)) state.owned.push(m); }
  save();
  const n5 = characters.list.filter(c => c.rarity === 5), n4 = characters.list.filter(c => c.rarity === 4), nx = characters.list.filter(c => !c.rarity);
  return `
  <div class="page-h"><h1>파티 편성</h1><p>보유 캐릭터로 겹치지 않는 1~3파티를 짭니다. 메인 딜러가 쓰는 각인을 동료가 공급하는지, 하이퍼캐리 · 밸런스 구성인지, 적 원소와 상성이 맞는지로 점수를 매깁니다.</p></div>
  <div class="card filters">
    <span class="note">파티 수</span>
    <div class="seg" id="b-n">${[1, 2, 3].map(n => `<button data-v="${n}" aria-pressed="${state.parties === n}">${n}파티</button>`).join('')}</div>
    <label class="switch"><input type="checkbox" id="b-kibo" ${state.kibo ? 'checked' : ''}><span>부족한 핵심 각인 1개는 키보로 보충</span></label>
    <span style="flex:1"></span>
    <button class="btn sm" id="b-reset">고정 모두 해제</button>
    <button class="btn sm" id="b-share">공유 링크</button>
    <button class="btn sm" id="b-copy">편성 텍스트 복사</button>
  </div>
  <details class="card roster-box" ${state.owned.length ? '' : 'open'}>
    <summary class="row" style="justify-content:space-between"><b>보유 캐릭터 <span class="note" id="b-count">${state.owned.length}/${characters.list.length}</span></b><span class="note">눌러서 편집 · 성림자는 항상 보유</span></summary>
    <div class="row" style="justify-content:flex-end;margin:10px 0"><button class="btn sm" data-act="all">전체</button><button class="btn sm" data-act="r5">5★만</button><button class="btn sm" data-act="free">무료만</button><button class="btn sm" data-act="none">해제</button></div>
    <h4 class="rost-h">5★</h4><div class="roster">${n5.map(rosterItem).join('')}</div>
    <h4 class="rost-h">4★</h4><div class="roster">${n4.map(rosterItem).join('')}</div>
    ${nx.length ? `<h4 class="rost-h">등급 미확인 (자동 추가)</h4><div class="roster">${nx.map(rosterItem).join('')}</div>` : ''}
  </details>
  <div id="b-out"></div>`;
};
const rosterItem = c => `<label title="${esc(c.name)} · ${L.prof[c.prof]}"><input type="checkbox" value="${c.id}" ${state.owned.includes(c.id) ? 'checked' : ''}>${pf(c)}<span>${esc(c.name)}</span></label>`;

let lastResult = null;
function renderBuild() {
  const out = $('#b-out'); if (!out) return;
  const N = state.parties;
  const r = buildParties(DATA, state.owned, { parties: N, targets: state.targets, kibo: state.kibo, fixedMains: state.mains, pinned: state.pinned });
  lastResult = r;
  const usedAll = new Set(r.parties.filter(Boolean).flatMap(p => p.team.map(u => u.id)));
  const ownedList = ALL.filter(c => c.id === 'starborn' || state.owned.includes(c.id));
  let h = `<div class="sec-h"><h2>편성 결과</h2><span class="note">${r.total.toLocaleString()}개 조합 채점 · 합계 <b class="score sm">${r.parties.reduce((s, p) => s + (p ? p.score : 0), 0)}</b> ${conf('estimate')}</span></div>`;
  h += `<div class="parties n${N}">`;
  for (let i = 0; i < N; i++) {
    const p = r.parties[i];
    const tsel = `<select data-target="${i}" aria-label="${i + 1}파티 적 원소"><option value="">적 원소: 무관</option>${ELS.map(e => `<option value="${e.id}" ${state.targets[i] === e.id ? 'selected' : ''}>적 원소: ${e.name}</option>`).join('')}</select>`;
    const msel = `<select data-main="${i}" aria-label="${i + 1}파티 메인 고정"><option value="">메인: 자동</option>${ownedList.filter(c => c.group !== 'support' || c.id === state.mains[i]).map(c => `<option value="${c.id}" ${state.mains[i] === c.id ? 'selected' : ''}>메인: ${esc(c.name)}</option>`).join('')}</select>`;
    h += `<div class="card team party p${i + 1}${p && p.pinned ? ' pinned' : ''}">
      <div class="row" style="justify-content:space-between"><h3 style="margin:0"><span class="pno">${i + 1}</span>파티</h3>
        <span class="row">${p ? `<span class="score">${p.score}</span>` : ''}<button class="btn sm pin" data-pin="${i}" aria-pressed="${!!(p && p.pinned)}" ${p ? '' : 'disabled'}>${p && p.pinned ? '📌 고정됨' : '📌 고정'}</button></span></div>
      <div class="row party-sel">${tsel}${msel}</div>`;
    if (!p) { h += `<div class="empty">남은 캐릭터로 파티를 만들 수 없습니다. 보유 캐릭터를 늘리거나 파티 수를 줄여 주세요.</div></div>`; continue; }
    h += `<div class="team-m">${p.team.map((u, j) => {
      const opts = ownedList.filter(c => c.id === u.id || !usedAll.has(c.id));
      const tgt = state.targets[i];
      const mu = tgt ? matchup(meta.chart, u.elements[0], tgt) : 0;
      return `<div class="mem${j === 0 ? ' main' : ''}">
        <a href="${href('character/' + u.id)}" data-link class="mem-a">${pf(u)}${mu ? `<span class="mu ${mu > 0 ? 'up' : 'down'}">${mu > 0 ? '▲' : '▼'}</span>` : ''}</a>
        <b>${esc(u.name)}</b><span class="slot">${j === 0 ? '메인 · ' : ''}${L.prof[u.prof]}</span>
        <select class="swap" data-p="${i}" data-j="${j}" aria-label="${esc(u.name)} 교체">${opts.map(c => `<option value="${c.id}" ${c.id === u.id ? 'selected' : ''}>${c.id === u.id ? '교체…' : esc(c.name)}</option>`).join('')}</select>
      </div>`;
    }).join('')}</div>
    <div class="marks"><span class="note">${esc(p.main.name)} 각인</span>${p.marks.length ? p.marks.map(m => `<span class="chip ${m.opt && m.st === 'miss' ? 'warn' : MARK_ST[m.st][0]}" title="${m.opt ? '보조 소모 각인' : '핵심 각인'}"><i class="dot" style="--c:${EL[m.e].color}"></i>${EL[m.e].name}${m.opt ? '(보조)' : ''} · ${MARK_ST[m.st][1]}</span>`).join('') : '<span class="chip">각인 소모 없음</span>'}</div>
    <div class="reasons">${p.reasons.filter(z => !z.k.startsWith('mark')).map(z => `<span class="chip ${z.t === 'good' ? 'ok' : z.t === 'bad' ? 'bad' : 'warn'}">${esc(REASON[z.k](z.v))}</span>`).join('')}</div>
    ${r.alts[i] && r.alts[i].length ? `<div class="alts"><span class="note">다른 후보</span>${r.alts[i].map((a, k) => `<button class="alt" data-alt="${i}:${k}">${a.team.map(u => esc(u.name)).join(' · ')} <b>${a.score}</b></button>`).join('')}</div>` : ''}
    </div>`;
  }
  h += `</div>
  <p class="note">점수는 공략 조언(메인의 각인을 동료가 공급, 딜러 1 + 서포터 2 또는 딜러 1 + 브레이커 1 + 서포터 1, 원소 상성 ±25%)을 수치로 옮긴 비교용 추정치이며 실제 피해량 계산이 아닙니다. ▲▼는 고른 적 원소에 대한 상성입니다. 가중치는 <code>src/data/builder-rules.json</code>에서 바꿀 수 있습니다.</p>`;
  out.innerHTML = h;
}

function teamText() {
  if (!lastResult) return '';
  return lastResult.parties.slice(0, state.parties).map((p, i) => p ? `${i + 1}파티${state.targets[i] ? `(적 ${EL[state.targets[i]].name})` : ''}: ${p.team.map(u => u.name).join(' / ')} [${p.score}]` : `${i + 1}파티: -`).join('\n') + `\n— ${SITE_NAME}`;
}
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); const o = btn.textContent; btn.textContent = '복사됨 ✓'; setTimeout(() => { btn.textContent = o; }, 1400); }
  catch (e) { prompt('복사해서 쓰세요', text); }
}

function bindBuilder(root) {
  const rerender = () => { save(); renderBuild(); };
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('.roster input')) { state.owned = [...root.querySelectorAll('.roster input:checked')].map(i => i.value); state.pinned = [null, null, null]; updateCount(root); rerender(); }
    else if (t.id === 'b-kibo') { state.kibo = t.checked; rerender(); }
    else if (t.dataset.target) { state.targets[+t.dataset.target] = t.value; rerender(); }
    else if (t.dataset.main) { const i = +t.dataset.main; state.mains[i] = t.value; state.pinned[i] = null; rerender(); }
    else if (t.matches('.swap')) {
      const i = +t.dataset.p, j = +t.dataset.j;
      const team = lastResult.parties[i].team.map(u => u.id);
      team[j] = t.value;
      state.pinned[i] = team;
      if (state.mains[i] && !team.includes(state.mains[i])) state.mains[i] = '';
      rerender();
    }
  });
  root.addEventListener('click', e => {
    const n = e.target.closest('#b-n button');
    if (n) { state.parties = +n.dataset.v; root.querySelectorAll('#b-n button').forEach(b => b.setAttribute('aria-pressed', b === n)); rerender(); return; }
    const pin = e.target.closest('[data-pin]');
    if (pin) { const i = +pin.dataset.pin; const p = lastResult.parties[i]; state.pinned[i] = p && !p.pinned ? p.team.map(u => u.id) : null; rerender(); return; }
    const alt = e.target.closest('[data-alt]');
    if (alt) { const [i, k] = alt.dataset.alt.split(':').map(Number); state.pinned[i] = lastResult.alts[i][k].team.map(u => u.id); rerender(); return; }
    if (e.target.closest('#b-reset')) { state.pinned = [null, null, null]; rerender(); return; }
    if (e.target.closest('#b-share')) { copy(location.origin + href('builder') + `?o=${state.owned.join('.')}&p=${state.parties}`, e.target.closest('button')); return; }
    if (e.target.closest('#b-copy')) { copy(teamText(), e.target.closest('button')); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    const freeIds = guide.free.map(f => f.id);
    state.owned = characters.list.filter(c => act === 'all' || (act === 'r5' && c.rarity === 5) || (act === 'free' && freeIds.includes(c.id))).map(c => c.id);
    state.pinned = [null, null, null];
    root.querySelectorAll('.roster input').forEach(i => { i.checked = state.owned.includes(i.value); });
    updateCount(root); rerender();
  });
}
function updateCount(root) { const c = $('#b-count', root); if (c) c.textContent = `${state.owned.length}/${characters.list.length}`; }

// ---------- 캐릭터 ----------
let chFilter = { prof: '', element: '', rarity: '' };
views.characters = () => {
  const sel = (k, label, opts) => `<select data-f="${k}"><option value="">${label} 전체</option>${opts.map(([v, t]) => `<option value="${v}" ${chFilter[k] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  return `<div class="page-h"><h1>캐릭터</h1><p>티어는 국내 정리(2026-11-24, CBT 기준)이며 GameWith CBT 티어를 함께 적었습니다. 같은 티어 안에서는 순서 차이가 없습니다.</p></div>
  <div class="filters">${sel('prof', '직업', Object.entries(L.prof).filter(([k]) => k !== 'none'))}${sel('element', '속성', ELS.map(e => [e.id, e.name]))}${sel('rarity', '등급', [['5', '5★'], ['4', '4★']])}</div>
  <div class="grid" id="ch-list"></div>
  <div class="sec-h"><h2>직업 5종</h2></div>
  <div class="grid">${Object.entries(L.profDesc).map(([k, d]) => `<div class="card"><h3><span class="prof ${k}">${L.prof[k]}</span> <span class="note">${{ eruption: '딜러', assault: '딜러', rupture: '브레이커', amplifier: '서포터', imbuement: '서포터' }[k]}</span></h3><p class="note" style="margin:0">${esc(d)}</p></div>`).join('')}</div>`;
};
function chListHtml() {
  const list = ALL.filter(c => (!chFilter.prof || c.prof === chFilter.prof) && (!chFilter.element || c.elements.includes(chFilter.element)) && (!chFilter.rarity || String(c.rarity) === chFilter.rarity));
  if (!list.length) return `<div class="card empty">조건에 맞는 캐릭터가 없습니다.</div>`;
  return list.map(c => `<a class="card adv" href="${href('character/' + c.id)}" data-link>${pf(c)}<div><div class="nm"><span class="n">${esc(c.name)}</span> ${rar(c.rarity)} ${tier(c.tier)} ${c.limited ? '<span class="chip acc">한정</span>' : ''} ${autoBadge(c)}</div>
    <div class="row">${prof(c)} ${els(c.elements) || '<span class="note">무속성</span>'}</div>
    <div class="row mk-row"><span class="note">각인</span>${c.wildcard ? '<span class="mk any">기존 각인 증폭</span>' : markChips(c.gains)}${c.consumes.length ? `<span class="note">→ 소모</span>${markChips(c.consumes, 'use')}` : ''}</div></div></a>`).join('');
}
function bindCharacters(root) {
  const draw = () => { $('#ch-list', root).innerHTML = chListHtml(); };
  draw();
  root.addEventListener('change', e => { const k = e.target.dataset.f; if (!k) return; chFilter[k] = e.target.value; draw(); });
}

views.character = (q, id) => {
  const c = CH[id]; if (!c) return views.notfound();
  const inTeams = teams.list.filter(t => t.members.includes(c.id) || (t.swaps || []).some(s => s.in === c.id));
  const need = [...new Set([...c.requires, ...c.consumes])];
  const suppliers = need.map(e => [e, ALL.filter(x => x.id !== c.id && x.gains.includes(e) && x.group === 'support')]);
  const takers = c.gains.map(e => [e, ALL.filter(x => x.id !== c.id && x.group !== 'support' && (x.consumes.includes(e) || x.requires.includes(e)))]);
  const strong = c.elements[0] ? meta.chart.strong[c.elements[0]] : [];
  const weak = c.elements[0] ? meta.chart.weak[c.elements[0]] : [];
  const link = x => `<a class="chip" href="${href('character/' + x.id)}" data-link>${esc(x.name)}</a>`;
  return `
  <a class="note" href="${href('characters')}" data-link>← 캐릭터 목록</a>
  ${imgOf(c, 'art') ? `<div class="art-hero" style="--c:${c.elements[0] ? EL[c.elements[0]].color : 'var(--gold)'}"><img src="${imgOf(c, 'art')}" alt="${esc(c.name)} 공식 일러스트"><span class="credit">© Manjuu · NEXON${IMGIDX.chars[c.id].artSrc === 'gw' ? ' · via GameWith' : ''}</span></div>`
    : imgOf(c, 'thumb') ? `<div class="art-hero alt" style="--c:${c.elements[0] ? EL[c.elements[0]].color : 'var(--gold)'};--bg:url('${imgOf(c, 'thumb')}')"><img src="${imgOf(c, 'thumb')}" alt="${esc(c.name)} 공식 이미지"><span class="credit">© Manjuu · NEXON · 일러스트 공개 전</span></div>` : ''}
  <div class="card adv head">${pf(c, true)}<div>
    <div class="nm" style="font-size:24px"><span class="n">${esc(c.name)}</span> ${rar(c.rarity)} ${tier(c.tier)} ${c.gwTier && c.gwTier !== '-' ? `<span class="chip">GameWith ${c.gwTier}</span>` : ''} ${conf(c.confidence)} ${autoBadge(c)}</div>
    <div class="note">${esc(c.nameEn)}${c.official ? ' · <span class="conf official">속성 · 직업 공식</span>' : ''}</div>
    <div class="row">${prof(c)} <span class="note">${L.group[c.group]}</span> ${els(c.elements)}</div>
    <div class="note">입수: ${c.obtain.map(esc).join(', ')}</div>
    <div class="row" style="margin-top:8px"><a class="btn primary sm" href="${href('builder?main=' + c.id)}" data-link>이 캐릭터를 메인으로 편성</a></div></div></div>
  <div class="card"><p style="margin:0">${esc(c.summary)}</p></div>
  <div class="grid">
    <div class="card"><h3>각인</h3><dl class="kv">
      <dt>만드는 각인</dt><dd class="chips">${c.wildcard ? '<span class="mk any">파티에 있는 각인을 증폭</span>' : markChips(c.gains)}</dd>
      <dt>소모</dt><dd class="chips">${markChips(c.consumes, 'use')}</dd>
      ${c.requires.length ? `<dt>필요</dt><dd class="chips">${markChips(c.requires, 'use')}</dd>` : ''}
    </dl></div>
    <div class="card"><h3>핵심 패시브</h3><p style="margin:0">${esc(c.passive)}</p></div>
    ${strong.length || weak.length ? `<div class="card"><h3>원소 상성 (${EL[c.elements[0]].name} 공격)</h3><dl class="kv"><dt>우위 +25%</dt><dd>${els(strong) || '-'}</dd><dt>열세 -25%</dt><dd>${els(weak) || '-'}</dd></dl></div>` : ''}
  </div>
  <div class="grid">
    ${need.length ? `<div class="card"><h3>각인을 대 줄 서포터</h3><dl class="kv">${suppliers.map(([e, xs]) => `<dt>${el(e)}</dt><dd class="chips">${xs.map(link).join('') || '<span class="note">없음 · 키보로 보충</span>'}</dd>`).join('')}</dl></div>` : ''}
    ${c.group === 'support' && c.gains.length ? `<div class="card"><h3>이 각인을 쓰는 딜러 · 브레이커</h3><dl class="kv">${takers.map(([e, xs]) => `<dt>${el(e)}</dt><dd class="chips">${xs.map(link).join('') || '<span class="note">없음</span>'}</dd>`).join('')}</dl></div>` : ''}
    <div class="card"><h3>장점</h3><ul class="plain">${c.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul>${c.cons.length ? `<h3 style="margin-top:10px">주의점</h3><ul class="plain">${c.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>
  </div>
  ${inTeams.length ? `<div class="sec-h"><h2>포함된 추천 편성</h2></div><div class="grid">${inTeams.map(presetCard).join('')}</div>` : ''}
  <p class="note">출처: ${srcLinks(c.sources)}</p>`;
};

// ---------- 원소 · 각인 ----------
views.elements = () => {
  const ring = ELS.filter(e => !['light', 'dark'].includes(e.id));
  return `
  <div class="page-h"><h1>원소 상성 · 각인 ${conf(meta.chart.confidence)}</h1><p>${esc(meta.chart._note)} 상성은 클리어 시간이 빡빡한 고난도에서 중요해집니다.</p></div>
  <div class="card" style="overflow-x:auto"><table class="chart"><thead><tr><th>공격 ↓ / 적 →</th>${ELS.map(e => `<th>${el(e.id)}</th>`).join('')}</tr></thead>
    <tbody>${ELS.map(a => `<tr><th>${el(a.id)}</th>${ELS.map(d => { const m = matchup(meta.chart, a.id, d.id); return `<td class="${m > 0 ? 'up' : m < 0 ? 'down' : ''}">${m > 0 ? '+25%' : m < 0 ? '-25%' : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
    <p class="note" style="margin:8px 0 0">고리 순서: ${ring.map(e => e.name).join(' · ')} — 각 원소가 둘을 이기고 둘에게 집니다. 적은 원소를 여러 개 가질 수 있습니다.</p></div>
  <div class="sec-h"><h2>각인(조율 표식) 원소 효과</h2></div>
  <div class="card note">${esc(meta.markRule)}</div>
  <div class="grid">${ELS.map(e => {
    const gain = ALL.filter(c => c.gains.includes(e.id));
    const use = ALL.filter(c => c.consumes.includes(e.id) || c.requires.includes(e.id));
    const chip = c => `<a class="chip" href="${href('character/' + c.id)}" data-link>${esc(c.name)}</a>`;
    return `<div class="card elcard" style="--c:${e.color}"><h3>${el(e.id)} 각인</h3><p style="margin:0 0 8px">${esc(e.mark)}</p>
      <dl class="kv"><dt>만드는 캐릭터</dt><dd class="chips">${gain.map(chip).join('') || '<span class="note">없음 · 키보</span>'}</dd><dt>쓰는 캐릭터</dt><dd class="chips">${use.map(chip).join('') || '<span class="note">없음</span>'}</dd></dl></div>`;
  }).join('')}</div>
  <p class="note">출처: ${srcLinks(['gw-elem', 'gw-tier', 'gw-char'])}</p>`;
};

// ---------- 가이드 ----------
views.guide = () => `
  <div class="page-h"><h1>입문 가이드 ${conf(guide.confidence)}</h1><p>파티 짜기 전에 알아 둘 기본 규칙과 출시 직후 육성 방향.</p></div>
  <div class="card"><ol class="steps">${guide.basics.map(s => `<li><div><b>${esc(s.title)}</b><span class="note">${esc(s.desc)}</span></div></li>`).join('')}</ol></div>
  <div class="grid">
    <div class="card"><h3>육성 순서</h3><ul class="plain">${guide.growth.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>
    <div class="card"><h3>관측(뽑기)</h3><ul class="plain">${guide.gacha.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>
    <div class="card"><h3>무료 캐릭터</h3><ul class="plain">${guide.free.map(f => `<li><a href="${href('character/' + f.id)}" data-link>${esc(CH[f.id].name)}</a> <span class="note">${esc(f.how)}</span></li>`).join('')}</ul></div>
  </div>
  <div class="sec-h"><h2>직업과 구성</h2></div>
  <div class="grid">${Object.entries(L.profDesc).map(([k, d]) => `<div class="card"><h3><span class="prof ${k}">${L.prof[k]}</span></h3><p class="note" style="margin:0">${esc(d)}</p></div>`).join('')}</div>
  <div class="card"><h3>주의</h3><ul class="plain">${guide.caveats.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>
  <p class="note">출처: ${srcLinks(guide.sources)}</p>`;

views.notfound = () => `<div class="card empty"><h3>페이지를 찾을 수 없습니다</h3><a class="btn" href="${href('')}" data-link>홈으로</a></div>`;

// ---------- 라우터 ----------
const BINDERS = { builder: (r) => { bindBuilder(r); renderBuild(); }, characters: bindCharacters };
function parse() {
  let p = decodeURIComponent(location.pathname);
  if (p.toLowerCase().startsWith(BASE.toLowerCase())) p = p.slice(BASE.length); else p = p.replace(/^\//, '');
  p = p.replace(/\.html$/, '').replace(/\/$/, '').replace(/^index$/, '');
  const [view, id] = p.split('/');
  return { view: view || 'home', id };
}
function show(view, id) {
  const q = new URLSearchParams(location.search);
  if (!views[view]) view = 'notfound';
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; v.replaceChildren(); });
  const old = document.querySelector(`.view[data-view="${view}"]`);
  const sec = old.cloneNode(false); // 새 노드로 갈아 끼워 이전 이벤트를 정리
  old.replaceWith(sec);
  sec.innerHTML = views[view](q, id);
  sec.hidden = false;
  BINDERS[view]?.(sec);
  if (view === 'builder' && q.toString()) history.replaceState(null, '', href('builder'));
  const navKey = { character: 'characters' }[view] || view;
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav.split(' ').includes(navKey)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const h1 = sec.querySelector('h1');
  document.title = (view === 'home' ? '' : (h1 ? h1.textContent.trim().replace(/\s+(커뮤니티|공식|추정)$/, '') + ' · ' : '')) + SITE_NAME;
}
function route(keepScroll) { const { view, id } = parse(); show(view, id); if (!keepScroll) window.scrollTo(0, 0); }

document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault();
  const url = a.getAttribute('href');
  if (url !== location.pathname + location.search) history.pushState(null, '', url);
  route();
});
window.addEventListener('popstate', () => route(true));

// 정적 HTML의 링크를 BASE 기준 절대 주소로
document.querySelectorAll('header a[data-link], .tabbar a[data-link]').forEach(a => { a.setAttribute('href', href(a.getAttribute('href') === './' ? '' : a.getAttribute('href'))); });

// 테마
const themeBtn = $('#btn-theme');
function applyTheme(t) { document.documentElement.dataset.theme = t; themeBtn.textContent = t === 'dark' ? '☀' : '☾'; }
let theme = 'dark'; try { theme = localStorage.getItem('azurp-theme') || 'dark'; } catch (e) { /* 무시 */ }
applyTheme(theme);
themeBtn.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); try { localStorage.setItem('azurp-theme', theme); } catch (e) { /* 무시 */ } });
$('#foot-ver').textContent = `데이터 v${meta.dataVersion} · ${meta.updated}`;

route(true);
loadImages().then(() => { if (IMGIDX.updated) $('#foot-ver').textContent += ` · 이미지 ${IMGIDX.updated}`; route(true); });
