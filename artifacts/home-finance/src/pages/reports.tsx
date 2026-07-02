import { useState } from "react";
import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart2,
  Lightbulb,
  PieChart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PeriodKey = "current-month" | "last-3-months" | "last-6-months" | "current-year";

type PeriodRange = {
  start: string;
  end: string;
  label: string;
};

type Summary = {
  income: number;
  expenses: number;
  balance: number;
  movementCount: number;
};

type CategoryTotal = {
  id: string;
  name: string;
  amount: number;
  percentage: number;
};

type AccountTotal = {
  id: string;
  name: string;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
};

type ExpenseAccountTotal = {
  id: string;
  name: string;
  amount: number;
  percentage: number;
};

type MonthlyTotal = {
  key: string;
  label: string;
  income: number;
  expenses: number;
};

function dateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getPeriodRange(period: PeriodKey, offset = 0): PeriodRange {
  const now = new Date();
  const base = period === "current-year" ? subYears(now, offset) : subMonths(now, offset);

  if (period === "last-3-months" || period === "last-6-months") {
    const monthCount = period === "last-3-months" ? 3 : 6;
    const endBase = subMonths(now, offset * monthCount);
    const startBase = subMonths(endBase, monthCount - 1);
    return {
      start: dateValue(startOfMonth(startBase)),
      end: dateValue(endOfMonth(endBase)),
      label: `${format(startOfMonth(startBase), "MMM yyyy", { locale: es })} - ${format(endOfMonth(endBase), "MMM yyyy", { locale: es })}`,
    };
  }

  if (period === "current-year") {
    return {
      start: dateValue(startOfYear(base)),
      end: dateValue(endOfYear(base)),
      label: format(base, "yyyy", { locale: es }),
    };
  }

  return {
    start: dateValue(startOfMonth(base)),
    end: dateValue(endOfMonth(base)),
    label: format(base, "MMMM yyyy", { locale: es }),
  };
}

function getPreviousRange(period: PeriodKey) {
  if (period === "current-month") return getPeriodRange("current-month", 1);
  if (period === "last-3-months") return getPeriodRange("last-3-months", 1);
  if (period === "last-6-months") return getPeriodRange("last-6-months", 1);
  return getPeriodRange("current-year", 1);
}

function inRange(tx: any, range: PeriodRange) {
  return tx.transaction_date >= range.start && tx.transaction_date <= range.end;
}

function summarize(transactions: any[]): Summary {
  const income = transactions.reduce((sum, tx) => (
    tx.type === "income" ? sum + Number(tx.amount || 0) : sum
  ), 0);
  const expenses = transactions.reduce((sum, tx) => (
    tx.type === "expense" ? sum + Number(tx.amount || 0) : sum
  ), 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    movementCount: transactions.length,
  };
}

function getCategoryTotals(transactions: any[], totalExpenses: number): CategoryTotal[] {
  const totals = transactions.reduce((acc: Record<string, CategoryTotal>, tx) => {
    if (tx.type !== "expense" || !tx.category_id) return acc;
    const amount = Number(tx.amount || 0);
    if (!acc[tx.category_id]) {
      acc[tx.category_id] = {
        id: tx.category_id,
        name: tx.category?.name || "Sin categoría",
        amount: 0,
        percentage: 0,
      };
    }
    acc[tx.category_id].amount += amount;
    return acc;
  }, {});

  return (Object.values(totals) as CategoryTotal[])
    .map(category => ({
      ...category,
      percentage: totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getAccountTotals(transactions: any[], accounts: any[]): AccountTotal[] {
  return accounts
    .map(account => {
      const totals = transactions.reduce(
        (acc, tx) => {
          const amount = Number(tx.amount || 0);
          if (tx.type === "income" && (tx.account_to_id === account.id || tx.account_id === account.id)) {
            acc.income += amount;
          } else if (tx.type === "expense" && (tx.account_from_id === account.id || tx.account_id === account.id)) {
            acc.expenses += amount;
          } else if (tx.type === "transfer" && tx.account_to_id === account.id) {
            acc.transfersIn += amount;
          } else if (tx.type === "transfer" && tx.account_from_id === account.id) {
            acc.transfersOut += amount;
          }
          return acc;
        },
        { income: 0, expenses: 0, transfersIn: 0, transfersOut: 0 }
      );

      return {
        id: account.id,
        name: account.name,
        ...totals,
      };
    })
    .filter(account =>
      account.income > 0 ||
      account.expenses > 0 ||
      account.transfersIn > 0 ||
      account.transfersOut > 0
    );
}

function getExpenseAccountTotals(transactions: any[], accounts: any[], totalExpenses: number): ExpenseAccountTotal[] {
  return accounts
    .map(account => {
      const amount = transactions.reduce((sum, tx) => {
        if (tx.type !== "expense") return sum;
        if (tx.account_from_id === account.id || tx.account_id === account.id) {
          return sum + Number(tx.amount || 0);
        }
        return sum;
      }, 0);

      return {
        id: account.id,
        name: account.name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      };
    })
    .filter(account => account.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function getMonthlyTotals(transactions: any[]): MonthlyTotal[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(now, 5 - index);
    const range = {
      start: dateValue(startOfMonth(date)),
      end: dateValue(endOfMonth(date)),
    };
    const monthTransactions = transactions.filter(tx =>
      tx.transaction_date >= range.start &&
      tx.transaction_date <= range.end
    );

    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM", { locale: es }),
      income: monthTransactions.reduce((sum, tx) => tx.type === "income" ? sum + Number(tx.amount || 0) : sum, 0),
      expenses: monthTransactions.reduce((sum, tx) => tx.type === "expense" ? sum + Number(tx.amount || 0) : sum, 0),
    };
  });
}

function getVariation(current: number, previous: number) {
  const diff = current - previous;
  const percent = previous > 0 ? (diff / previous) * 100 : current > 0 ? 100 : 0;
  return { diff, percent };
}

function getInsight({
  summary,
  previousSummary,
  categories,
  accounts,
}: {
  summary: Summary;
  previousSummary: Summary;
  categories: CategoryTotal[];
  accounts: AccountTotal[];
}) {
  const topCategory = categories[0];
  const topOutflowAccount = accounts
    .map(account => ({ name: account.name, amount: account.expenses + account.transfersOut }))
    .sort((a, b) => b.amount - a.amount)[0];

  if (topCategory) return `La categoría con mayor gasto fue ${topCategory.name}.`;
  if (summary.expenses > previousSummary.expenses) return "Los gastos subieron respecto al período anterior.";
  if (topOutflowAccount?.amount > 0) return `La cuenta con más salida de dinero fue ${topOutflowAccount.name}.`;
  if (summary.balance >= 0 && summary.movementCount > 0) return "El balance del período fue positivo.";
  if (summary.balance < 0) return "El balance del período fue negativo.";
  return "Registra movimientos para generar reportes más útiles.";
}

export default function Reports() {
  const [period, setPeriod] = useState<PeriodKey>("current-month");
  const { transactions, isLoading: loadingTransactions } = useTransactions();
  const { accounts, isLoading: loadingAccounts } = useAccounts();

  const currentRange = getPeriodRange(period);
  const previousRange = getPreviousRange(period);
  const currentTransactions = transactions.filter(tx => inRange(tx, currentRange));
  const previousTransactions = transactions.filter(tx => inRange(tx, previousRange));
  const summary = summarize(currentTransactions);
  const previousSummary = summarize(previousTransactions);
  const categoryTotals = getCategoryTotals(currentTransactions, summary.expenses);
  const expenseAccountTotals = getExpenseAccountTotals(currentTransactions, accounts, summary.expenses);
  const accountTotals = getAccountTotals(currentTransactions, accounts);
  const monthlyTotals = getMonthlyTotals(transactions);
  const maxMonthlyAmount = Math.max(...monthlyTotals.map(item => Math.max(item.income, item.expenses)), 1);
  const insight = getInsight({
    summary,
    previousSummary,
    categories: categoryTotals,
    accounts: accountTotals,
  });

  const isLoading = loadingTransactions || loadingAccounts;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 pb-24 animate-pulse">
        <div className="h-8 w-36 bg-muted rounded" />
        <div className="h-10 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(item => <div key={item} className="h-24 bg-muted rounded-2xl" />)}
        </div>
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">{currentRange.label}</p>
      </header>

      <Tabs value={period} onValueChange={value => setPeriod(value as PeriodKey)}>
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-card">
          <TabsTrigger value="current-month" className="rounded-lg text-xs">Este mes</TabsTrigger>
          <TabsTrigger value="last-3-months" className="rounded-lg text-xs">Últimos 3</TabsTrigger>
          <TabsTrigger value="last-6-months" className="rounded-lg text-xs">Últimos 6</TabsTrigger>
          <TabsTrigger value="current-year" className="rounded-lg text-xs">Año</TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="grid grid-cols-2 gap-4">
        <MetricCard label="Ingresos" value={formatCurrency(summary.income)} Icon={ArrowDownRight} tone="text-primary" />
        <MetricCard label="Gastos" value={formatCurrency(summary.expenses)} Icon={ArrowUpRight} tone="text-destructive" />
        <MetricCard label="Balance" value={formatCurrency(summary.balance)} Icon={TrendingUp} tone={summary.balance < 0 ? "text-destructive" : "text-primary"} />
        <MetricCard label="Movimientos" value={String(summary.movementCount)} Icon={BarChart2} />
      </section>

      <Card className="rounded-2xl border-none shadow-sm bg-card">
        <CardContent className="p-5 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold mb-1">Insight del período</p>
            <p className="text-sm text-muted-foreground">{insight}</p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          Comparación
        </h2>
        <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
          <div className="divide-y divide-border/50">
            <ComparisonRow label="Ingresos" current={summary.income} previous={previousSummary.income} />
            <ComparisonRow label="Gastos" current={summary.expenses} previous={previousSummary.expenses} />
            <ComparisonRow label="Balance" current={summary.balance} previous={previousSummary.balance} />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="w-5 h-5 text-muted-foreground" />
          Gastos por categoría
        </h2>
        {categoryTotals.length > 0 ? (
          <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {categoryTotals.map(category => (
                <div key={category.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium truncate">{category.name}</p>
                    <span className="font-semibold text-destructive tabular-nums">{formatCurrency(category.amount)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-destructive" style={{ width: `${Math.min(category.percentage, 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{category.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyCard text="No hay gastos por categoría en este período." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-muted-foreground" />
          Ingresos vs gastos
        </h2>
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            {monthlyTotals.map(month => {
              const incomeWidth = `${Math.max((month.income / maxMonthlyAmount) * 100, month.income > 0 ? 4 : 0)}%`;
              const expenseWidth = `${Math.max((month.expenses / maxMonthlyAmount) * 100, month.expenses > 0 ? 4 : 0)}%`;
              return (
                <div key={month.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium capitalize">{month.label}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(month.income - month.expenses)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-2 items-center">
                    <span className="text-[11px] text-primary">Ingresos</span>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: incomeWidth }} />
                    </div>
                    <span className="text-[11px] text-destructive">Gastos</span>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-destructive" style={{ width: expenseWidth }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-muted-foreground" />
          Gastos por cuenta
        </h2>
        {expenseAccountTotals.length > 0 ? (
          <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {expenseAccountTotals.map(account => (
                <div key={account.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium truncate">{account.name}</p>
                    <span className="font-semibold text-destructive tabular-nums">{formatCurrency(account.amount)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-destructive" style={{ width: `${Math.min(account.percentage, 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{account.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyCard text="No hay gastos por cuenta en este período." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-muted-foreground" />
          Resumen por cuenta
        </h2>
        {accountTotals.length > 0 ? (
          <div className="space-y-3">
            {accountTotals.map(account => (
              <Card key={account.id} className="rounded-2xl border-none shadow-sm bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pt-0">
                  <MiniMetric label="Ingresos" value={formatCurrency(account.income)} tone="text-primary" />
                  <MiniMetric label="Gastos" value={formatCurrency(account.expenses)} tone="text-destructive" />
                  <MiniMetric label="Transf. recibidas" value={formatCurrency(account.transfersIn)} />
                  <MiniMetric label="Transf. enviadas" value={formatCurrency(account.transfersOut)} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyCard text="No hay movimientos por cuenta en este período." />
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  Icon,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <Card className="rounded-2xl border-none shadow-sm bg-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ComparisonRow({ label, current, previous }: { label: string; current: number; previous: number }) {
  const variation = getVariation(current, previous);
  const isUp = variation.diff > 0;
  const isFlat = variation.diff === 0;
  return (
    <div className="p-4 flex items-center justify-between gap-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Anterior {formatCurrency(previous)}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums">{formatCurrency(current)}</p>
        <p className={`text-xs font-medium ${isFlat ? "text-muted-foreground" : isUp ? "text-primary" : "text-destructive"}`}>
          {isFlat ? "Sin cambio" : `${isUp ? "+" : ""}${formatCurrency(variation.diff)} (${variation.percent.toFixed(0)}%)`}
        </p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 min-w-0">
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      <p className={`font-bold tabular-nums truncate ${tone}`}>{value}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="text-center p-8 bg-card rounded-2xl border-none shadow-sm">
      <p className="text-sm text-muted-foreground font-medium">{text}</p>
    </div>
  );
}
