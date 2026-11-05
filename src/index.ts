import { join } from "node:path"
import { Plugin } from "@opencode/plugin"
import { findUpSync } from "find-up"

export default Plugin.define({
  id: "oc-codegraph-guard",
  setup: async (ctx) => {
    const exists = () => findUpSync(join(".codegraph", "codegraph.db"), { cwd: ctx.location.directory }) !== undefined

    const registration = await ctx.mcp.transform((servers) => {
      if (!exists() && servers.get("codegraph")) servers.remove("codegraph")
    })

    let ready = exists()
    const timer = setInterval(() => {
      const next = exists()
      if (next === ready) return
      ctx.mcp
        .reload()
        .then(() => {
          ready = next
        })
        .catch((error) => console.error("oc-codegraph-guard: MCP reload failed", error))
    }, 1000)
    timer.unref()

    return async () => {
      clearInterval(timer)
      await registration.dispose()
    }
  },
})
