import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { useRecurring } from "@/hooks/use-recurring";
import { useBudgets } from "@/hooks/use-budgets";
import { useToast } from "@/hooks/use-toast";
import { getGreeting } from "@/lib/greeting";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock,
  CreditCard, ChevronRight, CheckCircle2, AlertCircle, ArrowLeftRight,
  Lightbulb, PieChart, TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

type CategorySpend = {
  name: string;
  amount: number;
};

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

export default function Dashboard() {
  const { user, appUser } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const { dashboard, isLoading: loadingDash } = useDashboard();
  const { transactions, isLoading: loadingTx } = useTransactions();
  const { recurringTasks, isLoading: loadingRec, markAsPaid } = useRecurring();
  const { budgets, isLoading: loadingBudgets } = useBudgets(currentMonth, currentYear);
  const { toast } = useToast();
  const [payingId, setPayingId] = useState<string | null>(null);
  const displayName =
    appUser?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "usuario";

  if (loadingDash || loadingTx || loadingRec || loadingBudgets) {
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
  const monthlyBalance = monthlyIncome - monthlyExpenses;
  const expenseRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : monthlyExpenses > 0 ? 100 : 0;
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
  const sortedPayments = [...overdue, ...dueToday, ...upcoming].slice(0, 5);

  const totalPending = pendingTasks.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const recentTx = transactions.slice(0, 5);

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

      {/* Balance hero */}
      <section>
        <Card className="bg-foreground text-background border-none rounded-[2rem] shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <CardContent className="p-8">
            <p className="text-background/70 font-medium mb-2">Balance Total</p>
            <h2 className="text-4xl font-bold tracking-tight" data-testid="text-total-balance">
              {formatCurrency(dashboard?.totalBalance || 0)}
            </h2>
          </CardContent>
        </Card>
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
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-3">Balance mensual</p>
            <p className={`text-xl font-bold tabular-nums ${monthlyBalance < 0 ? "text-destructive" : "text-primary"}`}>
              {formatCurrency(monthlyBalance)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-3">Gastos / ingresos</p>
            <p className={`text-xl font-bold tabular-nums ${expenseRatio >= 80 ? "text-destructive" : "text-foreground"}`}>
              {expenseRatio.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        </div>
      </section>

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

      {budgetAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Presupuestos en alerta
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

      {topExpenseCategories.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-muted-foreground" />
            Top gastos por categoría
          </h3>

          <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {topExpenseCategories.map(category => (
                <div key={category.name} className="p-4 flex items-center justify-between gap-3">
                  <p className="font-medium truncate">{category.name}</p>
                  <span className="font-semibold text-destructive tabular-nums">{formatCurrency(category.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

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
