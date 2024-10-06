import { Hono } from "hono";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { users, codeSnippets, tags, codeSnippetTags } from "./db/schema";
import { eq, and } from "drizzle-orm";
import {
	authHandler,
	initAuthConfig,
	verifyAuth,
	type AuthConfig,
} from "@hono/auth-js";
import GitHub from "@auth/core/providers/github";

export type Env = {
	TURSO_CONNECTION_URL: string;
	TURSO_AUTH_TOKEN: string;
	AUTH_SECRET: string;
	AUTH_URL: string;
	AUTH_GITHUB_ID: string;
	AUTH_GITHUB_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

function getAuthConfig(c: { env: Env }): AuthConfig {
	return {
		secret: c.env.AUTH_SECRET,
		providers: [
			GitHub({
				clientId: c.env.AUTH_GITHUB_ID,
				clientSecret: c.env.AUTH_GITHUB_SECRET,
			}),
		],
	};
}

const getDb = (c: { env: Env }) =>
	drizzle(
		createClient({
			url: c.env.TURSO_CONNECTION_URL,
			authToken: c.env.TURSO_AUTH_TOKEN,
		}),
	);

app.use("*", initAuthConfig(getAuthConfig));
app.use("/api/auth/*", authHandler())

app.use("/api/*", verifyAuth());

app.get("/api/protected", (c) => {
	const auth = c.get("authUser");
	return c.json(auth);
});

// User CRUD
app.get("/api/users", async (c) => {
	const auth = c.get("authUser");
	console.log("🚀 ~ file: index.ts:58 ~ app.get ~ auth:", auth)

	const db = getDb(c);
	const result = await db.select().from(users);
	return c.json(result);
});
app.post("/api/users", async (c) => {
	const db = getDb(c);
	const userData = await c.req.json();
	const result = await db.insert(users).values(userData).returning();
	return c.json(result[0]);
});

app.get("/api/users/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	const result = await db.select().from(users).where(eq(users.id, id));
	return result.length > 0 ? c.json(result[0]) : c.notFound();
});

app.put("/api/users/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	const userData = await c.req.json();
	const result = await db
		.update(users)
		.set(userData)
		.where(eq(users.id, id))
		.returning();
	return result.length > 0 ? c.json(result[0]) : c.notFound();
});

app.delete("/api/users/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	await db.delete(users).where(eq(users.id, id));
	return c.json({ message: "User deleted successfully" });
});

// Code Snippet CRUD
app.post("/api/snippets", async (c) => {
	const db = getDb(c);
	const snippetData = await c.req.json();
	const result = await db.insert(codeSnippets).values(snippetData).returning();
	return c.json(result[0]);
});

app.get("/api/snippets/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	const result = await db
		.select()
		.from(codeSnippets)
		.where(eq(codeSnippets.id, id));
	return result.length > 0 ? c.json(result[0]) : c.notFound();
});

app.put("/api/snippets/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	const snippetData = await c.req.json();
	const result = await db
		.update(codeSnippets)
		.set(snippetData)
		.where(eq(codeSnippets.id, id))
		.returning();
	return result.length > 0 ? c.json(result[0]) : c.notFound();
});

app.delete("/api/snippets/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	await db.delete(codeSnippets).where(eq(codeSnippets.id, id));
	return c.json({ message: "Code snippet deleted successfully" });
});

// Tag CRUD
app.post("/api/tags", async (c) => {
	const db = getDb(c);
	const tagData = await c.req.json();
	const result = await db.insert(tags).values(tagData).returning();
	return c.json(result[0]);
});

app.get("/api/tags/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	const result = await db.select().from(tags).where(eq(tags.id, id));
	return result.length > 0 ? c.json(result[0]) : c.notFound();
});

app.put("/api/tags/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	const tagData = await c.req.json();
	const result = await db
		.update(tags)
		.set(tagData)
		.where(eq(tags.id, id))
		.returning();
	return result.length > 0 ? c.json(result[0]) : c.notFound();
});

app.delete("/api/tags/:id", async (c) => {
	const db = getDb(c);
	const id = c.req.param("id");
	await db.delete(tags).where(eq(tags.id, id));
	return c.json({ message: "Tag deleted successfully" });
});

// Additional routes for managing code snippet tags
app.post("/api/snippets/:snippetId/tags/:tagId", async (c) => {
	const db = getDb(c);
	const snippetId = c.req.param("snippetId");
	const tagId = c.req.param("tagId");
	await db.insert(codeSnippetTags).values({ snippetId, tagId });
	return c.json({ message: "Tag added to code snippet successfully" });
});

app.delete("/api/snippets/:snippetId/tags/:tagId", async (c) => {
	const db = getDb(c);
	const snippetId = c.req.param("snippetId");
	const tagId = c.req.param("tagId");
	await db
		.delete(codeSnippetTags)
		.where(
			and(
				eq(codeSnippetTags.snippetId, snippetId),
				eq(codeSnippetTags.tagId, tagId),
			),
		);
	return c.json({ message: "Tag removed from code snippet successfully" });
});

export default app;
