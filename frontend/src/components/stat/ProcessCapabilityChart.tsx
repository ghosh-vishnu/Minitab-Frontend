import React, { useMemo } from 'react'
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CapabilityResult } from '../../utils/capabilityNormal'

interface ProcessCapabilityChartProps {
  result: CapabilityResult
}

// Generate clean Y-axis ticks similar to Minitab
function generateYAxisTicks(min: number, max: number): number[] {
  const range = max - min
  if (range === 0) return [min]
  
  // Calculate ideal step (5-8 ticks)
  let step = range / 5
  
  // Round step to a clean number (1, 2, 5, 10, 20, 50, etc.)
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
      ticks.push(parseFloat(tickValue.toFixed(10)))
    }
    tickValue += step
  }
  
  return ticks.length > 0 ? ticks : [min, max]
}

// Generate clean X-axis ticks
function generateXAxisTicks(min: number, max: number): number[] {
  const range = max - min
  if (range === 0) return [min]
  
  // Calculate ideal step (5-8 ticks)
  let step = range / 6
  
  // Round step to a clean number
  const exponent = Math.floor(Math.log10(step))
  const mantissa = step / Math.pow(10, exponent)
  
  let cleanMantissa = 1
  if (mantissa > 5) cleanMantissa = 10
  else if (mantissa > 2.5) cleanMantissa = 5
  else if (mantissa > 1.5) cleanMantissa = 2
  
  step = cleanMantissa * Math.pow(10, exponent)
  
  // Generate ticks
  const ticks: number[] = []
  let tickValue = Math.floor(min / step) * step
  
  while (tickValue <= max + step * 0.01) {
    if (tickValue >= min - step * 0.01) {
      ticks.push(parseFloat(tickValue.toFixed(2)))
    }
    tickValue += step
  }
  
  return ticks.length > 0 ? ticks : [min, max]
}

export const ProcessCapabilityChart: React.FC<ProcessCapabilityChartProps> = ({ result }) => {
  const { histogram, mean, sigma, input } = result
  const { lsl, usl } = input
  const { bins, domain } = histogram
  const [minX, maxX] = domain
  const n = result.n

  // Calculate Y-axis domain from histogram
  const maxFrequency = Math.max(...bins.map(b => b.count))
  const yMax = Math.ceil(maxFrequency * 1.1) // Add 10% padding

  // Generate more points for smoother curves
  const curvePoints = useMemo(() => {
    const points: number[] = []
    const step = (maxX - minX) / 200 // 200 points for smooth curve
    for (let x = minX; x <= maxX; x += step) {
      points.push(x)
    }
    return points
  }, [minX, maxX])

  // Build chart data: for each bin xMid, y=frequency, yOverallPdf, yWithinPdf
  const chartData = useMemo(() => {
    return bins.map(bin => {
      const xMid = (bin.x0 + bin.x1) / 2
      const binWidth = bin.x1 - bin.x0

      // Normal PDF for overall
      const pdfOverall =
        (1 / (sigma.overall * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((xMid - mean) / sigma.overall) ** 2)

      // Normal PDF for within
      const pdfWithin =
        (1 / (sigma.within * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((xMid - mean) / sigma.within) ** 2)

      // Scale PDFs so area ~ n (so curve matches histogram height visually)
      const overallCount = pdfOverall * binWidth * n
      const withinCount = pdfWithin * binWidth * n

      return {
        x: xMid,
        count: bin.count,
        overall: overallCount,
        within: withinCount,
      }
    })
  }, [bins, mean, sigma, n])

  // Build smooth curve data for normal distributions
  const curveData = useMemo(() => {
    return curvePoints.map(x => {
      const binWidth = (maxX - minX) / bins.length
      
      // Normal PDF for overall
      const pdfOverall =
        (1 / (sigma.overall * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((x - mean) / sigma.overall) ** 2)

      // Normal PDF for within
      const pdfWithin =
        (1 / (sigma.within * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((x - mean) / sigma.within) ** 2)

      // Scale PDFs
      const overallCount = pdfOverall * binWidth * n
      const withinCount = pdfWithin * binWidth * n

      return {
        x,
        overall: overallCount,
        within: withinCount,
      }
    })
  }, [curvePoints, mean, sigma, n, bins.length, maxX, minX])

  // Combine data: use histogram bins for bars, add curve points for smooth lines
  const combinedData = useMemo(() => {
    // Create a map to combine data
    const dataMap = new Map<number, { x: number; count: number; overall?: number; within?: number }>()
    
    // Add histogram data (bars)
    chartData.forEach(d => {
      dataMap.set(d.x, { x: d.x, count: d.count, overall: d.overall, within: d.within })
    })
    
    // Add smooth curve points
    curveData.forEach(d => {
      const roundedX = Math.round(d.x * 100) / 100 // Round to 2 decimals for matching
      if (!dataMap.has(roundedX)) {
        dataMap.set(roundedX, { x: d.x, count: 0, overall: d.overall, within: d.within })
      } else {
        // Update existing point with curve values
        const existing = dataMap.get(roundedX)!
        existing.overall = d.overall
        existing.within = d.within
      }
    })
    
    return Array.from(dataMap.values()).sort((a, b) => a.x - b.x)
  }, [chartData, curveData])

  const yTicks = generateYAxisTicks(0, yMax)
  const xTicks = generateXAxisTicks(minX, maxX)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={combinedData}
          margin={{ top: 50, right: 30, left: 50, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          
          {/* X-Axis */}
          <XAxis
            dataKey="x"
            type="number"
            domain={[minX, maxX]}
            ticks={xTicks}
            tickFormatter={(v) => v.toFixed(2)}
            angle={-15}
            tick={{ fontSize: 11, fill: '#374151' }}
            label={{ 
              value: 'Value', 
              position: 'insideBottom', 
              offset: -5,
              style: { textAnchor: 'middle', fontSize: 12, fill: '#374151', fontWeight: 500 }
            }}
            style={{ fontSize: '12px' }}
          />
          
          {/* Y-Axis */}
          <YAxis
            domain={[0, yMax]}
            ticks={yTicks}
            tick={{ fontSize: 11, fill: '#374151' }}
            label={{ 
              value: 'Frequency', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12, fill: '#374151', fontWeight: 500 }
            }}
            style={{ fontSize: '12px' }}
          />
          
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'count') return [value, 'Frequency']
              if (name === 'overall') return [value.toFixed(2), 'Overall']
              if (name === 'within') return [value.toFixed(2), 'Within']
              return [value, name]
            }}
            labelFormatter={(label) => `Value: ${Number(label).toFixed(2)}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '8px',
            }}
          />
          
          {/* Legend - positioned at top-right corner (Minitab style) */}
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingTop: '10px', paddingRight: '10px', fontSize: '12px', fontWeight: 400 }}
            content={({ payload }) => {
              // Filter to show only Overall and Within (hide Frequency)
              const filteredPayload = payload?.filter((entry: any) => 
                entry.dataKey === 'overall' || entry.dataKey === 'within'
              ) || []
              
              return (
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                  {filteredPayload.map((entry: any, index: number) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="20" height="12" style={{ overflow: 'visible' }}>
                        {entry.dataKey === 'overall' ? (
                          <line x1="0" y1="6" x2="20" y2="6" stroke={entry.color} strokeWidth="2" />
                        ) : (
                          <line x1="0" y1="6" x2="20" y2="6" stroke={entry.color} strokeWidth="2" strokeDasharray="5 5" />
                        )}
                      </svg>
                      <span style={{ fontSize: '12px', color: '#374151' }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              )
            }}
          />

          {/* Histogram bars - Blue (visible but not in legend) */}
          <Bar
            dataKey="count"
            name=""
            fill="#3b82f6"
            barSize={Math.max(12, (maxX - minX) / bins.length * 0.9)}
            radius={[0, 0, 0, 0]}
          />

          {/* Normal curves - smooth lines */}
          <Line
            type="monotone"
            dataKey="overall"
            name="Overall"
            stroke="#dc2626"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
            legendType="line"
          />
          <Line
            type="monotone"
            dataKey="within"
            name="Within"
            stroke="#111827"
            strokeDasharray="5 5"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
            legendType="line"
          />

          {/* Spec lines - Vertical dashed red lines */}
          <ReferenceLine
            x={lsl}
            stroke="#dc2626"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: 'LSL',
              position: 'top',
              fill: '#dc2626',
              fontSize: 11,
              fontWeight: 500,
              offset: 5,
            }}
          />
          <ReferenceLine
            x={usl}
            stroke="#dc2626"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: 'USL',
              position: 'top',
              fill: '#dc2626',
              fontSize: 11,
              fontWeight: 500,
              offset: 5,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
