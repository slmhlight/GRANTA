/*
 * R227/E14/H7 — 가이드 챕터 목차(TOC) SSOT. Guide 본문·사이드바·용어 페이지가 공유.
 */
import { LineChart, ListChecks, Compass, BookOpen, Target, Sigma, AlertTriangle, Lightbulb, BookText, BookMarked } from 'lucide-react';
import { GLOSSARY } from '@/lib/glossary';

export interface TocItem {
  id: string;
  n: number;
  label: string;
  icon: any;
}

// 글로서리 용어 수는 데이터에서 산출 — 용어 추가 시 라벨이 자동 갱신(하드코딩 staleness 방지).
const GLOSS_COUNT = Object.keys(GLOSSARY.terms).length;

export const TOC: TocItem[] = [
  { id: 'ch7', n: 1, label: '실전 사례 16선 (앱 자동 연계)', icon: LineChart },
  { id: 'ch6', n: 2, label: 'Ashby 재료 선택법 + 차트 인터랙션', icon: ListChecks },
  { id: 'ch10', n: 3, label: '합금 family 빠른 매핑 + 환경 조건별 선택', icon: Compass },
  { id: 'ch1', n: 4, label: '물성 사전 + 열처리 글로서리', icon: BookOpen },
  { id: 'ch2', n: 5, label: '설계 요구를 물성 수치로 변환 + 안전계수 사전', icon: Target },
  { id: 'ch3', n: 6, label: '단면 성질 도감 (A · I · Z · J)', icon: Sigma },
  { id: 'ch4', n: 7, label: '보 하중·지지조건별 처짐 · 모멘트', icon: Sigma },
  { id: 'ch5', n: 8, label: '비틀림 · 좌굴 · 복합 · 압력', icon: Sigma },
  { id: 'ch11', n: 9, label: '흔한 설계 실수 10선 (실패 학습)', icon: AlertTriangle },
  { id: 'ch9', n: 10, label: 'AM 특화 — 이방성·HIP·후처리·분말', icon: Lightbulb },
  { id: 'ch12', n: 11, label: '인증·가공·시제품 시험 (산업 적용)', icon: ListChecks },
  { id: 'ch14', n: 12, label: '산업 case study 5선 — 추상에서 구체로', icon: LineChart },
  { id: 'ch8', n: 13, label: '데이터 해석·datasheet·출처·단위·FAQ', icon: BookText },
  { id: 'ch15', n: 14, label: '재료 family 기본론 (Steel · Al · Ti · Ni · Cu · KS)', icon: BookOpen },
  { id: 'chGloss', n: 15, label: `기술용어 사전 (글로서리 ${GLOSS_COUNT}종)`, icon: BookMarked },
];
