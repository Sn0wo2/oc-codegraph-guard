import { appendFileSync } from "node:fs"
import semver from "semver"
import { assertEnv, runMain } from "./utils.js"

function main() {
  assertEnv("GITHUB_OUTPUT", "GITHUB_ENV")

  const raw = process.argv[2] ?? process.env.GITHUB_REF_NAME
  if (!raw) throw new Error("Release version is not set")

  const version = semver.valid(raw)
  if (!version) throw new Error(`Invalid semantic version: ${raw}`)

  const distTag = semver.prerelease(version) ? "next" : "latest"
  appendFileSync(process.env.GITHUB_ENV, `VERSION=${version}\n`)
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ndist-tag=${distTag}\n`)
  console.log(`Release version ${version} (dist-tag ${distTag})`)
}

await runMain(main)
