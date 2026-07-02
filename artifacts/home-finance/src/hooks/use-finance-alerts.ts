import { endOfMonth, format, startOfMonth } from "date-fns";
import { useAccounts } from "@/hooks/use-accounts";
import { useBudgets } from "@/hooks/use-budgets";
import { useRecurring } from "@/hooks/use-recurring";
import { useTransactions } from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/currency";

export type FinanceAlertSeverity = "critical" | "warning" | "info";
export type FinanceAlertKind =
  | "budget_exceeded"
  | "budget_risk"
  | "recurring_due_soon"
  | "recurring_overdue"
  | "low_balance";

export type FinanceAlert = {
  id: string;
  kind: FinanceAlertKind;
  severity: FinanceAlertSeverity;
  title: string;
  description: string;
};

const LOW_BALANCE_THRESHOLD = 100;
const RECURRING_DUE_SOON_DAYS = 3;

function getBudgetAmount(budget: any) {
  return Number(budget.amount ?? budget.budgeted_amount ?? 0);
}

function severityRank(severity: FinanceAlertSeverity) {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

export function useFinanceAlerts() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const today = now.getDate();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const { budgets, isLoading: loadingBudgets } = useBudgets(month, year);
  const { transactions, isLoading: loadingTransactions } = useTransactions();
  const { recurringTasks, isLoading: loadingRecurring } = useRecurring();
  const { accounts, isLoading: loadingAccounts } = useAccounts();

  const monthTransactions = transactions.filter(tx =>
    tx.transaction_date >= monthStart &&
    tx.transaction_date <= monthEnd
  );

  const spentByCategory = monthTransactions.reduce((totals: Record<string, number>, tx) => {
    if (tx.type !== "expense" || !tx.category_id) return totals;
    totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.amount || 0);
    return totals;
  }, {});

  const paidRecurringTaskIds = new Set(
    monthTransactions
      .filter(tx => tx.type === "expense" && tx.recurring_task_id)
      .map(tx => tx.recurring_task_id)
  );

  const budgetAlerts: FinanceAlert[] = budgets.flatMap((budget): FinanceAlert[] => {
    const budgeted = getBudgetAmount(budget);
    if (budgeted <= 0) return [];

    const spent = spentByCategory[budget.category_id] || 0;
    const usedPercent = (spent / budgeted) * 100;
    const categoryName = budget.category?.name || "Sin categoría";

    if (usedPercent > 100) {
      return [{
        id: `budget-exceeded-${budget.id}`,
        kind: "budget_exceeded" as const,
        severity: "critical" as const,
        title: `Presupuesto excedido: ${categoryName}`,
        description: `${formatCurrency(spent)} usados de ${formatCurrency(budgeted)} (${usedPercent.toFixed(0)}%).`,
      }];
    }

    if (usedPercent >= 80) {
      return [{
        id: `budget-risk-${budget.id}`,
        kind: "budget_risk" as const,
        severity: "warning" as const,
        title: `Presupuesto en riesgo: ${categoryName}`,
        description: `${formatCurrency(spent)} usados de ${formatCurrency(budgeted)} (${usedPercent.toFixed(0)}%).`,
      }];
    }

    return [];
  });

  const recurringAlerts: FinanceAlert[] = recurringTasks.flatMap((task): FinanceAlert[] => {
    if (!task.active || paidRecurringTaskIds.has(task.id)) return [];

    const dueDay = Number(task.due_day || 1);
    const amount = formatCurrency(Number(task.amount || 0));

    if (dueDay < today) {
      return [{
        id: `recurring-overdue-${task.id}`,
        kind: "recurring_overdue" as const,
        severity: "critical" as const,
        title: `Gasto fijo vencido: ${task.title}`,
        description: `Venció el día ${dueDay} y aún no está pagado. Monto: ${amount}.`,
      }];
    }

    if (dueDay - today <= RECURRING_DUE_SOON_DAYS) {
      const dueText = dueDay === today ? "vence hoy" : `vence en ${dueDay - today} días`;
      return [{
        id: `recurring-due-soon-${task.id}`,
        kind: "recurring_due_soon" as const,
        severity: "warning" as const,
        title: `Gasto fijo próximo: ${task.title}`,
        description: `${dueText}. Monto: ${amount}.`,
      }];
    }

    return [];
  });

  const accountAlerts: FinanceAlert[] = accounts
    .filter(account => account.active && Number(account.current_balance ?? 0) <= LOW_BALANCE_THRESHOLD)
    .map(account => ({
      id: `low-balance-${account.id}`,
      kind: "low_balance" as const,
      severity: Number(account.current_balance ?? 0) <= 0 ? "critical" as const : "warning" as const,
      title: `Saldo bajo: ${account.name}`,
      description: `Saldo actual ${formatCurrency(Number(account.current_balance ?? 0))}.`,
    }));

  const alerts = [
    ...budgetAlerts,
    ...recurringAlerts,
    ...accountAlerts,
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return {
    alerts,
    isLoading: loadingBudgets || loadingTransactions || loadingRecurring || loadingAccounts,
  };
}
