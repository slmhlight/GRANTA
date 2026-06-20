/*
 * R212c — matchesAlloyKey digit-boundary 가드 단위 테스트.
 * 회귀 방지: niobium 'c103' 가 copper 'c10300' 에 오매칭(C10300 이 niobium 의 fatigue/KIC/tmax/price 상속)하던 버그.
 * separator 경계(다른 토큰)는 허용, separator 없는 숫자 glue(같은 토큰)는 거부.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs 빌드 헬퍼 (타입 선언 없음)
import { matchesAlloyKey } from '../scripts/pipeline/enrich/alloy-key-match.mjs';

describe('matchesAlloyKey — digit-boundary 가드 (R212c)', () => {
  it('niobium c103 가 copper c10300 에 오매칭하지 않음 (같은 토큰 digit glue)', () => {
    expect(matchesAlloyKey('c10300 (phosphorus-deoxidized low-p copper, dlp)', 'c103')).toBe(false);
  });

  it('niobium c103 가 C-103 에는 매칭 (separator 경계)', () => {
    expect(matchesAlloyKey('c-103 (nb-hf-ti)', 'c103')).toBe(true);
  });

  it('304l 가 2304 lean duplex 에 오매칭하지 않음 (앞 숫자 glue)', () => {
    expect(matchesAlloyKey('2304 lean duplex', '304l')).toBe(false);
  });

  it('316l 가 AISI 316L / STS316L 에 매칭', () => {
    expect(matchesAlloyKey('aisi 316l / sts316l', '316l')).toBe(true);
  });

  it('4140 가 AISI 4140 / 42CrMo4 에 매칭 (cross-token, separator 보존)', () => {
    expect(matchesAlloyKey('aisi 4140 / 42crmo4', '4140')).toBe(true);
  });

  it('ti153 가 Ti-15-3-3-3 에 매칭 (숫자 사이 separator)', () => {
    expect(matchesAlloyKey('ti-15-3-3-3 (β-ti)', 'ti153')).toBe(true);
  });

  it('문자 경계 substring 은 기존대로 허용 (inconel718 ⊂ inconel 718)', () => {
    expect(matchesAlloyKey('inconel 718', 'inconel718')).toBe(true);
  });

  it('숫자 키가 더 긴 숫자에 prefix 로 붙으면 거부 (4140 ⊄ 41400)', () => {
    expect(matchesAlloyKey('41400 hypothetical', '4140')).toBe(false);
  });
});
