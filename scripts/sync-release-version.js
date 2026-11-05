import { spawnSync } from "node:child_process"
import { appendFileSync } from "node:fs"
import { join } from "node:path"
import { assertEnv, run, runMain } from "./utils.js"

function main() {
  assertEnv("GITHUB_OUTPUT", "VERSION")

  const packageDir = process.env.PACKAGE_DIR ?? "."

  run(["npm", "pkg", "set", `version=${process.env.VERSION}`], { cwd: packageDir })
  run(["bun", "install"])

  const changed = spawnSync("git", ["diff", "--quiet", "--", join(packageDir, "package.json"), "bun.lock"]).status !== 0
  if (changed) appendFileSync(process.env.GITHUB_OUTPUT, "changed=true\n")
  console.log(
    changed ? `Package version synced to ${process.env.VERSION}.` : `Package version already ${process.env.VERSION}.`,
  )
}

await runMain(main)
