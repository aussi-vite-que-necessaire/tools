import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "zod"
import QRCode from "qrcode"

const app = new OpenAPIHono()

// POST /api/tools/qrcode
const qrCodeRoute = createRoute({
    method: "post",
    path: "/api/tools/qrcode",
    tags: ["Tools"],
    summary: "Generate QR Code",
    description: "Generates a QR Code image (PNG or SVG) from text",
    request: {
        body: {
            content: {
                "multipart/form-data": {
                    schema: z.object({
                        text: z.string().min(1).describe("Text to encode"),
                        format: z.enum(["png", "svg"]).optional().default("png"),
                        width: z.string().optional().describe("Width of the image"),
                        margin: z.string().optional().describe("Margin around the QR Code"),
                        color_dark: z.string().optional().describe("Dark color (hex)"),
                        color_light: z.string().optional().describe("Light color (hex)"),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: "QR Code image",
            content: {
                "image/png": {
                    schema: z.string().openapi({ format: "binary" }),
                },
                "image/svg+xml": {
                    schema: z.string().openapi({ format: "binary" }),
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

app.openapi(qrCodeRoute, async (c) => {
    try {
        const body = await c.req.parseBody()
        const text = body.text as string
        const format = (body.format as "png" | "svg") || "png"
        const width = body.width ? parseInt(body.width as string) : undefined
        const margin = body.margin ? parseInt(body.margin as string) : undefined
        const colorDark = body.color_dark as string | undefined
        const colorLight = body.color_light as string | undefined

        if (!text) {
            return c.json({ error: "Text is required" }, 400)
        }

        const options: QRCode.QRCodeToBufferOptions = {
            width,
            margin,
            color: {
                dark: colorDark,
                light: colorLight,
            },
        }

        if (format === "svg") {
            const svgString = await QRCode.toString(text, { ...options, type: "svg" })
            return new Response(svgString, {
                status: 200,
                headers: {
                    "Content-Type": "image/svg+xml",
                    "Content-Disposition": 'attachment; filename="qrcode.svg"',
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
        } else {
            const buffer = await QRCode.toBuffer(text, options)
            return new Response(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    "Content-Type": "image/png",
                    "Content-Disposition": 'attachment; filename="qrcode.png"',
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error"
        return c.json(
            { error: `Failed to generate QR Code: ${errorMessage}` },
            500
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any
    }
})

export default app
