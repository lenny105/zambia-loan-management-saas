import { describe, expect, it } from "vitest";
import { assertMinorUnits, parseZmwToMinor, tenantCanOperate } from "./billing";

const base = { tenantStatus: "active", verificationStatus: "approved", licenceExpiry: "2027-01-01", subscriptionStatus: "active" as const, today: "2026-08-06" };
describe("operation gate", () => {
  it("allows only an approved, licensed, paid, active tenant", () => expect(tenantCanOperate(base)).toBe(true));
  it.each([{...base, verificationStatus:"submitted"},{...base, subscriptionStatus:"payment_pending" as const},{...base, tenantStatus:"suspended"},{...base, licenceExpiry:"2026-01-01"}])("blocks ineligible state", state => expect(tenantCanOperate(state)).toBe(false));
  it("requires integer ngwee", () => { expect(() => assertMinorUnits(1050)).not.toThrow(); expect(() => assertMinorUnits(10.5)).toThrow(); });
  it.each([["1",100],["1.5",150],["1.05",105],["1250.99",125099]])("parses %s without floating-point arithmetic",(input,expected)=>expect(parseZmwToMinor(input as string)).toBe(expected));
  it.each(["1.999","-1","K 10","1e3",""])("rejects invalid amount %s",input=>expect(()=>parseZmwToMinor(input)).toThrow());
});
