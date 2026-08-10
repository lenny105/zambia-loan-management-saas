export type InstalmentBalance = { due_date: string; principal_minor: number; interest_minor: number; fees_minor: number; paid_minor: number };
export type RepaymentBalance = { amount_minor: number; reversed_at: string | null };
export function portfolioMetrics(instalments: InstalmentBalance[], repayments: RepaymentBalance[], asOf: string, thirtyDaysAgo: string) {
  const balance = (row: InstalmentBalance) => Math.max(0, row.principal_minor + row.interest_minor + row.fees_minor - row.paid_minor);
  const outstandingMinor = instalments.reduce((total, row) => total + balance(row), 0);
  const pastDueMinor = instalments.filter((row) => row.due_date < asOf).reduce((total, row) => total + balance(row), 0);
  const par30Minor = instalments.filter((row) => row.due_date < thirtyDaysAgo).reduce((total, row) => total + balance(row), 0);
  const receivedMinor = repayments.filter((row) => !row.reversed_at).reduce((total, row) => total + row.amount_minor, 0);
  return { outstandingMinor, pastDueMinor, par30Minor, par30Percent: outstandingMinor ? par30Minor / outstandingMinor * 100 : 0, receivedMinor };
}
