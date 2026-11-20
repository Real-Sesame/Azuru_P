import json, sys
E={"불":"fire","물":"water","번개":"thunder","얼음":"ice","용":"dragon"}
A={"독":"poison","수면":"sleep","마비":"paralysis","폭파":"blast","기절":"stun"}
rows="""도스쟈그라스|great-jagras|불,독,수면,마비,폭파,기절
토비카가치|tobi-kadachi|독
도스기르오스|great-girros|물,수면
오도가론|odogaron|얼음,마비
쿠루루야크|kulu-ya-ku|물
푸케푸케|pukei-pukei|번개,수면,마비
치치야크|tzitzi-ya-ku|번개,얼음
볼보로스|barroth|불,물,독,마비,폭파
안쟈나프|anjanath|물
라도발킨|radobaan|용,폭파
리오레이아|rathian|용,기절
리오레이아 아종|pink-rathian|용,기절
리오레우스|rathalos|용
디아블로스|diablos|얼음,마비
디아블로스 아종|black-diablos|얼음,마비
파오우르무|paolumu|불,폭파,기절
레이기에나|legiana|번개,독
쥬라토도스|jyuratodus|물,번개,기절
크샬다오라|kushala-daora|번개,독,폭파
네르기간테|nergigante|번개,폭파
루가 에알다|ruger-aidal|불,얼음,폭파
융광종 도스쟈그라스|radiant-great-jagras|불,독,수면,마비,폭파,기절
융광종 쿠루루야크|radiant-kulu-ya-ku|물
융광종 푸케푸케|radiant-pukei-pukei|번개,수면,마비
융광종 쥬라토도스|radiant-jyuratodus|얼음,기절
융광종 볼보로스|radiant-barroth|불,독,마비,폭파
융광종 안쟈나프|radiant-anjanath|물
융광종 리오레이아|radiant-rathian|번개,기절
융광종 디아블로스|radiant-diablos|얼음,마비
융광종 레이기에나|radiant-legiana|불,독
융광종 파오우르무|radiant-paolumu|불,폭파,기절
융광종 리오레우스|radiant-rathalos|번개
융광종 리오레이아 아종|radiant-pink-rathian|용,기절
융광종 디아블로스 아종|radiant-black-diablos|얼음,마비
융광종 라도발킨|radiant-radobaan|용,폭파
융광종 도스기르오스|radiant-great-girros|용,수면
융광종 토비카가치|radiant-tobi-kadachi|물,독
융광종 치치야크|radiant-tzitzi-ya-ku|용
융광종 오도가론|radiant-odogaron|얼음,마비"""
small="""쟈그라스|jagras
케스토돈|kestodon
랑고스타|vespoid
아프토노스|aptonoth
가쟈우|gajau
메르노스|mernos
파자푸 전사|warrior-atecoli
기르오스|girros
아프케로스|apceros
칸타로스|hornetaur
켈비|kelbi
노이오스|noios
융광종 쟈그라스|radiant-jagras
융광종 메르노스|radiant-mernos
융광종 케스토돈|radiant-kestodon
융광종 가쟈우|radiant-gajau
융광종 랑고스타|radiant-vespoid
융광종 칸타로스|radiant-hornetaur
융광종 기르오스|radiant-girros"""
elders={"kushala-daora","nergigante","ruger-aidal"}
out=[]
for line in rows.splitlines():
    name,slug,w=line.split("|")
    ws=w.split(",")
    radiant=slug.startswith("radiant-")
    m={"id":slug,"name":name,
       "nameEn":" ".join(p.capitalize() for p in slug.split("-")),
       "size":"large","class":"elder" if slug in elders else "standard",
       "radiant":radiant,
       "baseId":slug[len("radiant-"):] if radiant else None,
       "weakness":{E[x]:3 for x in ws if x in E},
       "ailmentWeakness":{A[x]:3 for x in ws if x in A},
       "weaknessComplete":False,
       "img":f"img/monsters/{slug}.png",
       "confidence":"community","sources":["gw-ko"]}
    out.append(m)
for line in small.splitlines():
    name,slug=line.split("|")
    out.append({"id":slug,"name":name,"nameEn":" ".join(p.capitalize() for p in slug.split("-")),
      "size":"small","class":"standard","radiant":slug.startswith("radiant-"),
      "baseId":slug[len("radiant-"):] if slug.startswith("radiant-") else None,
      "img":f"img/monsters/{slug}.png","confidence":"community","sources":["gw-ko"]})
# 루가 에알다 상세 (별점 전체 확인됨)
ra=next(m for m in out if m["id"]=="ruger-aidal")
ra.update({
 "nameJa":"ルガ・エアルダ","flagship":True,
 "weakness":{"fire":3,"water":1,"thunder":1,"ice":3,"dragon":2},
 "weaknessComplete":True,
 "inflicts":["화상(불속성 상태이상)","기절"],
 "breakable":["머리","앞다리","뒷다리","날개","꼬리","몸통"],
 "unlock":"스토리 6장 6-14 (직전 6-13은 모험 랭크 40 필요). S0 이후 지배자 챌린지에서 반복 사냥 가능, 지배자 무기 소재 획득.",
 "hitzones":"꼬리는 절단이 가장 잘 통하고, 머리는 절단이 가장 안 통한다.",
 "tips":[
  "날개의 창 공격은 가드 불가(랜스 포함). 몸통 쪽으로 피하거나 공격 버튼이 빛날 때 창을 부순다.",
  "태양 대기술은 바로 아래나 멀리 바깥으로 회피. 가드하면 불속성 상태이상에 걸린다.",
  "마무리 충돌 공격은 광선이 잦아든 뒤 납도하고 뒤로 달리다가 충돌 타이밍에 긴급 회피. 두 번째 낙석 지점 밑동이 안전지대.",
  "거리를 벌리면 돌진·창 대응이 어려우니 근접전 권장.",
  "낙석 지점으로 유도해 다운 가능(대기술 중엔 불가). 비행 중 섬광 날개벌레로 확실히 다운.",
  "상태 이상 해제는 토리나 류노스케 오의로."
 ],
 "teamIds":["ruger-fire","ruger-fire-ice"],
 "sources":["gw-ko","gw-en"]})
json.dump({"_note":"weakness는 별점(3=최대). weaknessComplete=false인 몬스터는 3★ 약점만 확인된 상태(나머지는 Step 3 전 보강). 융광종은 포획 불가, 전용 소재·장비를 드롭.",
  "radiantRules":{
    "name":"융광종",
    "summary":"루가 에알다의 융광 에너지로 변이한 개체. 일반 개체와 약점이 다른 경우가 있다.",
    "rules":[
      "융광 광폭화 상태가 되면 색이 바뀌고 포효하며 일부 패턴이 바뀐다.",
      "광폭화 중 색이 바뀐 융광 부위를 파괴하면 광폭화가 풀리고 다운된다. 부위는 시간이 지나면 재생되어 다시 파괴 가능.",
      "포획할 수 없다(필드 사냥 포함). 포획 도구를 쓰지 말 것.",
      "전용 소재만 드롭하며, 융광종 장비는 일반 장비와 스킬·능력치가 다르다.",
      "환경생물, 교란 오의(주인공 교란형·페페·케레스·라야·브릭스), 루타코 동반자로 행동을 끊을 수 있다.",
      "S0 한정 지배자 무기의 특수 효과(극)는 융광종 대상 대미지를 올린다. 약점 속성에 맞춰 제작."
    ],
    "confidence":"community","sources":["gw-ko"]},
  "list":out},sys.stdout,ensure_ascii=False,indent=1)
