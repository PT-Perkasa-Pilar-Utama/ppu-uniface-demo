# API Development Guide: Face Recognition Service

This guide outlines how to develop a standalone API service for face recognition, replicating the core logic of the demo application but without the Next.js frontend. It includes **API Key Authentication** and a **Simple Admin Dashboard**.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Documentation**: [Swagger / OpenAPI](https://hono.dev/guides/openapi) (via `@hono/zod-openapi`)
- **Face Recognition**: `ppu-uniface`
- **Database**: SQLite (via `better-sqlite3` and `drizzle-orm`)
- **Security**: API Key Middleware & Admin Dashboard

## 1. Project Setup

Initialize a new Bun project:

```bash
mkdir face-api
cd face-api
bun init
```

Install the required dependencies:

```bash
bun add hono @hono/zod-openapi ppu-uniface better-sqlite3 drizzle-orm zod
bun add -d drizzle-kit @types/better-sqlite3
```

## 2. Database Setup

We will use SQLite to store face embeddings and API keys.

### Schema Definition

Create `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { z } from "@hono/zod-openapi";

// --- Faces Table ---
export const faces = sqliteTable("faces", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    embedding: text("embedding").notNull(), // JSON stringified Float32Array
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// --- API Keys Table ---
export const apiKeys = sqliteTable("api_keys", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keyHash: text("key_hash").notNull().unique(), // Store hashed keys only!
    prefix: text("prefix").notNull(), // First few chars for display
    name: text("name").notNull(), // Description/Owner
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// --- Zod Schemas ---
export const FaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
});

export const ApiKeySchema = z.object({
  id: z.number(),
  prefix: z.string(),
  name: z.string(),
  createdAt: z.string(),
});
```

### Database Connection

Create `src/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("sqlite.db");
export const db = drizzle(sqlite, { schema });
```

## 3. Security Utilities

We need to hash API keys before storing them.

Create `src/lib/auth.ts`:

```typescript
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { eq } from "drizzle-orm";

export async function generateApiKey() {
  const key = "sk_" + crypto.randomUUID().replace(/-/g, "");
  const hash = await Bun.password.hash(key);
  return { key, hash, prefix: key.slice(0, 7) };
}

export async function validateApiKey(key: string) {
  // In a real app with many keys, you might want to cache this or optimize lookup
  // Since we can't look up by hash directly (salt differs), we iterate or use a lookup ID if the key structure allows.
  // For simplicity/security here, we'll fetch all and verify (not efficient for millions of keys).
  // BETTER APPROACH: Store a 'lookup_id' part in the key, e.g., sk_LOOKUPID_SECRET
  
  // For this demo, we will just iterate (fine for < 1000 keys)
  const allKeys = await db.select().from(apiKeys);
  for (const k of allKeys) {
    if (await Bun.password.verify(key, k.keyHash)) {
      return true;
    }
  }
  return false;
}
```

## 4. Face Recognition Service

Create `src/lib/uniface.ts`:

```typescript
import { Uniface } from "ppu-uniface";

export const uniface = new Uniface();

// Initialize on start
console.log("Initializing Uniface models...");
await uniface.initialize();
console.log("Uniface initialized.");
```

## 5. API Implementation

Create `src/index.ts`. This includes the API, the Auth Middleware, and the Admin Dashboard.

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { basicAuth } from "hono/basic-auth";
import { db } from "./db";
import { faces, apiKeys } from "./db/schema";
import { uniface } from "./lib/uniface";
import { generateApiKey, validateApiKey } from "./lib/auth";
import { eq, desc } from "drizzle-orm";
import { html } from "hono/html";

const app = new OpenAPIHono();

// --- Middleware ---

// API Key Auth Middleware
const apiKeyAuth = async (c: any, next: any) => {
  const key = c.req.header("x-api-key");
  if (!key || !(await validateApiKey(key))) {
    return c.json({ error: "Unauthorized: Invalid API Key" }, 401);
  }
  await next();
};

// --- Schemas ---

const SearchResponseSchema = z.array(
  z.object({
    face: z.object({
      id: z.number(),
      name: z.string(),
      createdAt: z.date(),
    }),
    similarity: z.number(),
    verified: z.boolean(),
  })
);

const ErrorSchema = z.object({ error: z.string() });

// --- Public / Protected Routes ---

// 1. Detect Route
app.openapi(
  createRoute({
    method: "post",
    path: "/api/detect",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              box: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
              landmarks: z.array(z.array(z.number())),
              confidence: z.number(),
              spoofing: z.boolean(),
            }),
          },
        },
        description: "Detection results",
      },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Bad Request" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) return c.json({ error: "File required" }, 400);

      const arrayBuffer = await file.arrayBuffer();
      const result = await uniface.detect(arrayBuffer);
      return c.json(result);
    } catch (e) {
      return c.json({ error: "Detection failed" }, 500);
    }
  }
);

// 2. Recognize Route (Get Embedding)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/recognize",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              embedding: z.array(z.number()),
            }),
          },
        },
        description: "Face embedding",
      },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Bad Request" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) return c.json({ error: "File required" }, 400);

      const arrayBuffer = await file.arrayBuffer();
      const result = await uniface.recognize(arrayBuffer);
      return c.json({ embedding: Array.from(result.embedding) });
    } catch (e) {
      return c.json({ error: "Recognition failed" }, 500);
    }
  }
);

// 3. Verify Route (Image vs Image)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/verify",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file1: z.instanceof(File).openapi({ type: "string", format: "binary" }),
              file2: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              verified: z.boolean(),
              similarity: z.number(),
            }),
          },
        },
        description: "Verification results",
      },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Bad Request" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const file1 = body["file1"];
      const file2 = body["file2"];

      if (!(file1 instanceof File) || !(file2 instanceof File)) {
        return c.json({ error: "Both file1 and file2 are required" }, 400);
      }

      const buffer1 = await file1.arrayBuffer();
      const buffer2 = await file2.arrayBuffer();

      const result = await uniface.verify(buffer1, buffer2);
      return c.json(result);
    } catch (e) {
      return c.json({ error: "Verification failed" }, 500);
    }
  }
);

// 4. Verify Embedding Route (Embedding vs Embedding)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/verify/embedding",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              embedding1: z.array(z.number()),
              embedding2: z.array(z.number()),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              verified: z.boolean(),
              similarity: z.number(),
            }),
          },
        },
        description: "Verification results",
      },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Bad Request" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const { embedding1, embedding2 } = await c.req.json();
      
      if (!embedding1 || !embedding2) {
        return c.json({ error: "Both embedding1 and embedding2 are required" }, 400);
      }

      const emb1 = new Float32Array(embedding1);
      const emb2 = new Float32Array(embedding2);

      const result = await uniface.verifyEmbedding(emb1, emb2);
      return c.json(result);
    } catch (e) {
      return c.json({ error: "Verification failed" }, 500);
    }
  }
);

// 5. Search Route (Image vs DB)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/search",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { "application/json": { schema: SearchResponseSchema } }, description: "Results" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) return c.json({ error: "File required" }, 400);

      const arrayBuffer = await file.arrayBuffer();
      const result = await uniface.recognize(arrayBuffer);
      const inputEmbedding = result.embedding;

      const allFaces = await db.select().from(faces);
      const matches = [];

      for (const face of allFaces) {
        const dbEmbedding = new Float32Array(JSON.parse(face.embedding));
        const verification = await uniface.verifyEmbedding(inputEmbedding, dbEmbedding);
        matches.push({
          face: { id: face.id, name: face.name, createdAt: face.createdAt },
          similarity: verification.similarity,
          verified: verification.verified,
        });
      }

      matches.sort((a, b) => b.similarity - a.similarity);
      return c.json(matches.slice(0, 10));
    } catch (e) {
      console.error(e);
      return c.json({ error: "Internal Error" }, 500);
    }
  }
);

// 6. Search Embedding Route (Embedding vs DB)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/search/embedding",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              embedding: z.array(z.number()),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { "application/json": { schema: SearchResponseSchema } }, description: "Results" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const { embedding } = await c.req.json();
      if (!embedding) return c.json({ error: "Embedding required" }, 400);

      const inputEmbedding = new Float32Array(embedding);

      const allFaces = await db.select().from(faces);
      const matches = [];

      for (const face of allFaces) {
        const dbEmbedding = new Float32Array(JSON.parse(face.embedding));
        const verification = await uniface.verifyEmbedding(inputEmbedding, dbEmbedding);
        matches.push({
          face: { id: face.id, name: face.name, createdAt: face.createdAt },
          similarity: verification.similarity,
          verified: verification.verified,
        });
      }

      matches.sort((a, b) => b.similarity - a.similarity);
      return c.json(matches.slice(0, 10));
    } catch (e) {
      console.error(e);
      return c.json({ error: "Internal Error" }, 500);
    }
  }
);

// 7. KYC Verification Route (Selfie + ID Card)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/kyc",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              selfie: z.instanceof(File).openapi({ type: "string", format: "binary" }),
              id_card: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              verified: z.boolean(),
              similarity: z.number(),
              liveness: z.boolean(),
              message: z.string(),
            }),
          },
        },
        description: "KYC verification results",
      },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Bad Request" },
      500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const selfie = body["selfie"];
      const idCard = body["id_card"];

      if (!(selfie instanceof File) || !(idCard instanceof File)) {
        return c.json({ error: "Both selfie and id_card are required" }, 400);
      }

      const selfieBuffer = await selfie.arrayBuffer();
      const idCardBuffer = await idCard.arrayBuffer();

      // 1. Check Liveness on Selfie
      const selfieResult = await uniface.detect(selfieBuffer);
      if (!selfieResult.box) {
        return c.json({ error: "No face detected in selfie" }, 400);
      }
      const isSpoof = selfieResult.spoofing || false;
      if (isSpoof) {
        return c.json({ 
          verified: false, 
          similarity: 0, 
          liveness: false, 
          message: "Liveness check failed: Spoof detected in selfie" 
        });
      }

      // 2. Verify Selfie vs ID Card
      const verification = await uniface.verify(selfieBuffer, idCardBuffer);

      return c.json({
        verified: verification.verified,
        similarity: verification.similarity,
        liveness: true,
        message: verification.verified ? "KYC Successful" : "Face mismatch between selfie and ID",
      });
    } catch (e) {
      console.error(e);
      return c.json({ error: "KYC verification failed" }, 500);
    }
  }
);

// 8. Spoof Check Route (Reserved)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/spoof",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      501: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              message: z.string(),
            }),
          },
        },
        description: "Not Implemented",
      },
    },
  }),
  async (c) => {
    return c.json({ 
      error: "Not Implemented", 
      message: "This endpoint is reserved for future use pending uniface.spoof() implementation." 
    }, 501);
  }
);

// 9. Enroll Route (Protected)
app.openapi(
  createRoute({
    method: "post",
    path: "/api/enroll",
    middleware: [apiKeyAuth] as any,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              name: z.string(),
              file: z.instanceof(File).openapi({ type: "string", format: "binary" }),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { "application/json": { schema: z.object({ message: z.string() }) } }, description: "Success" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
    },
  }),
  async (c) => {
    try {
      const body = await c.req.parseBody();
      const name = body["name"] as string;
      const file = body["file"];
      if (!name || !(file instanceof File)) return c.json({ error: "Invalid input" }, 400);

      const arrayBuffer = await file.arrayBuffer();
      const result = await uniface.recognize(arrayBuffer);

      await db.insert(faces).values({
        name,
        embedding: JSON.stringify(Array.from(result.embedding)),
      });

      return c.json({ message: "Enrolled successfully" });
    } catch (e) {
      return c.json({ error: "Enroll failed" }, 500);
    }
  }
);

// --- Admin Dashboard (Protected by Basic Auth) ---

const adminAuth = basicAuth({
  username: process.env.ADMIN_USER || "admin",
  password: process.env.ADMIN_PASSWORD || "admin",
});

app.use("/admin/*", adminAuth);

// Dashboard UI
app.get("/admin", async (c) => {
  const keys = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  
  return c.html(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Admin</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 p-8">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-8">
            <h1 class="text-2xl font-bold">API Key Management</h1>
            <form action="/admin/keys" method="post">
              <input type="text" name="name" placeholder="Key Name (e.g. Mobile App)" class="border p-2 rounded mr-2" required />
              <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Generate New Key</button>
            </form>
          </div>

          <div class="bg-white shadow rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prefix</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${keys.map(k => html`
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">${k.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap font-mono text-sm">${k.prefix}...</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${k.createdAt?.toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <form action="/admin/keys/${k.id}/delete" method="post" onsubmit="return confirm('Are you sure?');">
                        <button type="submit" class="text-red-600 hover:text-red-900">Revoke</button>
                      </form>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Generate Key Action
app.post("/admin/keys", async (c) => {
  const body = await c.req.parseBody();
  const name = body["name"] as string;
  const { key, hash, prefix } = await generateApiKey();

  await db.insert(apiKeys).values({ name, keyHash: hash, prefix });

  return c.html(html`
    <div style="font-family: sans-serif; padding: 2rem; max-w: 600px; margin: 0 auto; text-align: center;">
      <h1 style="color: green;">Key Generated!</h1>
      <p>Please copy this key now. You won't be able to see it again.</p>
      <div style="background: #f0f0f0; padding: 1rem; font-family: monospace; font-size: 1.2rem; margin: 1rem 0;">
        ${key}
      </div>
      <a href="/admin" style="color: blue; text-decoration: underline;">Back to Dashboard</a>
    </div>
  `);
});

// Revoke Key Action
app.post("/admin/keys/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"));
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return c.redirect("/admin");
});

// --- Swagger UI ---

app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "x-api-key",
});

app.doc("/doc", {
  openapi: "3.0.0",
  info: { version: "1.0.0", title: "Face Recognition API" },
  security: [{ ApiKeyAuth: [] }],
});

app.get("/ui", swaggerUI({ url: "/doc" }));

export default app;
```

## 6. API Endpoints Summary

| Endpoint | Method | Description | Auth |
| :--- | :--- | :--- | :--- |
| `/api/detect` | `POST` | Detect faces, landmarks, and attributes | API Key |
| `/api/recognize` | `POST` | Generate face embedding from image | API Key |
| `/api/verify` | `POST` | Verify two face images | API Key |
| `/api/verify/embedding` | `POST` | Verify two face embeddings | API Key |
| `/api/search` | `POST` | Search for matching faces in DB (Image) | API Key |
| `/api/search/embedding` | `POST` | Search for matching faces in DB (Embedding) | API Key |
| `/api/kyc` | `POST` | Verify selfie against ID card (e-KYC) | API Key |
| `/api/spoof` | `POST` | **[Reserved]** Check for face spoofing | API Key |
| `/api/enroll` | `POST` | Add a new face to the database | API Key |
| `/admin` | `GET` | Admin Dashboard for API Keys | Basic Auth |
| `/ui` | `GET` | Swagger UI Documentation | Public |
| `/doc` | `GET` | OpenAPI JSON Spec | Public |

## 7. Running the API

Run the development server:

```bash
bun run --watch src/index.ts
```

### Accessing the Dashboard

1.  Go to `http://localhost:3000/admin`
2.  Login with default credentials: `admin` / `admin` (Change these via env vars in production!)
3.  Generate an API Key.
4.  Use that key in the `x-api-key` header when making requests to `/api/search` or `/api/enroll`.

### Accessing Swagger

Visit `http://localhost:3000/ui`. You can authorize using the "Authorize" button and pasting your generated API key.
