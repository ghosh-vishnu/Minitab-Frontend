import React, { createContext, useContext, useState, useCallback } from 'react'

export type DialogType = 
  | 'descriptive-stats'
  | 'regression'
  | 'anova-one-way'
  | 'xbar-r-chart'
  | 'correlation'
  | 'tally'
  | null

interface DialogContextType {
  activeDialog: DialogType
  openDialog: (dialog: DialogType) => void
  closeDialog: () => void
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null)

  const openDialog = useCallback((dialog: DialogType) => {
    setActiveDialog(dialog)
  }, [])

  const closeDialog = useCallback(() => {
    setActiveDialog(null)
  }, [])

  return (
    <DialogContext.Provider value={{ activeDialog, openDialog, closeDialog }}>
      {children}
    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  const context = useContext(DialogContext)
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}
