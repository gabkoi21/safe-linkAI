import assert from "node:assert/strict"
import { chromium } from "@playwright/test"

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
})
try {
  const page = await browser.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/api/v1/analysis/file", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        submission_id: "file-submission-test",
        report_id: "report-test",
        model_version: "test",
        risk_score: 20,
        risk_level: "low",
        summary: "Test file report",
        recommended_action: "Verify the source",
        findings: [],
        file: {
          file_id: "file-test",
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
      }),
    }),
  )
  await page.goto(process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:5188/")
  await page.getByRole("tab", { name: "File", exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: "test.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  })
  await page.getByRole("button", { name: "Analyze File" }).click()
  await page.getByRole("dialog", { name: "SafeLink AI" }).waitFor()
  await page.getByText("Test file report", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Close report" }).click()
  await page
    .locator(".submission-row")
    .filter({ hasText: "test.txt" })
    .waitFor()
  await page
    .getByRole("searchbox")
    .count()
    .catch(() => 0)
  await page
    .getByRole("textbox", { name: "Search your submissions" })
    .fill("test.txt")
  assert.equal(await page.locator(".submission-row").count(), 1)
  await page.locator(".submission-row").click()
  await page.getByRole("dialog", { name: "SafeLink AI" }).waitFor()
  assert.deepEqual(errors, [])
  console.log(
    "PASS: file result renders, submission history filters, and report reopens without browser errors",
  )
} finally {
  await browser.close()
}
