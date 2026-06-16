import type { Config } from "./config/index.js";
import type { Provider } from "./providers/index.js";

export interface RuntimeContext {
	config: Config;
	provider: Provider;
}
