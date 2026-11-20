# 아웃랜더스 이모저모 (MH_OL)

몬스터헌터 아웃랜더스 개인용 공략 노트입니다. 범용 성장 가이드, 자동 파티 편성, 모험가·동반자·무기·몬스터 정보를 한곳에 모았습니다.
구조는 [띵조 AUTO TEAM MAKER](https://github.com/Real-Sesame/-)와 같습니다(Vite + GitHub Actions 배포).

주소: https://real-sesame.github.io/MH_OL/

## 구조

```
index.html              화면 뼈대(헤더 · 화면 틀 · 모바일 하단 탭바)
src/app.js              화면 · 라우터
src/builder.js          자동 편성 엔진(화면과 분리된 순수 함수)
src/styles/app.css      디자인
src/data/*.json         게임 데이터 — 업데이트 때는 여기만 고치면 됨
public/img/             공식 이미지(자동 수집) + index.json(보유 목록)
tools/validate.py       데이터 참조 점검(배포 때 자동 실행)
tools/fetch_images.py   공식 사이트 이미지 수집
docs/SCHEMA.md          데이터 스키마 설명
.github/workflows/      deploy.yml(배포) · update-images.yml(이미지 갱신)
```

- 주소: 홈 `/MH_OL/`, 파티 편성 `/builder`(`?m=<몬스터id>`, `?main=<모험가id>`), 모험가 `/adventurers` · `/adventurer/<id>`, 무기 `/weapons` · `/weapon/<id>`, 몬스터 `/monsters` · `/monster/<id>`, 성장 가이드 `/guide`.
- **Settings → Pages → Source**는 **GitHub Actions**여야 합니다.
- 빌드할 때 주소마다 페이지 파일을 만들어 하위 주소로 바로 들어와도 열리고 링크 미리보기가 나옵니다.

## 데이터 고치기

- 새 모험가: `src/data/adventurers.json`의 `list`에 항목 추가 → 자동 편성 · 목록 · 상세 페이지에 바로 반영.
- 새 몬스터: `src/data/monsters.json` (`weakness`는 속성별 별점 1~3).
- 추천 편성: `src/data/teams.json`. 주인공은 `"fated:<무기id>"`.
- 자동 편성 가중치: `src/data/builder-rules.json`.
- 화면 라벨(예: 지원형 동반자 = 메들리): `src/data/meta.json`의 `labels`.
- 고친 뒤 `npm run check`로 참조 오류를 확인합니다. 배포 때도 자동으로 점검하며, 오류가 있으면 배포가 멈춥니다.

## 공식 이미지

`공식 이미지 갱신` 워크플로가 매주(또는 **Actions → 공식 이미지 갱신 → Run workflow**) 공식 사이트에서 모험가 · 동반자 · 몬스터 이미지를 받아 `public/img/`에 커밋하고 다시 배포합니다.
공식 사이트에 새 그림이 생기면 `tools/fetch_images.py`의 번호 표(`MAP`)에 추가합니다. 이미지가 없는 항목은 속성 색 이니셜로 표시됩니다.

## 배포 · 운영 가이드

### 배포 흐름
1. `main`에 올리면(웹에서 ✏️ 고치고 **Commit changes**도 됨) **사이트 배포** 워크플로가 돕니다.
2. `tools/validate.py`가 데이터 참조를 점검합니다. 오류가 있으면 여기서 멈추고 사이트는 이전 버전이 유지됩니다.
3. Vite 빌드 → GitHub Pages 배포. 1~2분 뒤 반영됩니다.
4. 처음 한 번만: **Settings → Pages → Source = GitHub Actions** (완료).

### 게임 업데이트 때 체크리스트
- [ ] 새 모험가 → `adventurers.json` (`team`의 id는 실제 있는 모험가·`fated:<무기>`만)
- [ ] 새 동반자 → `buddies.json` (`pair`에 짝 모험가 id)
- [ ] 새 몬스터 · 융광종 → `monsters.json` (`radiant: true`면 `baseId`에 일반 개체 id)
- [ ] 티어 · 추천 편성 변경 → `adventurers.json`의 `tier`, `teams.json`
- [ ] `meta.json`의 `dataVersion` · `updated` · `season` 올리기 (사이트 아래쪽에 표시)
- [ ] 공식 사이트에 새 그림 → **Actions → 공식 이미지 갱신 → Run workflow**, 로그에 "번호 대응이 없는 새 이미지" 경고가 나오면 `tools/fetch_images.py`의 `MAP`에 추가

### 문제가 생겼을 때
- **배포가 빨간불:** Actions에서 실패한 실행을 열어 `데이터 점검` 단계 로그를 봅니다. "unknown adventurer xxx"처럼 어느 파일 어느 id가 틀렸는지 나옵니다.
- **새로 고쳤는데 그대로:** 휴대폰 브라우저 캐시 때문일 수 있습니다. 새로 고침을 한 번 더 하거나 1~2분 기다립니다.
- **이미지 갱신 실패:** 공식 사이트 구조가 바뀐 경우입니다. 이미지는 기존 파일이 그대로 남으니 사이트는 정상 동작합니다.

### 휴대폰 홈 화면에 추가
- 안드로이드 크롬: 메뉴 → **홈 화면에 추가**
- 아이폰 사파리: 공유 → **홈 화면에 추가**
- 앱처럼 주소창 없이 열립니다(이모저모 아이콘).

### 글꼴
본문은 프리텐다드, 로고·페이지 큰 제목은 검은고딕(Black Han Sans)입니다. 둘 다 `npm` 패키지로 자체 호스팅합니다. 제목 글꼴은 `src/styles/app.css`의 `--f-display`에서 바꿉니다.

## 내 컴퓨터에서 보기

Node.js 설치 후 `npm install` → `npm run dev`.

---
팬이 만든 비공식 사이트입니다. 게임 이미지와 명칭의 권리는 CAPCOM · TiMi Studio Group에 있습니다.
