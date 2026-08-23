import type { ComponentType } from 'npm:react@18.3.1'
import { template as demoRequest } from './demo-request.tsx'

export type TemplateData = Record<string, unknown>

export interface TemplateEntry {
  component: ComponentType<TemplateData>
  subject: string | ((data: TemplateData) => string)
  displayName?: string
  previewData?: TemplateData
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'demo-request': demoRequest,
}
