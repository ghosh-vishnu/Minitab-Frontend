import React, { useMemo, useState, useRef, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { calculateIChart, runTests, formatNumber } from '../../utils/chartCalculations'
import toast from 'react-hot-toast'
import { ScaleDialog } from '../dialogs/ScaleDialog'

/**
 * Generate clean Y-axis ticks similar to Minitab
 * Uses rounded intervals to avoid cluttered decimals
 */
function generateYAxisTicks(min: number, max: number): number[] {
  const range = max - min
  if (range === 0) return [min]
  
  // Calculate ideal step (5-8 ticks)
  let step = range / 5
  
  // Round step to a clean number (1, 2, 5, 10, 20, 50, 100, etc.)
  const exponent = Math.floor(Math.log10(step))
  const mantissa = step / Math.pow(10, exponent)
  
  let cleanMantissa = 1
  if (mantissa > 2.5) cleanMantissa = 5
  else if (mantissa > 1.5) cleanMantissa = 2
  
  step = cleanMantissa * Math.pow(10, exponent)
  
  // Generate ticks
  const ticks: number[] = []
  let tickValue = Math.floor(min / step) * step
  
  while (tickValue <= max + step * 0.01) {
    if (tickValue >= min - step * 0.01) {
      ticks.push(parseFloat(tickValue.toFixed(10))) // Remove floating-point errors
    }
    tickValue += step
  }
  
  return ticks.length > 0 ? ticks : [min, max]
}

/**
 * Generate Y-axis ticks with specific count
 */
function generateYAxisTicksWithCount(min: number, max: number, count: number): number[] {
  if (count <= 0) return generateYAxisTicks(min, max)
  const range = max - min
  const step = range / (count - 1)
  const ticks: number[] = []
  for (let i = 0; i < count; i++) {
    ticks.push(min + step * i)
  }
  return ticks
}

/**
 * Generate X-axis ticks (observation numbers)
 * Aims for 5-8 evenly-spaced ticks
 */
function generateXAxisTicks(pointCount: number): number[] {
  if (pointCount <= 8) {
    return Array.from({ length: pointCount }, (_, i) => i + 1)
  }
  
  // Calculate step to get 5-8 ticks
  let step = Math.ceil(pointCount / 8)
  
  // Round to clean numbers (1, 2, 5, 10, 20, 50, 100, etc.)
  if (step > 5) {
    const exponent = Math.floor(Math.log10(step))
    const mantissa = step / Math.pow(10, exponent)
    if (mantissa > 5) step = 10 * Math.pow(10, exponent - 1)
    else if (mantissa > 2) step = 5 * Math.pow(10, exponent - 1)
    else step = 2 * Math.pow(10, exponent - 1)
  }
  
  const ticks: number[] = []
  for (let i = 1; i <= pointCount; i += step) {
    ticks.push(i)
  }
  // Always include the last point
  if (ticks[ticks.length - 1] !== pointCount) {
    ticks.push(pointCount)
  }
  
  return ticks
}



interface IChartComponentProps {
  columnId: string
  columnName: string
  values: number[]
  xScaleType?: 'index' | 'stamp'
  stampColumn?: string
  stampValues?: (string | number)[]
  cells?: Array<{ row_index: number; column_index: number; value: any }>
  axesConfig?: {
    xAxisLabel?: string
    yAxisLabel?: string
    // Shared Y-axis domain for "Same Y" option
    sharedYAxisDomain?: { min: number; max: number }
    // Y Scale checkboxes
    yScaleAxisLineLow?: boolean
    yScaleAxisLineHigh?: boolean
    yScaleMajorTicksLow?: boolean
    yScaleMajorTicksHigh?: boolean
    yScaleMajorTickLabelsLow?: boolean
    yScaleMajorTickLabelsHigh?: boolean
    yScaleMinorTicksLow?: boolean
    // Y-Axis Scale Configuration
    yScaleTickMode?: 'automatic' | 'number' | 'position'
    yScaleNumberOfTicks?: number
    yScaleTickPositions?: number[]
    yScaleMinEnabled?: boolean
    yScaleMinValue?: number
    yScaleMaxEnabled?: boolean
    yScaleMaxValue?: number
    yScaleMinorTicksEnabled?: boolean
    yScaleMinorTicksNumber?: number
    // X Scale checkboxes
    xScaleAxisLineLow?: boolean
    xScaleAxisLineHigh?: boolean
    xScaleMajorTicksLow?: boolean
    xScaleMajorTicksHigh?: boolean
    xScaleMajorTickLabelsLow?: boolean
    xScaleMajorTickLabelsHigh?: boolean
  }
  labelsConfig?: {
    title?: string
    subtitle1?: string
    subtitle2?: string
    footnote1?: string
    footnote2?: string
  }
  onEditChart?: () => void
  onOpenScaleDialog?: (tab: 'time' | 'axes', currentConfig?: any) => void
  columnCount?: number
  rowCount?: number
  onScaleConfigChange?: (config: any) => void
}

export const IChartComponent: React.FC<IChartComponentProps> = ({ 
  columnId, 
  columnName, 
  values,
  xScaleType = 'index',
  stampColumn,
  stampValues,
  cells,
  axesConfig,
  labelsConfig,
  onEditChart,
  onOpenScaleDialog,
  columnCount = 0,
  rowCount = 0,
  onScaleConfigChange,
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showScaleDialog, setShowScaleDialog] = useState(false)
  const [scaleDialogTab, setScaleDialogTab] = useState<'time' | 'axes'>('axes')
  const [scaleDialogConfig, setScaleDialogConfig] = useState<any>(null)
  // Extract stamp values if stamp column is provided
  const extractedStampValues = useMemo(() => {
    if (xScaleType === 'stamp' && stampColumn && cells) {
      const colNum = parseInt(stampColumn.replace('C', ''))
      const colIndex = colNum - 1
      
      const stampCells = cells
        .filter((cell) => {
          if (cell.column_index !== colIndex) return false
          return cell.row_index >= 0
        })
        .sort((a, b) => a.row_index - b.row_index)
      
      return stampCells.map((cell) => cell.value).filter((val) => val !== null && val !== undefined && val !== '')
    }
    return stampValues || []
  }, [xScaleType, stampColumn, stampValues, cells])

  const chartData = useMemo(() => {
    if (values.length === 0) {
      return { points: [], stats: null, xAxisLabel: 'Observation' }
    }

    try {
      const stats = calculateIChart(values)
      
      // Determine X-axis values based on scale type
      let xValues: (number | string)[] = []
      let xAxisLabel = 'Observation'
      
      if (xScaleType === 'stamp' && extractedStampValues.length > 0) {
        // Use stamp values for X-axis
        xValues = extractedStampValues.slice(0, values.length) // Match length with values
        // Clean trailing 'y' from column name if present
        const cleanedStampColumn = (stampColumn || 'Observation').replace(/y$/i, '')
        xAxisLabel = cleanedStampColumn || 'Observation'
      } else {
        // Use index (1, 2, 3, ...)
        xValues = values.map((_, index) => index + 1)
        xAxisLabel = 'Observation'
      }

      const points = values.map((value, index) => ({
        x: xValues[index] !== undefined ? xValues[index] : index + 1,
        y: value,
        isOutOfControl: stats.outOfControlPoints.includes(index),
      }))

      // Add unique keys to points for React rendering
      const pointsWithKeys = points.map((point, index) => ({
        ...point,
        key: `point-${index}-${point.x}-${point.y}`,
      }))

      return { points: pointsWithKeys, stats, xAxisLabel, xValues }
    } catch (error) {
      console.error('Error calculating I-Chart:', error)
      return { points: [], stats: null, xAxisLabel: 'Observation', xValues: [] }
    }
  }, [values, xScaleType, extractedStampValues, stampColumn])

  if (!chartData.stats || chartData.points.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 h-96 flex items-center justify-center">
        <p className="text-gray-500">Unable to generate chart</p>
      </div>
    )
  }

  const { mean, ucl, lcl, outOfControlPoints } = chartData.stats

  // Calculate Y-axis domain using Minitab's approach
  // 1. Include all critical elements: data points, UCL, LCL, mean
  // 2. Add padding as ~8% of the control limit range
  // 3. Never let limits touch edges
  const dataValues = chartData.points.map((p) => p.y)
  const minData = Math.min(...dataValues)
  const maxData = Math.max(...dataValues)
  
  // Include all relevant points
  const allPoints = [minData, maxData, ucl, lcl, mean]
  const minPoint = Math.min(...allPoints)
  const maxPoint = Math.max(...allPoints)
  
  // Check if shared Y-axis domain is provided (from "Same Y" option)
  let yAxisMin: number
  let yAxisMax: number
  
  if (axesConfig?.sharedYAxisDomain) {
    // Use shared Y-axis domain from C1
    yAxisMin = axesConfig.sharedYAxisDomain.min
    yAxisMax = axesConfig.sharedYAxisDomain.max
  } else {
    // Calculate padding as percentage of control limit range
    // Minitab typically uses 8-10% padding
    const controlRange = ucl - lcl
    const padding = Math.max(controlRange * 0.08, (maxPoint - minPoint) * 0.05)
    
    // Final domain with padding
    yAxisMin = minPoint - padding
    yAxisMax = maxPoint + padding
    
    // Override with manual values if provided (when checkboxes are checked)
    if (axesConfig?.yScaleMinValue !== undefined) {
      const minValue = typeof axesConfig.yScaleMinValue === 'number' ? axesConfig.yScaleMinValue : parseFloat(axesConfig.yScaleMinValue.toString())
      if (!isNaN(minValue)) {
        yAxisMin = minValue
      }
    }
    if (axesConfig?.yScaleMaxValue !== undefined) {
      const maxValue = typeof axesConfig.yScaleMaxValue === 'number' ? axesConfig.yScaleMaxValue : parseFloat(axesConfig.yScaleMaxValue.toString())
      if (!isNaN(maxValue)) {
        yAxisMax = maxValue
      }
    }
    
    // Ensure control limits never touch edges (only if not using manual values)
    if (axesConfig?.yScaleMinEnabled !== false && axesConfig?.yScaleMaxEnabled !== false) {
      const minControlMargin = (maxPoint - minPoint) * 0.03
      if (lcl - yAxisMin < minControlMargin) {
        yAxisMin = lcl - minControlMargin
      }
      if (yAxisMax - ucl < minControlMargin) {
        yAxisMax = ucl + minControlMargin
      }
    }
  }

  // Note: Y-axis domain is calculated automatically based on data
  // If sharedYAxisDomain is provided, it overrides the calculated domain

  // Generate Y-axis ticks based on configuration
  const getYAxisTicks = (): number[] => {
    if (axesConfig?.yScaleTickMode === 'position' && axesConfig?.yScaleTickPositions) {
      // Use custom tick positions
      const positions = Array.isArray(axesConfig.yScaleTickPositions) 
        ? axesConfig.yScaleTickPositions 
        : axesConfig.yScaleTickPositions.toString().split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v))
      return positions.filter(tick => tick >= yAxisMin && tick <= yAxisMax)
    } else if (axesConfig?.yScaleTickMode === 'number' && axesConfig?.yScaleNumberOfTicks) {
      // Use specified number of ticks
      const numTicks = typeof axesConfig.yScaleNumberOfTicks === 'number' 
        ? axesConfig.yScaleNumberOfTicks 
        : parseInt(axesConfig.yScaleNumberOfTicks.toString())
      if (!isNaN(numTicks) && numTicks > 0) {
        const step = (yAxisMax - yAxisMin) / (numTicks - 1)
        return Array.from({ length: numTicks }, (_, i) => yAxisMin + i * step)
      }
    }
    // Default: automatic tick generation
    return generateYAxisTicks(yAxisMin, yAxisMax)
  }

  const yAxisTicks = getYAxisTicks()

  // Debug: Log labelsConfig to verify it's being passed
  console.log('[IChartComponent] labelsConfig:', labelsConfig)
  console.log('[IChartComponent] Has title?', !!labelsConfig?.title)
  console.log('[IChartComponent] Has subtitle1?', !!labelsConfig?.subtitle1)
  console.log('[IChartComponent] Has subtitle2?', !!labelsConfig?.subtitle2)
  console.log('[IChartComponent] Has footnote1?', !!labelsConfig?.footnote1)
  console.log('[IChartComponent] Has footnote2?', !!labelsConfig?.footnote2)

  const hasTitle = labelsConfig?.title && labelsConfig.title.trim()
  const hasSubtitle1 = labelsConfig?.subtitle1 && labelsConfig.subtitle1.trim()
  const hasSubtitle2 = labelsConfig?.subtitle2 && labelsConfig.subtitle2.trim()
  const hasFootnotes = (labelsConfig?.footnote1 && labelsConfig.footnote1.trim()) || (labelsConfig?.footnote2 && labelsConfig.footnote2.trim())

  // Handle copy graph
  const handleCopyGraph = async () => {
    if (!chartContainerRef.current) return
    
    try {
      // Use html2canvas to capture the chart
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      })
      
      // Try to copy to clipboard
      canvas.toBlob((blob) => {
        if (blob) {
          if (navigator.clipboard && navigator.clipboard.write) {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
              // Show success message
              if (typeof window !== 'undefined' && (window as any).toast) {
                (window as any).toast.success('Chart copied to clipboard!')
              } else {
                alert('Chart copied to clipboard!')
              }
            }).catch((err) => {
              console.error('Failed to copy:', err)
              // Fallback: download as image
              downloadChartAsImage(canvas)
            })
          } else {
            // Fallback: download as image
            downloadChartAsImage(canvas)
          }
        }
      }, 'image/png')
    } catch (error) {
      console.error('Error copying chart:', error)
      alert('Failed to copy chart. Please try again.')
    }
    
    setShowDropdown(false)
  }

  // Helper function to download chart as image
  const downloadChartAsImage = (canvas: HTMLCanvasElement) => {
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `chart-${columnId}-${Date.now()}.png`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success('Chart downloaded!')
    }
  }

  // Handle edit chart
  const handleEditChart = () => {
    if (onEditChart) {
      onEditChart()
    }
    setShowDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 relative">
      {/* Dropdown Menu - Top Right Corner */}
      <div className="absolute top-2 right-2 z-20" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Chart Options"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
            <button
              onClick={handleCopyGraph}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Graph
            </button>
            <button
              onClick={handleEditChart}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="mb-8 border border-gray-300 rounded-sm bg-white p-0" ref={chartContainerRef}>
        {/* Title and Subtitles - Show custom labels if provided */}
        {(hasTitle || hasSubtitle1 || hasSubtitle2) && (
          <div className="px-4 pt-4 pb-2 text-center bg-white">
            {hasTitle && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{labelsConfig.title}</h3>
            )}
            {hasSubtitle1 && (
              <p className="text-sm text-gray-700">{labelsConfig.subtitle1}</p>
            )}
            {hasSubtitle2 && (
              <p className="text-sm text-gray-700">{labelsConfig.subtitle2}</p>
            )}
          </div>
        )}
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={chartData.points}
            margin={{ top: 20, right: 180, left: 80, bottom: 80 }}
          >
            {/* Grid - Minitab style: light grey, subtle horizontal lines only for Y values */}
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              vertical={false}
              horizontal={true}
            />

            {/* X-Axis */}
            <XAxis
              dataKey="x"
              type={xScaleType === 'stamp' ? 'category' : 'number'}
              domain={xScaleType === 'stamp' ? undefined : [1, chartData.points.length]}
              // Generate evenly-spaced observation tick marks (5-10 ticks) for index mode
              ticks={xScaleType === 'stamp' ? undefined : generateXAxisTicks(chartData.points.length)}
              angle={xScaleType === 'stamp' ? -45 : 0}
              textAnchor={xScaleType === 'stamp' ? 'end' : 'middle'}
              tickFormatter={(value) => {
                // Hide tick labels if both Low and High are unchecked
                if (axesConfig?.xScaleMajorTickLabelsLow === false && axesConfig?.xScaleMajorTickLabelsHigh === false) {
                  return ''
                }
                // Format stamp values
                if (xScaleType === 'stamp') {
                  return String(value)
                }
                return String(value)
              }}
              tick={(props: any) => {
                const { x, y, payload } = props
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={16}
                      textAnchor="middle"
                      fill="#374151"
                      fontSize={11}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setScaleDialogTab('time')
                        setScaleDialogConfig({
                          xScaleType: xScaleType || 'index',
                          stampColumn: stampColumn,
                          axesConfig: axesConfig,
                        })
                        setShowScaleDialog(true)
                      }}
                    >
                      {payload.value}
                    </text>
                  </g>
                )
              }}
              axisLine={{ 
                stroke: '#6b7280', 
                strokeWidth: 1,
                ...(axesConfig?.xScaleAxisLineLow === false && axesConfig?.xScaleAxisLineHigh === false && { display: 'none' }),
              }}
              tickLine={{ 
                stroke: '#6b7280', 
                strokeWidth: 1,
                ...(axesConfig?.xScaleMajorTicksLow === false && axesConfig?.xScaleMajorTicksHigh === false && { display: 'none' }),
              }}
            />

            {/* Y-Axis with proper positioning and clean tick intervals */}
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              type="number"
              width={60}
              tickFormatter={(value) => {
                // Hide tick labels if both Low and High are unchecked
                if (axesConfig?.yScaleMajorTickLabelsLow === false && axesConfig?.yScaleMajorTickLabelsHigh === false) {
                  return ''
                }
                return String(value)
              }}
              tick={(props: any) => {
                const { x, y, payload } = props
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dx={-8}
                      textAnchor="end"
                      fill="#374151"
                      fontSize={11}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setScaleDialogTab('scale')
                        setScaleDialogConfig({
                          xScaleType: xScaleType || 'index',
                          stampColumn: stampColumn,
                          axesConfig: {
                            ...axesConfig,
                            yAxisLabel: axesConfig?.yAxisLabel || 'Individual Value',
                            // Include current Y-axis scale values
                            yScaleMinValue: yAxisMin.toString(),
                            yScaleMaxValue: yAxisMax.toString(),
                            yScaleMinEnabled: axesConfig?.yScaleMinEnabled !== false,
                            yScaleMaxEnabled: axesConfig?.yScaleMaxEnabled !== false,
                          },
                        })
                        setShowScaleDialog(true)
                      }}
                    >
                      {payload.value}
                    </text>
                  </g>
                )
              }}
              axisLine={{ 
                stroke: '#6b7280', 
                strokeWidth: 1,
                ...(axesConfig?.yScaleAxisLineLow === false && axesConfig?.yScaleAxisLineHigh === false && { display: 'none' }),
              }}
              tickLine={{ 
                stroke: '#6b7280', 
                strokeWidth: 1,
                ...(axesConfig?.yScaleMajorTicksLow === false && axesConfig?.yScaleMajorTicksHigh === false && { display: 'none' }),
              }}
              // Generate ticks based on configuration
              ticks={yAxisTicks}
              label={({ viewBox, offset }: any) => {
                if (!viewBox) return null
                const x = viewBox.x || 0
                const y = viewBox.y || 0
                const height = viewBox.height || 0
                const labelX = x - (offset || 10)
                const labelY = y + height / 2
                return (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="bold"
                    fill="#1f2937"
                    transform={`rotate(-90 ${labelX} ${labelY})`}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setScaleDialogTab('axes')
                      setScaleDialogConfig({
                        xAxisLabel: (axesConfig?.xAxisLabel || chartData.xAxisLabel || 'Observation').replace(/y$/i, ''),
                        yAxisLabel: axesConfig?.yAxisLabel || 'Individual Value',
                        ...axesConfig,
                      })
                      setShowScaleDialog(true)
                    }}
                  >
                    {axesConfig?.yAxisLabel || 'Individual Value'}
                  </text>
                )
              }}
            />

            {/* Tooltip - minimal Minitab style */}
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #9ca3af',
                borderRadius: '2px',
                padding: '6px 10px',
                fontSize: '11px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              formatter={(value: any) => [formatNumber(value), 'Value']}
              labelFormatter={(label) => `Obs: ${label}`}
              cursor={{ stroke: '#9ca3af', strokeWidth: 1 }}
              wrapperStyle={{ outline: 'none' }}
            />

            {/* Custom Legend with X-axis label - Legend items hidden */}
            <Legend
              verticalAlign="bottom"
              height={40}
              wrapperStyle={{
                paddingTop: '8px',
                textAlign: 'center',
              }}
              iconType="line"
              content={({ payload }: any) => {
                // Only render X-axis label, hide legend items
                return (
                  <g>
                    {/* X-axis label - only this is visible */}
                    <text
                      x="50%"
                      y={0}
                      dy={8}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                      fill="#1f2937"
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setScaleDialogTab('axes')
                        setScaleDialogConfig({
                          xAxisLabel: axesConfig?.xAxisLabel || chartData.xAxisLabel || 'Observation',
                          yAxisLabel: axesConfig?.yAxisLabel || 'Individual Value',
                          ...axesConfig,
                        })
                        setShowScaleDialog(true)
                      }}
                    >
                      {(axesConfig?.xAxisLabel || chartData.xAxisLabel || 'Observation').replace(/y$/i, '')}
                    </text>
                    {/* Legend items are hidden - not rendered */}
                  </g>
                )
              }}
            />

            {/* Mean Line - Green Solid */}
            <ReferenceLine
              y={mean}
              stroke="#16a34a"
              strokeWidth={2}
              name="Mean"
              label={{
                value: `X = ${formatNumber(mean)}`,
                position: 'right',
                fill: '#15803d',
                fontSize: 11,
                fontWeight: '600',
                offset: 8,
                dy: -5,
              } as any}
            />

            {/* UCL Line - Red Dashed */}
            <ReferenceLine
              y={ucl}
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              name="UCL"
              label={{
                value: `UCL = ${formatNumber(ucl)}`,
                position: 'right',
                fill: '#b91c1c',
                fontSize: 11,
                fontWeight: '600',
                offset: 8,
                dy: -5,
              } as any}
            />

            {/* LCL Line - Red Dashed */}
            <ReferenceLine
              y={lcl}
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              name="LCL"
              label={{
                value: `LCL = ${formatNumber(lcl)}`,
                position: 'right',
                fill: '#b91c1c',
                fontSize: 11,
                fontWeight: '600',
                offset: 8,
                dy: 5,
              } as any}
            />

            {/* Individual Values - Blue Line with Points */}
            <Line
              key="individual-values-line"
              type="linear"
              dataKey="y"
              stroke="#2563eb"
              strokeWidth={1.5}
              isAnimationActive={false}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props
                if (!cx || !cy || !payload) return <g key={`dot-${index}`} />
                
                const isOutOfControl = payload.isOutOfControl
                return (
                  <circle
                    key={`dot-${index}-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={isOutOfControl ? 5.5 : 4}
                    fill={isOutOfControl ? '#ef4444' : '#2563eb'}
                    stroke={isOutOfControl ? '#7f1d1d' : '#1e40af'}
                    strokeWidth={1.5}
                  />
                )
              }}
              // No name prop - this prevents it from showing in legend
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Footnotes - Show at bottom of chart container */}
        {hasFootnotes && (
          <div className="px-4 pb-3 pt-2 border-t border-gray-200 flex gap-4 text-xs text-gray-600 justify-center items-center">
            {labelsConfig.footnote1 && labelsConfig.footnote1.trim() && (
              <span className="font-normal">{labelsConfig.footnote1}</span>
            )}
            {labelsConfig.footnote2 && labelsConfig.footnote2.trim() && (
              <span className="font-normal">{labelsConfig.footnote2}</span>
            )}
          </div>
        )}
      </div>

      {/* Summary Statistics Panel */}
      <div className="mb-8 bg-gray-100 rounded p-4 border border-gray-300">
        <div className="grid grid-cols-4 gap-8">
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Mean</p>
            <p className="text-2xl font-bold text-green-700">{formatNumber(mean)}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">UCL</p>
            <p className="text-2xl font-bold text-red-700">{formatNumber(ucl)}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">LCL</p>
            <p className="text-2xl font-bold text-red-700">{formatNumber(lcl)}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Out of Control
            </p>
            <p
              className={`text-2xl font-bold ${
                outOfControlPoints.length > 0 ? 'text-red-700' : 'text-green-700'
              }`}
            >
              {outOfControlPoints.length}
            </p>
          </div>
        </div>
      </div>

      {/* Test Results Section */}
      <TestResultsSection columnId={columnId} columnName={columnName} values={values} stats={chartData.stats} />

      {/* Scale Dialog */}
      {cells && columnCount > 0 && (
        <ScaleDialog
          isOpen={showScaleDialog}
          onClose={() => setShowScaleDialog(false)}
          onApply={(config: any) => {
            if (onScaleConfigChange) {
              onScaleConfigChange(config)
            }
            setShowScaleDialog(false)
          }}
          cells={cells as any}
          columnCount={columnCount}
          rowCount={rowCount}
          currentConfig={scaleDialogConfig || {
            xScaleType: xScaleType || 'index',
            stampColumn: stampColumn,
            axesConfig: axesConfig,
          }}
          initialTab={scaleDialogTab}
        />
      )}
    </div>
  )
}

interface TestResultsSectionProps {
  columnId: string
  columnName: string
  values: number[]
  stats: ReturnType<typeof calculateIChart>
}

const TestResultsSection: React.FC<TestResultsSectionProps> = ({ columnId, values, stats }) => {
  const testResults = useMemo(() => {
    return runTests(values, stats.mean, stats.sigma)
  }, [values, stats])

  const failedTests = testResults.filter((test) => !test.passed)
  const anyTestsFailed = failedTests.length > 0

  return (
    <div className="border-t border-gray-300 pt-6">
      <h4 className="text-base font-bold text-gray-900 mb-4">Test Results for I Chart of {columnId}</h4>

      {anyTestsFailed ? (
        <div className="space-y-3">
          {failedTests.map((test) => (
            <div key={test.testNumber} className="bg-red-50 border-l-4 border-red-600 p-4 rounded-sm">
              <p className="text-sm font-bold text-gray-900">
                Test {test.testNumber}: {test.description}
              </p>
              <p className="text-sm text-red-800 mt-2 font-semibold">
                Test failed at points: <span className="font-bold">{test.failedPoints.join(', ')}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-sm">
          <p className="text-sm font-semibold text-green-900">
            ✓ All tests passed. Process appears to be in control.
          </p>
        </div>
      )}
    </div>
  )
}
