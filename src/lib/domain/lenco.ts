import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function verifyLencoSignature(rawBody: string, signature: string, apiToken: string): boolean {
  if (!signature || !apiToken) return false;
  const key = createHash("sha256").update(apiToken).digest();
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const supplied = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}
export function payloadHash(rawBody: string) { return createHash("sha256").update(rawBody).digest("hex"); }
