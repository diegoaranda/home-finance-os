import { useEffect, useState } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Search, ListOrdered, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getTodayInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

type TransactionKind = "expense" | "income" | "transfer";

export default function Transactions() {
  const [location, navigate] = useLocation();
  const { transactions, isLoading, createTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { toast } = useToast();
  
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  
  // Form state
  const [type, setType] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountFromId, setAccountFromId] = useState("");
  const [accountToId, setAccountToId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(getTodayInputValue);
  const amountValue = parseFloat(amount);
  const isTransfer = type === "transfer";
  const isValid = isTransfer
    ? amountValue > 0 && !!accountFromId && !!accountToId && accountFromId !== accountToId && !!date
    : amountValue > 0 && !!accountId && !!categoryId && !!date;
  const selectableAccounts = editingTx
    ? accounts.filter(acc =>
        acc.active ||
        acc.id === accountId ||
        acc.id === accountFromId ||
        acc.id === accountToId
      )
    : accounts.filter(acc => acc.active);

  const resetForm = () => {
    setType("expense");
    setAmount("");
    setDescription("");
    setAccountId("");
    setAccountFromId("");
    setAccountToId("");
    setCategoryId("");
    setDate(getTodayInputValue());
    setEditingTx(null);
  };

  const openCreate = (initialType: TransactionKind = "expense") => {
    resetForm();
    setType(initialType);
    setOpen(true);
  };

  const openEdit = (tx: any) => {
    const txType = (tx.type === "transfer" || tx.type === "income" || tx.type === "expense") ? tx.type : "expense";
    setEditingTx(tx);
    setType(txType);
    setAmount(String(tx.amount ?? ""));
    setDescription(tx.description ?? "");
    setDate(tx.transaction_date ?? getTodayInputValue());
    setCategoryId(tx.category_id ?? "");
    setAccountId(txType === "income" ? tx.account_to_id ?? tx.account_id ?? "" : tx.account_from_id ?? tx.account_id ?? "");
    setAccountFromId(tx.account_from_id ?? "");
    setAccountToId(tx.account_to_id ?? "");
    setOpen(true);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) resetForm();
  };

  const buildPayload = () => ({
    type,
    amount: amountValue,
    description: description.trim() || null,
    account_from_id: isTransfer || type === "expense" ? (isTransfer ? accountFromId : accountId) : null,
    account_to_id: isTransfer || type === "income" ? (isTransfer ? accountToId : accountId) : null,
    category_id: isTransfer ? null : categoryId,
    transaction_date: date,
    recurring_task_id: isTransfer ? null : editingTx?.recurring_task_id ?? null,
  });

  const filteredTx = transactions.filter(tx => {
    if (filter !== "all" && tx.type !== filter) return false;
    const query = search.toLowerCase();
    const matchesDescription = tx.description?.toLowerCase().includes(query);
    const matchesCategory = tx.category?.name?.toLowerCase().includes(query);
    const matchesAccountFrom = tx.account_from?.name?.toLowerCase().includes(query);
    const matchesAccountTo = tx.account_to?.name?.toLowerCase().includes(query);
    if (search && !matchesDescription && !matchesCategory && !matchesAccountFrom && !matchesAccountTo) return false;
    return true;
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: isTransfer
          ? "Seleccione cuentas distintas, monto mayor a cero y fecha."
          : "Seleccione tipo, cuenta, categoría, monto mayor a cero y fecha.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingTx) {
        await updateTransaction.mutateAsync({ id: editingTx.id, data: payload });
      } else {
        await createTransaction.mutateAsync(payload);
      }
      setOpen(false);
      resetForm();
      toast({ title: editingTx ? "Movimiento actualizado" : "Movimiento registrado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTx) return;
    try {
      await deleteTransaction.mutateAsync(deletingTx.id);
      setDeletingTx(null);
      toast({ title: "Movimiento eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  useEffect(() => {
    const typeParam = new URLSearchParams(window.location.search).get("type");
    if (typeParam === "expense" || typeParam === "income" || typeParam === "transfer") {
      openCreate(typeParam);
      navigate("/transactions", { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => openCreate()} data-testid="button-add-transaction">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editingTx ? "Editar Movimiento" : "Nuevo Movimiento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant={type === "expense" ? "default" : "outline"} onClick={() => { setType("expense"); setCategoryId(""); }} disabled={!!editingTx} className={type === "expense" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""} data-testid="button-transaction-expense">
                  Gasto
                </Button>
                <Button type="button" variant={type === "income" ? "default" : "outline"} onClick={() => { setType("income"); setCategoryId(""); }} disabled={!!editingTx} data-testid="button-transaction-income">
                  Ingreso
                </Button>
                <Button type="button" variant={type === "transfer" ? "default" : "outline"} onClick={() => { setType("transfer"); setCategoryId(""); }} disabled={!!editingTx} data-testid="button-transaction-transfer">
                  Transferencia
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Monto (Bs)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="text-lg" data-testid="input-transaction-amount" />
              </div>

              {isTransfer ? (
                <>
                  <div className="space-y-2">
                    <Label>Cuenta origen</Label>
                    <Select value={accountFromId} onValueChange={setAccountFromId} required>
                      <SelectTrigger data-testid="select-transfer-account-from"><SelectValue placeholder="Selecciona origen" /></SelectTrigger>
                      <SelectContent>
                        {selectableAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.current_balance ?? acc.initial_balance ?? 0)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cuenta destino</Label>
                    <Select value={accountToId} onValueChange={setAccountToId} required>
                      <SelectTrigger data-testid="select-transfer-account-to"><SelectValue placeholder="Selecciona destino" /></SelectTrigger>
                      <SelectContent>
                        {selectableAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id} disabled={acc.id === accountFromId}>{acc.name} ({formatCurrency(acc.current_balance ?? acc.initial_balance ?? 0)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Cuenta</Label>
                    <Select value={accountId} onValueChange={setAccountId} required>
                      <SelectTrigger data-testid="select-transaction-account"><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                      <SelectContent>
                        {selectableAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.current_balance ?? acc.initial_balance ?? 0)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger data-testid="select-transaction-category"><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => !c.type || c.type === type).map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required data-testid="input-transaction-date" />
              </div>

              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Compra súper" data-testid="input-transaction-description" />
              </div>

              <Button type="submit" className="w-full" disabled={saving || !isValid} data-testid="button-submit-transaction">
                {saving ? "Guardando..." : editingTx ? "Actualizar" : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="pl-9 bg-card border-none shadow-sm rounded-2xl h-12"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-card">
            <TabsTrigger value="all" className="rounded-lg">Todos</TabsTrigger>
            <TabsTrigger value="income" className="rounded-lg">Ingresos</TabsTrigger>
            <TabsTrigger value="expense" className="rounded-lg">Gastos</TabsTrigger>
            <TabsTrigger value="transfer" className="rounded-lg">Transferencias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-2xl"></div>)}
        </div>
      ) : filteredTx.length > 0 ? (
        <div className="space-y-3">
          {filteredTx.map((tx) => {
            const isTransferTx = tx.type === "transfer";
            const accountName = tx.type === "income" ? tx.account_to?.name : tx.account_from?.name;
            const transferRoute = `${tx.account_from?.name || "Sin origen"} -> ${tx.account_to?.name || "Sin destino"}`;
            return (
            <div key={tx.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-card shadow-sm border border-border/40">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-primary/10 text-primary' : isTransferTx ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
                  {tx.type === 'income'
                    ? <ArrowDownRight className="w-5 h-5" />
                    : isTransferTx
                      ? <ArrowLeftRight className="w-5 h-5" />
                      : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{isTransferTx ? "Transferencia" : tx.category?.name || (tx.type === 'income' ? 'Ingreso' : 'Gasto')}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="truncate">{isTransferTx ? transferRoute : accountName || "Sin cuenta"}</span>
                    <span>•</span>
                    <span>{format(parseISO(tx.transaction_date), "d MMM", { locale: es })}</span>
                  </div>
                </div>
              </div>
              <span className={`font-bold shrink-0 tabular-nums ${tx.type === 'income' ? 'text-primary' : isTransferTx ? 'text-muted-foreground' : 'text-destructive'}`}>
                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full shrink-0"
                    data-testid={`button-transaction-menu-${tx.id}`}
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => openEdit(tx)} data-testid={`button-edit-transaction-${tx.id}`}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeletingTx(tx)}
                    data-testid={`button-delete-transaction-${tx.id}`}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )})}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ListOrdered className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin movimientos</h3>
          <p className="text-sm text-muted-foreground">No se encontraron transacciones para estos filtros.</p>
        </div>
      )}

      <Dialog open={!!deletingTx} onOpenChange={open => { if (!open) setDeletingTx(null); }}>
        <DialogContent className="sm:max-w-[380px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Eliminar movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              Esta acción eliminará el movimiento y actualizará saldos, Dashboard y resúmenes por cuenta.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setDeletingTx(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteTransaction.isPending}
                data-testid="button-confirm-delete-transaction"
              >
                {deleteTransaction.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
