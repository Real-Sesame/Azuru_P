# 데이터 참조 점검: 캐릭터 · 원소 · 출처 · 추천 편성 id가 실제로 있는지 확인 (배포 때 자동 실행)
import json, sys, os
d = sys.argv[1]
L = lambda f: json.load(open(os.path.join(d, f), encoding="utf-8"))
meta, ch, teams, rules, guide = [L(f) for f in ["meta.json", "characters.json", "teams.json", "builder-rules.json", "guide.json"]]
err = []
E = {e["id"] for e in meta["elements"]}
S = {s["id"] for s in meta["sources"]}
P = set(meta["labels"]["prof"])
G = set(meta["labels"]["group"])
T = set(rules["scoring"]["tierBonus"]) | {"-"}
allc = ch["list"] + [ch["starborn"]]
C = {c["id"]: c for c in allc}
if len(C) != len(allc): err.append("duplicate character id")
for c in allc:
    i = c["id"]
    for k in ["elements", "gains", "consumes", "requires"]:
        for e in c[k]:
            if e not in E: err.append(f"{i}.{k}: unknown element {e}")
    if c["prof"] not in P: err.append(f"{i}: unknown prof {c['prof']}")
    if c["group"] not in G: err.append(f"{i}: unknown group {c['group']}")
    if c["tier"] not in T: err.append(f"{i}: unknown tier {c['tier']}")
    if c["rarity"] not in (4, 5): err.append(f"{i}: rarity")
    for s in c["sources"]:
        if s not in S: err.append(f"{i}: unknown source {s}")
for e, xs in list(meta["chart"]["strong"].items()) + list(meta["chart"]["weak"].items()):
    for x in [e] + xs:
        if x not in E: err.append(f"chart: unknown element {x}")
for t in teams["list"]:
    if len(t["members"]) != rules["partySize"]: err.append(f"team {t['id']} size")
    for x in t["members"] + [s for w in t.get("swaps", []) for s in (w["out"], w["in"])]:
        if x not in C: err.append(f"team {t['id']}: unknown character {x}")
    if t["element"] not in E: err.append(f"team {t['id']} element")
    for s in t["sources"]:
        if s not in S: err.append(f"team {t['id']} source {s}")
for f in guide["free"]:
    if f["id"] not in C: err.append(f"guide.free: unknown character {f['id']}")
print("characters", len(C), "teams", len(teams["list"]), "elements", len(E))
print("ERRORS:", err or "none")
sys.exit(1 if err else 0)
