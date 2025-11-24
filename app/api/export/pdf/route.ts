import { NextRequest, NextResponse } from 'next/server'
import { generatePDFBlob } from '@/lib/export/pdf'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, title, fileName } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Generate PDF buffer
    const pdfBlob = await generatePDFBlob(content, {
      title: title || 'Research Report',
      fileName: fileName || `research_report_${Date.now()}.pdf`,
    })

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'research_report.pdf'}"`,
      },
    })
  } catch (error) {
    console.error('Server PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
