export type GlobalFlag = "help" | "version" | "dryRun" | "cost";

export type TopLevelCommandName =
	| "chat"
	| "oneshot"
	| "plan"
	| "status"
	| "review"
	| "explain"
	| "commit"
	| "resume"
	| "mcp"
	| "skill"
	| "provider"
	| "cost"
	| "plugin"
	| "extension"
	| "config";

export interface ParsedBaseCommand {
	name: TopLevelCommandName;
	rawArgs: string[];
	flags: GlobalFlag[];
}

export interface ChatCommand extends ParsedBaseCommand {
	name: "chat";
}

export interface OneShotCommand extends ParsedBaseCommand {
	name: "oneshot";
	prompt: string;
}

export interface PlanCommand extends ParsedBaseCommand {
	name: "plan";
	prompt: string;
}

export interface ReviewCommand extends ParsedBaseCommand {
	name: "review";
}

export interface ExplainCommand extends ParsedBaseCommand {
	name: "explain";
	target: string;
}

export interface CommitCommand extends ParsedBaseCommand {
	name: "commit";
}

export interface ResumeCommand extends ParsedBaseCommand {
	name: "resume";
}

export type GroupSubcommand = string | undefined;

export interface McpCommand extends ParsedBaseCommand {
	name: "mcp";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface SkillCommand extends ParsedBaseCommand {
	name: "skill";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface ProviderCommand extends ParsedBaseCommand {
	name: "provider";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface CostCommand extends ParsedBaseCommand {
	name: "cost";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface PluginCommand extends ParsedBaseCommand {
	name: "plugin";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface ExtensionCommand extends ParsedBaseCommand {
	name: "extension";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface ConfigCommand extends ParsedBaseCommand {
	name: "config";
	subcommand?: GroupSubcommand;
	args: string[];
}

export interface StatusCommand extends ParsedBaseCommand {
	name: "status";
}

export type ParsedCommand =
	| ChatCommand
	| OneShotCommand
	| PlanCommand
	| StatusCommand
	| ReviewCommand
	| ExplainCommand
	| CommitCommand
	| ResumeCommand
	| McpCommand
	| SkillCommand
	| ProviderCommand
	| CostCommand
	| PluginCommand
	| ExtensionCommand
	| ConfigCommand;

export interface ParseResultSuccess {
	ok: true;
	command: ParsedCommand;
}

export interface ParseResultError {
	ok: false;
	error: string;
}

export type ParseResult = ParseResultSuccess | ParseResultError;
