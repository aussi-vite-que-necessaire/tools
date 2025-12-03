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
 * Extract specific page groups from a PDF
 * @param pdfBuffer - The source PDF buffer
 * @param pageGroups - Array of page index arrays (0-based). Example: [[0,1], [4,5,7], [9,11], [14]]
 * @returns Array of PDF buffers, one for each group
 */
export async function extractPageGroups(
  pdfBuffer: Buffer,
  pageGroups: number[][]
): Promise<Buffer[]> {
  if (pageGroups.length === 0) {
    throw new Error("At least one page group is required")
  }

  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()
  const result: Buffer[] = []

  // Validate all page indices are within bounds
  for (const group of pageGroups) {
    if (group.length === 0) {
      throw new Error("Page groups cannot be empty")
    }
    for (const pageIndex of group) {
      if (pageIndex < 0 || pageIndex >= pageCount) {
        throw new Error(
          `Page index ${pageIndex} is out of range. PDF has ${pageCount} pages (0-${pageCount - 1})`
        )
      }
    }
  }

  // Extract each group
  for (const group of pageGroups) {
    const newPdf = await PDFDocument.create()
    const copiedPages = await newPdf.copyPages(pdfDoc, group)
    copiedPages.forEach((page) => newPdf.addPage(page))
    const pdfBytes = await newPdf.save()
    result.push(Buffer.from(pdfBytes))
  }

  return result
}

/**
 * Create a ZIP file containing multiple PDF buffers
 * Each PDF is named as page-{index}.pdf
 */
export async function createZipFromPdfs(
  pdfBuffers: Buffer[],
  _zipFileName: string = "pages.zip",
  fileNames?: string[]
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
      const fileName =
        fileNames && fileNames[index]
          ? fileNames[index]
          : `page-${index + 1}.pdf`
      archive.append(Readable.from(pdfBuffer), { name: fileName })
    }

    archive.finalize()
  })
}
