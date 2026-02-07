/**
 * MinitabSidebar Component
 * Left navigation sidebar matching Minitab Web design
 */

import { Home, Compass, FolderOpen, FileText } from 'lucide-react'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
}

interface MinitabSidebarProps {
  activeItem?: string
  onNavigate?: (itemId: string) => void
  collapsed?: boolean
}

const MinitabSidebar = ({
  activeItem = 'untitled',
  onNavigate,
  collapsed = false,
}: MinitabSidebarProps) => {
  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'navigator',
      label: 'Navigator',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'open',
      label: 'Open',
      icon: <FolderOpen className="w-4 h-4" />,
    },
    {
      id: 'untitled',
      label: 'Untitled',
      icon: <FileText className="w-4 h-4" />,
    },
  ]

  const handleItemClick = (itemId: string) => {
    onNavigate?.(itemId)
  }

  if (collapsed) {
    return (
      <aside className="w-14 bg-gray-50 border-r border-gray-200 flex flex-col py-3">
        {navigationItems.map((item) => {
          const isActive = item.id === activeItem
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`
                p-3 flex items-center justify-center transition-colors cursor-pointer
                ${
                  isActive
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-700'
                }
              `}
              title={item.label}
            >
              {item.icon}
            </button>
          )
        })}
      </aside>
    )
  }

  return (
    <aside className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Sidebar Header */}
      <div className="px-4 py-2 border-b border-gray-200">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Navigator
        </h2>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-1">
        {navigationItems.map((item) => {
          const isActive = item.id === activeItem
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`
                w-full px-4 py-2 flex items-center gap-2.5 transition-colors text-left cursor-pointer
                ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <span
                className={`flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}
              >
                {item.icon}
              </span>
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-400">Quick Access</p>
      </div>
    </aside>
  )
}

export default MinitabSidebar
