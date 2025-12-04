import { OpenAPIHono } from "@hono/zod-openapi"
import { swaggerUI } from "@hono/swagger-ui"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import scraperRoutes from "./routes/scraper.routes.js"
import pdfRoutes from "./routes/pdf.routes.js"
import toolsRoutes from "./routes/tools.routes.js"
import { closeBrowser } from "./lib/browser.js"

const app = new OpenAPIHono()

// Middleware
app.use("*", logger())
app.use("*", cors())

// Auth Middleware
import { bearerAuth } from "hono/bearer-auth"
const apiKey = process.env.API_KEY
if (apiKey) {
  app.use("*", bearerAuth({ token: apiKey }))
}

// Routes
app.route("/", scraperRoutes)
app.route("/", pdfRoutes)
app.route("/", toolsRoutes)

// Swagger UI
app.doc("/doc/json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Tools API",
    description:
      "Micro-Monolithe backend API for n8n workflows - PDF manipulation and web scraping utilities",
  },
  servers: [
    {
      url: process.env.API_URL || "http://localhost:3000",
      description: "API Server",
    },
  ],
})

app.get("/doc", swaggerUI({ url: "/doc/json" }))

// Health check
app.get("/health", (c): Response => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Root endpoint
app.get("/", (c): Response => {
  return c.json({
    message: "Tools API - Micro-Monolithe backend for n8n workflows",
    version: "1.0.0",
    docs: "/doc",
    health: "/health",
  })
})

const port = Number(process.env.PORT) || 3000

// Only start the server if this file is run directly (not imported)
// Skip if running in test environment (Vitest sets VITEST env var)
const isTestEnvironment =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  typeof process.env.VITEST !== "undefined"

// Check if we're the main module by comparing import.meta.url with process.argv[1]
// or by checking if require.main === module (CommonJS) equivalent
const isMainModule =
  !isTestEnvironment &&
  (process.argv[1]?.includes("index") ||
    import.meta.url.endsWith("index.ts") ||
    import.meta.url.endsWith("index.js") ||
    // Fallback: if no parent caller info, assume we're main
    !import.meta.url.includes("node_modules"))

let server: ReturnType<typeof serve> | null = null

if (isMainModule) {
  // Start server only when run directly
  server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info: { port: number; address: string }) => {
      console.log(`🚀 Server running on http://localhost:${info.port}`)
      console.log(
        `📚 Swagger UI available at http://localhost:${info.port}/doc`
      )
    }
  )

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)

    // Close browser first
    await closeBrowser()

    // Close server if it exists
    if (server) {
      try {
        // Check if server has a close method (may not be in types)
        if (
          server &&
          typeof (server as { close?: (callback?: () => void) => void })
            .close === "function"
        ) {
          ; (server as { close: (callback?: () => void) => void }).close(() => {
            console.log("Server closed")
            process.exit(0)
          })
        } else {
          process.exit(0)
        }
      } catch (error) {
        console.error("Error closing server:", error)
        process.exit(1)
      }
    } else {
      process.exit(0)
    }
  }

  // Handle termination signals
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))

  // Handle uncaught exceptions
  process.on("uncaughtException", async (error) => {
    console.error("Uncaught exception:", error)
    await shutdown("uncaughtException")
  })

  // Cleanup on exit
  process.on("exit", async () => {
    await closeBrowser()
  })
}

export default app
