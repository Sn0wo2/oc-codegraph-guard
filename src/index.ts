import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Plugin } from "@opencode/plugin";

export default Plugin.define({
  id: "oc-codegraph-guard",
  setup: async (ctx) => {
    const exists = () => {
      let directory = resolve(ctx.location.directory);
      for (;;) {
        if (existsSync(join(directory, ".codegraph", "codegraph.db")))
          return true;
        const parent = dirname(directory);
        if (parent === directory) return false;
        directory = parent;
      }
    };

    const registration = await ctx.mcp.transform((servers) => {
      if (!exists() && servers.get("codegraph")) servers.remove("codegraph");
    });

    let ready = exists();
    const timer = setInterval(() => {
      const next = exists();
      if (next === ready) return;
      ctx.mcp
        .reload()
        .then(() => {
          ready = next;
        })
        .catch((error) =>
          console.error("oc-codegraph-guard: MCP reload failed", error),
        );
    }, 1000);
    timer.unref();

    return async () => {
      clearInterval(timer);
      await registration.dispose();
    };
  },
});
