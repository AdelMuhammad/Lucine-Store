import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

const PDF_MARGIN_MM = 8

/**
 * Renders a DOM node (the `.invoice-sheet`) onto a canvas and exports a real,
 * downloadable A4 PDF. Rendering the live DOM keeps Arabic text perfectly
 * shaped — the canvas is embedded into the PDF as a crisp image.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const pdf = new jsPDF({ orientation: 'portrait', format: 'a4', unit: 'mm' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const usableWidth = pageWidth - PDF_MARGIN_MM * 2
  const usableHeight = pageHeight - PDF_MARGIN_MM * 2

  const imageHeight = (canvas.height * usableWidth) / canvas.width
  const imageData = canvas.toDataURL('image/png')

  let heightLeft = imageHeight
  let position = PDF_MARGIN_MM

  pdf.addImage(
    imageData,
    'PNG',
    PDF_MARGIN_MM,
    position,
    usableWidth,
    imageHeight,
  )
  heightLeft -= usableHeight

  while (heightLeft > 0) {
    position = PDF_MARGIN_MM - heightLeft
    pdf.addPage()
    pdf.addImage(
      imageData,
      'PNG',
      PDF_MARGIN_MM,
      position,
      usableWidth,
      imageHeight,
    )
    heightLeft -= usableHeight
  }

  pdf.save(filename)
}

/** Snake-cased invoice file name: `invoice-20261013-a1b2c3.pdf`. */
export function invoiceFilename(number: string): string {
  return (
    number.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
    `invoice-${new Date().toISOString().slice(0, 10)}`
  )
}

/** Prints only the invoice sheet using browser print → "Save as PDF". */
export function printInvoice(): void {
  window.print()
}