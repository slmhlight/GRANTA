/*
 * R157b — Home 의 재료 import 결과 sheet.
 * Home.tsx 의 inline 정의에서 추출. Behavior identical.
 *
 * 표시:
 *  - 매칭 성공 / 실패 수
 *  - 컬렉션 이름 input (저장 시 localStorage)
 *  - 매칭된 / 미매칭 재료 리스트 (200/60 개 truncate)
 *  - 취소 / 컬렉션으로 저장 버튼
 */
import { Upload, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface ImportResult {
  matched: Array<{ name: string; matchedTo: string }>;
  unmatched: string[];
}

interface HomeImportSheetProps {
  importResult: ImportResult | null;
  setImportResult: (r: ImportResult | null) => void;
  importName: string;
  setImportName: (n: string) => void;
  confirmImport: () => void;
}

export function HomeImportSheet({
  importResult,
  setImportResult,
  importName,
  setImportName,
  confirmImport,
}: HomeImportSheetProps) {
  return (
    <Sheet open={importResult !== null} onOpenChange={(v) => { if (!v) setImportResult(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 pr-8"><Upload className="w-4 h-4 text-accent" /> 재료 목록 import 결과</SheetTitle>
        </SheetHeader>
        {importResult && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded border border-emerald-300 bg-emerald-50 px-2 py-2">
                <p className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">매칭 성공</p>
                <p className="text-2xl font-bold text-emerald-700 tabular-nums">{importResult.matched.length}</p>
              </div>
              <div className="rounded border border-rose-300 bg-rose-50 px-2 py-2">
                <p className="text-[10px] text-rose-700 uppercase tracking-wide font-semibold">매칭 실패</p>
                <p className="text-2xl font-bold text-rose-700 tabular-nums">{importResult.unmatched.length}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">컬렉션 이름</label>
              <input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="가공집 재료"
                className="w-full h-8 px-2 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="text-[10px] text-muted-foreground mt-1">localStorage(쿠키 대체) 에 저장돼 재방문 시 자동 복원.</p>
            </div>
            {importResult.matched.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">매칭된 재료 ({importResult.matched.length})</p>
                <div className="max-h-44 overflow-y-auto rounded border border-border bg-muted/30 text-xs divide-y divide-border/60">
                  {importResult.matched.slice(0, 200).map((m, i) => (
                    <div key={i} className="px-2 py-1 flex items-baseline justify-between gap-2">
                      <span className="font-medium text-foreground truncate">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">← {m.matchedTo}</span>
                    </div>
                  ))}
                  {importResult.matched.length > 200 && (
                    <div className="px-2 py-1 text-[10px] text-muted-foreground italic">… 외 {importResult.matched.length - 200}개</div>
                  )}
                </div>
              </div>
            )}
            {importResult.unmatched.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide mb-1">매칭 실패 ({importResult.unmatched.length})</p>
                <div className="max-h-32 overflow-y-auto rounded border border-rose-200 bg-rose-50/50 text-xs">
                  {importResult.unmatched.slice(0, 60).map((u, i) => (
                    <div key={i} className="px-2 py-0.5 text-rose-800 truncate">{u}</div>
                  ))}
                  {importResult.unmatched.length > 60 && (
                    <div className="px-2 py-0.5 text-[10px] text-rose-600 italic">… 외 {importResult.unmatched.length - 60}개</div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">DB 에 없는 등급은 무시됩니다. 표기 차이가 원인이면 alias 추가를 검토하세요.</p>
              </div>
            )}
          </div>
        )}
        <div className="border-t border-border/60 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setImportResult(null)}>취소</Button>
          <Button onClick={confirmImport} disabled={!importResult || importResult.matched.length === 0} className="gap-1.5">
            <BookmarkPlus className="w-3.5 h-3.5" /> 컬렉션으로 저장 ({importResult?.matched.length ?? 0})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
