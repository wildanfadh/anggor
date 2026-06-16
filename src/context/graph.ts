/**
 * Project Graph
 *
 * Visual representation of detected project technologies.
 */

import type { ProjectInfo } from "./scanner.js";

export class ProjectGraph {
	// TODO: Format project info as a tree/graph
	format(info: ProjectInfo): string {
		const lines: string[] = ["Project Graph"];
		if (info.framework) lines.push(`├── Framework: ${info.framework}`);
		if (info.language) lines.push(`├── Language: ${info.language}`);
		if (info.orm) lines.push(`├── ORM: ${info.orm}`);
		if (info.auth) lines.push(`├── Auth: ${info.auth}`);
		if (info.testFramework) lines.push(`├── Test: ${info.testFramework}`);
		if (info.database) lines.push(`└── Database: ${info.database}`);
		return lines.join("\n");
	}
}
