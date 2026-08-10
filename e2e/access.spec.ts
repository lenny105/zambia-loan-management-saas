import { expect, test } from "@playwright/test";

test.describe("protected routes", () => {
  for (const path of ["/onboarding", "/operations", "/workspace", "/workspace/reminders", "/workspace/reports", "/portal"]) {
    test(`${path} redirects an unauthenticated request`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers().location).toBe("/auth/sign-in");
    });
  }
});

test("sign-in clearly routes borrowers and new lenders", async ({ page }) => {
  await page.goto("/auth/sign-in");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send secure code" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Looking for a loan/ })).toHaveAttribute("href", "/borrow");
  await expect(page.getByRole("link", { name: /New lender/ })).toHaveAttribute("href", "/onboarding");
});

test("staff invitations preserve their secure return route", async ({ request }) => {
  const response = await request.get("/invite/example-secure-invitation-token", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/auth/sign-in?next=");
  expect(decodeURIComponent(response.headers().location ?? "")).toContain("/invite/example-secure-invitation-token");
});
