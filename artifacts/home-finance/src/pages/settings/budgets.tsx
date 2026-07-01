import { useMemo, useState } from "react";
import { ChevronLeft, MoreVertical, PieChart, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getMonthRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function getBudgetAmount(budget: any) {
  return Number(budget.amount ?? budget.budgeted_amount ?? 0);
}

function getStatus(usedPercent: number) {
  if (usedPercent > 100) return { label: "Excedido", bar: "bg-destructive", text: "text-destructive" };
  if (usedPercent >= 80) return { label: "Advertencia", bar: "bg-amber-500", text: "text-amber-600" };
  return { label: "Normal", bar: "bg-primary", text: "text-primary" };
}

export default function BudgetsSettings() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [year, setYear] = useState(getCurrentYear);
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<any | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const { budgets, isLoading, createBudget, updateBudget, deleteBudget } = useBudgets(month, year);
  const { categories } = useCategories();
  const { transactions } = useTransactions();
  const { toast } = useToast();

  const expenseCategories = categories.filter(category => !category.type || category.type === "expense");
  const amountValue = parseFloat(amount);
  const isValid = !!categoryId && month > 0 && year > 0 && amountValue > 0;

  const spentByCategory = useMemo(() => {
    const range = getMonthRange(month, year);
    return transactions.reduce((totals: Record<string, number>, tx) => {
      if (tx.type !== "expense" || !tx.category_id) return totals;
      if (tx.transaction_date < range.start || tx.transaction_date > range.end) return totals;
      totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.amount || 0);
      return totals;
    }, {});
  }, [transactions, month, year]);

  const resetForm = () => {
    setCategoryId("");
    setAmount("");
    setEditingBudget(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (budget: any) => {
    setEditingBudget(budget);
    setCategoryId(budget.category_id ?? "");
    setAmount(String(getBudgetAmount(budget) || ""));
    setOpen(true);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) resetForm();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Seleccione categoría, mes, año y un monto mayor a cero.",
      });
      return;
    }

    const duplicate = budgets.find(budget =>
      budget.category_id === categoryId &&
      Number(budget.month) === month &&
      Number(budget.year) === year &&
      budget.id !== editingBudget?.id
    );

    if (duplicate) {
      toast({
        variant: "destructive",
        title: "Presupuesto duplicado",
        description: "Ya existe un presupuesto para esta categoría en el mes seleccionado.",
      });
      return;
    }

    try {
      const payload = {
        category_id: categoryId,
        month,
        year,
        amount: amountValue,
      };

      if (editingBudget) {
        await updateBudget.mutateAsync({ id: editingBudget.id, data: payload });
      } else {
        await createBudget.mutateAsync(payload);
      }

      setOpen(false);
      resetForm();
      toast({ title: editingBudget ? "Presupuesto actualizado" : "Presupuesto creado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;
    try {
      await deleteBudget.mutateAsync(deletingBudget.id);
      setDeletingBudget(null);
      toast({ title: "Presupuesto eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const years = Array.from({ length: 7 }, (_, index) => getCurrentYear() - 3 + index);
  const isSaving = createBudget.isPending || updateBudget.isPending;

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border-none">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
        <div className="flex-1" />
        <Button size="icon" className="h-10 w-10 rounded-full shadow-md" onClick={openCreate} data-testid="button-add-budget">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Mes</Label>
          <Select value={String(month)} onValueChange={value => setMonth(Number(value))}>
            <SelectTrigger data-testid="select-budget-month"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(item => (
                <SelectItem key={item.value} value={String(item.value)}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Año</Label>
          <Select value={String(year)} onValueChange={value => setYear(Number(value))}>
            <SelectTrigger data-testid="select-budget-year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(item => (
                <SelectItem key={item} value={String(item)}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(item => <div key={item} className="h-36 bg-muted rounded-2xl" />)}
        </div>
      ) : budgets.length > 0 ? (
        <div className="space-y-3">
          {budgets.map(budget => {
            const budgeted = getBudgetAmount(budget);
            const spent = spentByCategory[budget.category_id] || 0;
            const remaining = budgeted - spent;
            const usedPercent = budgeted > 0 ? (spent / budgeted) * 100 : 0;
            const status = getStatus(usedPercent);
            const progressWidth = `${Math.min(usedPercent, 100)}%`;

            return (
              <div key={budget.id} className="p-4 rounded-2xl bg-card shadow-sm border border-border/40 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{budget.category?.name || "Sin categoría"}</h3>
                    <p className={`text-xs font-medium ${status.text}`}>{status.label} · {usedPercent.toFixed(0)}% usado</p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => openEdit(budget)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeletingBudget(budget)}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${status.bar}`} style={{ width: progressWidth }} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <BudgetMetric label="Presupuestado" value={formatCurrency(budgeted)} />
                  <BudgetMetric label="Gastado" value={formatCurrency(spent)} />
                  <BudgetMetric label="Restante" value={formatCurrency(remaining)} tone={remaining < 0 ? "text-destructive" : "text-primary"} />
                  <BudgetMetric label="Usado" value={`${usedPercent.toFixed(0)}%`} tone={status.text} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm mt-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <PieChart className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin presupuestos</h3>
          <p className="text-sm text-muted-foreground mb-6">Cree un presupuesto para controlar gastos por categoría.</p>
          <Button onClick={openCreate}>Crear presupuesto</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger data-testid="select-budget-category"><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={String(month)} onValueChange={value => setMonth(Number(value))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(item => (
                      <SelectItem key={item.value} value={String(item.value)}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={String(year)} onValueChange={value => setYear(Number(value))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(item => (
                      <SelectItem key={item} value={String(item)}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto presupuestado (Bs)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                placeholder="0.00"
                data-testid="input-budget-amount"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSaving || !isValid} data-testid="button-submit-budget">
              {isSaving ? "Guardando..." : editingBudget ? "Actualizar" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingBudget} onOpenChange={open => { if (!open) setDeletingBudget(null); }}>
        <DialogContent className="sm:max-w-[380px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Eliminar presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              Esta acción eliminará el presupuesto seleccionado. Los movimientos existentes no se eliminarán.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setDeletingBudget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteBudget.isPending}
                data-testid="button-confirm-delete-budget"
              >
                {deleteBudget.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetMetric({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 min-w-0">
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      <p className={`font-bold tabular-nums truncate ${tone}`}>{value}</p>
    </div>
  );
}
