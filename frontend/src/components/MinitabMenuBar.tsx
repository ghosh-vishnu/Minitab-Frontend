/**
 * MinitabMenuBar Component
 * Horizontal menu bar with Data, Calc, Stat, Graph, View, etc.
 * Matching Minitab Web Statistical Software design
 */

import { useState } from 'react'

interface MenuItem {
  id: string
  label: string
  items?: string[]
}

interface MinitabMenuBarProps {
  onMenuClick?: (menuId: string, itemId?: string) => void
}

const MinitabMenuBar = ({ onMenuClick }: MinitabMenuBarProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const menuItems: MenuItem[] = [
    {
      id: 'data',
      label: 'Data',
      items: ['Import', 'Export', 'Sort', 'Stack', 'Unstack', 'Code', 'Copy'],
    },
    {
      id: 'calc',
      label: 'Calc',
      items: ['Calculator', 'Column Statistics', 'Row Statistics', 'Standardize', 'Make Indicator Variables'],
    },
    {
      id: 'stat',
      label: 'Stat',
      items: [
        'Basic Statistics',
        'Regression',
        'ANOVA',
        'DOE',
        'Control Charts',
        'Quality Tools',
        'Reliability/Survival',
        'Multivariate',
        'Time Series',
        'Tables',
        'Nonparametrics',
        'Equivalence Tests',
        'Power and Sample Size',
      ],
    },
    {
      id: 'graph',
      label: 'Graph',
      items: ['Scatterplot', 'Histogram', 'Boxplot', 'Time Series Plot', 'Bar Chart', 'Pie Chart', 'Contour Plot'],
    },
    {
      id: 'view',
      label: 'View',
      items: ['Toolbars', 'Project Manager', 'Session Window', 'Worksheet', 'Data Window'],
    },
    {
      id: 'predictive',
      label: 'Predictive Analytics Module',
      items: ['Classification', 'Regression', 'Clustering'],
    },
    {
      id: 'solutions',
      label: 'Solutions Modules',
      items: ['Healthcare', 'Medical Devices', 'Automotive', 'Pharmaceutical'],
    },
  ]

  const handleMenuClick = (menuId: string) => {
    if (activeMenu === menuId) {
      setActiveMenu(null)
    } else {
      setActiveMenu(menuId)
      onMenuClick?.(menuId)
    }
  }

  const handleItemClick = (menuId: string, itemId: string) => {
    onMenuClick?.(menuId, itemId)
    setActiveMenu(null)
  }

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Menu Bar */}
      <div className="flex items-center h-9 px-3">
        {menuItems.map((menu) => (
          <div key={menu.id} className="relative">
            <button
              onClick={() => handleMenuClick(menu.id)}
              className={`
                px-3 py-1 text-xs font-medium transition-colors cursor-pointer leading-tight
                ${
                  activeMenu === menu.id
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-700 hover:text-gray-900'
                }
              `}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu */}
            {activeMenu === menu.id && menu.items && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveMenu(null)}
                />
                
                {/* Dropdown Content */}
                <div className="absolute top-full left-0 mt-0 bg-white border border-gray-200 shadow-md min-w-[200px] max-w-[280px] z-20 py-1">
                  {menu.items.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleItemClick(menu.id, item)}
                      className="w-full px-4 py-1 text-left text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer leading-tight"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MinitabMenuBar
