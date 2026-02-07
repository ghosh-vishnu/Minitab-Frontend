import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface LabelsDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (config: {
    title?: string
    subtitle1?: string
    subtitle2?: string
    footnote1?: string
    footnote2?: string
  }) => void
  currentConfig?: {
    title?: string
    subtitle1?: string
    subtitle2?: string
    footnote1?: string
    footnote2?: string
  }
}

export const LabelsDialog: React.FC<LabelsDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  currentConfig,
}) => {
  const [title, setTitle] = useState<string>(currentConfig?.title || '')
  const [subtitle1, setSubtitle1] = useState<string>(currentConfig?.subtitle1 || '')
  const [subtitle2, setSubtitle2] = useState<string>(currentConfig?.subtitle2 || '')
  const [footnote1, setFootnote1] = useState<string>(currentConfig?.footnote1 || '')
  const [footnote2, setFootnote2] = useState<string>(currentConfig?.footnote2 || '')

  useEffect(() => {
    if (currentConfig) {
      setTitle(currentConfig.title || '')
      setSubtitle1(currentConfig.subtitle1 || '')
      setSubtitle2(currentConfig.subtitle2 || '')
      setFootnote1(currentConfig.footnote1 || '')
      setFootnote2(currentConfig.footnote2 || '')
    } else {
      // Reset to defaults
      setTitle('')
      setSubtitle1('')
      setSubtitle2('')
      setFootnote1('')
      setFootnote2('')
    }
  }, [currentConfig])

  const handleOK = () => {
    const labelsConfig: any = {}
    // Include all values, even if empty string (trim first)
    if (title?.trim()) labelsConfig.title = title.trim()
    if (subtitle1?.trim()) labelsConfig.subtitle1 = subtitle1.trim()
    if (subtitle2?.trim()) labelsConfig.subtitle2 = subtitle2.trim()
    if (footnote1?.trim()) labelsConfig.footnote1 = footnote1.trim()
    if (footnote2?.trim()) labelsConfig.footnote2 = footnote2.trim()

    console.log('[LabelsDialog] Applying labelsConfig:', labelsConfig)
    onApply(labelsConfig)
    onClose()
  }

  const handleCancel = () => {
    // Reset to current config
    if (currentConfig) {
      setTitle(currentConfig.title || '')
      setSubtitle1(currentConfig.subtitle1 || '')
      setSubtitle2(currentConfig.subtitle2 || '')
      setFootnote1(currentConfig.footnote1 || '')
      setFootnote2(currentConfig.footnote2 || '')
    } else {
      setTitle('')
      setSubtitle1('')
      setSubtitle2('')
      setFootnote1('')
      setFootnote2('')
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
            <h2 className="text-lg font-semibold">Individuals Chart: Labels</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Line Chart"
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle 1:
              </label>
              <input
                type="text"
                value={subtitle1}
                onChange={(e) => setSubtitle1(e.target.value)}
                placeholder="e.g., a"
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle 2:
              </label>
              <input
                type="text"
                value={subtitle2}
                onChange={(e) => setSubtitle2(e.target.value)}
                placeholder="e.g., b"
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footnote 1:
              </label>
              <input
                type="text"
                value={footnote1}
                onChange={(e) => setFootnote1(e.target.value)}
                placeholder="e.g., x"
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footnote 2:
              </label>
              <input
                type="text"
                value={footnote2}
                onChange={(e) => setFootnote2(e.target.value)}
                placeholder="e.g., y"
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
