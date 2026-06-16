/**
 * Manifest Parser
 *
 * Reads common manifest files (package.json, go.mod, Cargo.toml, etc.)
 * and extracts framework, language, ORM, auth, test, and database info.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ManifestResult {
	framework?: string;
	language?: string;
	orm?: string;
	auth?: string;
	testFramework?: string;
	database?: string;
	packageManager?: string;
}

function resolveLanguage(name: string): string | undefined {
	if (name === "package.json") return "TypeScript/JavaScript";
	if (name === "go.mod") return "Go";
	if (name === "Cargo.toml") return "Rust";
	if (name === "composer.json") return "PHP";
	if (name === "requirements.txt" || name === "pyproject.toml" || name === "Pipfile") return "Python";
	if (name === "Gemfile") return "Ruby";
	if (name === "build.gradle" || name === "build.gradle.kts" || name === "pom.xml") return "Java/Kotlin";
	return undefined;
}

function normalizeDepName(name: string): string {
	return name.toLowerCase().trim();
}

interface DepMap {
	framework?: string;
	orm?: string;
	auth?: string;
	test?: string;
	database?: string;
}

function detectFromDeps(deps: string[]): DepMap {
	const set = new Set(deps.map(normalizeDepName));
	const result: DepMap = {};

	// Framework detection
	if (set.has("next")) result.framework = "Next.js";
	else if (set.has("nuxt")) result.framework = "Nuxt";
	else if (set.has("svelte") || set.has("sveltekit")) result.framework = "SvelteKit";
	else if (set.has("react") || set.has("react-dom")) result.framework = "React";
	else if (set.has("vue")) result.framework = "Vue";
	else if (set.has("astro")) result.framework = "Astro";
	else if (set.has("@angular/core")) result.framework = "Angular";
	else if (set.has("express")) result.framework = "Express";
	else if (set.has("fastify")) result.framework = "Fastify";
	else if (set.has("@nestjs/core")) result.framework = "NestJS";
	else if (set.has("hono")) result.framework = "Hono";
	else if (set.has("elysia")) result.framework = "Elysia";
	else if (set.has("laravel/framework")) result.framework = "Laravel";
	else if (set.has("symfony/http-kernel")) result.framework = "Symfony";
	else if (set.has("rails")) result.framework = "Rails";
	else if (set.has("sinatra")) result.framework = "Sinatra";
	else if (set.has("flask")) result.framework = "Flask";
	else if (set.has("django")) result.framework = "Django";
	else if (set.has("fastapi")) result.framework = "FastAPI";
	else if (set.has("actix-web")) result.framework = "Actix Web";
	else if (set.has("axum")) result.framework = "Axum";
	else if (set.has("gin")) result.framework = "Gin";
	else if (set.has("fiber")) result.framework = "Fiber";

	// ORM detection
	if (set.has("prisma") || set.has("@prisma/client")) result.orm = "Prisma";
	else if (set.has("drizzle-orm")) result.orm = "Drizzle";
	else if (set.has("sequelize")) result.orm = "Sequelize";
	else if (set.has("typeorm")) result.orm = "TypeORM";
	else if (set.has("knex")) result.orm = "Knex";
	else if (set.has("mongoose")) result.orm = "Mongoose";
	else if (set.has("mikro-orm") || set.has("@mikro-orm/core")) result.orm = "MikroORM";
	else if (set.has("@prisma/mongodb")) result.orm = "Prisma";
	else if (set.has("laravel/eloquent") || set.has("illuminate/database")) result.orm = "Eloquent";
	else if (set.has("doctrine/orm")) result.orm = "Doctrine";
	else if (set.has("activerecord")) result.orm = "ActiveRecord";
	else if (set.has("sqlalchemy")) result.orm = "SQLAlchemy";
	else if (set.has("diesel")) result.orm = "Diesel";
	else if (set.has("gorm")) result.orm = "GORM";

	// Auth detection
	if (set.has("next-auth") || set.has("@next-auth/prisma-adapter")) result.auth = "NextAuth";
	else if (set.has("lucia") || set.has("lucia-auth")) result.auth = "Lucia";
	else if (set.has("@clerk/nextjs") || set.has("@clerk/backend")) result.auth = "Clerk";
	else if (set.has("better-auth")) result.auth = "Better Auth";
	else if (set.has("passport")) result.auth = "Passport";
	else if (set.has("jsonwebtoken") || set.has("jose")) result.auth = "JWT";
	else if (set.has("firebase-admin")) result.auth = "Firebase Auth";
	else if (set.has("laravel/sanctum")) result.auth = "Sanctum";
	else if (set.has("devise")) result.auth = "Devise";
	else if (set.has("flask-login")) result.auth = "Flask-Login";

	// Test detection
	if (set.has("vitest")) result.test = "Vitest";
	else if (set.has("jest")) result.test = "Jest";
	else if (set.has("mocha")) result.test = "Mocha";
	else if (set.has("ava")) result.test = "Ava";
	else if (set.has("playwright") || set.has("@playwright/test")) result.test = "Playwright";
	else if (set.has("cypress")) result.test = "Cypress";
	else if (set.has("pestphp/pest")) result.test = "Pest";
	else if (set.has("phpunit/phpunit")) result.test = "PHPUnit";
	else if (set.has("rspec")) result.test = "RSpec";
	else if (set.has("pytest")) result.test = "Pytest";

	// Database detection
	if (set.has("pg") || set.has("postgres") || set.has("@vercel/postgres")) result.database = "PostgreSQL";
	else if (set.has("mysql2") || set.has("mysql")) result.database = "MySQL";
	else if (set.has("better-sqlite3") || set.has("sqlite3")) result.database = "SQLite";
	else if (set.has("mongodb") || set.has("mongoose")) result.database = "MongoDB";
	else if (set.has("ioredis") || set.has("redis")) result.database = "Redis";
	else if (set.has("@planetscale/database")) result.database = "PlanetScale";
	else if (set.has("@neondatabase/serverless")) result.database = "Neon";
	else if (set.has("@libsql/client")) result.database = "Turso/LibSQL";
	else if (set.has("@supabase/supabase-js")) result.database = "Supabase";

	return result;
}

function detectPackageManager(deps: string[]): string | undefined {
	const set = new Set(deps.map(normalizeDepName));
	if (set.has("bun") || set.has("@elysiajs/cors")) return "bun";
	if (set.has("yarn")) return "yarn";
	if (set.has("pnpm")) return "pnpm";
	return undefined;
}

export async function parsePackageJson(rootPath: string): Promise<ManifestResult | null> {
	const path = join(rootPath, "package.json");

	try {
		const content = await readFile(path, "utf8");
		const pkg = JSON.parse(content) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};
		const allDeps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];

		const detected = detectFromDeps(allDeps);
		const pm = detectPackageManager(allDeps);

		return {
			language: "TypeScript/JavaScript",
			framework: detected.framework,
			orm: detected.orm,
			auth: detected.auth,
			testFramework: detected.test,
			database: detected.database,
			packageManager: pm ?? "npm",
		};
	} catch {
		return null;
	}
}

async function parseTextManifest(rootPath: string, file: string): Promise<ManifestResult | null> {
	try {
		const content = await readFile(join(rootPath, file), "utf8");
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		const depNames = lines
			.filter((line) => !line.startsWith("#") && !line.startsWith("//"))
			.map((line) => line.split("=")[0].split(">")[0].split("<")[0].split("~")[0].split("^")[0].trim())
			.filter((name) => name.length > 0 && !name.startsWith("module"));

		const detected = detectFromDeps(depNames);

		return {
			language: resolveLanguage(file),
			framework: detected.framework,
			orm: detected.orm,
			auth: detected.auth,
			testFramework: detected.test,
			database: detected.database,
		};
	} catch {
		return null;
	}
}

async function parseComposerJson(rootPath: string): Promise<ManifestResult | null> {
	try {
		const path = join(rootPath, "composer.json");
		const content = await readFile(path, "utf8");
		const composer = JSON.parse(content) as {
			require?: Record<string, string>;
			"require-dev"?: Record<string, string>;
		};
		const allDeps = [...Object.keys(composer.require ?? {}), ...Object.keys(composer["require-dev"] ?? {})];
		const detected = detectFromDeps(allDeps);

		return {
			language: "PHP",
			framework: detected.framework,
			orm: detected.orm,
			auth: detected.auth,
			testFramework: detected.test,
			database: detected.database,
		};
	} catch {
		return null;
	}
}

async function parseGoMod(rootPath: string): Promise<ManifestResult | null> {
	try {
		const content = await readFile(join(rootPath, "go.mod"), "utf8");
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		const moduleLine = lines.find((line) => line.startsWith("module "));
		const moduleName = moduleLine?.split(/\s+/)[1] ?? "";
		const depLines = lines.filter(
			(line) =>
				line.startsWith("require ") ||
				(!line.startsWith("module ") &&
					!line.startsWith("go ") &&
					!line.startsWith("//") &&
					!line.startsWith("exclude ") &&
					!line.startsWith("replace ") &&
					!line.startsWith("retract ") &&
					!line.startsWith("toolchain ")),
		);
		const depNames = depLines
			.filter((line) => line.includes("\t") || line.includes(" "))
			.map((line) => line.split(/\s+/)[0].trim())
			.filter((name) => name.length > 0);

		const detected = detectFromDeps([moduleName, ...depNames]);

		return {
			language: "Go",
			framework: detected.framework,
			orm: detected.orm,
			auth: detected.auth,
			testFramework: detected.test,
			database: detected.database,
		};
	} catch {
		return null;
	}
}

async function parseCargoToml(rootPath: string): Promise<ManifestResult | null> {
	try {
		const content = await readFile(join(rootPath, "Cargo.toml"), "utf8");
		const lines = content.split("\n");
		let inDeps = false;
		const depNames: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed === "[dependencies]" || trimmed === "[dev-dependencies]") {
				inDeps = true;
				continue;
			}
			if (trimmed.startsWith("[") && !trimmed.startsWith("[dependencies")) {
				inDeps = false;
				continue;
			}
			if (inDeps) {
				const name = trimmed.split("=")[0].trim();
				if (name.length > 0 && !name.startsWith("#")) {
					depNames.push(name);
				}
			}
		}

		const detected = detectFromDeps(depNames);

		return {
			language: "Rust",
			framework: detected.framework,
			orm: detected.orm,
			auth: detected.auth,
			testFramework: detected.test,
			database: detected.database,
		};
	} catch {
		return null;
	}
}

export async function parseManifest(rootPath: string): Promise<ManifestResult[]> {
	const results: ManifestResult[] = [];
	const parsers: Array<{ file: string; parse: (root: string) => Promise<ManifestResult | null> }> = [
		{ file: "package.json", parse: parsePackageJson },
		{ file: "go.mod", parse: parseGoMod },
		{ file: "Cargo.toml", parse: parseCargoToml },
		{ file: "composer.json", parse: parseComposerJson },
		{ file: "requirements.txt", parse: (r) => parseTextManifest(r, "requirements.txt") },
		{ file: "pyproject.toml", parse: (r) => parseTextManifest(r, "pyproject.toml") },
		{ file: "Gemfile", parse: (r) => parseTextManifest(r, "Gemfile") },
	];

	for (const { parse } of parsers) {
		const result = await parse(rootPath);
		if (result) {
			results.push(result);
		}
	}

	return results;
}
