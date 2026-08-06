import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLencoSignature } from "./lenco";
describe("Lenco signature", () => {
  it("accepts an exact HMAC and rejects forgery", () => { const body='{"status":"successful"}'; const token="secret"; const key=createHash("sha256").update(token).digest(); const sig=createHmac("sha512",key).update(body).digest("hex"); expect(verifyLencoSignature(body,sig,token)).toBe(true); expect(verifyLencoSignature(body,"0".repeat(128),token)).toBe(false); });
});
