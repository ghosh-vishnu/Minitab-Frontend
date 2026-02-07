import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface MultipleGraphsDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (config: { sameY: boolean }) => void
  currentConfig?: { sameY?: boolean }
}

export const MultipleGraphsDialog: React.FC<MultipleGraphsDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  currentConfig,
}) => {
  const [sameY, setSameY] = useState<boolean>(currentConfig?.sameY || false)

  useEffect(() => {
    if (currentConfig) {
      setSameY(currentConfig.sameY || false)
    } else {
      setSameY(false)
    }
  }, [currentConfig, isOpen])

  const handleOK = () => {
    onApply({ sameY })
    onClose()
  }

  const handleCancel = () => {
    if (currentConfig) {
      setSameY(currentConfig.sameY || false)
    } else {
      setSameY(false)
    }
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={handleCancel}
      >
        {/* Dialog */}
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-lg font-semibold">Individuals Chart: Multiple Graphs</h2>
            <button
              onClick={handleCancel}
              className="text-white hover:text-gray-200 transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Scales for Different Variables</h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameY}
                  onChange={(e) => setSameY(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Same Y</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-6 py-4 rounded-b-lg flex justify-between items-center border-t border-gray-300">
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Help
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOK}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
