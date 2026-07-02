import { useMemo, useState } from "react";
import { ChevronLeft, MoreVertical, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, type CategoryType } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS: Record<CategoryType, string> = {
  income: "#22C55E",
  expense: "#F97316",
};

const DEFAULT_ICONS: Record<CategoryType, string> = {
  income: "💰",
  expense: "🧾",
};

const EMOJI_OPTIONS = [
  "💼", "💰", "🏦", "🎯", "📈", "🛒", "🍔", "🚗",
  "🏠", "💡", "📱", "🎓", "💊", "🐶", "✈️", "🎉",
  "🎁", "👕", "🧾", "🛠️", "❤️", "🎮", "👶", "📦",
  "🏋️", "⚽", "⛪",
];

const COLOR_OPTIONS = [
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#F97316",
  "#F59E0B",
  "#EF4444",
  "#F43F5E",
  "#64748B",
];

type CategoryForm = {
  name: string;
  type: CategoryType | "";
  color: string;
  icon: string;
};

const initialForm: CategoryForm = {
  name: "",
  type: "expense",
  color: DEFAULT_COLORS.expense,
  icon: DEFAULT_ICONS.expense,
};

export default function CategoriesSettings() {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<any | null>(null);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } = useCategories();
  const { toast } = useToast();

  const incomeCategories = useMemo(
    () => categories.filter(category => category.type === "income"),
    [categories]
  );

  const expenseCategories = useMemo(
    () => categories.filter(category => category.type !== "income"),
    [categories]
  );

  const isValid = form.name.trim().length > 0 && (form.type === "income" || form.type === "expense");
  const isSaving = createCategory.isPending || updateCategory.isPending;

  const resetForm = () => {
    setForm(initialForm);
    setEditingCategory(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (category: any) => {
    const type = category.type === "income" ? "income" : "expense";
    setEditingCategory(category);
    setForm({
      name: category.name ?? "",
      type,
      color: category.color || DEFAULT_COLORS[type],
      icon: category.icon || DEFAULT_ICONS[type],
    });
    setOpen(true);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) resetForm();
  };

  const setType = (type: CategoryType) => {
    setForm(current => ({
      ...current,
      type,
      color: editingCategory ? current.color || DEFAULT_COLORS[type] : DEFAULT_COLORS[type],
      icon: editingCategory ? current.icon || DEFAULT_ICONS[type] : DEFAULT_ICONS[type],
    }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValid || !form.type) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "El nombre y el tipo de categoría son obligatorios.",
      });
      return;
    }

    try {
      const payload = {
        name: form.name,
        type: form.type,
        color: form.color || DEFAULT_COLORS[form.type],
        icon: form.icon || DEFAULT_ICONS[form.type],
      };

      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data: payload });
      } else {
        await createCategory.mutateAsync(payload);
      }

      setOpen(false);
      resetForm();
      toast({ title: editingCategory ? "Categoría actualizada" : "Categoría creada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await deleteCategory.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
      toast({ title: "Categoría eliminada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: error.message });
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border-none">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
        <div className="flex-1" />
        <Button size="icon" className="h-10 w-10 rounded-full shadow-md" onClick={openCreate} data-testid="button-add-category">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(item => (
            <Skeleton key={item} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm mt-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No se pudieron cargar</h3>
          <p className="text-sm text-muted-foreground">Intenta nuevamente en unos segundos.</p>
        </div>
      ) : categories.length > 0 ? (
        <div className="space-y-6">
          <CategorySection title="Gastos" emptyText="Sin categorías de gasto" categories={expenseCategories} onEdit={openEdit} onDelete={setDeletingCategory} />
          <CategorySection title="Ingresos" emptyText="Sin categorías de ingreso" categories={incomeCategories} onEdit={openEdit} onDelete={setDeletingCategory} />
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm mt-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin categorías</h3>
          <p className="text-sm text-muted-foreground mb-6">Crea categorías para clasificar movimientos y presupuestos.</p>
          <Button onClick={openCreate}>Crear categoría</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Alimentación"
                data-testid="input-category-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={value => setType(value as CategoryType)}>
                <SelectTrigger data-testid="select-category-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="income">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="grid grid-cols-6 gap-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={form.icon === emoji ? "default" : "outline"}
                    className="h-10 w-full rounded-xl px-0 text-lg"
                    onClick={() => setForm(current => ({ ...current, icon: emoji }))}
                    aria-pressed={form.icon === emoji}
                    data-testid={`button-category-icon-${emoji}`}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-10 rounded-xl border border-border ring-offset-background transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      form.color === color && "ring-2 ring-ring ring-offset-2"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm(current => ({ ...current, color }))}
                    aria-label={`Color ${color}`}
                    aria-pressed={form.color === color}
                    data-testid={`button-category-color-${color}`}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSaving || !isValid} data-testid="button-submit-category">
              {isSaving ? "Guardando..." : editingCategory ? "Actualizar" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCategory} onOpenChange={open => { if (!open) setDeletingCategory(null); }}>
        <DialogContent className="sm:max-w-[380px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Eliminar categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              Solo se eliminará si no está vinculada a movimientos, presupuestos o gastos recurrentes.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setDeletingCategory(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteCategory.isPending}
                data-testid="button-confirm-delete-category"
              >
                {deleteCategory.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategorySection({
  title,
  emptyText,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  emptyText: string;
  categories: any[];
  onEdit: (category: any) => void;
  onDelete: (category: any) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Badge variant="secondary">{categories.length}</Badge>
      </div>

      {categories.length > 0 ? (
        <div className="space-y-3">
          {categories.map(category => (
            <CategoryRow key={category.id} category={category} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-sm">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: any;
  onEdit: (category: any) => void;
  onDelete: (category: any) => void;
}) {
  const typeLabel = category.type === "income" ? "Ingreso" : "Gasto";
  const color = category.color || (category.type === "income" ? DEFAULT_COLORS.income : DEFAULT_COLORS.expense);
  const icon = category.icon || (category.type === "income" ? DEFAULT_ICONS.income : DEFAULT_ICONS.expense);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm border border-border/40">
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold truncate">{category.name}</h3>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(category)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
