import type { App } from "obsidian";
import { describe, expect, it } from "vitest";
import { connectionsChanged, connectionSnapshot, connectionState } from "../src/connections";

describe("provider availability", () => {
  it("does not treat a missing interface in a current plugin as an outdated release", () => {
    const app = { plugins: { plugins: { reader: { manifest: { version: "99.0.0" } } } } } as unknown as App;
    expect(connectionState(app, "reader")).toBe("unavailable");
    expect(connectionState(app, "absent")).toBe("unavailable");
  });

  it("detects late registration, removal and replacement even without a Home change event", () => {
    const host: Record<string, { qiaomuHome?: unknown }> = { reader: {} };
    const app = { plugins: { plugins: host } } as unknown as App;
    let previous = connectionSnapshot(app);
    expect(connectionsChanged(previous, connectionSnapshot(app))).toBe(false);
    host.reader.qiaomuHome = { protocol: "qiaomu-home", version: 1, sections: () => [] };
    expect(connectionsChanged(previous, connectionSnapshot(app))).toBe(true);
    expect(connectionState(app, "reader")).toBe("ready");
    previous = connectionSnapshot(app);
    host.reader = { qiaomuHome: host.reader.qiaomuHome };
    expect(connectionsChanged(previous, connectionSnapshot(app))).toBe(true);
    previous = connectionSnapshot(app);
    delete host.reader;
    expect(connectionsChanged(previous, connectionSnapshot(app))).toBe(true);
  });

  it("distinguishes incompatible interfaces from missing connections", () => {
    const plugin = { qiaomuHome: { protocol: "qiaomu-home", version: 2, sections: () => [] } };
    const app = { plugins: { plugins: { reader: plugin } } } as unknown as App;
    expect(connectionState(app, "reader")).toBe("incompatible");
    plugin.qiaomuHome.version = 1;
    expect(connectionState(app, "reader")).toBe("ready");
  });
});
