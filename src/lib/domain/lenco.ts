import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function verifyLencoSignature(rawBody: string, signature: string, apiToken: string): boolean {
  if (!signature || !apiToken) return false;
  const key = createHash("sha256").update(apiToken).digest("hex");
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const supplied = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}
export function payloadHash(rawBody: string) { return createHash("sha256").update(rawBody).digest("hex"); }
export function normalizeZambianPhone(value:string):string{const digits=value.replace(/\D/g,"");if(/^0[79]\d{8}$/.test(digits))return`+260${digits.slice(1)}`;if(/^260[79]\d{8}$/.test(digits))return`+${digits}`;throw new Error("Enter a valid Zambian mobile number");}
export function enabledLencoOperators(value:string){const allowed=["mtn","airtel","zamtel"] as const;return allowed.filter(operator=>value.split(",").map(v=>v.trim().toLowerCase()).includes(operator));}
