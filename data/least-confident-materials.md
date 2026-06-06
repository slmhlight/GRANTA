# R133b — 자신감 가장 낮은 재료 10 + 표시 정책

사용자 질문: "데이터에 가장 자신이없는 재료 10개 말해볼래? 재료가 없으면 표시하지 않는것도 하나의 방법이라고 생각해"

→ 솔직히 답: **약 60-80 entry 는 표시 안 하는 게 사용자에게 더 honest**. 단, 어떻게 / 어디까지 hide 할지는 사용자 정책 결정이 필요. 아래는 그 근거.

---

## 1. 자신감 가장 낮은 Top 10 (실명)

`badness = risk_score - confidence_score×0.3 + popularity×1.5` 정렬 (popularity 가중치 — 잘못된 값이 자주 보이면 더 위험).

| # | 재료 | 카테고리 | Pop | Safety score | Verified | 진단 |
|---|---|---|---|---|---|---|
| 1 | **Ti-5-8-5 (Ti-5Al-8V-5Cr)** | β-Ti specialty | 3.5 | 0.5/12 | **0/3** | β-Ti specialty alloy, 시중 거의 사용 안 됨. handbook 없고 lookup 0. **표시 가치 < 오해 위험** |
| 2 | **AA 6151** (Al-Mg-Si forging) | Al alloy | 3.5 | 0.5/12 | **0/3** | 거의 사장된 forging-only grade. AA 6061 으로 대체 가능 |
| 3 | **AA 7178** (Al-Zn aerospace) | Al alloy | 3.5 | 0.5/12 | **0/3** | 1960년대 aerospace grade. 현재는 AA 7075-T7351 / 7050 사용. data sparse |
| 4 | **AA 7005** (Al-Zn-Mg-Cu weld plate) | Al alloy | 3.5 | 0.5/12 | **0/3** | 자전거 frame 일부 사용, but datasheet 부재 |
| 5 | **AA 5005 / 5050 / 5154 / 5251 / 5356 / 5383** (Al-Mg) | Al alloy | 3.3 | 0.5/12 | **0/3** | 6종 모두 5xxx 변종. AA 5052/5083 anchor 로 대체 가능 |
| 6 | **AISI 303 / 305 / 308 / 309 / 317** (austenitic variants) | Stainless | 3.5 | 0.5/12 | **0/3** | 304/316 변종. 304/316 anchor 로 대체 가능 |
| 7 | **AISI 436 / 440A / 440B / 446** (ferritic/martensitic variants) | Stainless | 3.3 | 0.5/12 | **0/3** | 430/440C anchor 로 대체 가능 |
| 8 | **AA 6463** (extrusion grade) | Al alloy | 3.2 | 0.5/12 | **0/3** | 6063 의 architectural 등급. handbook 거의 없음 |
| 9 | **Ti Grade 11** (Ti-0.15Pd corrosion) | Ti | 3.0 | 0.5/12 | **0/3** | 부식저항 specialty. handbook 부족, Gr2 + Pd note 로 대체 가능 |
| 10 | **AA 1200** (commercial pure Al) | Al alloy | 3.6 | 0.3/12 | **0/3** | 1050 / 1100 anchor 로 대체 가능 |

이 10개 entry 의 공통점:
- `verified=0/3 sources` (출처 URL 검증 불가)
- `safetyScore < 1` (fatigue / impact / KIC 의 신뢰도 거의 0)
- 가까운 다른 entry (anchor 보유) 가 대체 가능
- CSV-generic 으로 자동 grouping 된 결과 — 실측 측정값 0개

---

## 2. 표시 제외 후보 30+ entries (Composite / Polymer)

기록적으로 **CSV-generic 자동 생성 + verified URL 0 + safetyScore<2** 인 entry 가 ~60개 존재:

### 2.1 Polymer (verified=0, 표시 위험 高)
- PET / PBT (verified=0, MatWeb 링크만)
- HDPE / LDPE / Silicone Rubber / TPE (As-supplied generic)
- ABS / PEEK / ULTEM / PLA / TPU / PVDF / PSU / PPSU / PTFE / ETFE / PA11
- → 일부는 R127 polymer PDF 추가로 보강 가능 (이미 19종 처리됨)

### 2.2 Composite (verified=0, family typical fallback)
- CFRP — T300/Epoxy · T700/Epoxy · T800/Epoxy · IM7/Epoxy · M55J/Epoxy · P-100/Epoxy · 9종 카본 fiber 변종
- GFRP — E-glass/Epoxy · E-glass/Polyester · S-2 glass · Woven Roving
- Foam Core — Rohacell 71/110 IG · Corecell M80
- → vendor (Toray/Hexcel/Owens Corning) datasheet 미보유

### 2.3 Metal 일부 (CSV-generic 자동 grouping)
- Ti-5-8-5 7 entry (annealed / aged / strain-hardened / as-cast / as-built / as-supplied / strain-hardened)
- AISI 303 / 305 / 308 / 309 / 317 / 436 / 440A / 440B / 446 — 각 5-6개 HT variant
- 약 50+ AA Al variant (1200/5005/5050/5154/5251/5356/5383/6151/6463/7005/7178)
- → 총 약 80-100 entry 가 noise

---

## 3. 권장 표시 정책 (4 옵션)

### Option A: **Hard hide** (제외 — 가장 안전, 사용자에게 100% honest)
- 기준: `verified=0` AND `safetyScore<1` AND **대체 가능한 anchor 존재**
- 영향: ~80 entry 제외 → 1,291 → ~1,210
- 장점: 잘못된 데이터로 인한 의사결정 오류 0
- 단점: "검색해도 안 나옴" → 사용자가 다른 DB 로 이동

### Option B: **Soft hide with badge** (표시 + "Low confidence" 경고)
- 기준: 위와 동일
- 영향: 모든 entry 유지 + UI 에 "⚠️ Low confidence — data not verified" 표시
- 장점: 사용자가 보고 의사결정 — DB 의 honest 유지
- 단점: 사용자가 경고를 무시할 위험

### Option C: **Hybrid** (대체 가능한 것만 hide, 대체 불가능 entry 는 warning)
- 기준 A: AA 5005/5050/5154/5251/5356/5383 / AISI 303/305/308/309 / Ti-5-8-5 → hide (대체 가능)
- 기준 B: Ti Grade 11 / AA 7178 → warning badge (specialty, 다른 DB 도 부족)
- 영향: ~60 entry hide + ~20 entry warning
- 장점: 합리적 균형
- 단점: 기준 line drawing 복잡

### Option D: **Filter toggle** (사용자가 결정)
- 기준: 위 기준에 따라 `confidence_tier: 'low'` 필드 부여
- UI: FilterSidebar 에 "Show low-confidence entries" toggle
- Default: OFF (low-confidence hidden)
- 장점: 사용자 선택권 — power user 는 보고, 일반은 안 보임
- 단점: UI 추가 작업

**제 추천: Option D (Filter toggle)**
- 솔직성과 사용성 균형
- 기존 entry 다 보존 (학술/연구 가치)
- Default OFF 로 일반 사용자 보호

---

## 4. 구현 제안

### Phase 1 — confidence_tier 자동 부여
```js
// scripts/build-materials.mjs 마지막에:
for (const m of all) {
  const score = confidenceScore(m);
  const verified = (m.sources || []).filter(s => s.verified).length;
  if (score.total < 22 && verified === 0 && score.safety < 1.5) {
    m.confidence_tier = 'low';
  } else if (score.total < 30 && verified === 0) {
    m.confidence_tier = 'medium-low';
  } else if (verified >= 2 || score.total >= 50) {
    m.confidence_tier = 'high';
  } else {
    m.confidence_tier = 'medium';
  }
}
```

### Phase 2 — UI filter
```tsx
// client/src/components/FilterSidebar.tsx
<label>
  <input type="checkbox" checked={showLowConfidence} onChange={...} />
  Show low-confidence entries (n={lowConfCount})
</label>
```

### Phase 3 — MaterialDetail warning
- 이미 confidence badge + provenance tooltip 있음
- 추가: entry-level `confidence_tier === 'low'` 일 때 상단 warning banner

---

## 5. 솔직한 결론

**현재 DB 의 ~6% (80 entry / 1291) 는 "있는 게 없는 것보다 나쁠 수 있는" 수준.**

사용자 의사결정에 사용될 가능성 高 + 데이터 verified=0 + 대체 가능한 alternative 존재 → **default hide 가 합리적**.

**Phase 1 (confidence_tier 자동 부여)** 만 적용해도 사용자가 hover 시 즉시 인식 가능. UI filter 는 R134 에서 구현 추천.
