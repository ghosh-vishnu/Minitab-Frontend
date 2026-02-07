import React from 'react'
import { CapabilityResult } from '../../utils/capabilityNormal'
import { ProcessCapabilityReportSVG } from './ProcessCapabilityReportSVG'

interface ProcessCapabilityReportProps {
  result: CapabilityResult
  onEdit?: () => void
}

export const ProcessCapabilityReport: React.FC<ProcessCapabilityReportProps> = ({ result, onEdit }) => {
  return <ProcessCapabilityReportSVG result={result} onEdit={onEdit} />
}
