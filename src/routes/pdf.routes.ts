import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "zod"
import {
  splitPdf,
  mergePdfs,
  createZipFromPdfs,
  extractPageGroups,
} from "../lib/pdf.js"
import { createPdfFromHtml } from "../lib/browser.js"

const app = new OpenAPIHono()

// POST /api/pdf/split
const splitRoute = createRoute({
  method: "post",
  path: "/api/pdf/split",
  tags: ["PDF"],
  summary: "Split a PDF into individual pages",
  description:
    "Splits a PDF file into individual pages and returns them as a ZIP archive",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().describe("PDF file to split").openapi({
              type: "string",
              format: "binary",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "ZIP file containing individual PDF pages",
      content: {
        "application/zip": {
          schema: z.instanceof(Buffer),
        },
      },
    },
    400: {
      description: "Invalid request or invalid PDF file",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

app.openapi(splitRoute, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body.file

    if (!file || !(file instanceof File)) {
      return c.json({ error: "PDF file is required" }, 400)
    }

    // Check if file is a PDF
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return c.json({ error: "File must be a PDF" }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    const pages = await splitPdf(pdfBuffer)
    const zipBuffer = await createZipFromPdfs(pages, "pages.zip")

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="pages.zip"',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return c.json({ error: `Failed to split PDF: ${errorMessage}` }, 500) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
})

// POST /api/pdf/merge
const mergeRoute = createRoute({
  method: "post",
  path: "/api/pdf/merge",
  tags: ["PDF"],
  summary: "Merge multiple PDFs into one",
  description: "Merges multiple PDF files into a single PDF document",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z
              .union([
                z.array(
                  z.any().describe("PDF file").openapi({
                    type: "string",
                    format: "binary",
                  })
                ),
                z.any().describe("PDF file").openapi({
                  type: "string",
                  format: "binary",
                }),
              ])
              .describe("One or more PDF files to merge"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Merged PDF file",
      content: {
        "application/pdf": {
          schema: z.instanceof(Buffer),
        },
      },
    },
    400: {
      description: "Invalid request or invalid PDF files",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

app.openapi(mergeRoute, async (c) => {
  try {
    const body = await c.req.parseBody()
    const files = body.files

    if (!files) {
      return c.json({ error: "At least one PDF file is required" }, 400)
    }

    // Handle both single file and array of files
    const fileArray = Array.isArray(files) ? files : [files]

    if (fileArray.length === 0) {
      return c.json({ error: "At least one PDF file is required" }, 400)
    }

    // Validate all files are PDFs
    for (const file of fileArray) {
      if (!(file instanceof File)) {
        return c.json({ error: "All files must be valid PDF files" }, 400)
      }
      if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
        return c.json({ error: "All files must be PDFs" }, 400)
      }
    }

    // Convert files to buffers
    const pdfBuffers = await Promise.all(
      fileArray.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        return Buffer.from(arrayBuffer)
      })
    )

    const mergedPdf = await mergePdfs(pdfBuffers)

    return new Response(new Uint8Array(mergedPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return c.json(
      { error: `Failed to merge PDFs: ${errorMessage}` },
      500
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
  }
})

// POST /api/pdf/extract
const extractRoute = createRoute({
  method: "post",
  path: "/api/pdf/extract",
  tags: ["PDF"],
  summary: "Extract page groups from a PDF",
  description:
    "Extracts specific page groups from a PDF and returns them as a ZIP archive. Each group becomes a separate PDF file.",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().describe("PDF file to extract pages from").openapi({
              type: "string",
              format: "binary",
            }),
            pageGroups: z
              .string()
              .min(1, "pageGroups parameter is required")
              .optional()
              .describe(
                "JSON array of page index arrays (0-based). Example: [[0,1], [4,5,7], [9,11], [14]]"
              ),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "ZIP file containing extracted PDF groups",
      content: {
        "application/zip": {
          schema: z.instanceof(Buffer),
        },
      },
    },
    400: {
      description: "Invalid request or invalid PDF file",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

app.openapi(extractRoute, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body.file as File

    if (!file) {
      return c.json({ error: "No file provided" }, 400) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    // Check if pageGroups exists and is a valid string
    const pageGroupsValue = body.pageGroups
    if (
      pageGroupsValue === undefined ||
      pageGroupsValue === null ||
      (typeof pageGroupsValue === "string" && pageGroupsValue.trim() === "") ||
      (Array.isArray(pageGroupsValue) && pageGroupsValue.length === 0)
    ) {
      return c.json(
        { error: "pageGroups parameter is required" },
        400
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
    }

    const pageGroupsStr = pageGroupsValue as string

    // Parse pageGroups JSON
    let pageGroups: number[][]
    try {
      pageGroups = JSON.parse(pageGroupsStr)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return c.json(
        { error: "Invalid JSON format for pageGroups" },
        400
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
    }

    // Validate pageGroups structure
    if (!Array.isArray(pageGroups)) {
      return c.json(
        { error: "pageGroups must be an array of arrays" },
        400
      ) as any
    }

    if (pageGroups.length === 0) {
      return c.json(
        { error: "At least one page group is required" },
        400
      ) as any
    }

    for (const group of pageGroups) {
      if (!Array.isArray(group)) {
        return c.json(
          { error: "Each page group must be an array of page indices" },
          400
        ) as any
      }
      for (const index of group) {
        if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
          return c.json(
            {
              error: `Invalid page index: ${index}. Must be a non-negative integer`,
            },
            400
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any
        }
      }
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    // Extract page groups (catch validation errors and return 400)
    let extractedPdfs: Buffer[]
    try {
      extractedPdfs = await extractPageGroups(pdfBuffer, pageGroups)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      // Return 400 for validation errors (out of range, etc.)
      if (
        errorMessage.includes("out of range") ||
        errorMessage.includes("Page groups cannot be empty") ||
        errorMessage.includes("At least one page group is required")
      ) {
        return c.json({ error: errorMessage }, 400) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      // Re-throw other errors to be caught by outer catch
      throw error
    }

    // Create ZIP with custom file names
    const fileNames = extractedPdfs.map(
      (_, index) => `group-${index + 1}.pdf`
    )
    const zipBuffer = await createZipFromPdfs(
      extractedPdfs,
      "extracted-pages.zip",
      fileNames
    )

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="extracted-pages.zip"',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return c.json(
      { error: `Failed to extract pages: ${errorMessage}` },
      500
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
  }
})

// POST /api/pdf/from-html
const fromHtmlRoute = createRoute({
  method: "post",
  path: "/api/pdf/from-html",
  tags: ["PDF"],
  summary: "Create PDF from HTML or URL",
  description: "Converts HTML content or a webpage URL to a PDF file",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z
            .object({
              html: z.string().optional().describe("HTML content to convert"),
              url: z.string().url().optional().describe("URL to convert"),
              format: z
                .enum(["A4", "Letter", "A3", "A5", "Tabloid", "Legal"])
                .optional()
                .default("A4"),
              landscape: z.boolean().optional().default(false),
              printBackground: z.boolean().optional().default(true),
            })
            .refine((data) => data.html || data.url, {
              message: "Either html or url must be provided",
            }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Generated PDF file",
      content: {
        "application/pdf": {
          schema: z.instanceof(Buffer),
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

app.openapi(fromHtmlRoute, async (c) => {
  try {
    const body = c.req.valid("json")

    const pdfBuffer = await createPdfFromHtml(
      {
        html: body.html,
        url: body.url,
      },
      {
        format: body.format,
        landscape: body.landscape,
        printBackground: body.printBackground,
      }
    )

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="document.pdf"',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return c.json(
      { error: `Failed to create PDF: ${errorMessage}` },
      500
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
  }
})

export default app
