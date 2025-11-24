import { NextRequest } from 'next/server'
import { AccountPlan } from '@/types'
import { ExportService } from '@/lib/services/export-service'
import { planStorage } from '@/lib/storage'

const exportService = ExportService.getInstance()

export async function POST(req: NextRequest) {
  try {
    const { planId, options } = await req.json()

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const plan = planStorage.getPlan(planId)
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate plan has content
    if (!plan.sections || plan.sections.length === 0) {
      return new Response(JSON.stringify({ error: 'Plan has no content to export' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const exportOptions = {
      format: options?.format || 'json',
      includeSources: options?.includeSources ?? true,
      includeMetadata: options?.includeMetadata ?? true,
      sections: options?.sections,
      branding: options?.branding,
      includeCharts: options?.includeCharts ?? (options?.format === 'pdf'),
      chartImages: options?.chartImages || [],
    }

    let result

    switch (exportOptions.format) {
      case 'pdf':
        result = await exportService.exportToPDF(plan, exportOptions)
        break
      case 'docx':
        result = await exportService.exportToDOCX(plan, exportOptions)
        break
      case 'json':
        result = exportAsJSON(plan, exportOptions)
        break
      case 'html':
        result = exportAsHTML(plan, exportOptions)
        break
      case 'csv':
        result = exportAsCSV(plan, exportOptions)
        break
      default:
        return new Response(JSON.stringify({ error: 'Unsupported export format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Export failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // For PDF/DOCX, return blob directly as binary response
    if (result.blob) {
      const buffer = await result.blob.arrayBuffer()
      const mimeType = exportOptions.format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'Content-Length': result.size?.toString() || buffer.byteLength.toString(),
        },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function exportAsJSON(plan: AccountPlan, options: any): any {
  try {
    const data: any = {
      companyName: plan.companyName,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      sections: plan.sections.map(section => ({
        type: section.type,
        title: section.title,
        content: section.content,
        ...(options.includeSources && { sources: section.sources }),
        ...(options.includeMetadata && { metadata: section.metadata }),
      })),
      ...(options.includeSources && { sources: plan.sources }),
      ...(options.includeMetadata && { metadata: plan.metadata }),
    }

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    return {
      success: true,
      url,
      filename: `${plan.companyName.replace(/\s+/g, '_')}_plan.json`,
      size: blob.size,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function exportAsHTML(plan: AccountPlan, options: any): any {
  try {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Plan - ${plan.companyName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .section { margin-bottom: 30px; }
    .content { line-height: 1.6; }
    .sources { margin-top: 20px; font-size: 0.9em; color: #666; }
    .source { margin: 5px 0; }
    .metadata { font-size: 0.8em; color: #999; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Account Plan: ${plan.companyName}</h1>
  <p><strong>Created:</strong> ${plan.createdAt.toLocaleDateString()}</p>
  <p><strong>Updated:</strong> ${plan.updatedAt.toLocaleDateString()}</p>
`

    for (const section of plan.sections) {
      if (options.sections && !options.sections.includes(section.type)) {
        continue
      }

      html += `
  <div class="section">
    <h2>${section.title}</h2>
    <div class="content">${section.content.replace(/\n/g, '<br>')}</div>
`

      if (options.includeSources && section.sources.length > 0) {
        html += `
    <div class="sources">
      <strong>Sources:</strong>
      <ul>
`
        for (const source of section.sources) {
          html += `        <li class="source"><a href="${source.url}" target="_blank">${source.title}</a></li>\n`
        }
        html += `      </ul>
    </div>
`
      }

      if (options.includeMetadata && section.metadata) {
        html += `
    <div class="metadata">
      Confidence: ${section.confidence ? (section.confidence * 100).toFixed(0) + '%' : 'N/A'}
    </div>
`
      }

      html += `  </div>
`
    }

    html += `</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    return {
      success: true,
      url,
      filename: `${plan.companyName.replace(/\s+/g, '_')}_plan.html`,
      size: blob.size,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function exportAsCSV(plan: AccountPlan, options: any): any {
  try {
    let csv = 'Section Type,Title,Content\n'

    for (const section of plan.sections) {
      if (options.sections && !options.sections.includes(section.type)) {
        continue
      }

      const content = section.content.replace(/"/g, '""').replace(/\n/g, ' ')
      csv += `"${section.type}","${section.title}","${content}"\n`
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    return {
      success: true,
      url,
      filename: `${plan.companyName.replace(/\s+/g, '_')}_plan.csv`,
      size: blob.size,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

