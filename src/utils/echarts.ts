/**
 * ECharts 按需引入 — 仅注册实际使用的组件
 * 将打包体积从 ~1.1MB 降低到 ~200KB
 */
import * as echarts from 'echarts/core'

import { BarChart, PieChart, LineChart } from 'echarts/charts'

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
])

export default echarts
export type { ECharts, EChartsCoreOption } from 'echarts/core'
