export const subscriptionStatuses = ["pending_verification", "verification_approved", "invoice_pending", "payment_pending", "active", "grace", "past_due", "suspended", "cancelled", "expired"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];
export type OperationGate = { tenantStatus: string; verificationStatus: string; licenceExpiry: string; subscriptionStatus: SubscriptionStatus; today: string };
export function tenantCanOperate(gate: OperationGate): boolean {
  return gate.tenantStatus === "active" && gate.verificationStatus === "approved" && gate.licenceExpiry >= gate.today && ["active", "grace"].includes(gate.subscriptionStatus);
}
export function assertMinorUnits(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Money must be a non-negative integer in ngwee");
}
