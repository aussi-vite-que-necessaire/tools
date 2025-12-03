import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "zod"
import { takeScreenshot, extractContent } from "../lib/browser.js"

const app = new OpenAPIHono()

// Schema for screenshot request
const ScreenshotRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  fullPage: z.boolean().optional().default(false),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

// Schema for content extraction request
const ContentRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  format: z.enum(["html", "text"]).optional().default("html"),
})

// POST /api/scraper/screenshot
const screenshotRoute = createRoute({
  method: "post",
  path: "/api/scraper/screenshot",
  tags: ["Scraper"],
  summary: "Take a screenshot of a webpage",
  description:
    "Captures a screenshot of the specified URL with optional viewport and full-page options",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ScreenshotRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Screenshot image (PNG)",
      content: {
        "image/png": {
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

app.openapi(screenshotRoute, async (c) => {
  try {
    const body = c.req.valid("json")
    const imageBuffer = await takeScreenshot(body.url, {
      fullPage: body.fullPage,
      width: body.width,
      height: body.height,
    })

    return new Response(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="screenshot.png"',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return c.json(
      { error: `Failed to take screenshot: ${errorMessage}` },
      500
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
  }
})

// POST /api/scraper/content
const contentRoute = createRoute({
  method: "post",
  path: "/api/scraper/content",
  tags: ["Scraper"],
  summary: "Extract content from a webpage",
  description: "Extracts HTML or text content from the specified URL",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ContentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Extracted content",
      content: {
        "application/json": {
          schema: z.object({
            content: z.string(),
            format: z.enum(["html", "text"]),
            url: z.string(),
          }),
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

app.openapi(contentRoute, async (c) => {
  try {
    const body = c.req.valid("json")
    const content = await extractContent(body.url, body.format)

    return c.json({
      content,
      format: body.format ?? "html",
      url: body.url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return c.json(
      { error: `Failed to extract content: ${errorMessage}` },
      500
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any
  }
})

export default app
