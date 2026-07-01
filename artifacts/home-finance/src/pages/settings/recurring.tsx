import { useState } from "react";
import { useRecurring } from "@/hooks/use-recurring";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import {
  CalendarClock, Plus, ChevronLeft, MoreVertical,
  RefreshCw, CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const FREQUENCIES = [
  { value: "monthly",   label: "Mensual"   },
  { value: "weekly",    label: "Semanal"   },
  { value: "biweekly",  label: "Quincenal" },
  { value: "yearly",    label: "Anual"     },
] as const;

interface FormState {
  title: string;
  amount: string;
  account_id: string;
  category_id: string;
  due_day: string;
  frequency: string;
  active: boolean;
  reminder_days_before: string;
}

const DEFAULT_FORM: FormState = {
  title: "",
  amount: "",
  account_id: "",
  category_id: "",
  due_day: "1",
  frequency: "monthly",
  active: true,
  reminder_days_before: "3",
};

function getDueLabel(dueDay: number) {
  const today = new Date().getDate();
  if (dueDay < today) return { text: `Vencido el día ${dueDay}`, overdue: true };
  if (dueDay === today) return { text: "Vence hoy", overdue: false };
  return { text: `Vence el día ${dueDay}`, overdue: false };
}

export default function RecurringSettings() {
  const { recurringTasks, isLoading, createRecurring, updateRecurring, deleteRecurring, markAsPaid } = useRecurring();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setOpen(true);
  };

  const openEdit = (task: any) => {
    setEditingId(task.id);
    setForm({
      title: task.title ?? "",
      amount: String(task.amount ?? ""),
      account_id: task.account_id ?? "",
      category_id: task.category_id ?? "",
      due_day: String(task.due_day ?? 1),
      frequency: task.frequency ?? "monthly",
      active: task.active ?? true,
      reminder_days_before: String(task.reminder_days_before ?? 3),
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      title: form.title.trim(),
      amount: parseFloat(form.amount) || 0,
      account_id: form.account_id || null,
      category_id: form.category_id || null,
      due_day: parseInt(form.due_day) || 1,
      frequency: form.frequency,
      active: form.active,
    };
    if (form.reminder_days_before) {
      payload.reminder_days_before = parseInt(form.reminder_days_before) || null;
    }

    if (!payload.account_id) {
      toast({
        title: "Cuenta requerida",
        description: "Seleccione una cuenta para este gasto fijo.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        await updateRecurring.mutateAsync({ id: editingId, data: payload });
      } else {
        await createRecurring.mutateAsync(payload);
      }
      handleClose();
      toast({ title: "Guardado correctamente" });
    } catch (err: any) {
      toast({
        title: "Error al guardar",
        description: err?.message ?? "No se pudo guardar el gasto fijo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (task: any) => {
    try {
      await updateRecurring.mutateAsync({
        id: task.id,
        data: { active: !task.active },
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "No se pudo actualizar.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurring.mutateAsync(id);
      toast({ title: "Eliminado" });
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (task: any) => {
    try {
      await markAsPaid.mutateAsync(task);
      toast({ title: `"${task.title}" marcado como pagado` });
    } catch (err: any) {
      toast({
        title: "Error al registrar pago",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const isPending = createRecurring.isPending || updateRecurring.isPending;

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" data-testid="button-back-settings">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Gastos Fijos</h1>
        <div className="flex-1" />
        <Button
          size="icon"
          className="h-10 w-10 rounded-full shadow-md"
          onClick={openCreate}
          data-testid="button-add-recurring"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-2xl" />)}
        </div>
      ) : recurringTasks.length > 0 ? (
        <div className="space-y-3">
          {recurringTasks.map(task => {
            const due = getDueLabel(task.due_day);
            return (
              <div
                key={task.id}
                data-testid={`card-recurring-${task.id}`}
                className={`p-4 rounded-2xl bg-card shadow-sm border border-border/40 space-y-3 transition-opacity ${!task.active ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <RefreshCw className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold truncate">{task.title}</span>
                    {!task.active && (
                      <Badge variant="secondary" className="text-xs shrink-0">Inactivo</Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => openEdit(task)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(task)}>
                        {task.active ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(task.id)}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className={`text-xs font-medium ${due.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {due.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                      {task.category && <span>{task.category.name}</span>}
                      {task.category && task.account && <span>·</span>}
                      {task.account && <span>{task.account.name}</span>}
                      {!task.category && !task.account && (
                        <span>{FREQUENCIES.find(f => f.value === task.frequency)?.label ?? task.frequency}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold tabular-nums">{formatCurrency(task.amount)}</span>
                    {task._paidThisMonth && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Pagado
                      </Badge>
                    )}
                    {task.active && !task._paidThisMonth && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-3 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleMarkPaid(task)}
                        disabled={markAsPaid.isPending}
                        data-testid={`button-paid-${task.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin gastos fijos</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Registrá tus pagos mensuales como alquiler, servicios o suscripciones.
          </p>
          <Button onClick={openCreate} data-testid="button-empty-add-recurring">
            Agregar gasto fijo
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={val => { if (!val) handleClose(); }}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rec-title">Nombre *</Label>
              <Input
                id="rec-title"
                value={form.title}
                onChange={e => setField("title", e.target.value)}
                placeholder="Ej. Alquiler"
                required
                data-testid="input-recurring-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rec-amount">Monto (Bs) *</Label>
                <Input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={e => setField("amount", e.target.value)}
                  required
                  data-testid="input-recurring-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-due-day">Día de vencimiento</Label>
                <Input
                  id="rec-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={form.due_day}
                  onChange={e => setField("due_day", e.target.value)}
                  required
                  data-testid="input-recurring-due-day"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={form.frequency} onValueChange={v => setField("frequency", v)}>
                <SelectTrigger data-testid="select-recurring-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={form.account_id} onValueChange={v => setField("account_id", v)}>
                <SelectTrigger data-testid="select-recurring-account">
                  <SelectValue placeholder="Sin cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.active).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category_id} onValueChange={v => setField("category_id", v)}>
                <SelectTrigger data-testid="select-recurring-category">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-reminder">Recordatorio (días antes)</Label>
              <Input
                id="rec-reminder"
                type="number"
                min="0"
                max="30"
                value={form.reminder_days_before}
                onChange={e => setField("reminder_days_before", e.target.value)}
                placeholder="3"
                data-testid="input-recurring-reminder"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border/40">
              <div>
                <p className="font-medium text-sm">Activo</p>
                <p className="text-xs text-muted-foreground">Se muestra en dashboard y próximos pagos</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={v => setField("active", v)}
                data-testid="switch-recurring-active"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !form.title.trim() || !form.amount}
              data-testid="button-submit-recurring"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
