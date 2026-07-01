import { useState } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/currency";
import { Wallet, Plus, ChevronLeft, MoreVertical, CreditCard, Building, Banknote, Bitcoin, Coins } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const accountTypeIcons: Record<string, any> = {
  bank: Building,
  cash: Banknote,
  savings: Wallet,
  credit_card: CreditCard,
  investment: Coins,
  crypto: Bitcoin,
  default: Wallet
};

export default function AccountsSettings() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [balance, setBalance] = useState("0");
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setName("");
    setType("bank");
    setBalance("0");
    setActive(true);
    setEditingId(null);
  };

  const handleEdit = (acc: any) => {
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.current_balance?.toString() || "0");
    setActive(acc.active);
    setEditingId(acc.id);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      type,
      current_balance: parseFloat(balance),
      initial_balance: parseFloat(balance), // simplifying for prototype
      active
    };

    if (editingId) {
      await updateAccount.mutateAsync({ id: editingId, data });
    } else {
      await createAccount.mutateAsync(data);
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
        <h1 className="text-2xl font-bold tracking-tight">Cuentas</h1>
        <div className="flex-1" />
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-10 w-10 rounded-full shadow-lg">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej. Banco Fassil" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Banco</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="savings">Ahorro</SelectItem>
                    <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="investment">Inversión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Balance (Bs)</Label>
                <Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="cursor-pointer">Cuenta Activa</Label>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
              <Button type="submit" className="w-full mt-4">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl"></div>)}
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map(acc => {
            const Icon = accountTypeIcons[acc.type] || accountTypeIcons.default;
            return (
              <div key={acc.id} className={`flex items-center justify-between p-4 rounded-2xl bg-card shadow-sm border border-border/40 ${!acc.active ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{acc.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{acc.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{formatCurrency(acc.current_balance)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => handleEdit(acc)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteAccount.mutate(acc.id)}>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin cuentas</h3>
          <p className="text-sm text-muted-foreground">Añade tu primera cuenta para empezar a registrar movimientos.</p>
        </div>
      )}
    </div>
  );
}
