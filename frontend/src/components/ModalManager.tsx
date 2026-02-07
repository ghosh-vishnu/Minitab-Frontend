import React from 'react'
import { useModal } from '../context/ModalContext'
import { IndividualsChartDialog } from './dialogs/IndividualsChartDialog'
import { CapabilityAnalysisNormalDialog } from './dialogs/CapabilityAnalysisNormalDialog'
import { Cell } from '../api/spreadsheets'
import { CapabilityResult } from '../utils/capabilityNormal'

interface ModalManagerProps {
  cells: Cell[]
  columnCount: number
  rowCount: number
  initialConfig?: {
    selectedColumn?: string
    scaleConfig?: {
      xScaleType: 'index' | 'stamp'
      stampColumn?: string
      axesConfig?: any
    }
    labelsConfig?: {
      title?: string
      subtitle1?: string
      subtitle2?: string
      footnote1?: string
      footnote2?: string
    }
  }
  onGenerateCharts?: (
    chartData: Array<{ columnId: string; columnName: string; values: number[] }>,
    selectionInfo: { isRange: boolean; firstColumn: string; lastColumn: string },
    scaleConfig?: any,
    labelsConfig?: any,
    multipleGraphsConfig?: { sameY?: boolean }
  ) => void
  onCapabilityReportReady?: (result: CapabilityResult) => void
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  cells,
  columnCount,
  rowCount,
  onGenerateCharts,
  initialConfig,
  onCapabilityReportReady,
}) => {
  const { activeModal } = useModal()

  // Only render if a modal is active
  if (!activeModal) return null

  return (
    <>
      {activeModal === 'INDIVIDUALS_CHART' && (
        <IndividualsChartDialog
          cells={cells}
          columnCount={columnCount}
          rowCount={rowCount}
          onGenerateCharts={onGenerateCharts}
          initialConfig={initialConfig}
        />
      )}
      {activeModal === 'CAPABILITY_ANALYSIS_NORMAL' && (
        <CapabilityAnalysisNormalDialog
          cells={cells}
          columnCount={columnCount}
          rowCount={rowCount}
          onReportReady={onCapabilityReportReady || (() => {})}
        />
      )}
    </>
  )
}
