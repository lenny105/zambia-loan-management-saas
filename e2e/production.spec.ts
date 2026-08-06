import { expect, test } from "@playwright/test";

test("public homepage and sign-in are available", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ZamLoan by EZER-X/);
  await expect(page.getByRole("heading", { name: /Lending operations/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create lender account" }).first()).toBeVisible();
  await page.goto("/auth/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("protected application routes require authentication", async ({ request }) => {
  for (const path of ["/onboarding", "/billing/plans", "/operations"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    expect(response.headers().location, path).toBe("/auth/sign-in");
  }
});

test("unsigned provider webhooks are rejected", async ({ request }) => {
  for (const path of ["/api/webhooks/resend", "/api/webhooks/lenco"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status(), path).toBe(401);
  }
});

test("health endpoint and production security headers are present", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  await expect(health.json()).resolves.toMatchObject({ status: "ok" });

  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
});
