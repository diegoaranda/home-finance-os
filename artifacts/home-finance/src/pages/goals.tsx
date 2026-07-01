import { useSavingsGoals } from "@/hooks/use-savings-goals";
import { formatCurrency } from "@/lib/currency";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Goals() {
  const { goals, isLoading } = useSavingsGoals();

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
        <Button size="icon" className="h-10 w-10 rounded-full shadow-lg">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2].map(i => (
            <div key={i} className="h-48 bg-muted rounded-2xl"></div>
          ))}
        </div>
      ) : goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => {
            const current = goal.current_amount || 0;
            const target = goal.target_amount;
            const percentage = Math.min(100, Math.round((current / target) * 100));
            const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;

            return (
              <Card key={goal.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-card">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {daysLeft !== null && daysLeft > 0 
                            ? `Quedan ${daysLeft} días` 
                            : daysLeft !== null && daysLeft < 0 
                              ? `Vencida hace ${Math.abs(daysLeft)} días`
                              : `Vence hoy`} 
                          {' • '}{format(new Date(goal.deadline), "d MMM yyyy", { locale: es })}
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Target className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{formatCurrency(current)}</span>
                      <span className="text-muted-foreground">{formatCurrency(target)}</span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-primary/20" />
                    <p className="text-xs text-right font-medium text-primary">{percentage}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay metas</h3>
          <p className="text-sm text-muted-foreground mb-6">Establece un objetivo de ahorro para comenzar a medir tu progreso.</p>
          <Button className="rounded-full px-6">Crear primera meta</Button>
        </div>
      )}
    </div>
  );
}
