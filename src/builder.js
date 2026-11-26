// 자동 편성 엔진 — 화면과 분리된 순수 함수.
// 점수 수치는 src/data/builder-rules.json에서 읽으므로, 수치를 바꿔도 이 파일은 고칠 필요가 없다.

const TIERS = ['S', 'A', 'NEW', 'B', 'C'];
const PROF_RANK = { assault: 0, eruption: 0, rupture: 1, imbuement: 2, amplifier: 2 };

const atkEl = u => (u.elements && u.elements[0]) || null;

export function matchup(chart, attack, target) {
  if (!attack || !target) return 0;
  if ((chart.strong[attack] || []).includes(target)) return 1;
  if ((chart.weak[attack] || []).includes(target)) return -1;
  return 0;
}

function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}

function pickMain(team, fixedMain) {
  if (fixedMain) return team.find(u => u.id === fixedMain) || null;
  const cand = team.filter(u => u.group === 'dps');
  const pool = cand.length ? cand : team.filter(u => u.group === 'breaker');
  if (!pool.length) return null;
  const rank = u => TIERS.indexOf(u.tier) * 10 + (PROF_RANK[u.prof] ?? 3) + (u.rarity === 5 ? 0 : 3);
  return pool.slice().sort((a, b) => rank(a) - rank(b))[0];
}

// team: 캐릭터 객체 3개. ctx: { rules, chart, presets, target, kibo, fixedMain }
export function scoreTeam(team, ctx) {
  const { rules, chart, presets, target, kibo, fixedMain } = ctx;
  const S = rules.scoring;
  const main = pickMain(team, fixedMain);
  if (!main) return null;
  const allies = team.filter(u => u !== main);
  const reasons = [];
  let score = 0;
  const add = (v, t, k, x) => { score += v; if (k) reasons.push({ t, k, v: x }); };

  // 1) 직업 구성
  const C = S.composition;
  const dps = team.filter(u => u.group === 'dps').length;
  const brk = team.filter(u => u.group === 'breaker').length;
  const sup = team.filter(u => u.group === 'support').length;
  if (main.group === 'breaker') add(C.breakerAsMain, 'bad', 'breakerMain');
  if (dps >= 2) add(C.twoMainDps * (dps - 1), 'bad', 'twoDps', dps);
  if (sup === 0) add(C.noSupport, 'bad', 'noSup');
  if (dps === 1 && sup === 2) add(C.hypercarry, 'good', 'hc');
  else if (dps === 1 && brk === 1 && sup === 1) add(C.balanced, 'good', 'bal');
  if (team.some(u => u.heal || u.shield)) add(C.healOrShield, 'good', 'sustain', team.filter(u => u.heal || u.shield).map(u => u.id));
  else add(C.noSustain, 'bad', 'noSustain');

  // 2) 각인 수급 (메인 딜러 기준)
  const M = S.mark;
  const star = allies.find(u => u.wildcard);
  const allyGain = new Set(allies.flatMap(u => u.gains));
  // 성림자는 파티에 이미 있는 각인을 늘려 줌 → 메인 자급 각인도 동료 공급처럼 본다
  if (star) for (const e of [...main.gains, ...allyGain]) allyGain.add(e);
  const need = [...new Set([...main.requires, ...main.consumes])];
  const marks = [];
  let kiboLeft = kibo ? 1 : 0;
  const core = new Set([...main.requires, ...main.consumes.slice(0, 1)]);
  for (const e of need) {
    const opt = !core.has(e);
    const w = opt ? M.optionalMultiplier : main.requires.includes(e) ? M.requiresMultiplier : 1;
    const real = allies.filter(u => u.gains.includes(e)).map(u => u.id);
    const viaStar = star && (main.gains.includes(e) || allyGain.has(e));
    const by = viaStar ? [...real, star.id] : real;
    if (by.length) { add(Math.round(M.mainNeedByAlly * w * (real.length ? 1 : M.starbornSupplyRatio)), 'good', 'markAlly', [e, by]); marks.push({ e, st: 'ally', by, opt }); }
    else if (main.gains.includes(e)) { add(Math.round(M.mainNeedBySelfOnly * w), 'warn', 'markSelf', e); marks.push({ e, st: 'self', by: [main.id], opt }); }
    else if (kiboLeft > 0 && !opt) { kiboLeft--; add(M.mainNeedByKibo, 'warn', 'markKibo', e); marks.push({ e, st: 'kibo', by: [], opt }); }
    else if (opt) { add(M.optionalMissing, 'warn', 'markOpt', e); marks.push({ e, st: 'miss', by: [], opt }); }
    else { add(Math.round(M.mainNeedMissing * w), 'bad', 'markMiss', e); marks.push({ e, st: 'miss', by: [], opt }); }
  }
  if (star && need.length) add(M.starbornBoost, 'good', 'star');
  // 서브(브레이커 · 부여)가 소모하는 각인
  const teamGain = new Set(team.flatMap(u => u.gains));
  if (star) for (const e of teamGain) teamGain.add(e);
  for (const u of allies) for (const e of u.consumes) {
    if (teamGain.has(e)) score += M.subNeedByTeam; else score += M.subNeedMissing;
  }

  // 3) 원소 상성
  if (target) {
    const E = S.element;
    const m = matchup(chart, atkEl(main), target);
    if (m > 0) add(E.mainAdv, 'good', 'adv', atkEl(main));
    if (m < 0) add(E.mainDis, 'bad', 'dis', atkEl(main));
    for (const u of allies) { const s = matchup(chart, atkEl(u), target); score += s > 0 ? E.subAdv : s < 0 ? E.subDis : 0; }
  }

  // 4) 티어
  for (const u of team) score += S.tierBonus[u.tier] || 0;

  // 5) 공략 추천 편성과 일치
  const ids = team.map(u => u.id).sort().join();
  for (const p of presets) {
    const variants = [p.members, ...(p.swaps || []).map(s => p.members.map(x => (x === s.out ? s.in : x)))];
    if (variants.some(v => v.slice().sort().join() === ids)) { add(S.presetMatch, 'good', 'preset', p.name); break; }
  }

  return { team: [main, ...allies], main, score, reasons, marks };
}

// opts: { parties, targets[], kibo, fixedMains[], pinned[] (id 배열 또는 null) }
export function buildParties(data, ownedIds, opts = {}) {
  const { rules, characters, teams, meta } = data;
  const all = [...characters.list, characters.starborn];
  const byId = Object.fromEntries(all.map(c => [c.id, c]));
  const owned = new Set([...ownedIds, 'starborn']);
  const N = Math.max(1, Math.min(rules.maxParties, opts.parties || 1));
  const size = rules.partySize;
  const ctxOf = i => ({ rules, chart: meta.chart, presets: teams.list, target: (opts.targets || [])[i] || '', kibo: !!opts.kibo, fixedMain: (opts.fixedMains || [])[i] || '' });

  const parties = Array(N).fill(null);
  const used = new Set();
  // 고정(또는 직접 교체한) 파티 먼저
  for (let i = 0; i < N; i++) {
    const pin = (opts.pinned || [])[i];
    if (!pin || pin.length !== size) continue;
    const team = pin.map(id => byId[id]).filter(c => c && owned.has(c.id) && !used.has(c.id));
    if (team.length !== size) continue;
    const ctx = ctxOf(i);
    const r = scoreTeam(team, { ...ctx, fixedMain: team.some(u => u.id === ctx.fixedMain) ? ctx.fixedMain : '' }) || scoreTeam(team, { ...ctx, fixedMain: pin[0] });
    if (!r) continue;
    r.pinned = true;
    parties[i] = r; team.forEach(u => used.add(u.id));
  }

  const pool = all.filter(c => owned.has(c.id) && !used.has(c.id));
  const open = parties.map((p, i) => (p ? -1 : i)).filter(i => i >= 0);
  const all3 = pool.length >= size ? combos(pool, size) : [];
  const K = open.length >= 3 ? 70 : open.length === 2 ? 160 : 400;
  const ranked = {};
  let total = 0;
  for (const i of open) {
    const ctx = ctxOf(i);
    const list = [];
    for (const t of all3) { const r = scoreTeam(t, ctx); if (r) list.push(r); }
    total += list.length;
    list.sort((a, b) => b.score - a.score);
    ranked[i] = list.slice(0, K);
  }

  // 겹치지 않는 조합 중 점수 합이 가장 큰 것
  const keyset = r => new Set(r.team.map(u => u.id));
  let best = null, bestSum = -Infinity;
  const pick = (idx, chosen, sum, usedIds) => {
    if (idx === open.length) { if (sum > bestSum) { bestSum = sum; best = chosen.slice(); } return; }
    const list = ranked[open[idx]];
    let any = false;
    for (const r of list) {
      if (r.team.some(u => usedIds.has(u.id))) continue;
      // 남은 파티가 모두 지금 후보 이상 점수를 받아도 최고 기록을 못 넘으면 중단
      if (sum + r.score * (open.length - idx) <= bestSum) break;
      any = true;
      const ks = keyset(r);
      chosen.push(r); pick(idx + 1, chosen, sum + r.score, new Set([...usedIds, ...ks])); chosen.pop();
    }
    if (!any) { chosen.push(null); pick(idx + 1, chosen, sum, usedIds); chosen.pop(); }
  };
  if (open.length) pick(0, [], 0, new Set());
  if (best) open.forEach((i, j) => { parties[i] = best[j]; });

  // 파티마다 다른 후보(다른 파티 구성원과 겹치지 않는 것)
  const alts = parties.map((p, i) => {
    if (!p) return [];
    const others = new Set(parties.filter((q, j) => q && j !== i).flatMap(q => q.team.map(u => u.id)));
    const mine = p.team.map(u => u.id).sort().join();
    const out = [];
    for (const r of ranked[i] || []) {
      if (r.team.some(u => others.has(u.id))) continue;
      if (r.team.map(u => u.id).sort().join() === mine) continue;
      out.push(r); if (out.length >= 2) break;
    }
    return out;
  });

  return { parties, alts, total, owned: owned.size };
}
