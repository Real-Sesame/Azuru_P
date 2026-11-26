# Azuru_P 데이터 스키마 (v0.1, 2026-11-26)

게임 데이터는 모두 `src/data/*.json`에 있고, 화면 코드는 읽기만 한다.

## 공통
- 원소 id: `fire`(불) `water`(물) `ice`(얼음) `nature`(나무) `wind`(바람) `earth`(땅) `thunder`(번개) `light`(빛) `dark`(어둠)
- 직업 id: `eruption`(폭발) `assault`(맹공) `rupture`(파괴) `amplifier`(증폭) `imbuement`(부여)
- 그룹 id: `dps`(딜러) `breaker`(브레이커) `support`(서포터) — 자동 편성의 구성 판단에 쓴다
- `confidence`: `official` / `community` / `estimate` (화면 배지)
- `sources`: `meta.json`의 `sources[].id`

## characters.json
| 필드 | 설명 |
|---|---|
| `id` `name` `nameEn` | 슬러그 · 한국어 이름 · 영문 |
| `rarity` | 4 또는 5 |
| `limited` | 한정 여부(선택) |
| `elements[]` | 인게임 속성 표기. **첫 번째가 공격 원소**(상성 계산에 사용) |
| `prof` `group` | 직업 · 그룹 |
| `gains[]` | 만드는 각인 원소 |
| `consumes[]` | 소모하는 각인. 첫 번째가 주 소모(핵심), 나머지는 보조 |
| `requires[]` | 스킬 발동에 필요한 각인(핵심, 가중치 ×1.3) |
| `heal` `shield` | 회복 · 보호막 제공(선택) |
| `wildcard` | 성림자 전용: 파티에 이미 있는 각인을 증폭 |
| `tier` `gwTier` | 국내 티어(S/A/B/C/NEW) · GameWith CBT 티어 |
| `obtain[]` `summary` `passive` `pros[]` `cons[]` | 화면 표시용 |

## teams.json
`members`(3명, 첫 번째가 메인) · `swaps[{out,in}]` · `element` · `top`(홈 노출) · `budget`(무과금) · `note`

## builder-rules.json
`scoring.mark`(각인 수급) · `composition`(직업 구성 · 생존) · `element`(상성) · `tierBonus` · `presetMatch`. 숫자만 바꾸면 결과가 바뀐다.

## 검증
`npm run check` = `python3 tools/validate.py src/data`
