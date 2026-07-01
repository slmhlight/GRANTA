declare module 'react-plotly.js' {
  import { ComponentType } from 'react';

  /* R226e/C3 — Plotly 이벤트 최소 타입 (chart 가 실제 접근하는 필드만). 전체 Plotly 타입은 @types/plotly.js 도입 시 확장. */
  interface PlotlyPoint { customdata?: unknown; pointIndex?: number; pointNumber?: number; curveNumber?: number; x?: unknown; y?: unknown; }
  interface PlotlyEvent { points?: PlotlyPoint[]; range?: Record<string, unknown>; }

  interface PlotProps {
    data: any[];         // trace 배열 — Plotly 미타입(@types/plotly.js 없음), 의도적 any
    layout?: any;        // Plotly layout — 동상
    config?: any;        // Plotly config — 동상
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
  // 임의 plotly 인스턴스를 받아 Plot 컴포넌트를 생성하는 factory.
  function createPlotComponent(plotly: any): ComponentType<any>;
  export default createPlotComponent;
}

declare module 'plotly.js' {
  const Plotly: any;
  export default Plotly;
}

// R210 B9 — scatter-only 커스텀 번들용 서브패스 모듈 선언.
declare module 'plotly.js/lib/core' {
  const Plotly: any;
  export default Plotly;
}
declare module 'plotly.js/lib/scatter' {
  const scatter: any;
  export default scatter;
}
