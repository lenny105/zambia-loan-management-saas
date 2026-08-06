import { expect, test } from "@playwright/test";

test.describe("protected routes", () => {
  for (const path of ["/onboarding", "/operations"]) {
    test(`${path} redirects an unauthenticated request`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers().location).toBe("/auth/sign-in");
    });
  }
});
