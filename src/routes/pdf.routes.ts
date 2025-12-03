import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "zod"
import { splitPdf, mergePdfs, createZipFromPdfs } from "../lib/pdf.js"

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

export default app
