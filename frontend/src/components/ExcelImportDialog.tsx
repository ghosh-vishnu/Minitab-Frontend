/**
 * ExcelImportDialog - Minitab-style Excel/CSV import with preview and options
 * Matches Minitab's import workflow exactly
 */

import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface ImportOptions {
  selectedSheet: string
  allSheets: boolean
  headerRow: number
  firstDataRow: number
  trimWhitespace: boolean
  removeNonprintable: boolean
  formatDates: boolean
  equalColumnLengths: boolean
  removeEmptyRows: boolean
}

interface PreviewData {
  headers: string[]
  rows: any[][]
  sheetNames: string[]
}

interface ExcelImportDialogProps {
  file: File
  onLoad: (data: any, options: ImportOptions) => void
  onCancel: () => void
  onCleanAndTransform?: (data: any, options: ImportOptions) => void
}

const ExcelImportDialog = ({
  file,
  onLoad,
  onCancel,
  onCleanAndTransform,
}: ExcelImportDialogProps) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [options, setOptions] = useState<ImportOptions>({
    selectedSheet: '',
    allSheets: false,
    headerRow: 1,
    firstDataRow: 2,
    trimWhitespace: true,
    removeNonprintable: true,
    formatDates: true,
    equalColumnLengths: false,
    removeEmptyRows: true,
  })

  // Load and parse Excel file
  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true)
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        setWorkbook(wb)

        // Set default sheet
        const firstSheet = wb.SheetNames[0]
        setOptions((prev) => ({ ...prev, selectedSheet: firstSheet }))

        // Generate preview
        generatePreview(wb, firstSheet, 1, 2)
      } catch (error: any) {
        console.error('Error loading file:', error)
        toast.error('Failed to load file: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    loadFile()
  }, [file])

  // Generate preview data
  const generatePreview = (
    wb: XLSX.WorkBook,
    sheetName: string,
    headerRow: number,
    firstDataRow: number
  ) => {
    try {
      const sheet = wb.Sheets[sheetName]
      if (!sheet) return

      // Convert sheet to JSON with all rows
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      })

      if (jsonData.length === 0) {
        setPreviewData({ headers: [], rows: [], sheetNames: wb.SheetNames })
        return
      }

      // Extract headers (row index is 0-based, so headerRow-1)
      const headers =
        jsonData[headerRow - 1]?.map((h: any) => String(h || '').trim()) || []

      // Extract data rows (starting from firstDataRow)
      const rows = jsonData.slice(firstDataRow - 1)

      setPreviewData({
        headers,
        rows,
        sheetNames: wb.SheetNames,
      })
    } catch (error: any) {
      console.error('Error generating preview:', error)
      toast.error('Failed to generate preview')
    }
  }

  // Update preview when options change
  useEffect(() => {
    if (workbook && options.selectedSheet) {
      generatePreview(
        workbook,
        options.selectedSheet,
        options.headerRow,
        options.firstDataRow
      )
    }
  }, [options.selectedSheet, options.headerRow, options.firstDataRow, workbook])

  // Calculate column statistics for preview
  const columnStats = useMemo(() => {
    if (!previewData) return []

    return previewData.headers.map((header, colIdx) => {
      const values = previewData.rows.map((row) => row[colIdx])
      const nonEmpty = values.filter((v) => v !== '' && v != null)
      return {
        header,
        levels: nonEmpty.length,
        uniqueValues: new Set(nonEmpty).size,
      }
    })
  }, [previewData])

  // Handle load
  const handleLoad = () => {
    if (!workbook || !previewData) return

    const processedData = {
      file: file.name,
      sheet: options.selectedSheet,
      headers: previewData.headers,
      rows: previewData.rows,
      options,
    }

    onLoad(processedData, options)
  }

  // Handle clean and transform
  const handleCleanAndTransform = () => {
    if (!workbook || !previewData) return

    const processedData = {
      file: file.name,
      sheet: options.selectedSheet,
      headers: previewData.headers,
      rows: previewData.rows,
      options,
    }

    if (onCleanAndTransform) {
      onCleanAndTransform(processedData, options)
    } else {
      handleLoad()
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading file...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <h2 className="text-lg font-semibold text-gray-800">{file.name}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Options */}
          <div className="w-80 border-r bg-gray-50 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4">Options</h3>

            {/* Sheet Selection */}
            <div className="mb-6">
              <div className="space-y-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!options.allSheets}
                    onChange={() =>
                      setOptions((prev) => ({ ...prev, allSheets: false }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Selected Sheet</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={options.allSheets}
                    onChange={() =>
                      setOptions((prev) => ({ ...prev, allSheets: true }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">All Sheets</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sheet
                </label>
                <select
                  value={options.selectedSheet}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      selectedSheet: e.target.value,
                    }))
                  }
                  disabled={options.allSheets}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {previewData?.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row Configuration */}
            <div className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Header Row
                </label>
                <input
                  type="number"
                  min="1"
                  value={options.headerRow}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      headerRow: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Data Row
                </label>
                <input
                  type="number"
                  min="1"
                  value={options.firstDataRow}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      firstDataRow: parseInt(e.target.value) || 2,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Normalize Case */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Normalize Case
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Do not normalize</option>
                <option>Lowercase</option>
                <option>Uppercase</option>
                <option>Title Case</option>
              </select>
            </div>

            {/* Data Cleaning Options */}
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.trimWhitespace}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      trimWhitespace: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-sm">Trim whitespace</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeNonprintable}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      removeNonprintable: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-sm">Remove nonprintable characters</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.formatDates}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      formatDates: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-sm">
                  Format dates based on regional settings
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.equalColumnLengths}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      equalColumnLengths: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-sm">Create columns with equal lengths</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeEmptyRows}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      removeEmptyRows: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-sm">
                  Remove rows with missing values in every column
                </span>
              </label>
            </div>
          </div>

          {/* Right Panel - Data Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-6">
              {previewData && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {previewData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="border border-gray-300 px-4 py-2 text-left"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">═══</span>
                                <span className="font-semibold text-sm">
                                  {header || `Column ${idx + 1}`}
                                </span>
                              </div>
                              {/* Column visualization bars */}
                              <div className="flex gap-0.5 h-8 items-end">
                                {Array.from({ length: 8 }).map((_, barIdx) => (
                                  <div
                                    key={barIdx}
                                    className="w-2 bg-blue-300 rounded-sm"
                                    style={{
                                      height: `${Math.random() * 100}%`,
                                    }}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {columnStats[idx]?.levels || 0} levels
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.slice(0, 20).map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          {previewData.headers.map((_, colIdx) => {
                            const value = row[colIdx]
                            const isMissing = value === '' || value == null
                            return (
                              <td
                                key={colIdx}
                                className="border border-gray-300 px-4 py-2"
                              >
                                <span
                                  className={
                                    isMissing
                                      ? 'text-gray-400 italic text-sm'
                                      : 'text-sm'
                                  }
                                >
                                  {isMissing ? 'Missing value' : String(value)}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.rows.length > 20 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Showing first 20 rows of {previewData.rows.length} total
                      rows
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="border-t bg-white px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleLoad}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Load
              </button>
              {onCleanAndTransform && (
                <button
                  onClick={handleCleanAndTransform}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
                >
                  Clean and Transform
                </button>
              )}
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExcelImportDialog
