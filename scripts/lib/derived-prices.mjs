/*
 * AUD N02 (2026-09-22) — 파생 가격 재계산 (SSOT: 이 파일 하나. build-materials R205-R 와 build-from-registry 1j 가 공유).
 *
 * 납품 단가 delivered_price_per_kg = raw(price_per_kg.typical) × condition × form × grade,
 * 총 원가 total_cost_estimate = delivered × (1 + machining index) (AUD F10),
 * 부피 단가 price_per_cm3 = raw × ρ / 1000 (R101/R205-R).
 *
 * 세 값은 전부 raw 가격의 **파생값**이다. 그런데 raw 는 뒤늦게 바뀐다 — R146 시장가 검증(cost-verified-q2-2026)은 delivered 계산
 * 뒤에 ranges.price_per_kg 를 덮어쓰고, datasheet 교정(data/corrections/values.json)은 레지스트리 단계에서 raw 를 바꾼다.
 * 그 결과 95 entry 에서 "raw × 계수" 툴팁과 저장된 납품가가 달랐다(316L AM: 6.2×2.5=15.5 vs 14.5 · PEEK: 90 vs 400).
 * 파생값은 **입력이 바뀌면 다시 계산**한다 — 여기서 같은 식을 최종 입력에 다시 적용할 뿐 새 규칙을 만들지 않는다.
 *
 * 명시적 견적 override(meta.delivered_price_override = { value, reason, date, form })가 있으면 곱셈식을 쓰지 않고 그 값을 싣는다
 * (툴팁도 '견적 고정값' 으로 — 곱셈식 설명 금지). 현재 override 는 0 건이며, 스키마만 열어 둔다.
 */

const TOL = 0.02;   // USD/kg — 센트 반올림 차이는 무시

export function typicalOf(m, key) {
  const r = m?.ranges?.[key];
  const v = (r && typeof r.typical === 'number') ? r.typical : m?.[key];
  return (typeof v === 'number' && isFinite(v)) ? v : null;
}

/** 파생 가격을 최종 입력으로 다시 계산해 m 에 쓴다. 반환: 바뀐 필드 이름 배열(비어 있으면 정합). */
export function rederivePrices(m) {
  const changed = [];
  const pk = typicalOf(m, 'price_per_kg');
  if (pk == null || !(pk > 0)) return changed;

  // 0) 평면 raw 와 ranges.typical 정합 (R146 이 ranges 만 덮어써 평면값이 옛 숫자로 남던 것)
  if (typeof m.price_per_kg !== 'number' || Math.abs(m.price_per_kg - pk) > 1e-9) { m.price_per_kg = pk; changed.push('price_per_kg'); }

  // 1) delivered
  const cond = numOr1(m.price_condition_factor), form = numOr1(m.price_form_factor), grade = numOr1(m.price_grade_premium);
  const ov = m.meta?.delivered_price_override;
  let delivered, prov;
  if (ov && typeof ov.value === 'number' && ov.value > 0 && ov.reason) {
    delivered = +ov.value.toFixed(2);
    prov = `견적 고정값 (${ov.reason}${ov.date ? ` · ${ov.date}` : ''}${ov.form ? ` · ${ov.form}` : ''}) — 곱셈식 미적용`;
  } else {
    delivered = +(pk * cond * form * grade).toFixed(2);
    prov = `raw ${pk} × condition ${cond} × form ${form} × grade ${grade} = ${delivered} USD/kg`;
  }
  const curD = typicalOf(m, 'delivered_price_per_kg');
  const curProv = m.ranges?.delivered_price_per_kg?.provenance;
  if (curD == null || Math.abs(curD - delivered) > TOL || curProv !== prov) {
    m.delivered_price_per_kg = delivered;
    m.ranges = m.ranges || {};
    m.ranges.delivered_price_per_kg = { min: delivered, max: delivered, typical: delivered, n: 0, estimated: true, confidence: 'derived', provenance: prov };
    changed.push('delivered_price_per_kg');
  }

  // 2) total cost (AUD F10: delivered × (1 + machining index); 세라믹·복합재는 index null → 없음)
  const idx = m.machining_cost_factor;
  const total = (typeof idx === 'number' && isFinite(idx)) ? +(delivered * (1 + idx)).toFixed(2) : null;
  if ((m.total_cost_estimate ?? null) !== total && !(total != null && typeof m.total_cost_estimate === 'number' && Math.abs(m.total_cost_estimate - total) <= TOL)) {
    m.total_cost_estimate = total;
    changed.push('total_cost_estimate');
  }

  // 3) price_per_cm3 = raw × ρ / 1000 (R205-R 과 같은 식, 같은 2% 허용)
  const rho = typicalOf(m, 'density');
  if (rho != null && rho > 0) {
    const expect = +(pk * rho / 1000).toFixed(4);
    const cur = typicalOf(m, 'price_per_cm3');
    if (cur == null || Math.abs(cur - expect) / expect > 0.02) {
      m.ranges = m.ranges || {};
      m.ranges.price_per_cm3 = {
        min: +(expect * 0.85).toFixed(4), max: +(expect * 1.15).toFixed(4), typical: expect,
        n: 0, estimated: true, confidence: 'derived', provenance: 'price_per_kg × ρ 재계산',
      };
      m.price_per_cm3 = expect;
      changed.push('price_per_cm3');
    }
  }
  return changed;
}

/** 검사용 — 곱셈식과 저장값의 불일치(USD/kg) 를 돌려준다. override 가 있으면 null(식 미적용). */
export function deliveredMismatch(m) {
  const pk = typicalOf(m, 'price_per_kg');
  const d = typicalOf(m, 'delivered_price_per_kg');
  if (pk == null || d == null) return null;
  if (m.meta?.delivered_price_override) return null;
  const expect = pk * numOr1(m.price_condition_factor) * numOr1(m.price_form_factor) * numOr1(m.price_grade_premium);
  const diff = Math.abs(expect - d);
  return diff > TOL ? diff : 0;
}

function numOr1(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : 1; }
