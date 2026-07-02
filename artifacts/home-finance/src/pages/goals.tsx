import { type FormEvent, useState } from "react";
import { useSavingsGoals } from "@/hooks/use-savings-goals";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { format, differenceInCalendarDays, parseISO, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

function getGoalStats(goal: any) {
  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 0);
  const remaining = Math.max(target - current, 0);
  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const completed = target > 0 && current >= target;
  const rawDeadline = goal.deadline ?? goal.target_date;
  const deadline = rawDeadline ? parseISO(rawDeadline) : null;
  const daysLeft = deadline ? differenceInCalendarDays(deadline, startOfToday()) : null;
  const overdue = daysLeft !== null && daysLeft < 0 && !completed;

  return {
    current,
    target,
    remaining,
    percentage,
    completed,
    deadline,
    daysLeft,
    overdue,
  };
}

function getDeadlineLabel(daysLeft: number | null) {
  if (daysLeft === null) return null;
  if (daysLeft > 0) return `Quedan ${daysLeft} días`;
  if (daysLeft < 0) return `Vencida hace ${Math.abs(daysLeft)} días`;
  return "Vence hoy";
}

export default function Goals() {
  const { goals, isLoading, createGoal, addProgress } = useSavingsGoals();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [progressAmount, setProgressAmount] = useState("");

  const targetValue = parseFloat(targetAmount);
  const progressValue = parseFloat(progressAmount);
  const canCreate = name.trim().length > 0 && targetValue > 0;
  const canAddProgress = !!progressGoal && progressValue > 0;
  const isSaving = createGoal.isPending || addProgress.isPending;

  const resetCreateForm = () => {
    setName("");
    setTargetAmount("");
    setDeadline("");
  };

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreateForm();
  };

  const openProgressDialog = (goal: any) => {
    setProgressGoal(goal);
    setProgressAmount("");
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Ingrese un nombre y un monto objetivo mayor a cero.",
      });
      return;
    }

    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        target_amount: targetValue,
        deadline: deadline || null,
      });
      setCreateOpen(false);
      resetCreateForm();
      toast({ title: "Meta creada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al crear meta", description: error.message });
    }
  };

  const handleAddProgress = async (event: FormEvent) => {
    event.preventDefault();
    if (!canAddProgress) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Ingrese un avance mayor a cero.",
      });
      return;
    }

    try {
      await addProgress.mutateAsync({ goal: progressGoal, amount: progressValue });
      setProgressGoal(null);
      setProgressAmount("");
      toast({ title: "Ahorro agregado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al agregar ahorro", description: error.message });
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg"
          onClick={() => setCreateOpen(true)}
          data-testid="button-add-goal"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map(item => (
            <div key={item} className="h-48 bg-muted rounded-2xl" />
          ))}
        </div>
      ) : goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => {
            const stats = getGoalStats(goal);
            const deadlineLabel = getDeadlineLabel(stats.daysLeft);
            const statusLabel = stats.completed ? "Completada" : "Activa";
            const statusTone = stats.completed ? "text-primary" : stats.overdue ? "text-destructive" : "text-muted-foreground";

            return (
              <Card key={goal.id} className="rounded-2xl border-none shadow-sm overflow-hidden bg-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{goal.name}</h3>
                      <p className={`text-xs font-medium mt-1 ${statusTone}`}>
                        {stats.overdue ? "Vencida" : statusLabel}
                      </p>
                      {stats.deadline && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {deadlineLabel} · {format(stats.deadline, "d MMM yyyy", { locale: es })}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm gap-3">
                      <span className="font-medium truncate">{formatCurrency(stats.current)}</span>
                      <span className="text-muted-foreground truncate">{formatCurrency(stats.target)}</span>
                    </div>
                    <Progress value={stats.percentage} className="h-2 bg-primary/20" />
                    <p className="text-xs text-right font-medium text-primary">{stats.percentage}%</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <GoalMetric label="Objetivo" value={formatCurrency(stats.target)} />
                    <GoalMetric label="Ahorrado" value={formatCurrency(stats.current)} />
                    <GoalMetric label="Faltante" value={formatCurrency(stats.remaining)} tone={stats.completed ? "text-primary" : undefined} />
                    <GoalMetric label="Estado" value={statusLabel} tone={statusTone} />
                  </div>

                  {!stats.completed && (
                    <Button variant="outline" className="w-full" onClick={() => openProgressDialog(goal)} data-testid={`button-add-goal-progress-${goal.id}`}>
                      Agregar ahorro
                    </Button>
                  )}
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
          <Button type="button" className="rounded-full px-6" onClick={() => setCreateOpen(true)}>
            Crear primera meta
          </Button>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Nueva meta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Ej. Fondo de emergencia"
                data-testid="input-goal-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Monto objetivo (Bs)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={event => setTargetAmount(event.target.value)}
                placeholder="0.00"
                data-testid="input-goal-target"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha objetivo (opcional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={event => setDeadline(event.target.value)}
                data-testid="input-goal-deadline"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSaving || !canCreate} data-testid="button-submit-goal">
              {createGoal.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!progressGoal} onOpenChange={open => { if (!open) setProgressGoal(null); }}>
        <DialogContent className="sm:max-w-[380px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Agregar ahorro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProgress} className="space-y-4 pt-2">
            {progressGoal && (
              <p className="text-sm text-muted-foreground">
                {progressGoal.name}
              </p>
            )}
            <div className="space-y-2">
              <Label>Monto ahorrado (Bs)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={progressAmount}
                onChange={event => setProgressAmount(event.target.value)}
                placeholder="0.00"
                data-testid="input-goal-progress"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving || !canAddProgress} data-testid="button-submit-goal-progress">
              {addProgress.isPending ? "Guardando..." : "Agregar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={`font-semibold truncate ${tone || ""}`}>{value}</p>
    </div>
  );
}
