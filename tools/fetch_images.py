"""공식 사이트(monsterhunteroutlanders.com) 이미지를 public/img/로 내려받는다.

GitHub Actions(update-images.yml)에서 돌린다. 공식 사이트는 Vite로 만들어져 파일 이름에 해시가 붙고
배포 때마다 바뀌므로, 페이지와 JS 묶음에서 role1_<번호>-<해시>.png 형태를 찾아 번호로 대응시킨다.
번호 → id 대응은 공식 사이트 영문판 기준(2026-11-20 확인). 공식 사이트에 새 번호가 생기면 아래 표에 추가.
"""
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

SITE = "https://monsterhunteroutlanders.com"
PAGE = SITE + "/en/index.html"
OUT = Path(__file__).resolve().parent.parent / "public" / "img"
UA = {"User-Agent": "Mozilla/5.0 (MH_OL image sync; personal fan site)"}

MAP = {
    "role1": ("adventurers", {1: "raya", 2: "madelyn", 3: "midori", 4: "pepper", 5: "ouyang-varen", 6: "pyro",
                              7: "keres", 8: "luka", 9: "arkaya", 10: "rhodes", 11: "ryunosuke", 12: "haze", 13: "luxheart"}),
    "role2": ("buddyTypes", {1: "disruptor", 2: "support", 3: "assault"}),
    "role3": ("monsters", {1: "radiant-rathalos", 2: "rathalos", 3: "radiant-rathian", 4: "radiant-diablos",
                           5: "radiant-anjanath", 6: "radiant-kulu-ya-ku", 7: "pink-rathian"}),
}
MAX_W = 520  # 카드에 쓰기 충분한 폭으로 줄여 저장


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def find_assets():
    html = get(PAGE).decode("utf-8", "replace")
    texts = [html]
    for js in set(re.findall(r'(?:src|href)="(/assets/[^"]+\.js)"', html)):
        try:
            texts.append(get(SITE + js).decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            print("JS 못 받음", js, e)
    found = {}
    for t in texts:
        for m in re.finditer(r'assets/(role[123])_(\d+)-[\w-]+\.png', t):
            found.setdefault((m.group(1), int(m.group(2))), "/" + m.group(0))
    return found


def save(data, path, trim=False):
    try:
        from PIL import Image  # Actions에서 pip install pillow
        im = Image.open(io.BytesIO(data))
        if trim and im.mode in ("RGBA", "LA"):
            box = im.getbbox()  # 투명 여백을 잘라 인물이 칸을 채우게
            if box:
                im = im.crop(box)
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(path, "PNG", optimize=True)
    except ImportError:
        path.write_bytes(data)


def main():
    found = find_assets()
    print("찾은 이미지", len(found))
    if not found:
        print("공식 사이트에서 이미지를 찾지 못했습니다. 구조가 바뀌었는지 확인하세요.")
        sys.exit(1)
    index = {"adventurers": [], "monsters": [], "buddyTypes": [], "unmapped": []}
    for (prefix, num), url in sorted(found.items()):
        kind, table = MAP[prefix]
        ident = table.get(num)
        if not ident:
            index["unmapped"].append(url)
            continue
        d = OUT / kind
        d.mkdir(parents=True, exist_ok=True)
        try:
            save(get(SITE + url), d / f"{ident}.png", trim=kind != "monsters")
            index[kind].append(ident)
            print("저장", kind, ident)
        except Exception as e:  # noqa: BLE001
            print("실패", url, e)
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    if index["unmapped"]:
        print("::warning::번호 대응이 없는 새 이미지:", index["unmapped"])


if __name__ == "__main__":
    main()
