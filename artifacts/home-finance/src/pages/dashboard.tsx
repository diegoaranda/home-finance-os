import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { useRecurring } from "@/hooks/use-recurring";
import { getGreeting } from "@/lib/greeting";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const { appUser } = useAuth();
  const { dashboard, isLoading: loadingDash } = useDashboard();
  const { transactions, isLoading: loadingTx } = useTransactions();
  const { recurringTasks, isLoading: loadingRec } = useRecurring();

  if (loadingDash || loadingTx || loadingRec) {
    return <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded"></div>
      <div className="h-40 w-full bg-muted rounded-2xl"></div>
      <div className="flex gap-4"><div className="h-24 w-1/2 bg-muted rounded-2xl"></div><div className="h-24 w-1/2 bg-muted rounded-2xl"></div></div>
    </div>;
  }

  const today = new Date().getDate();
  const activeTasks = recurringTasks.filter(t => t.active);
  const overdue = activeTasks.filter(t => t.due_day < today);
  const dueToday = activeTasks.filter(t => t.due_day === today);
  const upcoming = activeTasks.filter(t => t.due_day > today).sort((a, b) => a.due_day - b.due_day);
  
  const sortedPayments = [...overdue, ...dueToday, ...upcoming].slice(0, 5);
  const recentTx = transactions.slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-xl font-medium text-muted-foreground">
          {getGreeting(appUser?.display_name || "Usuario")}
        </h1>
      </header>

      <section>
        <Card className="bg-foreground text-background border-none rounded-[2rem] shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <CardContent className="p-8">
            <p className="text-background/70 font-medium mb-2">Balance Total</p>
            <h2 className="text-4xl font-bold tracking-tight">
              {formatCurrency(dashboard?.totalBalance || 0)}
            </h2>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Ingresos</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(dashboard?.income || 0)}</p>
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
            <p className="text-xl font-bold">{formatCurrency(dashboard?.expenses || 0)}</p>
          </CardContent>
        </Card>
      </section>

      {sortedPayments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-muted-foreground" />
              Próximos pagos
            </h3>
          </div>
          <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {sortedPayments.map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className={`text-xs ${task.due_day < today ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {task.due_day < today ? `Vencido el día ${task.due_day}` : task.due_day === today ? 'Vence hoy' : `Vence el día ${task.due_day}`}
                    </p>
                  </div>
                  <span className="font-semibold">{formatCurrency(task.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

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
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-card shadow-sm border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description || tx.category?.name || "Transacción"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.transaction_date), "d MMM, yyyy", { locale: es })}</p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === 'income' ? 'text-primary' : ''}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
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
