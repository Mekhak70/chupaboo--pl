export type Person = "mkho" | "diana";
export const people: Record<Person, string> = { mkho: "Մխո", diana: "Դիանա" };
export type SaleSection = "cake";
export const saleSections: Record<SaleSection, string> = {
  cake: "Վաճառված տորթեր",
};
export interface Expense {
  id: string; person: Person; expense_date: string; description: string;
  amount: number; expense_type: "operating";
}
export interface SaleItem {
  product_id: string; name: string; section: SaleSection; quantity: number;
  unit_price: number; unit_cost: number | null; options: Record<string, unknown> | null;
  ingredient: string | null; image: string | null;
}
export interface FinanceOrder {
  id: string; created_at: string; business_date: string; sold_at: string | null;
  status: "pending" | "sold" | "cancelled"; phone: string;
  delivery_info: Record<string, unknown>; items: SaleItem[];
  delivery_fee: number; product_total: number;
}
export const money = (value: number) => new Intl.NumberFormat("hy-AM", {
  style: "currency", currency: "PLN", maximumFractionDigits: 2,
}).format(value);
export function today() {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  return `${p.find(x => x.type === "year")!.value}-${p.find(x => x.type === "month")!.value}-${p.find(x => x.type === "day")!.value}`;
}
export const firstDay = () => `${today().slice(0,7)}-01`;
export function errorText(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Գործողությունը չհաջողվեց։";
}
// Work in integer minor units so repeated sums do not accumulate float errors.
export const minor = (amount: number) => Math.round(Number(amount) * 100);
export function summarize(orders: FinanceOrder[], expenses: Expense[]) {
  const sold = orders.filter(order => order.status === "sold");
  const totals: Record<SaleSection, number> = { cake: 0 };
  let delivery = 0;
  for (const order of sold) {
    delivery += minor(order.delivery_fee);
    for (const item of order.items) {
      totals[item.section] += minor(item.unit_price) * item.quantity;
    }
  }
  const allExpenses = expenses.reduce((sum, expense) => sum + minor(expense.amount), 0);
  const revenue = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  return { totals: { cake: totals.cake/100 },
    revenue: revenue/100, delivery: delivery/100,
    allExpenses: allExpenses/100,
    result: (revenue - allExpenses)/100,
    cashResult: (revenue + delivery - allExpenses)/100 };
}
// Store and display the same rounded unit price in checkout and in its report.
export function checkoutUnitPrice(price: number, discountPercent: number = 0): number {
  const discount = price * (discountPercent / 100);
  return Math.round(Math.max(0, price - discount) * 100) / 100;
}
