/**
 * Skill Registry & Marketplace
 *
 * V2.0: manages skills - builtins, user-installed, and remote registry.
 * Skills are packages of prompts, tools, and context rules.
 */

import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface SkillMeta {
  name: string;
  description: string;
  tools: string[];
  version?: string;
  author?: string;
}

export interface Skill {
  meta: SkillMeta;
  prompt: string;
  rules?: string;
  examples?: string;
}

function builtinsDir(): string {
  return join(import.meta.dirname, "..", "skills", "builtins");
}

function userSkillsDir(): string {
  return join(homedir(), ".anggor", "skills");
}

async function loadSkill(dir: string, name: string): Promise<Skill | null> {
  const skillDir = join(dir, name);

  try {
    await access(skillDir, constants.R_OK);
  } catch {
    return null;
  }

  try {
    const metaRaw = await readFile(join(skillDir, "skill.json"), "utf8");
    const meta = JSON.parse(metaRaw) as SkillMeta;

    let prompt = "";

    try {
      prompt = await readFile(join(skillDir, "prompt.md"), "utf8");
    } catch {
      prompt = meta.description;
    }

    const skill: Skill = { meta, prompt };

    try {
      skill.rules = await readFile(join(skillDir, "rules.md"), "utf8");
    } catch {
      // Rules optional
    }

    try {
      skill.examples = await readFile(join(skillDir, "examples.md"), "utf8");
    } catch {
      // Examples optional
    }

    return skill;
  } catch {
    return null;
  }
}

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  async loadBuiltins(): Promise<string[]> {
    const names: string[] = [];

    try {
      const entries = await readdir(builtinsDir(), { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skill = await loadSkill(builtinsDir(), entry.name);
        if (skill) {
          this.skills.set(entry.name, skill);
          names.push(entry.name);
        }
      }
    } catch {
      // Builtins dir doesn't exist
    }

    return names;
  }

  async loadUserSkills(): Promise<string[]> {
    const names: string[] = [];

    try {
      const entries = await readdir(userSkillsDir(), { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skill = await loadSkill(userSkillsDir(), entry.name);
        if (skill) {
          this.skills.set(entry.name, skill);
          names.push(entry.name);
        }
      }
    } catch {
      // User skills dir doesn't exist
    }

    return names;
  }

  async install(name: string, content: { meta: SkillMeta; prompt: string }): Promise<void> {
    const skillDir = join(userSkillsDir(), name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "skill.json"), JSON.stringify(content.meta, null, 2), "utf8");
    await writeFile(join(skillDir, "prompt.md"), content.prompt, "utf8");
  }

  async remove(name: string): Promise<void> {
    const skillDir = join(userSkillsDir(), name);

    try {
      const { rm } = await import("node:fs/promises");
      await rm(skillDir, { recursive: true, force: true });
    } catch {
      // Already removed
    }

    this.skills.delete(name);
  }

  get(name: string): Skill | null {
    return this.skills.get(name) ?? null;
  }

  list(): SkillMeta[] {
    return [...this.skills.values()].map((s) => s.meta);
  }

  search(query: string): SkillMeta[] {
    const lower = query.toLowerCase();
    return this.list().filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower)
    );
  }
}
