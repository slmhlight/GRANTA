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
