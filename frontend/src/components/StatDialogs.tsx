import React from 'react'
import { useDialog } from '../context/DialogContext'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
}

const BaseDialog: React.FC<DialogProps & { children: React.ReactNode }> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">{children}</div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 flex gap-3 justify-end bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Descriptive Statistics Dialog
export const DescriptiveStatsDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog()
  const isOpen = activeDialog === 'descriptive-stats'

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={closeDialog}
      title="Display Descriptive Statistics"
      description="Calculate descriptive statistics for selected variables"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Variables</label>
          <select
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            size={4}
          >
            <option selected>Column A</option>
            <option>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Mean</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>StDev</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Minimum</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Maximum</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              <span>Median</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              <span>Q1</span>
            </label>
          </div>
        </div>
      </div>
    </BaseDialog>
  )
}

// Regression Dialog
export const RegressionDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog()
  const isOpen = activeDialog === 'regression'

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={closeDialog}
      title="Regression"
      description="Fit a linear or multiple regression model"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Response (Y)</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option>Select response variable...</option>
            <option>Column A</option>
            <option>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Predictors (X)</label>
          <select
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            size={4}
          >
            <option>Column A</option>
            <option selected>Column B</option>
            <option selected>Column C</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Use Ctrl+Click to select multiple predictors</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            <span>Include constant term</span>
          </label>
        </div>
      </div>
    </BaseDialog>
  )
}

// ANOVA One-Way Dialog
export const AnovaOneWayDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog()
  const isOpen = activeDialog === 'anova-one-way'

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={closeDialog}
      title="One-Way ANOVA"
      description="Perform one-way analysis of variance"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Response (Y)</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option>Select response variable...</option>
            <option>Column A</option>
            <option>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Factor</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option>Select factor...</option>
            <option>Column A</option>
            <option>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Level</label>
          <input
            type="number"
            defaultValue={95}
            min={0}
            max={100}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </BaseDialog>
  )
}

// Xbar-R Chart Dialog
export const XbarRChartDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog()
  const isOpen = activeDialog === 'xbar-r-chart'

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={closeDialog}
      title="Xbar-R Control Chart"
      description="Create a variables control chart for subgroups"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">All observations in one column</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option>Select variable...</option>
            <option>Column A</option>
            <option>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subgroup size</label>
          <input
            type="number"
            defaultValue={5}
            min={1}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Options</label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            <span>Use box Cox transformation</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            <span>Use moving range of length 2</span>
          </label>
        </div>
      </div>
    </BaseDialog>
  )
}

// Correlation Dialog
export const CorrelationDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog()
  const isOpen = activeDialog === 'correlation'

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={closeDialog}
      title="Correlation"
      description="Calculate Pearson correlation coefficients"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Variables</label>
          <select
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            size={4}
          >
            <option selected>Column A</option>
            <option selected>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="method" defaultChecked className="rounded" />
              <span>Pearson</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="method" className="rounded" />
              <span>Spearman</span>
            </label>
          </div>
        </div>
      </div>
    </BaseDialog>
  )
}

// Tally Dialog
export const TallyDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog()
  const isOpen = activeDialog === 'tally'

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={closeDialog}
      title="Tally"
      description="Count occurrences of unique values"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Variables</label>
          <select
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            size={4}
          >
            <option selected>Column A</option>
            <option>Column B</option>
            <option>Column C</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Display</label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            <span>Counts</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            <span>Percents</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded" />
            <span>Cumulative counts</span>
          </label>
        </div>
      </div>
    </BaseDialog>
  )
}

// Combined Dialog Container
export const DialogContainer: React.FC = () => {
  return (
    <>
      <DescriptiveStatsDialog />
      <RegressionDialog />
      <AnovaOneWayDialog />
      <XbarRChartDialog />
      <CorrelationDialog />
      <TallyDialog />
    </>
  )
}
