import React, { createContext, useContext, useState } from 'react'

export type ModalType = 'INDIVIDUALS_CHART' | 'IMR_CHART' | 'XBAR_R_CHART' | 'XBAR_S_CHART' | 'CAPABILITY_ANALYSIS_NORMAL' | null

interface ModalContextType {
  activeModal: ModalType
  openModal: (modalType: ModalType) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const openModal = (modalType: ModalType) => {
    setActiveModal(modalType)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}
