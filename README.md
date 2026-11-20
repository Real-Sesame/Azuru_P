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

## 내 컴퓨터에서 보기

Node.js 설치 후 `npm install` → `npm run dev`.

---
팬이 만든 비공식 사이트입니다. 게임 이미지와 명칭의 권리는 CAPCOM · TiMi Studio Group에 있습니다.
