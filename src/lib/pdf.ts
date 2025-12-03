import { PDFDocument } from "pdf-lib"
import archiver from "archiver"
import { Readable } from "node:stream"

/**
 * Split a PDF into individual pages
 * Returns an array of PDF buffers, one per page
 */
export async function splitPdf(pdfBuffer: Buffer): Promise<Buffer[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()
  const pages: Buffer[] = []

  for (let i = 0; i < pageCount; i++) {
    const newPdf = await PDFDocument.create()
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i])
    newPdf.addPage(copiedPage)
    const pdfBytes = await newPdf.save()
    pages.push(Buffer.from(pdfBytes))
  }

  return pages
}

/**
 * Merge multiple PDFs into a single PDF
 */
export async function mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
  if (pdfBuffers.length === 0) {
    throw new Error("At least one PDF buffer is required")
  }

  const mergedPdf = await PDFDocument.create()

  for (const pdfBuffer of pdfBuffers) {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
    pages.forEach((page) => mergedPdf.addPage(page))
  }

  const pdfBytes = await mergedPdf.save()
  return Buffer.from(pdfBytes)
}

/**
 * Create a ZIP file containing multiple PDF buffers
 * Each PDF is named as page-{index}.pdf
 */
export async function createZipFromPdfs(
  pdfBuffers: Buffer[],
  _zipFileName: string = "pages.zip"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver("zip", {
      zlib: { level: 9 },
    })

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })

    archive.on("end", () => {
      resolve(Buffer.concat(chunks))
    })

    archive.on("error", (err: Error) => {
      reject(err)
    })

    // Add each PDF buffer to the archive
    for (const [index, pdfBuffer] of pdfBuffers.entries()) {
      const fileName = `page-${index + 1}.pdf`
      archive.append(Readable.from(pdfBuffer), { name: fileName })
    }

    archive.finalize()
  })
}
