declare module 'react-plotly.js' {
  import { ComponentType } from 'react';

  interface PlotProps {
    data: any[];
    layout?: any;
    config?: any;
    onClick?: (data: any) => void;
    onHover?: (data: any) => void;
    onUnhover?: (data: any) => void;
    onRelayout?: (data: any) => void;
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
