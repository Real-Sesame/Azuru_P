"""공식 사이트 구조 조사: 페이지와 JS 묶음에서 이미지 · API 주소를 찾아 로그로 출력한다(저장소엔 남기지 않음).
사용: python3 tools/discover.py tools/discover-urls.txt [키워드]"""
import re, sys, json, urllib.request, urllib.parse
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36", "Accept-Language": "ko,ja;q=0.8,en;q=0.6"}
def get(u, n=8_000_000):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
        return r.geturl(), r.headers.get("content-type", ""), r.read(n)
IMG = re.compile(r'(?:https?:)?//[^\s"\'()<>\\]+?\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s"\'()<>\\]*)?|(?<=["\'(])/[^\s"\'()<>\\]+?\.(?:png|jpe?g|webp|avif)', re.I)
API = re.compile(r'(?:https?:)?//[^\s"\'<>\\]+?(?:/api/|\.json)[^\s"\'<>\\]*', re.I)
kw = sys.argv[2] if len(sys.argv) > 2 else ""
for line in open(sys.argv[1], encoding="utf-8"):
    url = line.strip()
    if not url or url.startswith("#"): continue
    print("\n" + "=" * 100 + "\n## PAGE", url)
    try:
        final, ct, body = get(url)
    except Exception as e:
        print("  FAIL", e); continue
    html = body.decode("utf-8", "replace")
    print("  final:", final, "| type:", ct, "| bytes:", len(body))
    t = re.search(r"<title>(.*?)</title>", html, re.S); print("  title:", t and t.group(1).strip()[:120])
    texts = [(final, html)]
    for js in sorted(set(re.findall(r'<script[^>]+src="([^"]+)"', html)))[:25]:
        ju = urllib.parse.urljoin(final, js)
        if any(x in ju for x in ("googletag", "gtag", "facebook", "analytics", "nexon.com/js/", "beacon")): continue
        try:
            _, _, jb = get(ju); texts.append((ju, jb.decode("utf-8", "replace"))); print("  script:", ju, len(jb))
        except Exception as e:
            print("  script FAIL", ju, e)
    # JS 안에서 지연 로딩되는 조각(.js)도 한 단계 따라감
    seen = {u for u, _ in texts}
    extra = []
    for src, t in list(texts[1:]):
        for m in re.finditer(r'["\'(]((?:\.{0,2}/)?[\w./-]*?assets/[\w.-]+\.js|\./[\w.-]+\.js)["\')]', t):
            ju = urllib.parse.urljoin(src, m.group(1))
            if ju not in seen and len(extra) < 60:
                seen.add(ju); extra.append(ju)
    for ju in extra:
        try:
            _, _, jb = get(ju); texts.append((ju, jb.decode("utf-8", "replace"))); print("  chunk:", ju, len(jb))
        except Exception as e:
            print("  chunk FAIL", ju, e)
    for m in re.finditer(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S):
        print("  __NEXT_DATA__ head:", m.group(1)[:3000])
    imgs, apis = {}, set()
    for src, t in texts:
        for m in IMG.finditer(t):
            u = urllib.parse.urljoin(final, m.group(0))
            ctx = re.sub(r"\s+", " ", t[max(0, m.start() - 90):m.start()])[-90:]
            imgs.setdefault(u, ctx)
        for m in API.finditer(t): apis.add(m.group(0))
    print(f"  -- images ({len(imgs)})")
    for u, ctx in list(imgs.items())[:400]:
        print("   ", u, "  <<", ctx)
    print(f"  -- api/json ({len(apis)})")
    for a in sorted(apis)[:80]: print("   ", a)
    if kw:
        for src, t in texts:
            for m in list(re.finditer(re.escape(kw), t))[:6]:
                print("  KW", src[-40:], re.sub(r"\s+", " ", t[max(0, m.start()-300):m.end()+700]))
