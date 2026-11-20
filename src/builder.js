// 자동 편성 엔진 — 화면과 분리된 순수 함수.
// 점수 수치는 모두 src/data/builder-rules.json에서 읽으므로, 수치를 바꿔도 이 파일은 고칠 필요가 없다.

const TIERS = ['SSS', 'SS', 'S', 'A', 'B', 'C'];

// 주인공 가상 유닛: 메인용(헤비보우건·돌격형)과 공명용(대검·지원형)을 속성별로 만든다.
function fatedUnits(data) {
  const out = [];
  const els = data.meta.elements.map(e => e.id);
  const tw = data.adventurers.fated.tierByWeapon;
  const subW = data.rules.fated.preferredWeaponAsResonance;
  for (const el of els) {
    out.push({ id: `fated:heavy-bowgun:${el}`, fated: true, name: '주인공', weapon: 'heavy-bowgun', element: el, role: 'assault', tier: tw['heavy-bowgun'], fatedMain: true });
    out.push({ id: `fated:${subW}:${el}`, fated: true, name: '주인공', weapon: subW, element: el, role: 'support', tier: tw[subW] });
  }
  return out;
}

function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}

function pickMain(team, fixedMain) {
  if (fixedMain) { const m = team.find(u => u.id === fixedMain); if (m) return m; }
  const rank = u => (u.role === 'assault' ? 0 : 10) + TIERS.indexOf(u.tier) + (u.fated ? (u.fatedMain ? 0.5 : 20) : 0);
  return team.slice().sort((a, b) => rank(a) - rank(b))[0];
}

export function scoreTeam(team, ctx) {
  const { rules, monster, elementTarget, fixedMain } = ctx;
  const S = rules.scoring;
  const reasons = [];
  let score = 0;
  const main = pickMain(team, fixedMain);
  if (fixedMain && main.id !== fixedMain) return null;
  // 헤비보우건 주인공(메인용)은 메인일 때만 허용, 서브 자리의 주인공은 공명용 유닛으로만
  if (team.some(u => u.fatedMain && u !== main)) return null;

  // 1) 약점 속성 일치
  const weak = monster ? monster.weakness || {} : (elementTarget ? { [elementTarget]: 3 } : null);
  if (weak) {
    let w = 0;
    for (const u of team) w += S.elementMatchWeakness[String(weak[u.element] || 1)] || 0;
    score += w;
    const hit = [...new Set(team.filter(u => (weak[u.element] || 0) >= 3).map(u => u.element))];
    if (hit.length) reasons.push({ t: 'good', k: 'weak', v: hit });
  }

  // 2) 속성 공명
  const cnt = {};
  for (const u of team) cnt[u.element] = (cnt[u.element] || 0) + 1;
  const kinds = Object.keys(cnt).length;
  if (kinds > S.resonance.maxElements) { score += S.resonance.threeOrMoreElementsPenalty; reasons.push({ t: 'bad', k: 'spread', v: kinds }); }
  for (const [el, n] of Object.entries(cnt)) if (n >= 2) { score += S.resonance.sameElementBonusPerMember * n; reasons.push({ t: 'good', k: 'reso', v: [el, n] }); }

  // 3) 역할 밸런스
  const roles = team.map(u => u.role);
  if (roles.every(r => r === 'assault')) { score += S.roleBalance.allAssaultPenalty; reasons.push({ t: 'bad', k: 'allAssault' }); }

  // 4) 티어
  for (const u of team) score += S.tierBonus[u.tier] || 0;

  // 5) 범용 버퍼
  for (const u of team) if (S.universalBuffer.ids.includes(u.id)) { score += S.universalBuffer.bonus; reasons.push({ t: 'good', k: 'buffer', v: u.id }); }

  // 6) 연계기 궁합
  const hasDisruptor = roles.includes('disruptor');
  let linkS = 0;
  for (const u of team) {
    if (!u.link) continue;
    if (u.link.trigger === 'suppress' && hasDisruptor && u !== main) linkS += S.linkSynergy.suppressNeedsDisruptor;
    if (u.link.trigger === 'special' && main.role === 'assault' && u !== main) linkS += S.linkSynergy.specialNeedsAssaultMain;
  }
  if (linkS) { score += linkS; reasons.push({ t: 'good', k: 'link', v: linkS }); }

  // 7) 상충
  for (const c of S.conflicts) {
    if (main.id === c.main && team.some(u => u !== main && u.role === c.avoidRole)) { score += c.penalty; reasons.push({ t: 'bad', k: 'conflict', v: c.desc }); }
  }

  // 8) 몬스터 특수
  if (monster) {
    for (const r of S.monsterSpecific) {
      if (r.class && monster.class === r.class && r.id && team.some(u => u.id === r.id)) { score += r.penalty; reasons.push({ t: 'bad', k: 'special', v: r.note }); }
      if (r.radiant && monster.radiant && team.some(u => u.role === r.role)) { score += r.bonus; reasons.push({ t: 'good', k: 'special', v: r.note }); }
    }
  }

  return { team, main, score, reasons };
}

export function pickBuddy(main, data) {
  const list = data.buddies.list;
  const pair = !main.fated && list.find(b => b.pair === main.id);
  if (pair) return { buddy: pair, why: '모티프 동반자' };
  // 짝이 정해진 SSR 동반자는 다른 모험가에겐 효과가 덜하므로, 짝이 없는 동반자 중에서 고른다
  const same = list.filter(b => b.type === main.role && !b.pair).sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
  return same.length ? { buddy: same[0], why: main.fated ? '주인공 범용' : '같은 타입 범용' } : null;
}

// owned: 보유 모험가 id 배열. target: { monsterId } | { element } | {}
export function buildTeams(data, owned, target = {}, opts = {}) {
  const rules = data.rules;
  const advs = data.adventurers.list.filter(a => owned.includes(a.id));
  const pool = [...advs, ...fatedUnits(data)];
  const monster = target.monsterId ? data.monsters.list.find(m => m.id === target.monsterId) : null;
  const ctx = { rules, monster, elementTarget: target.element || null, fixedMain: opts.fixedMain || null };
  const size = rules.partySize;
  const results = [];
  for (const team of combos(pool, Math.min(size, pool.length))) {
    if (team.filter(u => u.fated).length > 1) continue;
    const r = scoreTeam(team, ctx);
    if (r) results.push(r);
  }
  results.sort((a, b) => b.score - a.score);
  // 구성원이 거의 같은 결과(3명 이상 겹침)는 건너뛰어 다양한 조합을 보여 준다
  const top = [];
  const key = u => (u.fated ? 'fated' : u.id);
  for (const r of results) {
    if (top.some(t => t.team.filter(u => r.team.some(v => key(v) === key(u))).length >= 3)) continue;
    top.push(r);
    if (top.length >= (opts.topN || rules.output.topN)) break;
  }
  for (const r of top) {
    r.buddy = pickBuddy(r.main, data);
    // 메인을 맨 앞에
    r.team = [r.main, ...r.team.filter(u => u !== r.main)];
  }
  return { results: top, monster, total: results.length };
}
