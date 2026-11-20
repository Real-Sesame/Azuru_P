import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/app.css';
import meta from './data/meta.json';
import adventurers from './data/adventurers.json';
import buddies from './data/buddies.json';
import weapons from './data/weapons.json';
import monsters from './data/monsters.json';
import teams from './data/teams.json';
import growth from './data/growth.json';
import rules from './data/builder-rules.json';
import { buildTeams } from './builder.js';

const DATA = { meta, adventurers, buddies, weapons, monsters, teams, growth, rules };
const BASE = import.meta.env.BASE_URL; // '/MH_OL/'
const STORE = 'mhol-v1';

// ---------- 도우미 ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = meta.labels;
const EL = Object.fromEntries(meta.elements.map(e => [e.id, e.name]));
const AIL = Object.fromEntries(meta.ailments.map(e => [e.id, e.name]));
const ADV = Object.fromEntries(adventurers.list.map(a => [a.id, a]));
const WEP = Object.fromEntries(weapons.list.map(w => [w.id, w]));
const MON = Object.fromEntries(monsters.list.map(m => [m.id, m]));
const BUD = Object.fromEntries(buddies.list.map(b => [b.id, b]));
const SRC = Object.fromEntries(meta.sources.map(s => [s.id, s]));
const href = p => BASE + p.replace(/^\//, '');
const el = id => id && EL[id] ? `<span class="el ${id}">${EL[id]}</span>` : '';
const role = id => L.roles[id] ? `<span class="role ${id}">${L.roles[id]}</span>` : '';
const conf = c => c ? `<span class="conf ${c}" title="정보 출처 신뢰도">${L.confidence[c]}</span>` : '';
const stars = n => `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;
const srcLinks = ids => (ids || []).map(id => SRC[id] ? `<a href="${esc(SRC[id].url)}" target="_blank" rel="noopener">${esc(SRC[id].name)}</a>` : '').filter(Boolean).join(' · ');

let state = { owned: adventurers.list.map(a => a.id), target: '', main: '', advTab: 'adv' };
try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* 저장소 못 씀 */ }
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* 무시 */ } };

// 공식 이미지: tools/fetch_images.py가 public/img/index.json에 보유 목록을 적어 둠
let IMG = { adventurers: [], monsters: [], buddyTypes: [] };
async function loadImages() {
  try { const r = await fetch(href('img/index.json'), { cache: 'no-cache' }); if (r.ok) IMG = await r.json(); } catch (e) { /* 이미지 없음 */ }
}
function pf(kind, id, label, elem) {
  const has = (IMG[kind] || []).includes(id);
  const inner = has ? `<img src="${href(`img/${kind}/${id}.png`)}" alt="" loading="lazy">` : `<span class="ini">${esc((label || '?').slice(0, 1))}</span>`;
  return `<div class="pf ${elem || 'any'}">${inner}</div>`;
}
const advPf = a => pf('adventurers', a.id, a.name, a.element);

// 편성 표기 "fated:great-sword" 해석
function member(x) {
  if (typeof x === 'string' && x.startsWith('fated:')) { const w = WEP[x.split(':')[1]]; return { fated: true, id: 'fated', name: '주인공', sub: w ? w.name : '', element: null }; }
  const a = ADV[x]; return a ? { id: a.id, name: a.name, sub: L.roles[a.role], element: a.element, a } : { id: x, name: x, sub: '' };
}
function memberChip(x) {
  const m = member(x);
  return m.a ? `<a class="chip" href="${href('adventurer/' + m.id)}" data-link>${esc(m.name)}</a>` : `<span class="chip">${esc(m.name)}${m.sub ? ' (' + esc(m.sub) + ')' : ''}</span>`;
}

// ---------- 화면 ----------
const views = {};

views.home = () => {
  const top = teams.list.filter(t => t.tier === 'top');
  const ra = MON['ruger-aidal'];
  return `
  <div class="hero">
    <h1>아웃랜더스 <em>범용 세팅</em>부터<br>파티 편성까지 한 곳에서</h1>
    <p class="note" style="margin:0">데이터 기준 ${esc(meta.updated)} · 게임 ${esc(meta.gameVersion)} · 시즌 ${esc(meta.season)}</p>
    <div class="row"><a class="btn primary" href="${href('builder')}" data-link>⚔ 자동 편성</a><a class="btn" href="${href('guide')}" data-link>성장 가이드 전체</a></div>
  </div>

  <div class="sec-h"><h2>초반 필수 동선</h2>${conf(growth.confidence)}</div>
  <div class="card"><ol class="steps">${growth.earlyRoute.map(s => `<li><div><b>${esc(s.title)}</b><span class="note">${esc(s.desc)}</span></div></li>`).join('')}</ol></div>

  <div class="grid">
    <div class="card"><h3>육성 우선순위</h3><ol class="plain" style="padding-left:20px;margin:0">${growth.priority.map(p => `<li>${esc(p.item)} <span class="stars">${'★'.repeat(p.weight)}</span></li>`).join('')}</ol></div>
    <div class="card"><h3>매일 할 일</h3><ul class="plain">${growth.daily.map(d => `<li>${esc(d)}</li>`).join('')}</ul><h3 style="margin-top:12px">먼저 해금</h3><div class="chips">${growth.unlockFirst.map(d => `<span class="chip">${esc(d)}</span>`).join('')}</div></div>
    <div class="card"><h3>${esc(growth.keepsake.name)} 한눈에</h3><p class="note" style="margin:0 0 8px">${esc(growth.keepsake.summary)}</p><ul class="plain"><li>${esc(growth.keepsake.levelUp)}</li><li>${esc(growth.keepsake.ascension.desc)}</li></ul><a href="${href('guide')}" data-link>기념품 · 인장 자세히</a></div>
  </div>

  <div class="sec-h"><h2>속성별 추천 편성</h2><a class="btn sm" href="${href('builder')}" data-link>내 모험가로 짜기</a></div>
  <div class="grid">${top.map(presetCard).join('')}</div>

  <div class="sec-h"><h2>주목 몬스터</h2></div>
  <div class="grid">
    <a class="card mon" href="${href('monster/' + ra.id)}" data-link><span class="nm">${esc(ra.name)} <span class="chip acc">시즌 0 고룡</span></span><span class="note">약점 ${weakList(ra)}</span><span class="note">스토리 6장 · 모험 랭크 40</span></a>
    <a class="card mon" href="${href('monsters?r=1')}" data-link><span class="nm">${esc(monsters.radiantRules.name)} ${monsters.list.filter(m => m.radiant).length}종</span><span class="note">${esc(monsters.radiantRules.rules[1])}</span></a>
  </div>`;
};

function weakList(m) {
  const w = Object.entries(m.weakness || {}).filter(([, n]) => n >= 3).map(([e]) => el(e));
  const a = Object.entries(m.ailmentWeakness || {}).filter(([, n]) => n >= 3).map(([k]) => `<span class="chip">${AIL[k]}</span>`);
  return [...w, ...a].join(' ') || '<span class="note">미확인</span>';
}

function presetCard(t) {
  const target = t.target.type === 'monster' && MON[t.target.id] ? ` · ${MON[t.target.id].name}` : '';
  return `<div class="card team">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(t.name)}</h3><span>${t.element !== 'mixed' ? el(t.element) : ''} ${t.budget ? '<span class="chip ok">가성비</span>' : ''} ${conf(t.confidence)}</span></div>
    <div class="team-m">${t.members.map((x, i) => {
      const m = member(x.id);
      const sub = m.fated ? `${m.sub}${x.fatedElement ? ' · ' + EL[x.fatedElement] : ''}` : m.sub;
      const pic = m.a ? advPf(m.a) : pf('x', 'fated', '주', x.fatedElement);
      const tag = m.a ? 'a' : 'div';
      return `<${tag} class="mem${i === 0 ? ' main' : ''}" ${m.a ? `href="${href('adventurer/' + m.id)}" data-link` : ''}>${pic}<b>${esc(m.name)}</b><span class="slot">${esc(sub || '')}</span></${tag}>`;
    }).join('')}</div>
    ${t.buddy && BUD[t.buddy] ? `<div class="note">동반자: <b>${esc(BUD[t.buddy].name)}</b> (${esc(L.buddyTypes[BUD[t.buddy].type])})${target}</div>` : (target ? `<div class="note">대상${target}</div>` : '')}
    <p class="note" style="margin:0">${esc(t.note)}</p>
    ${t.swaps && t.swaps.length ? `<div class="chips">${t.swaps.map(s => `<span class="chip">${esc(member(s.out).name)} → ${esc(member(s.in).name)}</span>`).join('')}</div>` : ''}
  </div>`;
}

// ---------- 자동 편성 ----------
const REASON = {
  weak: v => `약점 일치 ${v.map(e => EL[e]).join('·')}`,
  reso: v => `공명 ${EL[v[0]]}×${v[1]}`,
  spread: v => `속성 ${v}종 분산`,
  allAssault: () => '전원 돌격형',
  buffer: v => `범용 버퍼 ${ADV[v]?.name || v}`,
  link: v => `연계기 궁합 +${v}`,
  conflict: v => v,
  special: v => v
};

views.builder = (q) => {
  if (q.get('m')) state.target = 'm:' + q.get('m');
  if (q.get('main')) { state.main = q.get('main'); if (!state.owned.includes(state.main)) state.owned.push(state.main); }
  const large = monsters.list.filter(m => m.size === 'large');
  const opt = (v, t) => `<option value="${esc(v)}" ${state.target === v ? 'selected' : ''}>${esc(t)}</option>`;
  return `
  <div class="page-h"><h1>파티 편성</h1><p>보유한 모험가를 고르고 타깃을 정하면, 약점 속성 · 속성 공명 · 역할 밸런스 · 연계기 궁합으로 점수를 매겨 4인 편성 3개를 추천합니다. 주인공은 항상 보유로 보고, 빈 속성을 채우는 데 씁니다.</p></div>
  <div class="card filters">
    <label class="row" style="flex:1 1 260px"><span class="note">타깃</span>
      <select id="b-target" style="flex:1">
        ${opt('', '정하지 않음 (범용)')}
        <optgroup label="속성으로">${meta.elements.map(e => opt('e:' + e.id, e.name + ' 약점 몬스터')).join('')}</optgroup>
        <optgroup label="고룡 · 플래그십">${large.filter(m => m.class === 'elder').map(m => opt('m:' + m.id, m.name)).join('')}</optgroup>
        <optgroup label="대형 몬스터">${large.filter(m => m.class !== 'elder' && !m.radiant).map(m => opt('m:' + m.id, m.name)).join('')}</optgroup>
        <optgroup label="융광종">${large.filter(m => m.radiant).map(m => opt('m:' + m.id, m.name)).join('')}</optgroup>
      </select></label>
    <label class="row" style="flex:1 1 200px"><span class="note">메인 고정</span>
      <select id="b-main" style="flex:1"><option value="">자동</option>${adventurers.list.filter(a => state.owned.includes(a.id)).map(a => `<option value="${a.id}" ${state.main === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
  </div>
  <details class="card roster-box" ${state.owned.length === adventurers.list.length ? '' : 'open'}>
    <summary class="row" style="justify-content:space-between"><b>보유 모험가 <span class="note" id="b-count">${state.owned.length}/${adventurers.list.length}</span></b><span class="note">눌러서 편집</span></summary>
    <div class="row" style="justify-content:flex-end;margin:10px 0"><button class="btn sm" data-act="all">전체</button><button class="btn sm" data-act="none">해제</button></div>
    <div class="roster">${adventurers.list.map(a => `<label title="${esc(a.name)}"><input type="checkbox" value="${a.id}" ${state.owned.includes(a.id) ? 'checked' : ''}>${advPf(a)}<span>${esc(a.name)}</span></label>`).join('')}</div>
  </details>
  <div id="b-out"></div>`;
};

function renderBuild() {
  const out = $('#b-out'); if (!out) return;
  const t = state.target;
  const target = t.startsWith('m:') ? { monsterId: t.slice(2) } : t.startsWith('e:') ? { element: t.slice(2) } : {};
  const main = state.owned.includes(state.main) ? state.main : '';
  const r = buildTeams(DATA, state.owned, target, { fixedMain: main });
  const mon = r.monster;
  const presets = teams.list.filter(p => (mon && p.target.type === 'monster' && p.target.id === mon.id) || (target.element && p.element === target.element));
  let h = '';
  if (mon) h += `<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(mon.name)}</h3><a class="btn sm" href="${href('monster/' + mon.id)}" data-link>공략 보기</a></div>
    <div class="note">3★ 약점: ${weakList(mon)}${mon.weaknessComplete ? '' : ' · 2★ 이하는 아직 미확인이라 점수에 반영하지 않음'}</div></div>`;
  h += `<div class="sec-h"><h2>추천 편성</h2><span class="note">${r.total.toLocaleString()}개 조합 채점 ${conf('estimate')}</span></div>`;
  if (!r.results.length) h += `<div class="card empty">조합을 만들 수 없습니다. 보유 모험가를 3명 이상 골라 주세요.</div>`;
  h += `<div class="grid">${r.results.map((x, i) => `<div class="card team">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">${i + 1}안</h3><span class="score">${x.score}</span></div>
    <div class="team-m">${x.team.map((u, j) => {
      const a = u.fated ? null : ADV[u.id];
      const pic = a ? advPf(a) : pf('x', 'fated', '주', u.element);
      const sub = u.fated ? `${WEP[u.weapon].name} · ${EL[u.element]} 무기` : L.roles[u.role];
      const tag = a ? 'a' : 'div';
      return `<${tag} class="mem${j === 0 ? ' main' : ''}" ${a ? `href="${href('adventurer/' + a.id)}" data-link` : ''}>${pic}<b>${esc(u.fated ? '주인공' : u.name)}</b><span class="slot">${j === 0 ? '메인 · ' : ''}${esc(sub)}</span></${tag}>`;
    }).join('')}</div>
    ${x.buddy ? `<div class="note">동반자: <b>${esc(x.buddy.buddy.name)}</b> (${esc(L.buddyTypes[x.buddy.buddy.type])} · ${esc(x.buddy.why)})</div>` : ''}
    <div class="reasons">${x.reasons.map(z => `<span class="chip ${z.t === 'good' ? 'ok' : 'bad'}">${esc(REASON[z.k](z.v))}</span>`).join('')}</div>
  </div>`).join('')}</div>
  <p class="note">점수는 커뮤니티 조언(속성 1~2종, 전원 돌격형 회피, 약점 속성 맞추기 등)을 수치로 옮긴 비교용 추정치입니다. 실제 화력 계산이 아닙니다. 가중치는 <code>src/data/builder-rules.json</code>에서 바꿀 수 있습니다.</p>`;
  if (presets.length) h += `<div class="sec-h"><h2>공략 사이트 추천 편성</h2></div><div class="grid">${presets.map(presetCard).join('')}</div>`;
  out.innerHTML = h;
}

function bindBuilder(root) {
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('.roster input')) { state.owned = [...root.querySelectorAll('.roster input:checked')].map(i => i.value); save(); updateCount(root); refreshMainSelect(root); renderBuild(); }
    if (t.id === 'b-target') { state.target = t.value; save(); syncUrl(); renderBuild(); }
    if (t.id === 'b-main') { state.main = t.value; save(); renderBuild(); }
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    state.owned = b.dataset.act === 'all' ? adventurers.list.map(a => a.id) : [];
    root.querySelectorAll('.roster input').forEach(i => { i.checked = state.owned.includes(i.value); });
    save(); updateCount(root); refreshMainSelect(root); renderBuild();
  });
}
function updateCount(root) { const c = $('#b-count', root); if (c) c.textContent = `${state.owned.length}/${adventurers.list.length}`; }
function refreshMainSelect(root) {
  const s = $('#b-main', root); if (!s) return;
  if (!state.owned.includes(state.main)) state.main = '';
  s.innerHTML = `<option value="">자동</option>` + adventurers.list.filter(a => state.owned.includes(a.id)).map(a => `<option value="${a.id}" ${state.main === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
}
function syncUrl() {
  const m = state.target.startsWith('m:') ? '?m=' + state.target.slice(2) : '';
  history.replaceState(null, '', href('builder') + m);
}

// ---------- 모험가 · 동반자 ----------
let advFilter = { role: '', element: '', weapon: '' };
views.adventurers = () => {
  const tab = state.advTab;
  const head = `<div class="page-h"><h1>모험가 · 동반자</h1><p>티어는 커뮤니티 평가(GameWith 한국어 2026-11-19 기준)이며, 같은 티어 안에서는 순위 차이가 없습니다.</p></div>
  <div class="seg" id="adv-tab"><button data-v="adv" aria-pressed="${tab === 'adv'}">모험가</button><button data-v="bud" aria-pressed="${tab === 'bud'}">동반자</button></div>`;
  if (tab === 'bud') return head + buddyList();
  const sel = (k, opts) => `<select data-f="${k}"><option value="">${{ role: '역할', element: '속성', weapon: '무기' }[k]} 전체</option>${opts.map(([v, t]) => `<option value="${v}" ${advFilter[k] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const f = adventurers.fated;
  return head + `
  <div class="filters">${sel('role', Object.entries(L.roles))}${sel('element', meta.elements.map(e => [e.id, e.name]))}${sel('weapon', weapons.list.map(w => [w.id, w.name]))}</div>
  <div class="grid" id="adv-list"></div>
  <div class="sec-h"><h2>${esc(f.name)}</h2>${conf(f.confidence)}</div>
  <div class="card"><p style="margin:0 0 8px">${esc(f.summary)}</p><ul class="plain">${f.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
    <h3 style="margin-top:12px">무기별 평가</h3><div class="chips">${Object.entries(f.tierByWeapon).map(([w, t]) => `<a class="chip" href="${href('weapon/' + w)}" data-link>${esc(WEP[w].name)} <b>${t}</b></a>`).join('')}</div></div>`;
};
function advListHtml() {
  const list = adventurers.list.filter(a => (!advFilter.role || a.role === advFilter.role) && (!advFilter.element || a.element === advFilter.element) && (!advFilter.weapon || a.weapon === advFilter.weapon));
  if (!list.length) return `<div class="card empty">조건에 맞는 모험가가 없습니다.</div>`;
  return list.map(a => `<a class="card adv" href="${href('adventurer/' + a.id)}" data-link>${advPf(a)}<div><div class="nm"><span class="n">${esc(a.name)}</span> <span class="rar ${a.rarity}">${a.rarity}</span> <span class="tier">${a.tier}</span></div>
    <div class="row">${role(a.role)} <span class="note">${esc(WEP[a.weapon].name)}</span> ${el(a.element)}</div><div class="note">${esc(a.ult.name)}: ${esc(a.ult.desc)}</div></div></a>`).join('');
}
function buddyList() {
  return `<div class="grid">${buddies.types.map(t => `<div class="card">${pf('buddyTypes', t.id, t.label, null)}<h3 style="margin-top:10px">${esc(L.buddyTypes[t.id])} <span class="role ${t.id}">${esc(t.role)}</span></h3><p class="note" style="margin:0 0 6px">${esc(t.summary)}</p><ul class="plain">${t.whenToUse.map(w => `<li>${esc(w)}</li>`).join('')}</ul>${t.warning ? `<p class="note" style="color:var(--warn)">⚠ ${esc(t.warning)}</p>` : ''}</div>`).join('')}</div>
  <div class="card note">${esc(buddies.rule)}</div>
  <div class="sec-h"><h2>핵심 동반자</h2>${conf(buddies.confidence)}</div>
  <div class="grid">${buddies.list.map(b => `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><span><span class="rar ${b.rarity}">${b.rarity}</span> <span class="tier">${b.tier}</span></span></div>
    <div class="row"><span class="role ${b.type}">${esc(L.buddyTypes[b.type])}</span>${b.pair ? `<a class="chip acc" href="${href('adventurer/' + b.pair)}" data-link>${esc(ADV[b.pair].name)} 모티프</a>` : ''}</div><p class="note" style="margin:6px 0 0">${esc(b.effect)}</p></div>`).join('')}</div>
  <p class="note">${esc(buddies._note)}</p>`;
}
function bindAdventurers(root) {
  const list = $('#adv-list', root); if (list) list.innerHTML = advListHtml();
  root.addEventListener('change', e => { const k = e.target.dataset.f; if (!k) return; advFilter[k] = e.target.value; $('#adv-list', root).innerHTML = advListHtml(); });
  root.addEventListener('click', e => { const b = e.target.closest('#adv-tab button'); if (!b) return; state.advTab = b.dataset.v; save(); show('adventurers'); });
}

const TRIG = { special: '메인 필살기 명중 시', dodge: '메인 회피 성공 시', suppress: '몬스터 제압 시' };
const SLOT = { main: '메인 조작', resonance: '속성 공명', buffer: '버퍼', support: '지원', suppress: '제압', flex: '자유', debuff: '디버프', swaps: '교체 후보' };
views.adventurer = (q, id) => {
  const a = ADV[id]; if (!a) return views.notfound();
  const inTeams = teams.list.filter(t => t.members.some(m => m.id === a.id));
  const bl = a.buddies.map(b => BUD[b]).filter(Boolean);
  return `
  <a class="note" href="${href('adventurers')}" data-link>← 모험가 목록</a>
  <div class="card adv" style="grid-template-columns:96px 1fr">${advPf(a).replace('class="pf', 'style="width:96px" class="pf')}<div>
    <div class="nm" style="font-size:24px"><span class="n">${esc(a.name)}</span> <span class="rar ${a.rarity}">${a.rarity}</span> <span class="tier">${a.tier}</span> ${conf(a.confidence)}</div>
    <div class="row">${role(a.role)} <a class="note" href="${href('weapon/' + a.weapon)}" data-link>${esc(WEP[a.weapon].name)}</a> ${el(a.element)}</div>
    <div class="note">입수: ${a.obtain.map(esc).join(', ')}</div>
    <div class="row" style="margin-top:8px"><a class="btn primary sm" href="${href('builder?main=' + a.id)}" data-link>이 모험가로 편성</a></div></div></div>
  <div class="grid">
    <div class="card"><h3>오의 · ${esc(a.ult.name)}</h3><p style="margin:0">${esc(a.ult.desc)}</p></div>
    <div class="card"><h3>연계기 · ${esc(a.link.name)}</h3><p style="margin:0">${esc(a.link.desc)}</p><div class="note">발동: ${esc(TRIG[a.link.trigger])} · ${a.link.cooldown}초에 1회</div></div>
    <div class="card"><h3>고유 특성 · ${esc(a.trait.name)}</h3><p style="margin:0">${esc(a.trait.desc)}</p></div>
    ${a.corePassive ? `<div class="card"><h3>코어 패시브</h3><p style="margin:0">${esc(a.corePassive)}</p><div class="note">기념품 인장 '코어 패시브'(Lv50~)로 강화</div></div>` : ''}
    ${a.survival ? `<div class="card"><h3>서바이벌 특성</h3><p style="margin:0">${esc(a.survival)}</p></div>` : ''}
  </div>
  <div class="grid">
    <div class="card"><h3>추천 동반자</h3><ul class="plain">${bl.map(b => `<li><b>${esc(b.name)}</b> <span class="note">${esc(L.buddyTypes[b.type])} · ${b.rarity}${b.pair === a.id ? ' · 모티프' : ''}</span><br><span class="note">${esc(b.effect)}</span></li>`).join('')}</ul></div>
    <div class="card"><h3>추천 파티</h3><dl class="kv">${Object.entries(a.team).map(([k, v]) => `<dt>${esc(SLOT[k] || k)}</dt><dd class="chips">${(Array.isArray(v) ? v : [v]).map(memberChip).join('')}</dd>`).join('')}</dl></div>
    <div class="card"><h3>장점</h3><ul class="plain">${a.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul><h3 style="margin-top:10px">주의점</h3><ul class="plain">${a.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
  </div>
  ${inTeams.length ? `<div class="sec-h"><h2>포함된 추천 편성</h2></div><div class="grid">${inTeams.map(presetCard).join('')}</div>` : ''}
  <p class="note">출처: ${srcLinks(a.sources)}</p>`;
};

// ---------- 무기 ----------
views.weapons = () => `
  <div class="page-h"><h1>주인공 무기 8종</h1><p>주인공은 장비 화면에서 언제든 무기를 바꿀 수 있고, 모든 무기를 가지고 시작합니다. 속성은 몬스터 약점에 맞춰 고르는 것이 공통 원칙입니다.</p></div>
  <div class="grid">${weapons.list.map(w => `<a class="card" href="${href('weapon/' + w.id)}" data-link style="text-decoration:none">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(w.name)}</h3><span><span class="tier">${w.tier}</span> <span class="note">난이도 ${'●'.repeat(w.difficulty)}${'○'.repeat(3 - w.difficulty)}</span></span></div>
    <p class="note" style="margin:6px 0">${esc(w.summary)}</p>
    <div class="chips">${w.range === 'ranged' ? '<span class="chip">원거리</span>' : '<span class="chip">근거리</span>'}${(w.insights || []).map(i => `<span class="chip acc">${esc(i)}</span>`).join('')}</div></a>`).join('')}</div>
  <div class="sec-h"><h2>주인공 타입 고르기</h2>${conf(weapons.typeGuide.confidence)}</div>
  <div class="card"><p style="margin:0 0 6px">${esc(weapons.typeGuide.summary)}</p><ul class="plain">${weapons.typeGuide.advice.map(a => `<li>${esc(a)}</li>`).join('')}<li>${esc(weapons.typeGuide.disruptorUlt)}</li></ul></div>`;

views.weapon = (q, id) => {
  const w = WEP[id]; if (!w) return views.notfound();
  const users = adventurers.list.filter(a => a.weapon === w.id);
  return `
  <a class="note" href="${href('weapons')}" data-link>← 무기 목록</a>
  <div class="page-h"><h1>${esc(w.name)} <span class="tier">${w.tier}</span> ${conf(w.confidence)}</h1><p>${esc(w.summary)}</p></div>
  <div class="card"><h3>기본 운용</h3><ol class="steps">${w.howTo.map(s => `<li><div>${esc(s)}</div></li>`).join('')}</ol></div>
  <div class="grid">
    <div class="card"><h3>추천 깨달음</h3><div class="chips">${(w.insights || []).map(i => `<span class="chip acc">${esc(i)}</span>`).join('') || '<span class="note">정보 없음</span>'}</div>
      <h3 style="margin-top:12px">초반 장비</h3><p class="note" style="margin:0">${esc(w.earlyGear || '')}</p>${w.partyNote ? `<p class="note">${esc(w.partyNote)}</p>` : ''}</div>
    <div class="card"><h3>팁</h3><ul class="plain">${w.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul><h3 style="margin-top:10px">주의점</h3><ul class="plain">${w.cautions.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    ${w.elementPicks ? `<div class="card"><h3>속성별 추천 무기</h3><dl class="kv">${Object.entries(w.elementPicks).map(([e, n]) => `<dt>${el(e)}</dt><dd>${esc(n)}</dd>`).join('')}</dl></div>` : ''}
  </div>
  <div class="card"><h3>이 무기를 쓰는 모험가</h3><div class="chips"><a class="chip acc" href="${href('adventurers')}" data-link>주인공 (${adventurers.fated.tierByWeapon[w.id]})</a>${users.map(a => `<a class="chip" href="${href('adventurer/' + a.id)}" data-link>${esc(a.name)} (${a.tier})</a>`).join('')}</div></div>`;
};

// ---------- 몬스터 ----------
let monFilter = { q: '', kind: 'all', weak: '' };
views.monsters = (q) => {
  if (q.get('r')) monFilter.kind = 'radiant';
  const rr = monsters.radiantRules;
  return `
  <div class="page-h"><h1>몬스터</h1><p>대형 몬스터 ${monsters.list.filter(m => m.size === 'large').length}종 · 소형 ${monsters.list.filter(m => m.size === 'small').length}종. 약점은 3★(최대) 속성 · 상태이상을 표시합니다.</p></div>
  <div class="filters">
    <input type="search" id="m-q" placeholder="이름 검색" value="${esc(monFilter.q)}">
    <div class="seg" id="m-kind">${[['all', '전체'], ['normal', '일반'], ['radiant', '융광종'], ['small', '소형']].map(([v, t]) => `<button data-v="${v}" aria-pressed="${monFilter.kind === v}">${t}</button>`).join('')}</div>
    <select id="m-weak"><option value="">약점 속성 전체</option>${meta.elements.map(e => `<option value="${e.id}" ${monFilter.weak === e.id ? 'selected' : ''}>${e.name} 3★</option>`).join('')}</select>
  </div>
  <div class="grid" id="m-list"></div>
  <details class="card"><summary><b>${esc(rr.name)} 공통 규칙</b> ${conf(rr.confidence)}</summary><ul class="plain" style="margin-top:8px">${rr.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>`;
};
function monListHtml() {
  const k = monFilter.kind;
  const list = monsters.list.filter(m => (k === 'small' ? m.size === 'small' : m.size === 'large') && (k !== 'normal' || !m.radiant) && (k !== 'radiant' || m.radiant)
    && (!monFilter.q || m.name.includes(monFilter.q) || m.nameEn.toLowerCase().includes(monFilter.q.toLowerCase()))
    && (!monFilter.weak || (m.weakness || {})[monFilter.weak] >= 3));
  if (!list.length) return `<div class="card empty">조건에 맞는 몬스터가 없습니다.</div>`;
  return list.map(m => {
    const pic = (IMG.monsters || []).includes(m.id) ? `<img class="mon-img" src="${href('img/monsters/' + m.id + '.png')}" alt="" loading="lazy">` : '';
    const body = `${pic}<span class="nm">${esc(m.name)} ${m.radiant ? '<span class="chip acc">융광종</span>' : ''}${m.class === 'elder' ? '<span class="chip">고룡</span>' : ''}</span>${m.size === 'large' ? `<span class="note">약점 ${weakList(m)}</span>` : '<span class="note">소형 몬스터</span>'}`;
    return m.size === 'large' ? `<a class="card mon" href="${href('monster/' + m.id)}" data-link>${body}</a>` : `<div class="card mon">${body}</div>`;
  }).join('');
}
function bindMonsters(root) {
  const draw = () => { $('#m-list', root).innerHTML = monListHtml(); };
  draw();
  root.addEventListener('input', e => { if (e.target.id === 'm-q') { monFilter.q = e.target.value.trim(); draw(); } });
  root.addEventListener('change', e => { if (e.target.id === 'm-weak') { monFilter.weak = e.target.value; draw(); } });
  root.addEventListener('click', e => { const b = e.target.closest('#m-kind button'); if (!b) return; monFilter.kind = b.dataset.v; root.querySelectorAll('#m-kind button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
}

views.monster = (q, id) => {
  const m = MON[id]; if (!m || m.size !== 'large') return views.notfound();
  const twin = m.radiant ? MON[m.baseId] : monsters.list.find(x => x.baseId === m.id);
  const presets = teams.list.filter(t => t.target.type === 'monster' && t.target.id === m.id);
  return `
  <a class="note" href="${href('monsters')}" data-link>← 몬스터 목록</a>
  ${(IMG.monsters || []).includes(m.id) ? `<img class="mon-hero" src="${href('img/monsters/' + m.id + '.png')}" alt="${esc(m.name)}">` : ''}
  <div class="page-h"><h1>${esc(m.name)} ${m.species && m.species !== '융광종' ? `<span class="chip">${esc(m.species)}</span>` : ''}${m.radiant ? '<span class="chip acc">융광종</span>' : ''}${m.class === 'elder' ? '<span class="chip">고룡</span>' : ''} ${conf(m.confidence)}</h1><p class="note">${esc(m.nameEn)}${m.nameJa ? ' · ' + esc(m.nameJa) : ''}</p></div>
  <div class="card"><h3>속성 약점</h3>
    <div class="weak-t">${meta.elements.map(e => { const n = (m.weakness || {})[e.id]; return `<div>${el(e.id)}${n ? stars(n) : `<span class="note">${m.weaknessComplete ? '-' : '?'}</span>`}</div>`; }).join('')}</div>
    ${m.weaknessStates ? `<p class="note" style="margin:8px 0 0">상태에 따라 달라짐: ${Object.entries(m.weaknessStates).map(([e, v]) => `${EL[e]} ${Object.entries(v).map(([k, n]) => `${esc(k)} ★${n}`).join(' / ')}`).join(' · ')}</p>` : ''}
    <h3 style="margin-top:14px">상태이상</h3>
    <div class="weak-t">${meta.ailments.map(a => { const n = (m.ailmentWeakness || {})[a.id]; return `<div><span class="note" style="font-weight:700">${a.name}</span>${n ? stars(n) : '<span class="note">?</span>'}</div>`; }).join('')}</div>
    ${m.weaknessComplete ? '' : '<p class="note" style="margin:8px 0 0">? 표시는 2★ 이하로, 아직 정확한 별점을 확인하지 못했습니다.</p>'}
    <div class="row" style="margin-top:10px"><a class="btn primary sm" href="${href('builder?m=' + m.id)}" data-link>이 몬스터용 자동 편성</a>${twin ? `<a class="btn sm" href="${href('monster/' + twin.id)}" data-link>${esc(twin.name)}</a>` : ''}</div>
  </div>
  ${m.unlock || m.breakable ? `<div class="grid">${m.unlock ? `<div class="card"><h3>출현</h3><p style="margin:0">${esc(m.unlock)}</p></div>` : ''}${m.breakable ? `<div class="card"><h3>파괴 부위</h3><div class="chips">${m.breakable.map(b => `<span class="chip">${esc(b)}</span>`).join('')}</div>${m.inflicts ? `<p class="note">거는 상태이상: ${m.inflicts.map(esc).join(', ')}</p>` : ''}</div>` : ''}</div>` : ''}
  ${m.hitzones && Object.keys(m.hitzones).length ? `<div class="card"><h3>약점 부위</h3><table class="hz"><thead><tr><th>부위</th><th>절단</th><th>타격</th><th>탄</th></tr></thead><tbody>${Object.entries(m.hitzones).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${stars(v.cut)}</td><td>${stars(v.blunt)}</td><td>${stars(v.shot)}</td></tr>`).join('')}</tbody></table>
    ${m.items ? `<div class="row" style="margin-top:10px">${[['flash', '섬광탄'], ['pitfall', '구멍 함정'], ['sonic', '음폭탄']].map(([k, t]) => `<span class="chip ${m.items[k] === '유효' ? 'ok' : ''}">${t} ${esc(m.items[k])}</span>`).join('')}</div>` : ''}</div>` : ''}
  ${m.hitzoneStates ? `<div class="card note">${esc(m.hitzoneStates)}</div>` : ''}
  ${m.eventNote ? `<div class="card note">${esc(m.eventNote)}</div>` : ''}
  ${m.tips ? `<div class="card"><h3>파훼 포인트</h3><ul class="plain">${m.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
  ${m.radiant ? `<div class="card"><h3>융광종 공통 규칙</h3><ul class="plain">${monsters.radiantRules.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
  ${presets.length ? `<div class="sec-h"><h2>추천 편성</h2></div><div class="grid">${presets.map(presetCard).join('')}</div>` : ''}
  <p class="note">출처: ${srcLinks(m.sources)}</p>`;
};

// ---------- 성장 가이드 ----------
views.guide = () => {
  const k = growth.keepsake, e = k.engravings;
  return `
  <div class="page-h"><h1>성장 가이드 ${conf(growth.confidence)}</h1><p>뉴비 기준 범용 진행 순서와 육성 자원 쓰는 법.</p></div>
  <div class="card"><h3>초반 동선</h3><ol class="steps">${growth.earlyRoute.map(s => `<li><div><b>${esc(s.title)}</b><span class="note">${esc(s.desc)}</span></div></li>`).join('')}</ol></div>
  <div class="grid">
    <div class="card"><h3>매일 할 일</h3><ul class="plain">${growth.daily.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
    <div class="card"><h3>먼저 해금</h3><ul class="plain">${growth.unlockFirst.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
    <div class="card"><h3>나중에 해도 되는 것</h3><ul class="plain">${growth.later.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
  </div>
  <div class="sec-h"><h2>${esc(k.name)} (Keepsake)</h2></div>
  <div class="card"><p style="margin:0 0 8px">${esc(k.summary)}</p><dl class="kv"><dt>레벨 업</dt><dd>${esc(k.levelUp)}</dd><dt>한계 돌파</dt><dd>${esc(k.ascension.desc)}<br>${k.ascension.materials.map(m => `<span class="chip">${esc(m.name)} ${esc(m.range)}</span>`).join(' ')}<br><span class="note">${esc(k.ascension.source)}</span></dd></dl></div>
  <div class="card"><h3>${esc(e.name)} (${esc(e.unlock)})</h3>
    <dl class="kv">${e.list.map(x => `<dt>${esc(x.name)}</dt><dd>${esc(x.desc)} <span class="note">Lv ${esc(x.levels)}</span></dd>`).join('')}</dl>
    <p class="note">${esc(e.materials)}</p><h3>투자 순서</h3><ul class="plain">${e.investOrder.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="grid">
    <div class="card"><h3>육성 우선순위</h3><ol class="plain" style="padding-left:20px;margin:0">${growth.priority.map(p => `<li>${esc(p.item)} <span class="stars">${'★'.repeat(p.weight)}</span></li>`).join('')}</ol></div>
    <div class="card"><h3>동반자 육성</h3><p style="margin:0">${esc(growth.buddyGrowth)}</p></div>
  </div>
  <div class="card"><h3>낭비 줄이는 팁</h3><ul class="plain">${growth.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
  <p class="note">출처: ${srcLinks(growth.sources)}</p>`;
};

views.notfound = () => `<div class="card empty"><h3>페이지를 찾을 수 없습니다</h3><a class="btn" href="${href('')}" data-link>홈으로</a></div>`;

// ---------- 라우터 (레퍼런스와 같은 history 방식) ----------
const BINDERS = { builder: (r) => { bindBuilder(r); renderBuild(); }, adventurers: bindAdventurers, monsters: bindMonsters };
function parse() {
  let p = decodeURIComponent(location.pathname);
  if (p.startsWith(BASE)) p = p.slice(BASE.length); else p = p.replace(/^\//, '');
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
  const navKey = { adventurer: 'adventurers', weapon: 'weapons', monster: 'monsters' }[view] || view;
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav.split(' ').includes(navKey)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const h1 = sec.querySelector('h1');
  document.title = (view === 'home' ? '' : (h1 ? h1.textContent.trim().replace(/\s+(커뮤니티|공식|추정)$/, '') + ' · ' : '')) + '아웃랜더스 이모저모';
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
let theme = 'dark'; try { theme = localStorage.getItem('mhol-theme') || 'dark'; } catch (e) { /* 무시 */ }
applyTheme(theme);
themeBtn.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); try { localStorage.setItem('mhol-theme', theme); } catch (e) { /* 무시 */ } });
$('#foot-ver').textContent = `데이터 v${meta.dataVersion} · ${meta.updated}`;

loadImages().then(() => route(true));
route(true);
