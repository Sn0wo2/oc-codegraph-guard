import { spawnSync } from "node:child_process"
import { appendFileSync } from "node:fs"
import { join } from "node:path"
import { assertEnv, run, runMain } from "./utils.js"

function main() {
  assertEnv("GITHUB_OUTPUT", "VERSION", "GH_TOKEN", "DEFAULT_BRANCH")

  const version = process.env.VERSION
  const tag = `v${version}`
  const defaultBranch = process.env.DEFAULT_BRANCH
  const packageDir = process.env.PACKAGE_DIR ?? "."
  const push = (...command) => run(["git", "-c", "credential.helper=!gh auth git-credential", "push", ...command])

  run(["git", "config", "user.name", "github-actions[bot]"])
  run(["git", "config", "user.email", "github-actions[bot]@users.noreply.github.com"])
  run(["git", "add", "-u", "--", join(packageDir, "package.json"), "bun.lock"])

  const tagExists = spawnSync("git", ["show-ref", "--verify", "--quiet", `refs/tags/${tag}`]).status === 0
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"]).status !== 0
  if (!staged && tagExists) {
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${run(["git", "rev-parse", "HEAD"])}\n`)
    console.log(`Tag ${tag} already points at the checked version; nothing to commit.`)
    return
  }

  if (staged) run(["git", "commit", "-m", `chore(release): bump version to ${version}`])
  const releaseSha = run(["git", "rev-parse", "HEAD"])

  if (tagExists) {
    run(["git", "fetch", "origin", defaultBranch])
    run(["git", "checkout", "--detach", "FETCH_HEAD"])
    const picked = spawnSync("git", ["cherry-pick", releaseSha], { encoding: "utf8" })
    if (picked.status !== 0) {
      if (spawnSync("git", ["diff", "--cached", "--quiet"]).status !== 0) {
        throw new Error(`\`git cherry-pick ${releaseSha}\` failed: ${picked.stderr?.trim() || picked.stdout?.trim()}`)
      }
      run(["git", "cherry-pick", "--skip"])
      console.log(`Version bump for ${tag} is already on ${defaultBranch}; nothing to cherry-pick.`)
    } else {
      push("origin", `HEAD:refs/heads/${defaultBranch}`)
      console.log(`Cherry-picked the version bump for ${tag} onto ${defaultBranch}.`)
    }
  } else {
    run(["git", "tag", tag])
    push("--atomic", "origin", `HEAD:refs/heads/${defaultBranch}`, `refs/tags/${tag}`)
    console.log(`Tagged ${tag} and pushed it with ${defaultBranch}.`)
  }

  appendFileSync(process.env.GITHUB_OUTPUT, `sha=${releaseSha}\n`)
}

await runMain(main)
