/*
 * R210 B9 — scatter-only Plotly 번들.
 * 이전: react-plotly.js 의 default import 가 plotly.js 전체판(gl3d·mapbox·geo 등 모든 trace 포함, ~4.6MB)을 끌어옴.
 * 이 앱의 Ashby 차트는 2D scatter 하나만 사용(markers·lines·fill·log axis·shapes·toImage) →
 *   core + scatter 만 register 하면 gl/mapbox/geo 가 트리쉐이크되어 청크가 대폭 축소.
 * 사용처: AshbyChartPlotly.tsx. data/layout/config API 는 전체판과 동일.
 */
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js/lib/core';
import scatter from 'plotly.js/lib/scatter';

Plotly.register([scatter]);

const Plot = createPlotlyComponent(Plotly);
export default Plot;
