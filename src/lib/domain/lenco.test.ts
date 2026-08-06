import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { enabledLencoOperators, normalizeZambianPhone, verifyLencoSignature } from "./lenco";
describe("Lenco signature", () => {
  it("accepts Lenco's documented hex-derived HMAC and rejects forgery", () => { const body='{"status":"successful"}'; const token="secret"; const key=createHash("sha256").update(token).digest("hex"); const sig=createHmac("sha512",key).update(body).digest("hex"); expect(verifyLencoSignature(body,sig,token)).toBe(true); expect(verifyLencoSignature(body,"0".repeat(128),token)).toBe(false); });
  it("does not confuse raw digest bytes with the documented hex key",()=>{const body="{}",token="secret";const rawKey=createHash("sha256").update(token).digest();const wrong=createHmac("sha512",rawKey).update(body).digest("hex");expect(verifyLencoSignature(body,wrong,token)).toBe(false)});
});
describe("Zambian collection input",()=>{it.each([["0971234567","+260971234567"],["+260 76 123 4567","+260761234567"]])("normalizes %s",(input,expected)=>expect(normalizeZambianPhone(input)).toBe(expected));it("rejects a non-Zambian number",()=>expect(()=>normalizeZambianPhone("123")).toThrow());it("shows only configured supported operators",()=>expect(enabledLencoOperators("mtn,zamtel,unknown")).toEqual(["mtn","zamtel"]))});
