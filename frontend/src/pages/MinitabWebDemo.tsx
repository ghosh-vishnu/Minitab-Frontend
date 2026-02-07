/**
 * Minitab Web Demo Page
 * Demonstrates the redesigned Minitab-style UI with all components
 */

import { useState, useEffect } from 'react'
import MinitabHeader from '../components/MinitabHeader'
import MinitabSidebar from '../components/MinitabSidebar'
import MinitabMenuBar from '../components/MinitabMenuBar'
import MinitabGrid from '../components/MinitabGrid'
import { Cell, spreadsheetsAPI } from '../api/spreadsheets'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const MinitabWebDemo = () => {
  const { id: spreadsheetId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  
  // State
  const [fileName, setFileName] = useState('Untitled')
  const [isSaved, setIsSaved] = useState(false)
  const [activeNavItem, setActiveNavItem] = useState('untitled')
  const [cells, setCells] = useState<Cell[]>([])
  const [rowCount] = useState(1000)
  const [columnCount] = useState(50)
  const [worksheetNames, setWorksheetNames] = useState<Record<string, string>>({})

  // Load spreadsheet data
  useEffect(() => {
    const loadData = async () => {
      if (spreadsheetId && spreadsheetId !== 'undefined') {
        try {
          const spreadsheetData = await spreadsheetsAPI.get(spreadsheetId)
          setFileName(spreadsheetData.name || 'Untitled')
          setWorksheetNames(spreadsheetData.worksheet_names || {})
          
          const cellsData = await spreadsheetsAPI.getCells(spreadsheetId)
          setCells(cellsData || [])
          setIsSaved(true)
        } catch (error: any) {
          console.error('Failed to load spreadsheet data:', error)
          setCells([])
          setIsSaved(false)
        }
      }
    }
    loadData()
  }, [spreadsheetId])

  // Handlers
  const handleNavigate = (itemId: string) => {
    setActiveNavItem(itemId)
    
    if (itemId === 'home') {
      navigate('/dashboard')
    } else if (itemId === 'open') {
      toast.info('Open file dialog - coming soon')
    }
  }

  const handleMenuClick = (menuId: string, itemId?: string) => {
    if (itemId) {
      toast.info(`${menuId} → ${itemId} - Feature coming soon`)
    } else {
      console.log('Menu clicked:', menuId)
    }
  }

  const handleSearch = (query: string) => {
    console.log('Search:', query)
    if (query) {
      toast.info(`Searching for: ${query}`)
    }
  }

  const handleHelp = () => {
    toast.info('Help documentation - coming soon')
  }

  const handleSettings = () => {
    navigate('/minitab/profile')
  }

  const handleUserClick = () => {
    navigate('/minitab/profile')
  }

  const handleCellsUpdate = async (updatedCells: Cell[]) => {
    setCells(updatedCells)
    setIsSaved(false)
    
    // Auto-save after a short delay
    setTimeout(() => {
      setIsSaved(true)
    }, 2000)
  }

  const handleWorksheetNamesUpdate = async (names: Record<string, string>) => {
    if (!spreadsheetId) return
    
    try {
      await spreadsheetsAPI.update(spreadsheetId, {
        worksheet_names: names,
      })
      setWorksheetNames(names)
      toast.success('Worksheet names saved')
    } catch (error) {
      toast.error('Failed to save worksheet names')
      throw error
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Fixed Header */}
      <MinitabHeader
        fileName={fileName}
        isSaved={isSaved}
        onSearch={handleSearch}
        onHelp={handleHelp}
        onSettings={handleSettings}
        onUserClick={handleUserClick}
      />

      {/* Menu Bar */}
      <MinitabMenuBar onMenuClick={handleMenuClick} />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <MinitabSidebar activeItem={activeNavItem} onNavigate={handleNavigate} />

        {/* Content Area - Worksheet */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Worksheet Area */}
          <div className="flex-1 overflow-hidden p-3 bg-gray-50">
            <div className="h-full bg-white border border-gray-200 overflow-hidden rounded-sm">
              {spreadsheetId ? (
                <MinitabGrid
                  spreadsheetId={spreadsheetId}
                  // Demo page uses spreadsheet-level cells only, so no active worksheet ID
                  rowCount={rowCount}
                  columnCount={columnCount}
                  cells={cells}
                  onCellsUpdate={handleCellsUpdate}
                  spreadsheetName={fileName}
                  worksheetNames={worksheetNames}
                  onWorksheetNamesUpdate={handleWorksheetNamesUpdate}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-1">No Worksheet Loaded</h3>
                    <p className="text-xs">Create a new worksheet or open an existing one</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="h-7 bg-white border-t border-gray-200 px-4 flex items-center justify-between text-xs text-gray-500">
            <span>Ready</span>
            <span>NaN Days Remaining</span>
          </div>
        </main>
      </div>
    </div>
  )
}

export default MinitabWebDemo
