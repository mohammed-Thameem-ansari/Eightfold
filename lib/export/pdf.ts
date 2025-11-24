import { jsPDF } from 'jspdf'

/**
 * Call this function when PDF export fails to show error toast
 */
export function handlePDFExportError(error: Error, toastFn?: (opts: any) => void) {
  console.error('PDF export failed:', error)
  if (toastFn) {
    toastFn({
      title: 'Export Failed',
      description: error.message || 'Could not generate PDF. Please try again.',
      variant: 'destructive',
    })
  }
}

export interface PDFExportOptions {
  title?: string
  fileName?: string
  maxWidth?: number
}

export async function exportTextToPDF(content: string, options: PDFExportOptions = {}) {
  const { title = 'Research Report', fileName = `research_report_${Date.now()}.pdf`, maxWidth = 515 } = options
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const lines = doc.splitTextToSize(content, maxWidth)
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin, y)
  y += 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  lines.forEach((line: string) => {
    if (y > 780) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 15
  })

  doc.save(fileName)
}

/**
 * Generate PDF blob for server-side use
 */
export async function generatePDFBlob(content: string, options: PDFExportOptions = {}): Promise<Blob> {
  const { title = 'Research Report', maxWidth = 515 } = options
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const lines = doc.splitTextToSize(content, maxWidth)
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin, y)
  y += 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  lines.forEach((line: string) => {
    if (y > 780) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 15
  })

  return doc.output('blob')
}
