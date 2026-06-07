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
        // Background lazy prefetch — first paint 직후
        const prefetchAll = () => {
          if (cancelled) return;
          for (const c of CATEGORIES) loadCategoryInternal(c);
        };
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(prefetchAll, { timeout: 1500 });
        } else {
          setTimeout(prefetchAll, 80);
        }
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

  const stats = {
    total: materials.length,
    full: materials.filter((m) => loadedRef.current.has(m.category)).length,
    slim: materials.filter((m) => !loadedRef.current.has(m.category)).length,
  };

  return { materials, loading, error, loadedCategories, ensureCategory, stats };
}
