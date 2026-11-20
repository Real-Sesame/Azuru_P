"""조사용 페이지 수집: 주어진 주소 목록의 HTML을 내려받아 _pages/에 저장한다.

GitHub Actions(research-fetch.yml)에서 돌리고, 결과는 아티팩트로 올린다(저장소에는 커밋하지 않음).
데이터 보강용으로 한 번에 수십 장 정도만, 요청 사이에 쉬면서 받는다.
"""
import re
import sys
import time
import urllib.request
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0 (MH_OL personal data research)", "Accept-Language": "ko,en;q=0.8"}
OUT = Path("_pages")


def main(list_file):
    OUT.mkdir(exist_ok=True)
    urls = [u.strip() for u in Path(list_file).read_text(encoding="utf-8").splitlines() if u.strip() and not u.startswith("#")]
    ok = 0
    for u in urls:
        name = re.sub(r"[^\w.-]+", "_", u.split("://", 1)[-1])[:150] + ".html"
        try:
            req = urllib.request.Request(u, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                (OUT / name).write_bytes(r.read())
            ok += 1
            print("저장", u)
        except Exception as e:  # noqa: BLE001
            print("실패", u, e)
        time.sleep(1.5)
    print(f"{ok}/{len(urls)}")


if __name__ == "__main__":
    main(sys.argv[1])
