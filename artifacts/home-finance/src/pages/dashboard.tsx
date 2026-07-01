import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { useRecurring } from "@/hooks/use-recurring";
import { useToast } from "@/hooks/use-toast";
import { getGreeting } from "@/lib/greeting";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock,
  CreditCard, ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const { appUser } = useAuth();
  const { dashboard, isLoading: loadingDash } = useDashboard();
  const { transactions, isLoading: loadingTx } = useTransactions();
  const { recurringTasks, isLoading: loadingRec, markAsPaid } = useRecurring();
  const { toast } = useToast();
  const [payingId, setPayingId] = useState<string | null>(null);

  if (loadingDash || loadingTx || loadingRec) {
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

  const today = new Date().getDate();
  const activeTasks = recurringTasks.filter(t => t.active);
  const overdue  = activeTasks.filter(t => t.due_day < today).sort((a, b) => a.due_day - b.due_day);
  const dueToday = activeTasks.filter(t => t.due_day === today);
  const upcoming = activeTasks.filter(t => t.due_day > today).sort((a, b) => a.due_day - b.due_day);
  const sortedPayments = [...overdue, ...dueToday, ...upcoming].slice(0, 5);

  const totalPending = activeTasks
    .filter(t => t.due_day <= today + 7)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

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
          {getGreeting(appUser?.display_name || "Usuario")}
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

      {/* Income / Expenses */}
      <section className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Ingresos</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-monthly-income">
              {formatCurrency(dashboard?.income || 0)}
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
              {formatCurrency(dashboard?.expenses || 0)}
            </p>
          </CardContent>
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
                          {isOverdue ? `Vencido el día ${task.due_day}` : isToday ? "Vence hoy" : `Vence el día ${task.due_day}`}
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
                        {payingId === task.id ? "..." : "Pagado"}
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
            {recentTx.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-card shadow-sm border border-border/50"
                data-testid={`row-transaction-${tx.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "income" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {tx.type === "income"
                      ? <ArrowDownRight className="w-5 h-5" />
                      : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description || tx.category?.name || "Transacción"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.transaction_date), "d MMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === "income" ? "text-primary" : ""}`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
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
