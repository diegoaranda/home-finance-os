import { useState } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, ArrowDownRight, ArrowUpRight, Search, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";

export default function Transactions() {
  const { transactions, isLoading, createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { toast } = useToast();
  
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const amountValue = parseFloat(amount);
  const isValid = amountValue > 0 && !!accountId && !!categoryId && !!date;

  const filteredTx = transactions.filter(tx => {
    if (filter !== "all" && tx.type !== filter) return false;
    const query = search.toLowerCase();
    const matchesDescription = tx.description?.toLowerCase().includes(query);
    const matchesCategory = tx.category?.name?.toLowerCase().includes(query);
    const matchesAccount = (tx.type === "income" ? tx.account_to?.name : tx.account_from?.name)?.toLowerCase().includes(query);
    if (search && !matchesDescription && !matchesCategory && !matchesAccount) return false;
    return true;
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Seleccione tipo, cuenta, categoría, monto mayor a cero y fecha.",
      });
      return;
    }

    setSaving(true);
    try {
      await createTransaction.mutateAsync({
        type,
        amount: amountValue,
        description: description.trim() || null,
        account_from_id: type === "expense" ? accountId : null,
        account_to_id: type === "income" ? accountId : null,
        category_id: categoryId,
        transaction_date: date,
        recurring_task_id: null,
      });
      setOpen(false);
      // Reset form
      setAmount("");
      setDescription("");
      setAccountId("");
      setCategoryId("");
      setDate(new Date().toISOString().split('T')[0]);
      toast({ title: "Movimiento registrado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-10 w-10 rounded-full shadow-lg" data-testid="button-add-transaction">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>Nuevo Movimiento</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={type === "expense" ? "default" : "outline"} onClick={() => { setType("expense"); setCategoryId(""); }} className={type === "expense" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""} data-testid="button-transaction-expense">
                  Gasto
                </Button>
                <Button type="button" variant={type === "income" ? "default" : "outline"} onClick={() => { setType("income"); setCategoryId(""); }} data-testid="button-transaction-income">
                  Ingreso
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Monto (Bs)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="text-lg" data-testid="input-transaction-amount" />
              </div>

              <div className="space-y-2">
                <Label>Cuenta</Label>
                <Select value={accountId} onValueChange={setAccountId} required>
                  <SelectTrigger data-testid="select-transaction-account"><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.initial_balance ?? 0)})</SelectItem>
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

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required data-testid="input-transaction-date" />
              </div>

              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Compra súper" data-testid="input-transaction-description" />
              </div>

              <Button type="submit" className="w-full" disabled={saving || !isValid} data-testid="button-submit-transaction">
                {saving ? "Guardando..." : "Guardar"}
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
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-card">
            <TabsTrigger value="all" className="rounded-lg">Todos</TabsTrigger>
            <TabsTrigger value="income" className="rounded-lg">Ingresos</TabsTrigger>
            <TabsTrigger value="expense" className="rounded-lg">Gastos</TabsTrigger>
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
            const accountName = tx.type === "income" ? tx.account_to?.name : tx.account_from?.name;
            return (
            <div key={tx.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-card shadow-sm border border-border/40">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{tx.category?.name || (tx.type === 'income' ? 'Ingreso' : 'Gasto')}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{accountName || "Sin cuenta"}</span>
                    <span>•</span>
                    <span>{format(parseISO(tx.transaction_date), "d MMM", { locale: es })}</span>
                  </div>
                </div>
              </div>
              <span className={`font-bold shrink-0 tabular-nums ${tx.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </span>
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
    </div>
  );
}
