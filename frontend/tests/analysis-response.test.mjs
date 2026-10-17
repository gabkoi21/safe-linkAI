import assert from "node:assert/strict"
import { test } from "node:test"
import { analyzeFile } from "../src/lib/messageAnalysis.ts"

const common = {
  submission_id: "submission-1",
  report_id: "report-1",
  model_version: "test",
  risk_score: 30,
  risk_level: "low",
  summary: "Test summary",
  recommended_action: "Test action",
  findings: [],
}
const complete = {
  ...common,
  file: {
    file_id: "file-1",
    original_name: "test.txt",
    mime_type: "text/plain",
    size_bytes: 4,
    sha256: "test-hash",
  },
  extraction: {
    method: "text_extraction",
    text: "test",
    pages: null,
    limitations: [],
  },
}
async function respondWith(body, run) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  try {
    await run()
  } finally {
    globalThis.fetch = originalFetch
  }
}
test("file analysis rejects missing file details before rendering", async () => {
  await respondWith(common, async () =>
    assert.rejects(
      analyzeFile(new File(["test"], "test.txt")),
      /incomplete file report/,
    ),
  )
})
test("file analysis rejects malformed risk level and findings", async () => {
  for (const invalid of [
    { ...complete, risk_level: null },
    { ...complete, findings: [{ title: { invalid: true } }] },
    { ...complete, extraction: { ...complete.extraction, limitations: null } },
  ]) {
    await respondWith(invalid, async () =>
      assert.rejects(
        analyzeFile(new File(["test"], "test.txt")),
        /incomplete file report/,
      ),
    )
  }
})
test("complete file analysis remains available for the report", async () => {
  await respondWith(complete, async () =>
    assert.deepEqual(
      await analyzeFile(new File(["test"], "test.txt")),
      complete,
    ),
  )
})
