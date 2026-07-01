import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";

export type AccountPeriod = "today" | "week" | "month" | "year" | "custom";

interface AccountSummaryOptions {
  period: AccountPeriod;
  customStart?: string;
  customEnd?: string;
}

function dateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getPeriodRange(period: AccountPeriod, customStart?: string, customEnd?: string) {
  const now = new Date();

  if (period === "today") {
    const today = dateValue(now);
    return { start: today, end: today };
  }

  if (period === "week") {
    return {
      start: dateValue(startOfWeek(now, { weekStartsOn: 1 })),
      end: dateValue(endOfWeek(now, { weekStartsOn: 1 })),
    };
  }

  if (period === "month") {
    return {
      start: dateValue(startOfMonth(now)),
      end: dateValue(endOfMonth(now)),
    };
  }

  if (period === "year") {
    return {
      start: dateValue(startOfYear(now)),
      end: dateValue(endOfYear(now)),
    };
  }

  return {
    start: customStart || dateValue(startOfMonth(now)),
    end: customEnd || dateValue(now),
  };
}

function belongsToAccount(tx: any, accountId: string) {
  return tx.account_id === accountId || tx.account_from_id === accountId || tx.account_to_id === accountId;
}

function isInRange(tx: any, start: string, end: string) {
  return tx.transaction_date >= start && tx.transaction_date <= end;
}

export function useAccountSummary(accountId: string | undefined, options: AccountSummaryOptions) {
  const { accounts, isLoading: loadingAccounts } = useAccounts();
  const { transactions, isLoading: loadingTransactions } = useTransactions();
  const account = accounts.find(acc => acc.id === accountId);
  const range = getPeriodRange(options.period, options.customStart, options.customEnd);

  const accountTransactions = accountId
    ? transactions.filter(tx => belongsToAccount(tx, accountId))
    : [];
  const periodTransactions = accountTransactions.filter(tx => isInRange(tx, range.start, range.end));

  const totals = periodTransactions.reduce(
    (summary, tx) => {
      const amount = Number(tx.amount || 0);
      if (tx.type === "income" && (tx.account_to_id === accountId || tx.account_id === accountId)) {
        summary.income += amount;
      } else if (tx.type === "expense" && (tx.account_from_id === accountId || tx.account_id === accountId)) {
        summary.expenses += amount;
      } else if (tx.type === "transfer" && tx.account_to_id === accountId) {
        summary.transfersIn += amount;
      } else if (tx.type === "transfer" && tx.account_from_id === accountId) {
        summary.transfersOut += amount;
      }
      return summary;
    },
    { income: 0, expenses: 0, transfersIn: 0, transfersOut: 0 }
  );

  const currentBalance = account
    ? Number(account.initial_balance || 0) +
      accountTransactions.reduce((sum, tx) => {
        const amount = Number(tx.amount || 0);
        if (tx.type === "income" && (tx.account_to_id === accountId || tx.account_id === accountId)) return sum + amount;
        if (tx.type === "expense" && (tx.account_from_id === accountId || tx.account_id === accountId)) return sum - amount;
        if (tx.type === "transfer" && tx.account_to_id === accountId) return sum + amount;
        if (tx.type === "transfer" && tx.account_from_id === accountId) return sum - amount;
        return sum;
      }, 0)
    : 0;

  return {
    account,
    range,
    isLoading: loadingAccounts || loadingTransactions,
    summary: {
      currentBalance,
      initialBalance: Number(account?.initial_balance || 0),
      income: totals.income,
      expenses: totals.expenses,
      transfersIn: totals.transfersIn,
      transfersOut: totals.transfersOut,
      movementCount: periodTransactions.length,
    },
    recentTransactions: periodTransactions.slice(0, 8),
  };
}
