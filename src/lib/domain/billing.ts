export const subscriptionStatuses = ["pending_verification", "verification_approved", "invoice_pending", "payment_pending", "active", "grace", "past_due", "suspended", "cancelled", "expired"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];
export type OperationGate = { tenantStatus: string; verificationStatus: string; licenceExpiry: string; subscriptionStatus: SubscriptionStatus; today: string };
export function tenantCanOperate(gate: OperationGate): boolean {
  return gate.tenantStatus === "active" && gate.verificationStatus === "approved" && gate.licenceExpiry >= gate.today && ["active", "grace"].includes(gate.subscriptionStatus);
}
export function assertMinorUnits(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Money must be a non-negative integer in ngwee");
}
export function parseZmwToMinor(value:string):number{const normalized=value.trim();if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))throw new Error("Enter a valid ZMW amount with no more than two decimal places");const[whole,fraction=""]=normalized.split(".");const minor=Number(whole)*100+Number(fraction.padEnd(2,"0"));assertMinorUnits(minor);return minor;}
export function formatMinorToZmw(value:number):string{assertMinorUnits(value);return new Intl.NumberFormat("en-ZM",{style:"currency",currency:"ZMW"}).format(value/100)}
