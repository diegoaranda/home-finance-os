import { useState } from "react";
import { useRecurring } from "@/hooks/use-recurring";
import { useCategories } from "@/hooks/use-categories";
import { formatCurrency } from "@/lib/currency";
import { CalendarClock, Plus, ChevronLeft, MoreVertical, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function RecurringSettings() {
  const { recurringTasks, isLoading, createRecurring, updateRecurring, deleteRecurring } = useRecurring();
  const { categories } = useCategories();
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setDueDay("1");
    setCategoryId("");
    setActive(true);
    setEditingId(null);
  };

  const handleEdit = (task: any) => {
    setTitle(task.title);
    setAmount(task.amount.toString());
    setDueDay(task.due_day.toString());
    setCategoryId(task.category_id || "");
    setActive(task.active);
    setEditingId(task.id);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title,
      amount: parseFloat(amount),
      due_day: parseInt(dueDay),
      category_id: categoryId || null,
      active,
      task_type: "expense",
      frequency: "monthly"
    };

    if (editingId) {
      await updateRecurring.mutateAsync({ id: editingId, data });
    } else {
      await createRecurring.mutateAsync(data);
    }
    setOpen(false);
    resetForm();
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border-none">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight leading-tight">Gastos Fijos</h1>
        <div className="flex-1" />
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-10 w-10 rounded-full shadow-lg">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej. Alquiler" />
              </div>
              <div className="space-y-2">
                <Label>Monto Estimado (Bs)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Día de vencimiento (1-31)</Label>
                <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Categoría (Opcional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => !c.type || c.type === 'expense').map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="cursor-pointer">Activo</Label>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
              <Button type="submit" className="w-full mt-4">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2].map(i => <div key={i} className="h-24 bg-muted rounded-2xl"></div>)}
        </div>
      ) : recurringTasks.length > 0 ? (
        <div className="space-y-3">
          {recurringTasks.map(task => (
            <div key={task.id} className={`p-4 rounded-2xl bg-card shadow-sm border border-border/40 ${!task.active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  {task.title}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => handleEdit(task)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteRecurring.mutate(task.id)}>Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Vence el día {task.due_day}</p>
                  {task.category && <p className="text-xs text-muted-foreground/70">{task.category.name}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(task.amount)}</p>
                  <p className="text-xs text-muted-foreground">mensual</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin gastos fijos</h3>
          <p className="text-sm text-muted-foreground">Registra tus gastos mensuales recurrentes como alquiler o servicios.</p>
        </div>
      )}
    </div>
  );
}
