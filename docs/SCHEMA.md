# MH_OL 데이터 스키마 (v0.1, 2026-11-20)

모든 게임 데이터는 `src/data/*.json`에 있고, 화면 코드는 이 파일들을 읽기만 한다.
새 모험가·몬스터·편성이 나오면 **해당 JSON에 항목 하나만 추가**하면 된다.

## 공통 규칙
- `id`: 영문 소문자 슬러그(GameWith URL과 동일). 이미지 파일명도 `id`를 그대로 쓴다.
- `confidence`: `official`(게임 내 표기) / `community`(공략 사이트·커뮤니티 평가) / `estimate`(추정). 화면에 배지로 표시한다.
- `sources`: `meta.json`의 `sources[].id`를 참조한다.
- 속성 id: `fire` `water` `thunder` `ice` `dragon` / 상태이상 id: `poison` `sleep` `paralysis` `blast` `stun`
- 역할 id: `assault`(돌격형) `disruptor`(교란) `support`(지원형). 화면에 보이는 한국어 이름은 `meta.labels`에서 바꾼다.

## 파일별 구조
| 파일 | 내용 | 주요 필드 |
|---|---|---|
| `meta.json` | 버전·시즌·라벨·속성 색상·출처 | `labels`, `elements[]`, `sources[]` |
| `adventurers.json` | `fated`(주인공) + `list`(모험가 13명) | `role` `weapon` `element` `rarity` `tier` `obtain[]` `ult` `link{trigger,cooldown}` `trait` `corePassive` `survival` `buddies[]` `team{}` `pros[]` `cons[]` `img` |
| `buddies.json` | 동반자 타입 3종 + 핵심 동반자 16종 | `type` `rarity` `tier` `pair`(모티프 모험가) `effect` |
| `weapons.json` | 주인공 무기 8종 + 타입 가이드 | `tier` `difficulty(1~3)` `howTo[]` `insights[]` `tips[]` `cautions[]` `elementPicks{}` `earlyGear` |
| `monsters.json` | 몬스터 58종 + 융광종 규칙 | `size` `class(elder)` `radiant` `baseId` `weakness{속성:별점}` `ailmentWeakness{}` `weaknessComplete` `tips[]` |
| `teams.json` | 큐레이션 추천 편성 7개 | `members[{id,slot,fatedElement}]` `buddy` `swaps[]` `target{type,id}` `budget` |
| `growth.json` | 범용 성장 가이드(홈) | `earlyRoute[]` `daily[]` `priority[]` `keepsake{levelUp,ascension,engravings}` `tips[]` |
| `builder-rules.json` | 자동 편성 점수 규칙 | `scoring{elementMatchWeakness,resonance,roleBalance,tierBonus,linkSynergy,conflicts,monsterSpecific}` |

## 참조 표기
- 편성 안의 주인공: `"fated:<무기id>"` (예: `fated:great-sword`) + `fatedElement`
- 연계기 발동 조건 `link.trigger`: `special`(메인 필살기 명중) / `dodge`(메인 회피 성공) / `suppress`(제압 발생)

## 자동 편성 로직 (Step 3 구현 예정)
1. 사용자가 보유 모험가를 체크하고 타깃 몬스터(또는 속성)를 고른다.
2. 보유 모험가 4인 조합 전부(13명 기준 최대 715개)를 `builder-rules.json` 점수표로 채점한다.
3. 공명 속성이 부족하면 주인공이 그 속성 무기를 들고 빈 자리를 채운다.
4. 상위 3개 조합을 **점수가 붙은 이유**(약점 일치, 공명, 역할 밸런스, 연계기 궁합)와 함께 보여 주고, 메인의 모티프 동반자를 추천한다.

## 검증
`npm run check` (= `python3 tools/validate.py src/data`): 모든 참조(모험가·동반자·무기·몬스터·출처 id)가 실제로 있는지 확인한다.

## 남은 데이터 작업 (Step 3 전)
- 동반자 38종 중 나머지 22종
- 이미지 파일(`public/img/...`) 확보 경로
