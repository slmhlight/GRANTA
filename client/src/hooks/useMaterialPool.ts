/*
 * R154 — Material pool loader with slim index + per-category lazy load.
 *
 * 로딩 흐름:
 *   1. mount 시 materials/index.json (slim, ~670 KB) 즉시 fetch → setLoading(false)
 *   2. 첫 페인트 직후 requestIdleCallback 으로 4 category 백그라운드 prefetch
 *   3. 각 category 가 도착하면 materials state 의 해당 entry 가 slim → full 로 in-place 업그레이드
 *
 * 사용자가 materials[id] 의 full 필드 (composition, story, specs, ranges 의 full 형태) 가 필요한 시점:
 *   - ensureCategory(material.category) 를 await
 *   - 이미 로드됐으면 즉시 resolve, 아니면 fetch 완료까지 대기
 *
 * Race condition 회피: inflightCategories ref 로 같은 카테고리 중복 fetch 차단.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Material } from '@/lib/materials';

const CATEGORIES = ['Metal', 'Polymer', 'Ceramic', 'Composite'] as const;
const CATEGORY_FILE: Record<string, string> = {
  Metal: 'metal.json',
  Polymer: 'polymer.json',
  Ceramic: 'ceramic.json',
  Composite: 'composite.json',
};

export interface MaterialPoolState {
  materials: Material[];
  loading: boolean;
  error: string | null;
  loadedCategories: Set<string>;
  ensureCategory: (cat: string) => Promise<void>;
  /** R08 — 샤드 전용 필드(조성·열처리·출처·프로파일)를 읽는 필터/정렬이 켜지면 전 카테고리를 즉시 불러온다. */
  ensureAll: () => Promise<void>;
  /** 디버깅 — 슬림 vs full entry 수 */
  stats: { total: number; slim: number; full: number };
}

export function useMaterialPool(): MaterialPoolState {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());
  const inflightCategories = useRef<Record<string, Promise<void>>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  const loadCategoryInternal = useCallback((cat: string): Promise<void> => {
    if (loadedRef.current.has(cat)) return Promise.resolve();
    const inflight = inflightCategories.current[cat];
    if (inflight) return inflight;
    const base = import.meta.env.BASE_URL || '/';
    const filename = CATEGORY_FILE[cat];
    if (!filename) return Promise.resolve();
    const p = fetch(`${base}materials/${filename}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${filename} (HTTP ${r.status})`);
        return r.json();
      })
      .then((full: Material[]) => {
        if (!Array.isArray(full)) throw new Error(`${filename} is not an array`);
        // Merge: replace slim entries with full by id
        setMaterials((prev) => {
          const fullById = new Map(full.map((m) => [m.id, m]));
          return prev.map((m) => fullById.get(m.id) || m);
        });
        loadedRef.current.add(cat);
        setLoadedCategories(new Set(loadedRef.current));
      })
      .catch((e) => {
        // Non-fatal — slim data 그대로 사용 가능
        console.warn(`[useMaterialPool] Failed to load category ${cat}: ${e.message}`);
      })
      .finally(() => {
        delete inflightCategories.current[cat];
      });
    inflightCategories.current[cat] = p;
    return p;
  }, []);

  // Initial index fetch
  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}materials/index.json`)
      .then((r) => {
        if (!r.ok) {
          // Fallback to legacy single-file materials.json (R154 호환)
          throw new Error(`index.json HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((slim: Material[]) => {
        if (cancelled) return;
        if (!Array.isArray(slim)) throw new Error('index.json is not an array');
        setMaterials(slim);
        setLoading(false);
        /* R08(2026-09-22, 감사 R08) — 선제 로딩을 **단계별·회선 인지**로.
           이전: idle 직후 4 샤드(9.2 MB)를 한꺼번에 — 첫 상호작용과 대역폭을 다퉜다.
           지금: ① 작은 샤드(Ceramic·Composite·Polymer ≈ 1.6 MB)만 idle 에, ② Metal(7 MB)은 추가 idle 뒤에,
           ③ Save-Data 또는 2G/3G 회선이면 Metal 은 선제 로딩하지 않는다(상세 열기·전용 필터가 ensureCategory/ensureAll 로 즉시 요청).
           slim 만으로 표·카드·Ashby·비교가 동작하므로 사용자 체감은 없다. */
        const conn = typeof navigator !== 'undefined' ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection : undefined;
        const saveData = !!conn?.saveData;
        const slow = /(^|-)2g$|^3g$/.test(conn?.effectiveType || '');
        const idle = (cb: () => void, timeout: number) => {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout });
          } else setTimeout(cb, Math.min(timeout, 80));
        };
        const prefetchSmall = () => {
          if (cancelled || saveData) return;
          for (const c of CATEGORIES) if (c !== 'Metal') loadCategoryInternal(c);
          /* requestIdleCallback 의 timeout 은 '최대 대기'지 지연이 아니다 — 첫 idle 에 바로 불려 Metal 이 1.3 s 에
             내려왔다(실측). 진짜 지연은 setTimeout 으로 두고, 그 뒤 idle 에 얹는다. */
          if (!slow) setTimeout(() => { if (!cancelled) idle(() => { if (!cancelled) loadCategoryInternal('Metal'); }, 4000); }, 6000);
        };
        idle(prefetchSmall, 1500);
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn(`[useMaterialPool] index.json 로드 실패 (${e.message}) — legacy materials.json 으로 fallback`);
        // Fallback to legacy monolith
        fetch(`${base}materials.json`)
          .then((r) => {
            if (!r.ok) throw new Error('Failed to load materials database');
            return r.json();
          })
          .then((data: { materials: Material[] } | Material[]) => {
            if (cancelled) return;
            const list = Array.isArray(data) ? data : (data as { materials: Material[] }).materials;
            setMaterials(list);
            // All categories considered loaded since legacy = monolith
            loadedRef.current = new Set(CATEGORIES);
            setLoadedCategories(new Set(loadedRef.current));
            setLoading(false);
          })
          .catch((err) => {
            if (cancelled) return;
            setError(err.message);
            setLoading(false);
          });
      });
    return () => { cancelled = true; };
  }, [loadCategoryInternal]);

  const ensureCategory = useCallback(
    (cat: string) => loadCategoryInternal(cat),
    [loadCategoryInternal],
  );
  const ensureAll = useCallback(
    () => Promise.all(CATEGORIES.map((c) => loadCategoryInternal(c))).then(() => undefined),
    [loadCategoryInternal],
  );

  const stats = {
    total: materials.length,
    full: materials.filter((m) => loadedRef.current.has(m.category)).length,
    slim: materials.filter((m) => !loadedRef.current.has(m.category)).length,
  };

  return { materials, loading, error, loadedCategories, ensureCategory, ensureAll, stats };
}
