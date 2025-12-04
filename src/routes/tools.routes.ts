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
                "application/json": {
                    schema: z.object({
                        text: z.string().min(1).describe("Text to encode"),
                        format: z.enum(["png", "svg"]).optional().default("png"),
                        width: z.number().int().positive().optional().describe("Width of the image"),
                        margin: z.number().int().min(0).optional().describe("Margin around the QR Code"),
                        color: z
                            .object({
                                dark: z.string().optional().describe("Dark color (hex)"),
                                light: z.string().optional().describe("Light color (hex)"),
                            })
                            .optional(),
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
                    schema: z.instanceof(Buffer),
                },
                "image/svg+xml": {
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

app.openapi(qrCodeRoute, async (c) => {
    try {
        const body = c.req.valid("json")
        const { text, format, width, margin, color } = body

        const options: QRCode.QRCodeToBufferOptions = {
            width,
            margin,
            color: {
                dark: color?.dark,
                light: color?.light,
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
