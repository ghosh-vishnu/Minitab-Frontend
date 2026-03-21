/**
 * SheetTabs Component - Excel-like sheet tabs navigation
 * Features: Add sheet, rename sheet, delete sheet, switch sheets
 */

import { useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'

export interface Worksheet {
  id: string
  name: string
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SheetTabsProps {
  spreadsheetId: string
  worksheets: Worksheet[]
  activeWorksheet: Worksheet | null
  onSelectWorksheet: (worksheet: Worksheet) => void
  onAddWorksheet: (name: string) => Promise<Worksheet>
  onRenameWorksheet: (worksheetId: string, newName: string) => Promise<void>
  onDeleteWorksheet: (worksheetId: string) => Promise<void>
  rowCount?: number
  columnCount?: number
}

const SheetTabs = ({
  spreadsheetId: _spreadsheetId,
  worksheets,
  activeWorksheet,
  onSelectWorksheet,
  onAddWorksheet,
  onRenameWorksheet,
  onDeleteWorksheet,
  rowCount,
  columnCount,
}: SheetTabsProps) => {
  const [isRenaming, setIsRenaming] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showContextMenu, setShowContextMenu] = useState<{ worksheetId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!showContextMenu) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowContextMenu(null)
    }
    const handleResize = () => setShowContextMenu(null)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleResize)
    }
  }, [showContextMenu])

  const handleAddSheet = async () => {
    const sheetMatch = /^Sheet(\d+)$/i
    const numbers = worksheets
      .map((ws) => {
        const m = ws.name.match(sheetMatch)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => n > 0)
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
    const defaultName = `Sheet${maxNum + 1}`

    try {
      await onAddWorksheet(defaultName)
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to create sheet'
      toast.error(msg)
      console.error(error)
    }
  }

  const handleRename = useCallback(
    async (worksheetId: string) => {
      if (!newName.trim()) {
        setIsRenaming(null)
        return
      }

      try {
        await onRenameWorksheet(worksheetId, newName.trim())
        setIsRenaming(null)
        setNewName('')
        toast.success('Sheet renamed successfully')
      } catch (error: any) {
        if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
          toast.error('Sheet name already exists')
        } else {
          toast.error('Failed to rename sheet')
        }
        console.error(error)
      }
    },
    [newName, onRenameWorksheet]
  )

  const handleDelete = useCallback(
    async (worksheetId: string) => {
      if (worksheets.length <= 1) {
        toast.error('Cannot delete the last sheet')
        return
      }

      if (!confirm('Are you sure you want to delete this sheet?')) {
        return
      }

      try {
        await onDeleteWorksheet(worksheetId)
        setShowContextMenu(null)
        toast.success('Sheet deleted successfully')
      } catch (error) {
        toast.error('Failed to delete sheet')
        console.error(error)
      }
    },
    [worksheets.length, onDeleteWorksheet]
  )

  const MENU_WIDTH = 160
  const MENU_HEIGHT = 88
  const VIEWPORT_PADDING = 8

  const handleRightClick = (e: React.MouseEvent<HTMLElement>, worksheetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const clickX = e.clientX
    const clickY = e.clientY

    let x = clickX
    let y = clickY

    if (y + MENU_HEIGHT + VIEWPORT_PADDING > window.innerHeight) {
      y = clickY - MENU_HEIGHT
    }
    if (y < VIEWPORT_PADDING) y = VIEWPORT_PADDING

    if (x + MENU_WIDTH + VIEWPORT_PADDING > window.innerWidth) {
      x = window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING
    }
    if (x < VIEWPORT_PADDING) x = VIEWPORT_PADDING

    setShowContextMenu({
      worksheetId,
      x,
      y,
    })
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-white border-t border-slate-200 px-3 py-2 shrink-0 min-h-[40px] w-full overflow-x-auto overflow-y-hidden">
      {/* Sheet Tabs */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {worksheets.map((worksheet) => (
          <div key={worksheet.id} className="flex items-center flex-shrink-0">
            {isRenaming === worksheet.id ? (
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(worksheet.id)
                  else if (e.key === 'Escape') { setIsRenaming(null); setNewName('') }
                }}
                onBlur={() => handleRename(worksheet.id)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[80px]"
                placeholder="Sheet name"
              />
            ) : (
              <button
                onClick={() => onSelectWorksheet(worksheet)}
                onContextMenu={(e) => handleRightClick(e, worksheet.id)}
                onDoubleClick={() => {
                  setIsRenaming(worksheet.id)
                  setNewName(worksheet.name)
                }}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg border transition-colors ${
                  activeWorksheet?.id === worksheet.id
                    ? 'bg-slate-50 border-slate-200 border-b-white -mb-px text-slate-900 border-t-2 border-t-emerald-500'
                    : 'bg-slate-100/80 border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {worksheet.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Sheet Button */}
      <button
        onClick={handleAddSheet}
        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-sm font-medium flex-shrink-0 transition-colors"
        title="Add new sheet"
      >
        +
      </button>

      {/* Rows × Columns | Ready */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 flex-shrink-0 whitespace-nowrap ml-auto">
        {rowCount != null && columnCount != null && (
          <span>{activeWorksheet?.name || '—'} | {rowCount} rows × {columnCount} columns</span>
        )}
        <span className="text-slate-400">Ready</span>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setShowContextMenu(null)}
            aria-hidden="true"
          />
          <div
            className="fixed bg-white border border-slate-200 rounded-xl shadow-lg z-[100] min-w-[140px] py-1"
            style={{
              top: `${showContextMenu.y}px`,
              left: `${showContextMenu.x}px`,
            }}
          >
            <button
              onClick={() => {
                setIsRenaming(showContextMenu.worksheetId)
                const ws = worksheets.find((w) => w.id === showContextMenu.worksheetId)
                setNewName(ws?.name || '')
                setShowContextMenu(null)
              }}
              className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-t-xl"
            >
              Rename
            </button>
            <button
              onClick={() => handleDelete(showContextMenu.worksheetId)}
              className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-xl"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default SheetTabs
