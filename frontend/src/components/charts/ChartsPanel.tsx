import React from 'react'
import { IChartComponent } from './IChartComponent'

interface ColumnChartData {
  columnId: string
  columnName: string
  values: number[]
  xScaleType?: 'index' | 'stamp'
  stampColumn?: string
  axesConfig?: {
    xAxisLabel?: string
    yAxisLabel?: string
    // Y Scale checkboxes
    yScaleAxisLineLow?: boolean
    yScaleAxisLineHigh?: boolean
    yScaleMajorTicksLow?: boolean
    yScaleMajorTicksHigh?: boolean
    yScaleMajorTickLabelsLow?: boolean
    yScaleMajorTickLabelsHigh?: boolean
    yScaleMinorTicksLow?: boolean
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
}

interface ChartsPanelProps {
  chartData: ColumnChartData[]
  onClose?: () => void
  cells?: Array<{ row_index: number; column_index: number; value: any }>
  onEditChart?: (columnId: string, scaleConfig?: any, labelsConfig?: any) => void
  columnCount?: number
  rowCount?: number
  onScaleConfigChange?: (columnId: string, config: any) => void
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ chartData, onClose, cells, onEditChart, columnCount, rowCount, onScaleConfigChange }) => {
  if (chartData.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg p-8 border border-gray-200 text-center">
        <p className="text-gray-500">No charts to display</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Individuals Charts</h2>
          <p className="text-sm text-gray-600 mt-1">
            {chartData.length} chart{chartData.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartData.map((data) => {
          console.log('[ChartsPanel] Passing labelsConfig to chart:', data.columnId, data.labelsConfig)
          return (
            <IChartComponent
              key={data.columnId}
              columnId={data.columnId}
              columnName={data.columnName}
              values={data.values}
              xScaleType={data.xScaleType}
              stampColumn={data.stampColumn}
              cells={cells}
              axesConfig={data.axesConfig}
              labelsConfig={data.labelsConfig}
              onEditChart={() => {
                if (onEditChart) {
                  onEditChart(
                    data.columnId,
                    {
                      xScaleType: data.xScaleType,
                      stampColumn: data.stampColumn,
                      axesConfig: data.axesConfig,
                    },
                    data.labelsConfig
                  )
                }
              }}
              columnCount={columnCount}
              rowCount={rowCount}
              onScaleConfigChange={(config) => {
                if (onScaleConfigChange) {
                  onScaleConfigChange(data.columnId, config)
                }
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
