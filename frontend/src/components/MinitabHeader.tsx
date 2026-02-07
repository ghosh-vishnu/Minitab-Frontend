/**
 * MinitabHeader Component
 * Top header bar matching Minitab Web Statistical Software design
 */

import { Search, HelpCircle, Settings, User } from 'lucide-react'

interface MinitabHeaderProps {
  fileName?: string
  isSaved?: boolean
  onSearch?: (query: string) => void
  onHelp?: () => void
  onSettings?: () => void
  onUserClick?: () => void
}

const MinitabHeader = ({
  fileName = 'Untitled',
  isSaved = false,
  onSearch,
  onHelp,
  onSettings,
  onUserClick,
}: MinitabHeaderProps) => {
  return (
    <header className="h-14 bg-white border-b border-gray-190 flex items-center px-5 z-50">
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-2.5">
        {/* Logo */}
        <div className="w-7 h-7 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-sm flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="text-gray-600 text-xs font-medium hidden md:inline tracking-tight">
          Statistical Software
        </span>
      </div>

      {/* Center: File Name and Status */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-sm font-medium text-gray-800 leading-tight">{fileName}</h1>
          <p className="text-xs text-gray-500 leading-tight">
            {isSaved ? 'All changes saved' : 'Not currently saved'}
          </p>
        </div>
      </div>

      {/* Right: Search, Help, Settings, User */}
      <div className="flex items-center gap-1">
        {/* Search Bar */}
        <div className="relative hidden lg:block mr-1">
          <input
            type="text"
            placeholder="Search..."
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-40 pl-8 pr-3 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-300 placeholder-gray-400 leading-tight"
          />
          <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Help Icon */}
        <button
          onClick={onHelp}
          className="p-1.5 hover:bg-gray-50 rounded transition-colors cursor-pointer"
          title="Help"
        >
          <HelpCircle className="w-4 h-4 text-gray-500" />
        </button>

        {/* Settings Icon */}
        <button
          onClick={onSettings}
          className="p-1.5 hover:bg-gray-50 rounded transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>

        {/* User Avatar */}
        <button
          onClick={onUserClick}
          className="p-1.5 hover:bg-gray-50 rounded transition-colors cursor-pointer"
          title="User Profile"
        >
          <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </div>
    </header>
  )
}

export default MinitabHeader
