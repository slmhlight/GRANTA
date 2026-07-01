/*
 * react-plotly.js 및 plotly.js 서브패스 모듈 선언.
 * R226e — @types/plotly.js 도입: data/layout/config 가 실제 Plotly 타입 (이전: 전부 any).
 *   'plotly.js' 본체 선언은 제거 — @types/plotly.js 가 제공.
 */
declare module 'react-plotly.js' {
  import { ComponentType } from 'react';
  import type { Data, Layout, Config } from 'plotly.js';

  /* Plotly 이벤트 최소 타입 (chart 가 실제 접근하는 필드만). */
  interface PlotlyPoint { customdata?: unknown; pointIndex?: number; pointNumber?: number; curveNumber?: number; x?: unknown; y?: unknown; }
  interface PlotlyEvent { points?: PlotlyPoint[]; range?: Record<string, unknown>; }

  export interface PlotProps {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    useResizeHandler?: boolean;
    onClick?: (data: PlotlyEvent) => void;
    onHover?: (data: PlotlyEvent) => void;
    onUnhover?: (data: PlotlyEvent) => void;
    onSelected?: (data: PlotlyEvent | undefined) => void;
    onDeselect?: () => void;
    onRelayout?: (data: Record<string, unknown>) => void;
    style?: React.CSSProperties;
    className?: string;
  }

  const Plot: ComponentType<PlotProps>;
  export default Plot;
}

declare module 'react-plotly.js/factory' {
  import { ComponentType } from 'react';
  import type { PlotProps } from 'react-plotly.js';
  /* 임의 plotly 인스턴스(core 번들 등)를 받아 Plot 컴포넌트를 생성하는 factory. */
  function createPlotComponent(plotly: unknown): ComponentType<PlotProps>;
  export default createPlotComponent;
}

// R210 B9 — scatter-only 커스텀 번들용 서브패스 모듈 선언 (@types/plotly.js 는 본체만 커버).
declare module 'plotly.js/lib/core' {
  const Plotly: typeof import('plotly.js') & { register: (modules: unknown[]) => void };
  export default Plotly;
}
declare module 'plotly.js/lib/scatter' {
  const scatter: unknown;
  export default scatter;
}
