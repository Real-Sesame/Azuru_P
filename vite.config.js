import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// GitHub Pages 주소: https://real-sesame.github.io/Azuru_P/
const BASE = '/Azuru_P/';
const SITE = 'https://real-sesame.github.io' + BASE;
const NAME = '아주르 프로밀리아 AUTO TEAM MAKER';

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
      const HOME = { path: '', title: '', desc: '아주르 프로밀리아 보유 캐릭터로 각인 수급 · 원소 상성을 맞춘 3파티 자동 편성' };
      write('index.html', HOME); write('404.html', HOME);
      const pages = [
        ['builder', '파티 편성', '보유 캐릭터로 겹치지 않는 1~3파티를 각인 수급 · 직업 구성 · 원소 상성으로 자동 편성합니다.'],
        ['characters', '캐릭터', '아주르 프로밀리아 캐릭터 직업 · 속성 · 각인 · 티어'],
        ['elements', '원소 · 각인', '원소 상성표(±25%)와 각인 원소별 효과 · 공급 캐릭터'],
        ['guide', '입문 가이드', '파티 구성 기본 규칙 · 무료 캐릭터 · 관측 · 육성 순서']
      ];
      for (const [p, t, d] of pages) write(`${p}.html`, { path: p, title: t, desc: d });
      const ch = J('characters.json');
      for (const c of [...ch.list, ch.starborn]) write(`character/${c.id}.html`, { path: `character/${c.id}`, title: c.name, desc: `${c.name} 직업 · 각인 · 추천 파티` });
    }
  }]
});
