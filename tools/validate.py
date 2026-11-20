import json,sys,os
d=sys.argv[1]; L=lambda f: json.load(open(os.path.join(d,f)))
meta,adv,bud,wep,mon,teams,rules=[L(f) for f in ["meta.json","adventurers.json","buddies.json","weapons.json","monsters.json","teams.json","builder-rules.json"]]
err=[]
A={a["id"]:a for a in adv["list"]}; B={b["id"] for b in bud["list"]}; W={w["id"] for w in wep["list"]}
M={x["id"] for x in mon["list"]}; S={s["id"] for s in meta["sources"]}
E={e["id"] for e in meta["elements"]}
def ref(x,ctx):
    if x.startswith("fated:"):
        if x[6:] not in W: err.append(f"{ctx}: bad fated weapon {x}")
    elif x not in A: err.append(f"{ctx}: unknown adventurer {x}")
for a in adv["list"]:
    if a["weapon"] not in W: err.append(f"{a['id']} weapon")
    if a["element"] not in E: err.append(f"{a['id']} element")
    for b in a["buddies"]:
        if b not in B: err.append(f"{a['id']}: unknown buddy {b}")
    for k,v in a["team"].items():
        for x in v if isinstance(v,list) else [v]: ref(x,f"{a['id']}.team.{k}")
    for s in a["sources"]:
        if s not in S: err.append(f"{a['id']} source {s}")
for b in bud["list"]:
    if b.get("pair") and b["pair"] not in A: err.append(f"buddy {b['id']} pair")
for t in teams["list"]:
    if len(t["members"])!=4: err.append(f"team {t['id']} size")
    for x in t["members"]: ref(x["id"],t["id"])
    if t.get("buddy") and t["buddy"] not in B: err.append(f"team {t['id']} buddy")
    if t["target"]["type"]=="monster" and t["target"]["id"] not in M: err.append(f"team {t['id']} target")
    for s in t["sources"]:
        if s not in S: err.append(f"team {t['id']} source {s}")
for x in mon["list"]:
    for e in x.get("weakness",{}):
        if e not in E: err.append(f"{x['id']} weakness {e}")
    if x.get("baseId") and x["baseId"] not in M: err.append(f"{x['id']} baseId")
print("adventurers",len(A),"buddies",len(B),"weapons",len(W),"monsters",len(M),"teams",len(teams["list"]))
print("ERRORS:",err or "none")
