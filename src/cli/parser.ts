import type {
	CommitCommand,
	ConfigCommand,
	CostCommand,
	ExplainCommand,
	ExtensionCommand,
	GlobalFlag,
	McpCommand,
	ParseResult,
	PlanCommand,
	PluginCommand,
	ProviderCommand,
	ResumeCommand,
	ReviewCommand,
	SkillCommand,
	StatusCommand,
} from "./types.js";

const GLOBAL_FLAG_MAP: Record<string, GlobalFlag> = {
	"--help": "help",
	"-h": "help",
	"--version": "version",
	"-v": "version",
	"--dry-run": "dryRun",
	"--cost": "cost",
};

function isGlobalFlag(arg: string): arg is keyof typeof GLOBAL_FLAG_MAP {
	return arg in GLOBAL_FLAG_MAP;
}

function extractGlobalFlags(argv: string[]): {
	flags: GlobalFlag[];
	positional: string[];
} {
	const flags: GlobalFlag[] = [];
	const positional: string[] = [];

	for (const arg of argv) {
		if (isGlobalFlag(arg)) {
			const mappedFlag = GLOBAL_FLAG_MAP[arg];
			if (!flags.includes(mappedFlag)) {
				flags.push(mappedFlag);
			}
			continue;
		}

		positional.push(arg);
	}

	return { flags, positional };
}

function createSimpleCommand<T extends CommitCommand | ResumeCommand | ReviewCommand | StatusCommand>(
	name: T["name"],
	rawArgs: string[],
	flags: GlobalFlag[],
): T {
	return { name, rawArgs, flags } as T;
}

function createGroupCommand(
	name: "mcp" | "skill" | "provider" | "cost" | "plugin" | "extension" | "config",
	rawArgs: string[],
	flags: GlobalFlag[],
	args: string[],
): McpCommand | SkillCommand | ProviderCommand | CostCommand | PluginCommand | ExtensionCommand | ConfigCommand {
	const [subcommand, ...restArgs] = args;
	return {
		name,
		rawArgs,
		flags,
		subcommand,
		args: restArgs,
	};
}

function missingArgumentError(command: string, usage: string): ParseResult {
	return {
		ok: false,
		error: `Missing argument for \`${command}\`. Usage: ${usage}`,
	};
}

export function parseArgv(argv: string[]): ParseResult {
	const rawArgs = [...argv];
	const { flags, positional } = extractGlobalFlags(argv);

	if (positional.length === 0) {
		return {
			ok: true,
			command: {
				name: "chat",
				rawArgs,
				flags,
			},
		};
	}

	const [head, ...tail] = positional;

	switch (head) {
		case "plan": {
			if (tail.length === 0) {
				return missingArgumentError("plan", 'anggor plan "<prompt>"');
			}

			const command: PlanCommand = {
				name: "plan",
				rawArgs,
				flags,
				prompt: tail.join(" "),
			};

			return { ok: true, command };
		}

		case "review":
			return { ok: true, command: createSimpleCommand("review", rawArgs, flags) };

		case "explain": {
			if (tail.length === 0) {
				return missingArgumentError("explain", "anggor explain <file>");
			}

			const command: ExplainCommand = {
				name: "explain",
				rawArgs,
				flags,
				target: tail[0],
			};

			return { ok: true, command };
		}

		case "commit":
			return { ok: true, command: createSimpleCommand("commit", rawArgs, flags) };

		case "status":
			return { ok: true, command: createSimpleCommand("status", rawArgs, flags) };

		case "resume":
			return { ok: true, command: createSimpleCommand("resume", rawArgs, flags) };

		case "mcp":
			return {
				ok: true,
				command: createGroupCommand("mcp", rawArgs, flags, tail),
			};

		case "skill":
			return {
				ok: true,
				command: createGroupCommand("skill", rawArgs, flags, tail),
			};

		case "provider":
			return {
				ok: true,
				command: createGroupCommand("provider", rawArgs, flags, tail),
			};

		case "cost":
			return {
				ok: true,
				command: createGroupCommand("cost", rawArgs, flags, tail),
			};

		case "plugin":
			return {
				ok: true,
				command: createGroupCommand("plugin", rawArgs, flags, tail),
			};

		case "extension":
			return {
				ok: true,
				command: createGroupCommand("extension", rawArgs, flags, tail),
			};

		case "config":
			return {
				ok: true,
				command: createGroupCommand("config", rawArgs, flags, tail),
			};

		default:
			return {
				ok: true,
				command: {
					name: "oneshot",
					rawArgs,
					flags,
					prompt: positional.join(" "),
				},
			};
	}
}
