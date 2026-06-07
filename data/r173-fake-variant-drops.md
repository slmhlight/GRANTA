# R173 — Dropped fake-variant entries (검토용)

Total dropped: 52 (50 non-curated + 2 curated)

## Non-curated drops (CSV / supplementary)

|#|Alloy|Condition class|Pattern|
|--|--|--|--|
|1|AA 1050|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|2|AA 1100|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|3|AA 1200|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|4|AA 3003|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|5|AA 3004|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|6|AA 3005|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|7|AA 3105|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|8|AA 5052|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|9|AA 5083|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|10|AA 5086|Aged / solution-treated|P4: non-HT Al × Aged/Q+T|
|11|AISI 1010|Aged / solution-treated|P1: plain carbon × Aged|
|12|AISI 1015|Aged / solution-treated|P1: plain carbon × Aged|
|13|AISI 1020|Aged / solution-treated|P1: plain carbon × Aged|
|14|AISI 1025|Aged / solution-treated|P1: plain carbon × Aged|
|15|AISI 1030|Aged / solution-treated|P1: plain carbon × Aged|
|16|AISI 1040|Aged / solution-treated|P1: plain carbon × Aged|
|17|AISI 1050|Aged / solution-treated|P1: plain carbon × Aged|
|18|AISI 1080|Aged / solution-treated|P1: plain carbon × Aged|
|19|AISI 1095|Aged / solution-treated|P1: plain carbon × Aged|
|20|AISI 304|Aged / solution-treated|P3/P5: austenitic SS × Q+T/Aged|
|21|AISI 304|Quenched / tempered|P3/P5: austenitic SS × Q+T/Aged|
|22|AISI 304L|Aged / solution-treated|P3/P5: austenitic SS × Q+T/Aged|
|23|AISI 304L|Quenched / tempered|P3/P5: austenitic SS × Q+T/Aged|
|24|AISI 310|Aged / solution-treated|P3/P5: austenitic SS × Q+T/Aged|
|25|AISI 310|Quenched / tempered|P3/P5: austenitic SS × Q+T/Aged|
|26|AISI 316|Aged / solution-treated|P3/P5: austenitic SS × Q+T/Aged|
|27|AISI 316|Quenched / tempered|P3/P5: austenitic SS × Q+T/Aged|
|28|AISI 321|Aged / solution-treated|P3/P5: austenitic SS × Q+T/Aged|
|29|AISI 321|Quenched / tempered|P3/P5: austenitic SS × Q+T/Aged|
|30|AISI 347|Aged / solution-treated|P3/P5: austenitic SS × Q+T/Aged|
|31|AISI 347|Quenched / tempered|P3/P5: austenitic SS × Q+T/Aged|
|32|AISI 405|Aged / solution-treated|P2: ferritic SS × Aged/Q+T|
|33|AISI 405|Quenched / tempered|P2: ferritic SS × Aged/Q+T|
|34|AISI 410|Aged / solution-treated|P6: martensitic SS × Aged|
|35|AISI 4130|Aged / solution-treated|P7: alloy steel × Aged|
|36|AISI 4150|Aged / solution-treated|P7: alloy steel × Aged|
|37|AISI 430|Aged / solution-treated|P2: ferritic SS × Aged/Q+T|
|38|AISI 430|Quenched / tempered|P2: ferritic SS × Aged/Q+T|
|39|AISI 434|Aged / solution-treated|P2: ferritic SS × Aged/Q+T|
|40|AISI 434|Quenched / tempered|P2: ferritic SS × Aged/Q+T|
|41|AISI 4340|Aged / solution-treated|P7: alloy steel × Aged|
|42|AISI 5140|Aged / solution-treated|P7: alloy steel × Aged|
|43|AISI 6150|Aged / solution-treated|P7: alloy steel × Aged|
|44|Hastelloy C-276|Aged / solution-treated|P8: solid-sol Ni × Aged|
|45|Inconel 600|Aged / solution-treated|P8: solid-sol Ni × Aged|
|46|Monel 400|Aged / solution-treated|P8: solid-sol Ni × Aged|
|47|Ti Grade 1|Aged / solution-treated|P11: CP-Ti × Aged|
|48|Ti Grade 2|Aged / solution-treated|P11: CP-Ti × Aged|
|49|Ti Grade 3|Aged / solution-treated|P11: CP-Ti × Aged|
|50|Ti Grade 4|Aged / solution-treated|P11: CP-Ti × Aged|

## Curated layer drops (material_db.json)

|#|Alloy|Condition|
|--|--|--|
|1|H13|Aged|
|2|CuNi30|Aged|

## Pattern reference (classification.mjs)

- **P1** Plain carbon (10xx/11xx) × Aged — ASM Vol.1: low-C steel 은 PH 불가
- **P2** Ferritic SS (4xx single-phase α) × Aged/Q+T — austenite 없음 → martensite 없음, PH 없음
- **P3** Austenitic SS (304/316/321/347) × Q+T — Ms ≈ -100°C, RT quench 으로 martensite 형성 X
- **P4** Non-HT Al (1xxx/3xxx/5xxx) × Aged/Q+T — solid-solution, only O/Hxx temper
- **P5** Austenitic SS × Aged — 18-8 austenitic no precipitation phase (사용자 직접 지적)
- **P6** Martensitic SS (410/420/440) × Aged — Q+T 만 valid
- **P7** Alloy steel (41xx/43xx/51xx/61xx/86xx/87xx Cr-Mo) × Aged — solid-solution 강화
- **P8** Solid-solution Ni (Monel 400/Inconel 600/Hastelloy C-276/X) × Aged — γ'/γ'' 없음
- **P9** Cupronickel (C70600/C71500) × Aged — solid-solution Cu-Ni
- **P10** Tool steel (H13/D2/A2/CPM) × Aged 단독 — Hardened-tempered 가 정상
- **P11** CP-Ti Grade 1-4 × Aged — single-phase α, no β transformation
