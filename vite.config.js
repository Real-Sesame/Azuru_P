import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// GitHub Pages 주소: https://real-sesame.github.io/MH_OL/
const BASE = '/MH_OL/';
const SITE = 'https://real-sesame.github.io' + BASE;
const NAME = '아웃랜더스 이모저모';

const J = f => JSON.parse(readFileSync(resolve('src/data', f), 'utf8'));

// 보안 정책(CSP): 이 사이트 · 폰트 외의 스크립트 · 연결을 막음
const CSP = `<meta http-equiv="Content-Security-Policy" content="${[
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "connect-src 'self'", "manifest-src 'self'",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'"
].join('; ')}">`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// 페이지마다 제목 · 설명 · 미리보기 태그를 바꿔 끼움 (레퍼런스와 같은 방식)
function withMeta(html, { path, title, desc, image }) {
  const full = title ? `${title} · ${NAME}` : NAME;
  const meta = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(SITE + path)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(NAME)}">`,
    `<meta property="og:title" content="${esc(full)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    image ? `<meta property="og:image" content="${esc(SITE + image)}">` : ''
  ].filter(Boolean).join('\n');
  return html
    .replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + CSP)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/\n?<meta name="description"[^>]*>/g, '')
    .replace('</head>', meta + '\n</head>');
}

export default defineConfig({
  base: BASE,
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // 게임 데이터는 따로 묶음: 코드만 바뀐 업데이트에서는 브라우저에 저장된 데이터를 그대로 씀
        manualChunks(id) { if (/[\\/]src[\\/]data[\\/]/.test(id)) return 'data'; }
      }
    }
  },
  plugins: [{
    // 주소마다 실제 페이지 파일을 만들어 둠: 바로 들어와도 정상 응답 + 링크 미리보기
    name: 'pages',
    closeBundle() {
      const dist = resolve('dist');
      const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
      const write = (file, meta) => { const f = resolve(dist, file); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, withMeta(html, meta)); };
      const HOME = { path: '', title: '', desc: '몬스터헌터 아웃랜더스 범용 세팅 · 자동 파티 편성 · 모험가 · 무기 · 몬스터 약점 정리' };
      write('index.html', HOME); write('404.html', HOME);
      const pages = [
        ['builder', '파티 편성', '보유 모험가와 타깃 몬스터로 속성 공명 · 역할 밸런스를 맞춘 4인 편성을 추천합니다.'],
        ['adventurers', '모험가 · 동반자', '모험가 13명과 주인공의 역할 · 무기 · 속성 · 오의 · 연계기 · 추천 동반자'],
        ['weapons', '무기', '주인공 무기 8종 운용법 · 추천 깨달음 · 속성별 추천 무기'],
        ['monsters', '몬스터', '몬스터 · 융광종 약점 속성과 공략'],
        ['guide', '성장 가이드', '초반 동선 · 육성 우선순위 · 기념품 · 인장']
      ];
      for (const [p, t, d] of pages) write(`${p}.html`, { path: p, title: t, desc: d });
      for (const a of J('adventurers.json').list) write(`adventurer/${a.id}.html`, { path: `adventurer/${a.id}`, title: a.name, desc: `${a.name} 스킬 · 추천 파티 · 동반자` });
      for (const w of J('weapons.json').list) write(`weapon/${w.id}.html`, { path: `weapon/${w.id}`, title: w.name, desc: `주인공 ${w.name} 운용법` });
      for (const m of J('monsters.json').list) if (m.size === 'large') write(`monster/${m.id}.html`, { path: `monster/${m.id}`, title: m.name, desc: `${m.name} 약점 · 공략` });
    }
  }]
});
