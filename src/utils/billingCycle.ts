export function getBillingCycleDates(billDay: number) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  let previousBillDate: Date;
  let nextBillDate: Date;

  if (currentDate >= billDay) {
    previousBillDate = new Date(currentYear, currentMonth, billDay);
    nextBillDate = new Date(currentYear, currentMonth + 1, billDay);
  } else {
    previousBillDate = new Date(currentYear, currentMonth - 1, billDay);
    nextBillDate = new Date(currentYear, currentMonth, billDay);
  }

  return { previousBillDate, nextBillDate };
}

export function getDaysUntilReset(nextBillDate: Date): number {
  return Math.ceil(
    (nextBillDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
  );
}
