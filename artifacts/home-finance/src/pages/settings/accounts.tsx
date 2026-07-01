import { useState } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import {
  Wallet, Plus, ChevronLeft, ChevronRight, MoreVertical,
  CreditCard, Building, Banknote, Bitcoin, Coins, PiggyBank
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const ACCOUNT_TYPES = [
  { value: "bank",        label: "Banco",              Icon: Building  },
  { value: "cash",        label: "Efectivo",            Icon: Banknote  },
  { value: "savings",     label: "Ahorro",              Icon: PiggyBank },
  { value: "credit_card", label: "Tarjeta de crédito",  Icon: CreditCard},
  { value: "investment",  label: "Inversión",           Icon: Coins     },
  { value: "crypto",      label: "Cripto",              Icon: Bitcoin   },
] as const;

type AccountType = typeof ACCOUNT_TYPES[number]["value"];

function getTypeIcon(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.Icon ?? Wallet;
}

function getTypeLabel(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type;
}

interface FormState {
  name: string;
  type: AccountType;
  initial_balance: string;
  color: string;
  icon: string;
  active: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  type: "bank",
  initial_balance: "0",
  color: "",
  icon: "",
  active: true,
};

export default function AccountsSettings() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
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

  const openEdit = (acc: any) => {
    setEditingId(acc.id);
    setForm({
      name: acc.name ?? "",
      type: (acc.type as AccountType) ?? "bank",
      initial_balance: String(acc.initial_balance ?? 0),
      color: acc.color ?? "",
      icon: acc.icon ?? "",
      active: acc.active ?? true,
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
    const payload = {
      name: form.name.trim(),
      type: form.type,
      initial_balance: parseFloat(form.initial_balance) || 0,
      color: form.color.trim() || null,
      icon: form.icon.trim() || null,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateAccount.mutateAsync({ id: editingId, data: payload });
      } else {
        await createAccount.mutateAsync(payload);
      }
      handleClose();
      toast({ title: "Cuenta guardada" });
    } catch (err: any) {
      toast({
        title: "Error al guardar",
        description: err?.message ?? "No se pudo guardar la cuenta.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (acc: any) => {
    try {
      await updateAccount.mutateAsync({
        id: acc.id,
        data: { active: !acc.active },
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "No se pudo actualizar la cuenta.",
        variant: "destructive",
      });
    }
  };

  const isPending = createAccount.isPending || updateAccount.isPending;

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            data-testid="button-back-settings"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Cuentas</h1>
        <div className="flex-1" />
        <Button
          size="icon"
          className="h-10 w-10 rounded-full shadow-md"
          onClick={openCreate}
          data-testid="button-add-account"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-2xl" />
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map(acc => {
            const Icon = getTypeIcon(acc.type);
            return (
              <div
                key={acc.id}
                data-testid={`card-account-${acc.id}`}
                className={`flex items-center justify-between p-4 rounded-2xl bg-card shadow-sm border border-border/40 transition-opacity ${!acc.active ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={acc.color ? { backgroundColor: `${acc.color}22`, color: acc.color } : undefined}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={!acc.color ? undefined : { color: acc.color }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold">{acc.name}</h3>
                    <p className="text-sm text-muted-foreground">{getTypeLabel(acc.type)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums">
                    {formatCurrency(acc.current_balance ?? acc.initial_balance ?? 0)}
                  </span>

                  <Link href={`/settings/accounts/${acc.id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      data-testid={`button-account-detail-${acc.id}`}
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Link>

                  <Switch
                    checked={!!acc.active}
                    onCheckedChange={() => toggleActive(acc)}
                    data-testid={`switch-active-${acc.id}`}
                    aria-label="Activa"
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        data-testid={`button-menu-${acc.id}`}
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem
                        onClick={() => openEdit(acc)}
                        data-testid={`button-edit-${acc.id}`}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteAccount.mutate(acc.id)}
                        data-testid={`button-delete-${acc.id}`}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 bg-card rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Sin cuentas</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Todavía no registraste cuentas.
          </p>
          <Button onClick={openCreate} data-testid="button-empty-add-account">
            Agregar cuenta
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={val => { if (!val) handleClose(); }}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="acc-name">Nombre *</Label>
              <Input
                id="acc-name"
                value={form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder="Ej. Banco Fassil"
                required
                data-testid="input-account-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-type">Tipo *</Label>
              <Select
                value={form.type}
                onValueChange={v => setField("type", v as AccountType)}
              >
                <SelectTrigger id="acc-type" data-testid="select-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-balance">Saldo inicial (Bs)</Label>
              <Input
                id="acc-balance"
                type="number"
                step="0.01"
                min="0"
                value={form.initial_balance}
                onChange={e => setField("initial_balance", e.target.value)}
                data-testid="input-account-balance"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acc-color">Color (hex)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color || "#22c55e"}
                    onChange={e => setField("color", e.target.value)}
                    className="h-10 w-10 rounded-lg border border-border cursor-pointer p-1"
                    data-testid="input-account-color"
                  />
                  <Input
                    id="acc-color"
                    value={form.color}
                    onChange={e => setField("color", e.target.value)}
                    placeholder="#22c55e"
                    data-testid="input-account-color-hex"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acc-icon">Ícono</Label>
                <Input
                  id="acc-icon"
                  value={form.icon}
                  onChange={e => setField("icon", e.target.value)}
                  placeholder="Ej. wallet"
                  data-testid="input-account-icon"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border/40">
              <div>
                <p className="font-medium text-sm">Cuenta activa</p>
                <p className="text-xs text-muted-foreground">Se incluye en cálculos y reportes</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={v => setField("active", v)}
                data-testid="switch-account-active"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !form.name.trim()}
              data-testid="button-submit-account"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
