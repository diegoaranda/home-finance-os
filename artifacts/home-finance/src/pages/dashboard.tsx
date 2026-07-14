import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { useRecurring } from "@/hooks/use-recurring";
import { useBudgets } from "@/hooks/use-budgets";
import { useFinanceAlerts, type FinanceAlertSeverity } from "@/hooks/use-finance-alerts";
import { toast } from "@/hooks/use-toast";
import { getGreeting } from "@/lib/greeting";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock,
  CreditCard, ChevronRight, CheckCircle2, AlertCircle, ArrowLeftRight,
  Lightbulb, TrendingUp, Plus, Wallet, Building, Banknote, Bitcoin, Coins, PiggyBank
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

type CategorySpend = {
  name: string;
  amount: number;
};

const QUICK_TRANSACTION_TYPE_KEY = "home-finance:quick-transaction-type";

const ACCOUNT_ICONS = {
  bank: Building,
  cash: Banknote,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: Coins,
  crypto: Bitcoin,
} as const;

function getAccountIcon(type: string) {
  return ACCOUNT_ICONS[type as keyof typeof ACCOUNT_ICONS] ?? Wallet;
}

function rememberQuickTransactionType(type: "expense" | "income" | "transfer") {
  window.sessionStorage.setItem(QUICK_TRANSACTION_TYPE_KEY, type);
}

function getBudgetAmount(budget: any) {
  return Number(budget.amount ?? budget.budgeted_amount ?? 0);
}

function getBudgetStatus(usedPercent: number) {
  if (usedPercent > 100) return { label: "Excedido", text: "text-destructive" };
  if (usedPercent >= 80) return { label: "Cerca del límite", text: "text-amber-600" };
  return { label: "Normal", text: "text-primary" };
}

function getMonthlyInsight({
  alerts,
  topCategory,
  monthlyIncome,
  monthlyExpenses,
}: {
  alerts: any[];
  topCategory?: { name: string; amount: number };
  monthlyIncome: number;
  monthlyExpenses: number;
}) {
  if (alerts.some(alert => alert.usedPercent > 100)) {
    return "Hay presupuestos excedidos este mes.";
  }
  if (alerts.length > 0) {
    return "Hay presupuestos cerca del límite.";
  }
  if (topCategory) {
    return `El mayor gasto del mes está en ${topCategory.name}.`;
  }
  if (monthlyIncome > monthlyExpenses && monthlyIncome > 0) {
    return "Este mes los ingresos superan los gastos.";
  }
  return "Registra movimientos para generar mejores insights del mes.";
}

function getAlertTone(severity: FinanceAlertSeverity) {
  if (severity === "critical") {
    return {
      badge: "destructive" as const,
      icon: "bg-destructive/10 text-destructive",
      text: "text-destructive",
      label: "Crítica",
    };
  }
  if (severity === "warning") {
    return {
      badge: "secondary" as const,
      icon: "bg-amber-500/10 text-amber-600",
      text: "text-amber-600",
      label: "Atención",
    };
  }
  return {
    badge: "outline" as const,
    icon: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
    label: "Info",
  };
}

export default function Dashboard() {
  const { user, appUser } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const { dashboard, isLoading: loadingDash } = useDashboard();
  const { transactions, isLoading: loadingTx } = useTransactions();
  const { recurringTasks, isLoading: loadingRec, markAsPaid } = useRecurring();
  const { budgets, isLoading: loadingBudgets } = useBudgets(currentMonth, currentYear);
  const { alerts, isLoading: loadingAlerts } = useFinanceAlerts();
  const [payingId, setPayingId] = useState<string | null>(null);
  const displayName =
    appUser?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "usuario";

  if (loadingDash || loadingTx || loadingRec || loadingBudgets || loadingAlerts) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-40 w-full bg-muted rounded-2xl" />
        <div className="flex gap-4">
          <div className="h-24 w-1/2 bg-muted rounded-2xl" />
          <div className="h-24 w-1/2 bg-muted rounded-2xl" />
        </div>
        <div className="h-40 w-full bg-muted rounded-2xl" />
      </div>
    );
  }

  const today = now.getDate();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = format(nextMonth, "yyyy-MM-dd");
  const monthTransactions = transactions.filter(tx =>
    tx.transaction_date >= monthStart &&
    tx.transaction_date < monthEnd
  );
  const monthlyIncome = monthTransactions.reduce((sum, tx) => (
    tx.type === "income" ? sum + Number(tx.amount || 0) : sum
  ), 0);
  const monthlyExpenses = monthTransactions.reduce((sum, tx) => (
    tx.type === "expense" ? sum + Number(tx.amount || 0) : sum
  ), 0);
  const spentByCategory = monthTransactions.reduce((totals: Record<string, CategorySpend>, tx) => {
    if (tx.type !== "expense" || !tx.category_id) return totals;
    const categoryName = tx.category?.name || "Sin categoría";
    if (!totals[tx.category_id]) totals[tx.category_id] = { name: categoryName, amount: 0 };
    totals[tx.category_id].amount += Number(tx.amount || 0);
    return totals;
  }, {});
  const topExpenseCategories = (Object.values(spentByCategory) as CategorySpend[])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const budgetAlerts = budgets
    .map(budget => {
      const budgeted = getBudgetAmount(budget);
      const spent = spentByCategory[budget.category_id]?.amount || 0;
      const usedPercent = budgeted > 0 ? (spent / budgeted) * 100 : 0;
      return {
        ...budget,
        budgeted,
        spent,
        usedPercent,
        status: getBudgetStatus(usedPercent),
      };
    })
    .filter(budget => budget.usedPercent >= 80)
    .sort((a, b) => b.usedPercent - a.usedPercent)
    .slice(0, 5);
  const monthlyInsight = getMonthlyInsight({
    alerts: budgetAlerts,
    topCategory: topExpenseCategories[0],
    monthlyIncome,
    monthlyExpenses,
  });
  const paidTaskIds = new Set(
    transactions
      .filter(tx =>
        tx.type === "expense" &&
        tx.recurring_task_id &&
        tx.transaction_date >= monthStart &&
        tx.transaction_date < monthEnd
      )
      .map(tx => tx.recurring_task_id)
  );
  const dashboardTasks = recurringTasks.map(task => ({
    ...task,
    _paidThisMonth: paidTaskIds.has(task.id),
  }));
  const pendingTasks = dashboardTasks.filter(t => t.active && !t._paidThisMonth);
  const overdue  = pendingTasks.filter(t => t.due_day < today).sort((a, b) => a.due_day - b.due_day);
  const dueToday = pendingTasks.filter(t => t.due_day === today);
  const upcoming = pendingTasks.filter(t => t.due_day > today).sort((a, b) => a.due_day - b.due_day);
  const sortedPayments = [...overdue, ...dueToday, ...upcoming].slice(0, 3);

  const totalPending = pendingTasks.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const recentTx = transactions.slice(0, 5);

  const openQuickTransaction = (type: "expense" | "income" | "transfer") => {
    rememberQuickTransactionType(type);
    window.location.assign(`/transactions?type=${type}`);
  };

  const handleMarkPaid = async (task: any) => {
    setPayingId(task.id);
    try {
      await markAsPaid.mutateAsync(task);
      toast({ title: `"${task.title}" registrado como pagado` });
    } catch (err: any) {
      toast({
        title: "Error al registrar pago",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <header>
        <h1 className="text-xl font-medium text-muted-foreground">
          {getGreeting(displayName)}
        </h1>
      </header>

      {/* Account balances */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Saldo por cuenta</h2>
        {dashboard?.accounts.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dashboard.accounts.map(account => {
              const AccountIcon = getAccountIcon(account.type);
              return (
                <Card
                  key={account.id}
                  className="rounded-2xl border-none bg-card shadow-sm"
                  data-testid={`card-dashboard-account-${account.id}`}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                      style={account.color
                        ? { backgroundColor: `${account.color}22`, color: account.color }
                        : undefined}
                    >
                      <AccountIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-muted-foreground">
                        {account.name}
                      </p>
                      <p
                        className="mt-1 text-2xl font-bold tabular-nums tracking-tight"
                        data-testid={`text-dashboard-account-balance-${account.id}`}
                      >
                        {formatCurrency(account.current_balance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border-none bg-card shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Sin cuentas activas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega o activa una cuenta para ver su saldo actual.
              </p>
              <Link href="/settings/accounts">
                <Button variant="outline" className="mt-4 rounded-xl">
                  Configurar cuentas
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Monthly summary */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          Resumen del mes
        </h3>
        <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Ingresos</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-monthly-income">
              {formatCurrency(monthlyIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm font-medium">Gastos</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-monthly-expenses">
              {formatCurrency(monthlyExpenses)}
            </p>
          </CardContent>
        </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Acciones rápidas</h3>
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" className="h-20 min-h-20 w-full rounded-2xl flex-col gap-2 border-destructive/30 text-destructive shadow-sm hover:bg-destructive hover:text-destructive-foreground" onClick={() => openQuickTransaction("expense")} data-testid="button-quick-expense">
            <Plus className="w-5 h-5" />
            <span className="text-xs font-semibold">Gasto</span>
          </Button>
          <Button variant="outline" className="h-20 min-h-20 w-full rounded-2xl flex-col gap-2 border-primary/30 text-primary shadow-sm hover:bg-primary hover:text-primary-foreground" onClick={() => openQuickTransaction("income")} data-testid="button-quick-income">
            <Plus className="w-5 h-5" />
            <span className="text-xs font-semibold">Ingreso</span>
          </Button>
          <Button variant="outline" className="h-20 min-h-20 w-full rounded-2xl flex-col gap-2 border-muted-foreground/20 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground" onClick={() => openQuickTransaction("transfer")} data-testid="button-quick-transfer">
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-xs font-semibold">Transferir</span>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
          Alertas internas
        </h3>

        <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
          {alerts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {alerts.slice(0, 5).map(alert => {
                const tone = getAlertTone(alert.severity);
                return (
                  <div key={alert.id} className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone.icon}`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{alert.title}</p>
                        <Badge variant={tone.badge} className="text-[10px] shrink-0">
                          {tone.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <CardContent className="p-5">
              <p className="text-sm font-medium">Sin alertas activas</p>
              <p className="text-xs text-muted-foreground mt-1">No hay presupuestos, pagos o cuentas que requieran atención inmediata.</p>
            </CardContent>
          )}
        </Card>
      </section>

      {/* Upcoming payments */}
      {sortedPayments.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-muted-foreground" />
              Próximos pagos
            </h3>
            {totalPending > 0 && (
              <span className="text-sm font-semibold text-destructive" data-testid="text-total-pending">
                {formatCurrency(totalPending)} pendiente
              </span>
            )}
          </div>

          <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {sortedPayments.map(task => {
                const isOverdue = task.due_day < today;
                const isToday   = task.due_day === today;
                return (
                  <div
                    key={task.id}
                    className="p-4 flex items-center justify-between gap-3"
                    data-testid={`row-payment-${task.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOverdue ? (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      ) : (
                        <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className={`text-xs ${isOverdue ? "text-destructive font-medium" : isToday ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          Pendiente · {isOverdue ? `vencido el día ${task.due_day}` : isToday ? "vence hoy" : `vence el día ${task.due_day}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold tabular-nums">{formatCurrency(task.amount)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs gap-1 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleMarkPaid(task)}
                        disabled={payingId === task.id}
                        data-testid={`button-pay-${task.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {payingId === task.id ? "..." : "Marcar pagado"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {budgetAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Presupuestos críticos
            </h3>
            <Link href="/settings/budgets">
              <span className="text-sm font-medium text-primary flex items-center cursor-pointer">
                Ver <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            </Link>
          </div>

          <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {budgetAlerts.map(budget => (
                <div key={budget.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{budget.category?.name || "Sin categoría"}</p>
                    <p className={`text-xs font-medium ${budget.status.text}`}>
                      {budget.status.label} · {budget.usedPercent.toFixed(0)}% usado
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">{formatCurrency(budget.spent)}</p>
                    <p className="text-xs text-muted-foreground">de {formatCurrency(budget.budgeted)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section>
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold mb-1">Insight del mes</p>
              <p className="text-sm text-muted-foreground">{monthlyInsight}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent transactions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            Recientes
          </h3>
          <Link href="/transactions">
            <span className="text-sm font-medium text-primary flex items-center cursor-pointer">
              Ver todos <ChevronRight className="w-4 h-4 ml-1" />
            </span>
          </Link>
        </div>

        {recentTx.length > 0 ? (
          <div className="space-y-3">
            {recentTx.map(tx => {
              const isTransfer = tx.type === "transfer";
              const transferRoute = `${tx.account_from?.name || "Sin origen"} -> ${tx.account_to?.name || "Sin destino"}`;
              const formattedDate = format(parseISO(tx.transaction_date), "d MMM, yyyy", { locale: es });
              return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-card shadow-sm border border-border/50"
                data-testid={`row-transaction-${tx.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "income" ? "bg-primary/10 text-primary" : tx.type === "expense" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    {tx.type === "income"
                      ? <ArrowDownRight className="w-5 h-5" />
                      : isTransfer
                        ? <ArrowLeftRight className="w-5 h-5" />
                        : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{isTransfer ? "Transferencia" : tx.description || tx.category?.name || "Transacción"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isTransfer ? `${transferRoute} · ${formattedDate}` : formattedDate}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === "income" ? "text-primary" : tx.type === "expense" ? "text-destructive" : "text-muted-foreground"}`}>
                  {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}{formatCurrency(tx.amount)}
                </span>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center p-8 bg-card rounded-2xl border-none shadow-sm">
            <p className="text-muted-foreground">No hay movimientos recientes.</p>
          </div>
        )}
      </section>
    </div>
  );
}
