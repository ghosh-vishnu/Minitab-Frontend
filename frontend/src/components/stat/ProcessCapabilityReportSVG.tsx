import React, { useMemo, useState, useRef, useEffect } from 'react'
import { CapabilityResult } from '../../utils/capabilityNormal'
import toast from 'react-hot-toast'

interface ProcessCapabilityReportSVGProps {
  result: CapabilityResult
  onEdit?: () => void
}

const fmt = (x: number | null, digits = 3): string => {
  if (x == null || Number.isNaN(x)) return 'NA'
  return x.toFixed(digits)
}

export const ProcessCapabilityReportSVG: React.FC<ProcessCapabilityReportSVGProps> = ({ result, onEdit }) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    input,
    mean,
    n,
    sigma,
    cp,
    cpl,
    cpu,
    cpk,
    pp,
    ppl,
    ppu,
    ppk,
    cpm,
    ppmTable,
    histogram,
  } = result
  const { lsl, usl, columnId } = input
  const { bins, domain } = histogram
  const [minX, maxX] = domain

  // SVG dimensions
  const svgWidth = 900
  const svgHeight = 600

  // Layout constants
  const titleY = 25
  const graphLeft = 70
  const graphRight = 585 // ~65% of width
  const graphTop = 50
  const graphBottom = 350
  const graphWidth = graphRight - graphLeft
  const graphHeight = graphBottom - graphTop
  const rightPanelLeft = 600
  const rightPanelWidth = 280
  const performanceTableTop = 370
  const footerY = 580

  // Calculate Y-axis domain
  const maxFrequency = Math.max(...bins.map(b => b.count))
  const yMax = Math.ceil(maxFrequency * 1.1)

  // Scale functions
  const scaleX = (x: number) => graphLeft + ((x - minX) / (maxX - minX)) * graphWidth
  const scaleY = (y: number) => graphBottom - (y / yMax) * graphHeight

  // Generate smooth curve points
  const curvePoints = useMemo(() => {
    const points: number[] = []
    const step = (maxX - minX) / 300
    for (let x = minX; x <= maxX; x += step) {
      points.push(x)
    }
    return points
  }, [minX, maxX])

  // Build overall curve path
  const overallCurvePath = useMemo(() => {
    const binWidth = (maxX - minX) / bins.length
    const points = curvePoints.map(x => {
      const pdf = (1 / (sigma.overall * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((x - mean) / sigma.overall) ** 2)
      const y = pdf * binWidth * n
      return { x, y }
    })
    const scaleXFunc = (x: number) => graphLeft + ((x - minX) / (maxX - minX)) * graphWidth
    const scaleYFunc = (y: number) => graphBottom - (y / yMax) * graphHeight
    return points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${scaleXFunc(p.x)} ${scaleYFunc(p.y)}`
    ).join(' ')
  }, [curvePoints, mean, sigma.overall, n, bins.length, maxX, minX, graphLeft, graphWidth, graphBottom, graphHeight, yMax])

  // Build within curve path
  const withinCurvePath = useMemo(() => {
    const binWidth = (maxX - minX) / bins.length
    const points = curvePoints.map(x => {
      const pdf = (1 / (sigma.within * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((x - mean) / sigma.within) ** 2)
      const y = pdf * binWidth * n
      return { x, y }
    })
    const scaleXFunc = (x: number) => graphLeft + ((x - minX) / (maxX - minX)) * graphWidth
    const scaleYFunc = (y: number) => graphBottom - (y / yMax) * graphHeight
    return points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${scaleXFunc(p.x)} ${scaleYFunc(p.y)}`
    ).join(' ')
  }, [curvePoints, mean, sigma.within, n, bins.length, maxX, minX, graphLeft, graphWidth, graphBottom, graphHeight, yMax])

  // Generate X-axis ticks
  const xTicks = useMemo(() => {
    const range = maxX - minX
    let step = range / 6
    const exponent = Math.floor(Math.log10(step))
    const mantissa = step / Math.pow(10, exponent)
    let cleanMantissa = 1
    if (mantissa > 5) cleanMantissa = 10
    else if (mantissa > 2.5) cleanMantissa = 5
    else if (mantissa > 1.5) cleanMantissa = 2
    step = cleanMantissa * Math.pow(10, exponent)
    
    const ticks: number[] = []
    let tickValue = Math.floor(minX / step) * step
    while (tickValue <= maxX + step * 0.01) {
      if (tickValue >= minX - step * 0.01) {
        ticks.push(parseFloat(tickValue.toFixed(2)))
      }
      tickValue += step
    }
    return ticks.length > 0 ? ticks : [minX, maxX]
  }, [minX, maxX])

  // Generate Y-axis ticks
  const yTicks = useMemo(() => {
    const range = yMax
    let step = range / 5
    const exponent = Math.floor(Math.log10(step))
    const mantissa = step / Math.pow(10, exponent)
    let cleanMantissa = 1
    if (mantissa > 2.5) cleanMantissa = 5
    else if (mantissa > 1.5) cleanMantissa = 2
    step = cleanMantissa * Math.pow(10, exponent)
    
    const ticks: number[] = []
    let tickValue = 0
    while (tickValue <= yMax + step * 0.01) {
      ticks.push(parseFloat(tickValue.toFixed(10)))
      tickValue += step
    }
    return ticks.length > 0 ? ticks : [0, yMax]
  }, [yMax])

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

  // Copy graph to clipboard
  const handleCopyGraph = async () => {
    try {
      if (!svgRef.current) {
        toast.error('Graph element not found')
        return
      }

      // Dynamic import html2canvas
      const html2canvas = (await import('html2canvas')).default

      // Convert SVG to canvas
      const canvas = await html2canvas(svgRef.current.parentElement as HTMLElement, {
        backgroundColor: 'white',
        scale: 2,
        logging: false,
      })

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to copy graph')
          return
        }

        // Copy to clipboard
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
          toast.success('Graph copied to clipboard!')
          setShowDropdown(false)
        }).catch(() => {
          toast.error('Failed to copy graph to clipboard')
        })
      }, 'image/png')
    } catch (error) {
      console.error('Error copying graph:', error)
      toast.error('Failed to copy graph')
    }
  }

  // Handle edit
  const handleEdit = () => {
    if (onEdit) {
      onEdit()
      setShowDropdown(false)
    }
  }

  return (
    <div className="w-full flex justify-center bg-white p-2 relative">
      {/* Dropdown Menu - Top Right Corner */}
      <div className="absolute top-4 right-4 z-10" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-md hover:bg-gray-100 border border-gray-300 bg-white shadow-sm transition-colors"
          title="Options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
            <button
              onClick={handleEdit}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
            <button
              onClick={handleCopyGraph}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Graph
            </button>
          </div>
        )}
      </div>

      <svg ref={svgRef} width={svgWidth} height={svgHeight} style={{ border: '1px solid #d1d5db', backgroundColor: 'white' }}>
        {/* Title */}
        <text
          x={svgWidth / 2}
          y={titleY}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#1f2937"
        >
          Process Capability Report for {columnId}
        </text>

        {/* Graph Background */}
        <rect
          x={graphLeft}
          y={graphTop}
          width={graphWidth}
          height={graphHeight}
          fill="white"
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* Grid Lines - horizontal only (Minitab style) */}
        {yTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={graphLeft}
            y1={scaleY(tick)}
            x2={graphRight}
            y2={scaleY(tick)}
            stroke="#d1d5db"
            strokeWidth="0.5"
            strokeDasharray="3 3"
            opacity="0.8"
          />
        ))}

        {/* Histogram Bars - Light Blue, with small gaps (Minitab style) */}
        {bins.map((bin, idx) => {
          const x0 = scaleX(bin.x0)
          const x1 = scaleX(bin.x1)
          const binWidth = x1 - x0
          // Add small gap between bars (2% of bin width) - Minitab style
          const gap = binWidth * 0.02
          const barWidth = binWidth - gap
          const barHeight = (bin.count / yMax) * graphHeight
          return (
            <rect
              key={`bar-${idx}`}
              x={x0 + gap / 2}
              y={scaleY(bin.count)}
              width={barWidth}
              height={barHeight}
              fill="#60a5fa"
              stroke="none"
            />
          )
        })}

        {/* Overall Curve (solid red) */}
        <path
          d={overallCurvePath}
          fill="none"
          stroke="#dc2626"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Within Curve (dashed black) */}
        <path
          d={withinCurvePath}
          fill="none"
          stroke="#111827"
          strokeWidth="2.5"
          strokeDasharray="5 5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* LSL Line */}
        <line
          x1={scaleX(lsl)}
          y1={graphTop}
          x2={scaleX(lsl)}
          y2={graphBottom}
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x={scaleX(lsl)}
          y={graphTop - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#dc2626"
        >
          LSL
        </text>

        {/* USL Line */}
        <line
          x1={scaleX(usl)}
          y1={graphTop}
          x2={scaleX(usl)}
          y2={graphBottom}
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x={scaleX(usl)}
          y={graphTop - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#dc2626"
        >
          USL
        </text>

        {/* Mean Line (thin grey dashed, Minitab style) */}
        <line
          x1={scaleX(mean)}
          y1={graphTop}
          x2={scaleX(mean)}
          y2={graphBottom}
          stroke="#777777"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.7"
        />

        {/* X-Axis */}
        <line
          x1={graphLeft}
          y1={graphBottom}
          x2={graphRight}
          y2={graphBottom}
          stroke="#374151"
          strokeWidth="1"
        />
        {xTicks.map((tick) => {
          const x = scaleX(tick)
          return (
            <g key={`x-tick-${tick}`}>
              <line
                x1={x}
                y1={graphBottom}
                x2={x}
                y2={graphBottom + 5}
                stroke="#374151"
                strokeWidth="1"
              />
              <text
                x={x}
                y={graphBottom + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#374151"
                transform={`rotate(-15 ${x} ${graphBottom + 20})`}
              >
                {tick.toFixed(2)}
              </text>
            </g>
          )
        })}
        <text
          x={(graphLeft + graphRight) / 2}
          y={graphBottom + 40}
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          fill="#374151"
        >
          Value
        </text>

        {/* Y-Axis */}
        <line
          x1={graphLeft}
          y1={graphTop}
          x2={graphLeft}
          y2={graphBottom}
          stroke="#374151"
          strokeWidth="1"
        />
        {yTicks.map((tick) => {
          const y = scaleY(tick)
          return (
            <g key={`y-tick-${tick}`}>
              <line
                x1={graphLeft}
                y1={y}
                x2={graphLeft - 5}
                y2={y}
                stroke="#374151"
                strokeWidth="1"
              />
              <text
                x={graphLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#374151"
              >
                {tick.toFixed(0)}
              </text>
            </g>
          )
        })}
        <text
          x={graphLeft - 30}
          y={(graphTop + graphBottom) / 2}
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          fill="#374151"
          transform={`rotate(-90 ${graphLeft - 30} ${(graphTop + graphBottom) / 2})`}
        >
          Frequency
        </text>

        {/* Legend - inside plot, top-right */}
        <g transform={`translate(${graphRight - 110}, ${graphTop + 12})`}>
          <line x1="0" y1="6" x2="20" y2="6" stroke="#dc2626" strokeWidth="2" />
          <text x="25" y="10" fontSize="12" fill="#374151">Overall</text>
          <line x1="0" y1="22" x2="20" y2="22" stroke="#111827" strokeWidth="2" strokeDasharray="5 5" />
          <text x="25" y="26" fontSize="12" fill="#374151">Within</text>
        </g>

        {/* Right Panel - Process Data */}
        <g transform={`translate(${rightPanelLeft}, ${graphTop})`}>
          <text x="0" y="15" fontSize="13" fontWeight="bold" fill="#1f2937">Process Data</text>
          <line x1="0" y1="20" x2={rightPanelWidth} y2="20" stroke="#e5e7eb" strokeWidth="1" />
          
          <text x="0" y="40" fontSize="11" fill="#374151">LSL</text>
          <text x={rightPanelWidth} y="40" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(lsl, 2)}</text>
          
          <text x="0" y="57" fontSize="11" fill="#374151">Target</text>
          <text x={rightPanelWidth} y="57" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">*</text>
          
          <text x="0" y="74" fontSize="11" fill="#374151">USL</text>
          <text x={rightPanelWidth} y="74" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(usl, 2)}</text>
          
          <text x="0" y="91" fontSize="11" fill="#374151">Sample Mean</text>
          <text x={rightPanelWidth} y="91" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(mean, 3)}</text>
          
          <text x="0" y="108" fontSize="11" fill="#374151">Sample N</text>
          <text x={rightPanelWidth} y="108" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{n}</text>
          
          <text x="0" y="125" fontSize="11" fill="#374151">StDev (Overall)</text>
          <text x={rightPanelWidth} y="125" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(sigma.overall, 6)}</text>
          
          <text x="0" y="142" fontSize="11" fill="#374151">StDev (Within)</text>
          <text x={rightPanelWidth} y="142" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(sigma.within, 6)}</text>
        </g>

        {/* Right Panel - Overall Capability */}
        <g transform={`translate(${rightPanelLeft}, ${graphTop + 165})`}>
          <text x="0" y="15" fontSize="13" fontWeight="bold" fill="#1f2937">Overall Capability</text>
          <line x1="0" y1="20" x2={rightPanelWidth} y2="20" stroke="#e5e7eb" strokeWidth="1" />
          
          <text x="0" y="40" fontSize="11" fill="#374151">Pp</text>
          <text x={rightPanelWidth} y="40" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(pp, 2)}</text>
          
          <text x="0" y="57" fontSize="11" fill="#374151">PPL</text>
          <text x={rightPanelWidth} y="57" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(ppl, 2)}</text>
          
          <text x="0" y="74" fontSize="11" fill="#374151">PPU</text>
          <text x={rightPanelWidth} y="74" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(ppu, 2)}</text>
          
          <text x="0" y="91" fontSize="11" fill="#374151">Ppk</text>
          <text x={rightPanelWidth} y="91" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(ppk, 2)}</text>
          
          <text x="0" y="108" fontSize="11" fill="#374151">Cpm</text>
          <text x={rightPanelWidth} y="108" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(cpm)}</text>
        </g>

        {/* Right Panel - Potential (Within) Capability */}
        <g transform={`translate(${rightPanelLeft}, ${graphTop + 285})`}>
          <text x="0" y="15" fontSize="13" fontWeight="bold" fill="#1f2937">Potential (Within) Capability</text>
          <line x1="0" y1="20" x2={rightPanelWidth} y2="20" stroke="#e5e7eb" strokeWidth="1" />
          
          <text x="0" y="40" fontSize="11" fill="#374151">Cp</text>
          <text x={rightPanelWidth} y="40" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{Number.isNaN(cp) ? '*' : fmt(cp, 2)}</text>
          
          <text x="0" y="57" fontSize="11" fill="#374151">CPL</text>
          <text x={rightPanelWidth} y="57" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{Number.isNaN(cpl) ? '*' : fmt(cpl, 2)}</text>
          
          <text x="0" y="74" fontSize="11" fill="#374151">CPU</text>
          <text x={rightPanelWidth} y="74" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{Number.isNaN(cpu) ? '*' : fmt(cpu, 2)}</text>
          
          <text x="0" y="91" fontSize="11" fill="#374151">Cpk</text>
          <text x={rightPanelWidth} y="91" fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{Number.isNaN(cpk) ? '*' : fmt(cpk, 2)}</text>
        </g>

        {/* Performance Table */}
        <g transform={`translate(${graphLeft}, ${performanceTableTop})`}>
          <text x="0" y="15" fontSize="13" fontWeight="bold" fill="#1f2937">Performance</text>
          <line x1="0" y1="20" x2={graphWidth + rightPanelWidth} y2="20" stroke="#e5e7eb" strokeWidth="1" />
          
          {/* Table Header */}
          <line x1="0" y1="40" x2={graphWidth + rightPanelWidth} y2="40" stroke="#e5e7eb" strokeWidth="1" />
          <text x="0" y="55" fontSize="11" fontWeight="bold" fill="#374151"></text>
          <text x="150" y="55" fontSize="11" fontWeight="bold" fill="#374151" textAnchor="end">Observed</text>
          <text x="280" y="55" fontSize="11" fontWeight="bold" fill="#374151" textAnchor="end">Expected Overall</text>
          <text x="410" y="55" fontSize="11" fontWeight="bold" fill="#374151" textAnchor="end">Expected Within</text>
          
          {/* Table Rows */}
          {ppmTable.map((row, idx) => {
            const y = 75 + idx * 20
            return (
              <g key={row.label}>
                <line x1="0" y1={y - 5} x2={graphWidth + rightPanelWidth} y2={y - 5} stroke="#e5e7eb" strokeWidth="1" />
                <text x="0" y={y + 5} fontSize="11" fill="#374151">{row.label}</text>
                <text x="150" y={y + 5} fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(row.observed, 2)}</text>
                <text x="280" y={y + 5} fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{fmt(row.expectedOverall, 2)}</text>
                <text x="410" y={y + 5} fontSize="11" fill="#374151" textAnchor="end" fontFamily="monospace">{Number.isNaN(row.expectedWithin) ? '*' : fmt(row.expectedWithin, 2)}</text>
              </g>
            )
          })}
        </g>

        {/* Footer */}
        <text
          x={graphLeft}
          y={footerY}
          fontSize="10"
          fontStyle="italic"
          fill="#6b7280"
        >
          The actual process spread is represented by 6 sigma.
        </text>
      </svg>
    </div>
  )
}
