"""공식 사이트 자동 동기화 (GitHub Actions: sync.yml, 매일 실행)

1) 한국 공식 사이트(azurpromilia.nexon.com/main)의 캐릭터 배열에서 id · 이름 · 영문명 · 속성 · 직업을 읽어
   src/data/characters.json의 공식 필드를 갱신하고, 새 캐릭터는 '자동 추가' 항목으로 넣는다.
2) 공식 이미지를 받아 사이트에 맞게 편집해 public/img/에 저장한다.
   우선순위: 직접 넣은 이미지(assets-src/manual) > 한국 공식 > 일본 공식(포스터) > 동남아 공식(썸네일)
   - 썸네일: 투명 여백 잘라내기 → 정사각형 맞춤 → 256px WebP (카드 · 편성 초상화)
   - 일러스트: 가로 1400px WebP. 세로 포스터는 흐린 배경을 깔아 16:9 배너로 편집
   - 썸네일이 없으면 일러스트에서 얼굴 인식(OpenCV)으로 잘라 원형 썸네일 생성
3) 바뀐 내용을 tools/.sync-report.md에 적는다(워크플로가 이슈 · 커밋 메시지로 사용).

사용: python3 tools/sync_official.py [--no-images]
"""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
IMG = ROOT / "public" / "img"
REPORT = ROOT / "tools" / ".sync-report.md"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 (Azuru_P fan site sync)"}

KR_MAIN = "https://azurpromilia.nexon.com/main"
SEA_MAIN = "https://azurpromilia.playpark.com/en/"
JP_CHAR = "https://azurpromilia.jp/character"
MANUAL = ROOT / "assets-src" / "manual"  # 직접 넣는 공식 이미지: <id>.png(일러스트) · <id>-thumb.png(썸네일)

# 공식 사이트 표기 → 사이트 내부 id
ELEMENT = {"fire": "fire", "water": "water", "ice": "ice", "wood": "nature", "nature": "nature", "grass": "nature",
           "wind": "wind", "earth": "earth", "ground": "earth", "rock": "earth", "thunder": "thunder", "lightning": "thunder",
           "electric": "thunder", "light": "light", "dark": "dark"}
ROLE = {"strike": "assault", "burst": "eruption", "destroy": "rupture", "amplify": "amplifier", "enchant": "imbuement"}
GROUP = {"assault": "dps", "eruption": "dps", "rupture": "breaker", "amplifier": "support", "imbuement": "support"}

THUMB = 256
ART_W = 1400


def get(url, limit=12_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.geturl(), r.read(limit)


def page_texts(url):
    final, body = get(url)
    html = body.decode("utf-8", "replace")
    texts = [html]
    for src in sorted(set(re.findall(r'<script[^>]+src="([^"]+)"', html))):
        u = urllib.parse.urljoin(final, src)
        if not re.search(r"_next/static/chunks/|/assets/", u):
            continue
        try:
            texts.append(get(u)[1].decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            print("  스크립트 못 받음", u, e)
    return final, html, texts


OBJ = re.compile(r'\{order:(\d+),id:"([^"]+)",name:"([^"]*)",nameEn:"([^"]*)"(.*?)(?=\{order:\d+,id:"|$)', re.S)


def parse_kr_roster(texts):
    roster = {}
    for t in texts:
        for m in OBJ.finditer(t):
            order, oid, name, name_en, body = m.groups()
            body = body[:6000]
            els = re.search(r"elements:\[([^\]]*)\]", body)
            role = re.search(r"role:\w+\.(\w+)", body)
            raw_els = re.findall(r"\.(\w+)", els.group(1)) if els else []
            roster[oid] = {
                "order": int(order), "officialId": oid, "name": name.strip(),
                "nameEn": name_en.strip().title(),
                "rawElements": raw_els, "rawRole": role.group(1) if role else None,
                "elements": [ELEMENT[e] for e in raw_els if e in ELEMENT],
                "prof": ROLE.get(role.group(1)) if role else None,
            }
    return roster


def edit_thumb(data):
    from PIL import Image
    from PIL import ImageDraw
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    alpha = im.getchannel("A")
    if alpha.getextrema()[0] == 255:
        # 투명 배경이 없는 사각 썸네일(동남아 공식 등)은 한국 공식처럼 원형으로 맞춤
        side = min(im.size)
        im = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width + side) // 2, (im.height + side) // 2))
        mask = Image.new("L", (side * 4, side * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, side * 4 - 1, side * 4 - 1), fill=255)
        im.putalpha(mask.resize((side, side), Image.LANCZOS))
    box = im.getchannel("A").getbbox()
    if box:
        im = im.crop(box)
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    canvas = canvas.resize((THUMB, THUMB), Image.LANCZOS)
    out = io.BytesIO()
    canvas.save(out, "WEBP", quality=88, method=6)
    return out.getvalue()


def edit_art(data):
    """일러스트를 가로 배너(약 16:9)로 맞춤. 세로 포스터는 흐린 배경 위에 원본을 세워 배너로 만든다."""
    from PIL import Image, ImageFilter, ImageEnhance
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.width / im.height < 1.45:
        W, H = ART_W, round(ART_W * 9 / 16)
        bg = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
        top = max(0, (bg.height - H) // 3)
        bg = bg.crop((0, top, W, top + H)).filter(ImageFilter.GaussianBlur(28))
        bg = ImageEnhance.Brightness(bg).enhance(0.72)
        fg = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        bg.paste(fg, ((W - fg.width) // 2, 0))
        im = bg
    elif im.width > ART_W:
        im = im.resize((ART_W, round(im.height * ART_W / im.width)), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, "WEBP", quality=80, method=6)
    return out.getvalue()


_CASCADE = None


def face_box(im):
    """애니메이션 얼굴 인식(lbpcascade_animeface). 없으면 None."""
    global _CASCADE
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None
    path = ROOT / "tools" / ".cache" / "lbpcascade_animeface.xml"
    if not path.exists():
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(get("https://raw.githubusercontent.com/nagadomi/lbpcascade_animeface/master/lbpcascade_animeface.xml")[1])
        except Exception as e:  # noqa: BLE001
            print("  얼굴 인식 모델 못 받음", e)
            return None
    if _CASCADE is None:
        _CASCADE = cv2.CascadeClassifier(str(path))
    gray = cv2.equalizeHist(cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2GRAY))
    faces = _CASCADE.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(max(40, im.width // 20),) * 2)
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return int(x), int(y), int(w), int(h)


def thumb_from_art(data):
    """썸네일이 없을 때 일러스트에서 얼굴 중심으로 정사각 잘라 원형 썸네일을 만든다."""
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGB")
    box = face_box(im)
    if box:
        x, y, w, h = box
        side = int(max(w, h) * 2.3)
        cx, cy = x + w / 2, y + h / 2 + h * 0.25
    else:  # 얼굴을 못 찾으면 위쪽 가운데
        side = int(min(im.width, im.height) * 0.6)
        cx, cy = im.width / 2, side * 0.55
    side = min(side, im.width, im.height)
    l = int(min(max(cx - side / 2, 0), im.width - side))
    t = int(min(max(cy - side / 2, 0), im.height - side))
    crop = im.crop((l, t, l + side, t + side))
    out = io.BytesIO()
    crop.save(out, "PNG")
    return edit_thumb(out.getvalue()), bool(box)


def save_if_changed(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == data:
        return False
    path.write_bytes(data)
    return True


def main():
    with_images = "--no-images" not in sys.argv
    ch_path = DATA / "characters.json"
    chars = json.loads(ch_path.read_text(encoding="utf-8"))
    meta_path = DATA / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    report = {"new": [], "changed": [], "images": [], "noImage": [], "warn": []}

    # ---- 1) 한국 공식 캐릭터 목록 ----
    print("한국 공식 사이트 읽는 중…")
    kr_final, kr_html, kr_texts = page_texts(KR_MAIN)
    roster = parse_kr_roster(kr_texts)
    print("  공식 캐릭터", len(roster), sorted(roster))
    if not roster:
        report["warn"].append("한국 공식 사이트에서 캐릭터 목록을 찾지 못했습니다(사이트 구조 변경 가능). 데이터는 그대로 둡니다.")
    by_off = {c.get("officialId", c["id"]): c for c in chars["list"]}
    by_name = {c["name"]: c for c in chars["list"]}
    for oid, o in sorted(roster.items(), key=lambda x: x[1]["order"]):
        for e in o["rawElements"]:
            if e not in ELEMENT:
                report["warn"].append(f"{o['name']}: 모르는 속성 표기 `{e}` → tools/sync_official.py의 ELEMENT에 추가 필요")
        if o["rawRole"] and o["rawRole"] not in ROLE:
            report["warn"].append(f"{o['name']}: 모르는 직업 표기 `{o['rawRole']}` → ROLE에 추가 필요")
        c = by_off.get(oid) or by_name.get(o["name"])
        if c is not None and c.get("officialId", c["id"]) != oid:
            c["officialId"] = oid  # 이름으로 찾은 경우 공식 id를 기억
        if c is None:
            c = {
                "id": oid, "name": o["name"], "nameEn": o["nameEn"], "rarity": None,
                "elements": o["elements"], "prof": o["prof"] or "amplifier", "group": GROUP.get(o["prof"], "support"),
                "gains": o["elements"][:1], "consumes": [], "requires": [],
                "tier": "-", "gwTier": "-", "obtain": ["미확인"],
                "summary": "공식 사이트에 새로 공개된 캐릭터입니다. 등급 · 스킬 · 각인 정보는 아직 검증되지 않았습니다(만드는 각인은 첫 속성으로 임시 표시).",
                "passive": "검증 전", "pros": [], "cons": ["정보 수집 중"],
                "confidence": "estimate", "sources": ["nexon"], "auto": True,
            }
            chars["list"].append(c)
            by_off[oid] = c
            report["new"].append(f"{o['name']} ({oid}) · {'/'.join(o['elements']) or '?'} · {o['prof'] or '?'}")
        diffs = []
        for k in ("name", "elements", "prof"):
            if o[k] and c.get(k) != o[k]:
                diffs.append(f"{k}: {c.get(k)} → {o[k]}")
                c[k] = o[k]
        if o["prof"] and c.get("group") != GROUP[o["prof"]]:
            diffs.append(f"group: {c.get('group')} → {GROUP[o['prof']]}")
            c["group"] = GROUP[o["prof"]]
        if not c.get("nameEn"):
            c["nameEn"] = o["nameEn"]
        c["official"] = {"order": o["order"], "elements": True, "prof": True}
        if "nexon" not in c["sources"]:
            c["sources"].append("nexon")
        if diffs:
            report["changed"].append(f"{c['name']}: " + ", ".join(diffs))

    # ---- 2) 공식 이미지 ----
    index = {"chars": {}}
    old_index = IMG / "index.json"
    if old_index.exists():
        try:
            index = json.loads(old_index.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pass
    index.setdefault("chars", {})
    if with_images:
        base = re.search(r'(https://[^"\')\s]+/main/character/)thumb_', kr_html)
        kr_base = base.group(1) if base else None
        sea_thumbs, jp_posters = {}, {}
        try:
            _, _, sea_texts = page_texts(SEA_MAIN)
            for t in sea_texts:
                for m in re.finditer(r'(?:https?://[^"\'\s()]+)?/landing/assets/e26/char/thumb_([a-z0-9-]+)\.png', t):
                    sea_thumbs.setdefault(m.group(1), urllib.parse.urljoin(SEA_MAIN, m.group(0)))
        except Exception as e:  # noqa: BLE001
            report["warn"].append(f"동남아 공식 사이트 읽기 실패: {e}")
        try:  # 일본 공식: 캐릭터 목록(slug · posterId) → roles/<posterId>/poster.jpg
            jp_final, _, jp_texts = page_texts(JP_CHAR)
            real = {}  # 빌드된 사이트는 원래 경로 → 해시 붙은 실제 주소 대응표를 JS에 가지고 있음
            for t in jp_texts:
                for m in re.finditer(r'"/src/assets/images/roles/(r\d+)/poster\.(?:jpg|png|webp)":"([^"]+)"', t):
                    real.setdefault(m.group(1), urllib.parse.urljoin(jp_final, m.group(2)))
            for t in jp_texts:
                for m in re.finditer(r'posterId:"(r\d+)",slug:"([a-z0-9-]+)"', t):
                    jp_posters.setdefault(m.group(2), real.get(m.group(1)) or urllib.parse.urljoin(jp_final, f"/src/assets/images/roles/{m.group(1)}/poster.jpg"))
        except Exception as e:  # noqa: BLE001
            report["warn"].append(f"일본 공식 사이트 읽기 실패: {e}")
        print("  한국 이미지 경로", kr_base, "| 동남아 썸네일", sorted(sea_thumbs), "| 일본 포스터", sorted(jp_posters))
        manual = {}
        if MANUAL.exists():
            for f in sorted(MANUAL.iterdir()):
                m = re.fullmatch(r"([a-z0-9-]+?)(-thumb)?\.(png|jpe?g|webp)", f.name.lower())
                if m:
                    manual[(m.group(1), "thumb" if m.group(2) else "art")] = f
        RANK = {"manual": 4, "kr": 3, "jp": 2, "sea": 1, "derived": 0}
        for c in chars["list"] + [chars["starborn"]]:
            oid = c.get("officialId", c["id"])
            keys = {c["id"], oid}
            entry = index["chars"].get(c["id"], {})
            cands = []  # (종류, 출처, 원본 읽는 함수)
            for k in keys:
                for kind in ("thumb", "art"):
                    if (k, kind) in manual:
                        cands.append((kind, "manual", lambda f=manual[(k, kind)]: f.read_bytes()))
            if kr_base and oid in roster:
                cands.append(("thumb", "kr", lambda u=kr_base + f"thumb_{oid}.png": get(u)[1]))
                cands.append(("art", "kr", lambda u=kr_base + f"bg_{oid}.jpg": get(u)[1]))
            for k in keys:
                if k in jp_posters:
                    cands.append(("art", "jp", lambda u=jp_posters[k]: get(u)[1]))
                    break
            for k in keys:
                if k in sea_thumbs:
                    cands.append(("thumb", "sea", lambda u=sea_thumbs[k]: get(u)[1]))
                    break
            cands.sort(key=lambda x: -RANK[x[1]])
            got = {}
            for kind, src, fetch in cands:
                if kind in got:
                    continue
                try:
                    raw = fetch()
                    data = edit_thumb(raw) if kind == "thumb" else edit_art(raw)
                except Exception as e:  # noqa: BLE001
                    print("  이미지 실패", c["id"], kind, src, e)
                    continue
                got[kind] = (src, data, raw)
            # 썸네일이 없고 일러스트만 있으면 일러스트에서 얼굴을 찾아 잘라 씀
            if "thumb" not in got and "art" in got:
                try:
                    data, found = thumb_from_art(got["art"][2])
                    got["thumb"] = ("derived", data, None)
                    print("  썸네일 생성", c["id"], "(얼굴 인식)" if found else "(위쪽 가운데)")
                except Exception as e:  # noqa: BLE001
                    print("  썸네일 생성 실패", c["id"], e)
            for kind, (src, data, _) in got.items():
                rel = f"img/chars/{kind}/{c['id']}.webp"
                if save_if_changed(ROOT / "public" / rel, data):
                    label = {"kr": "한국 공식", "jp": "일본 공식", "sea": "동남아 공식", "manual": "직접 넣은 공식 이미지", "derived": "일러스트에서 잘라 냄"}[src]
                    report["images"].append(f"{c['name']} {'썸네일' if kind == 'thumb' else '일러스트'} ({label})")
                entry[kind] = rel
                entry[kind + "Src"] = src
            if entry:
                index["chars"][c["id"]] = entry
            if "art" not in entry:
                report["noImage"].append(c["name"])
        index["updated"] = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
        index["credit"] = "이미지 © Manjuu · NEXON (공식 사이트에서 자동 수집 · 크기/여백 편집)"
        IMG.mkdir(parents=True, exist_ok=True)
        new_idx = json.dumps(index, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
        old = old_index.read_text(encoding="utf-8") if old_index.exists() else ""
        # 날짜만 바뀐 경우는 쓰지 않음
        strip = lambda s: re.sub(r'"updated": "[^"]*"', "", s)
        if strip(old) != strip(new_idx):
            old_index.write_text(new_idx, encoding="utf-8")

    # ---- 3) 저장 · 보고 ----
    data_changed = bool(report["new"] or report["changed"])
    if data_changed or report["images"]:
        today = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
        meta["updated"] = today
        major, minor, patch = (int(x) for x in meta["dataVersion"].split("."))
        meta["dataVersion"] = f"{major}.{minor}.{patch + 1}"
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if data_changed:
        ch_path.write_text(json.dumps(chars, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = []
    if report["new"]:
        lines += ["### 새 캐릭터 (자동 추가 · 등급/각인/티어 입력 필요)", *[f"- {x}" for x in report["new"]], ""]
    if report["changed"]:
        lines += ["### 공식 정보로 고친 항목", *[f"- {x}" for x in report["changed"]], ""]
    if report["images"]:
        lines += ["### 새로 받은 공식 이미지", *[f"- {x}" for x in report["images"]], ""]
    if report["noImage"]:
        lines += ["### 일러스트가 아직 없는 캐릭터", "- " + ", ".join(report["noImage"]), "- 공식 X · 커뮤니티 · 게임에서 저장한 공식 이미지를 `assets-src/manual/<id>.png`(일러스트) 또는 `<id>-thumb.png`(썸네일)로 올리면 다음 갱신 때 자동 편집됩니다.", ""]
    if report["warn"]:
        lines += ["### 경고", *[f"- {x}" for x in report["warn"]], ""]
    review = [c["name"] for c in chars["list"] if c.get("auto")]
    if review:
        lines += ["### 자동 추가 후 아직 검토 안 된 캐릭터", "- " + ", ".join(review),
                  "- `src/data/characters.json`에서 `rarity` · `gains/consumes/requires` · `tier`를 채우고 `\"auto\": true`를 지우면 목록에서 빠집니다.", ""]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines) or "변경 없음")


if __name__ == "__main__":
    main()
