import type { App } from "obsidian";
import { runCommand } from "./ecosystem";

/**
 * The slice of the Qiaomu Agent API (Qiaomu Context Protocol v1, `plugin.api` on "qiaomu-agent") Home uses.
 * `compose` is an optional v1 addition: open a fresh conversation with a draft and, when `submit` is true, send it.
 */
interface AgentApi {
  protocol: "qiaomu-agent";
  version: number;
  compose?(request: { prompt: string; submit?: boolean }): Promise<void>;
}

function agentApi(app: App): AgentApi | null {
  const plugins = (app as App & { plugins?: { plugins?: Record<string, { api?: unknown }> } }).plugins?.plugins;
  const api = plugins?.["qiaomu-agent"]?.api as Partial<AgentApi> | undefined;
  return api?.protocol === "qiaomu-agent" && api.version === 1 ? api as AgentApi : null;
}

/** True when an enabled Qiaomu Agent can receive a question from Home. */
export function canAsk(app: App): boolean {
  return agentApi(app) !== null;
}

/** Sends the question to Qiaomu Agent. Older Agent versions without `compose` just open, so the user can paste. */
export async function askAgent(app: App, prompt: string): Promise<void> {
  const api = agentApi(app);
  if (api && typeof api.compose === "function") {
    await api.compose({ prompt, submit: true });
    return;
  }
  runCommand(app, "qiaomu-agent:open-agent");
}
