import { appendFileSync } from "node:fs"
import { GraphQLClient } from "graphql-request"
import { assertEnv, runMain } from "./utils.js"

async function main() {
  assertEnv("GITHUB_REPOSITORY", "GH_TOKEN", "GITHUB_OUTPUT")

  const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME
  if (!tag) throw new Error("Release tag is not set")

  const [owner, name] = process.env.GITHUB_REPOSITORY.split("/")
  if (!(owner && name)) throw new Error("GITHUB_REPOSITORY must be in owner/name format")

  const client = new GraphQLClient(process.env.GITHUB_GRAPHQL_URL ?? "https://api.github.com/graphql", {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}` },
    signal: AbortSignal.timeout(30_000),
  })
  const { repository } = await client.request(
    `query($owner: String!, $name: String!, $tag: String!) {
      repository(owner: $owner, name: $name) {
        release(tagName: $tag) { isDraft }
      }
    }`,
    { owner, name, tag },
  )

  const release = repository?.release
  const skip = release != null && !release.isDraft
  appendFileSync(process.env.GITHUB_OUTPUT, `skip=${skip}\n`)
  console.log(skip ? `Release ${tag} is already published; skipping.` : `Release ${tag} is not published; continuing.`)
}

await runMain(main)
