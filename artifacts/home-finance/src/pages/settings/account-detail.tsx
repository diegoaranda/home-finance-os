import { useState } from "react";
import { Link, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Bitcoin,
  Building,
  ChevronLeft,
  Coins,
  CreditCard,
  ListOrdered,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { useAccountSummary, type AccountPeriod } from "@/hooks/use-account-summary";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Banco", Icon: Building },
  { value: "cash", label: "Efectivo", Icon: Banknote },
  { value: "savings", label: "Ahorro", Icon: PiggyBank },
  { value: "credit_card", label: "Tarjeta de crédito", Icon: CreditCard },
  { value: "investment", label: "Inversión", Icon: Coins },
  { value: "crypto", label: "Cripto", Icon: Bitcoin },
] as const;

function getTypeIcon(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.Icon ?? Wallet;
}

function getTypeLabel(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type;
}

function getTodayInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

function getMonthStartInputValue() {
  return format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
}

function getMovementMeta(tx: any, accountId: string) {
  const amount = formatCurrency(tx.amount);
  if (tx.type === "income") {
    return {
      title: tx.category?.name || tx.description || "Ingreso",
      detail: tx.account_to?.name || "Sin cuenta",
      amount: `+${amount}`,
      tone: "text-primary",
      Icon: ArrowDownRight,
      iconClass: "bg-primary/10 text-primary",
    };
  }

  if (tx.type === "expense") {
    return {
      title: tx.category?.name || tx.description || "Gasto",
      detail: tx.account_from?.name || "Sin cuenta",
      amount: `-${amount}`,
      tone: "text-destructive",
      Icon: ArrowUpRight,
      iconClass: "bg-destructive/10 text-destructive",
    };
  }

  const isIncoming = tx.account_to_id === accountId;
  return {
    title: isIncoming ? "Transferencia recibida" : "Transferencia enviada",
    detail: `${tx.account_from?.name || "Sin origen"} -> ${tx.account_to?.name || "Sin destino"}`,
    amount,
    tone: "text-muted-foreground",
    Icon: ArrowLeftRight,
    iconClass: "bg-muted text-muted-foreground",
  };
}

export default function AccountDetail() {
  const params = useParams<{ id: string }>();
  const accountId = params.id;
  const [period, setPeriod] = useState<AccountPeriod>("month");
  const [customStart, setCustomStart] = useState(getMonthStartInputValue);
  const [customEnd, setCustomEnd] = useState(getTodayInputValue);
  const { account, summary, recentTransactions, range, isLoading } = useAccountSummary(accountId, {
    period,
    customStart,
    customEnd,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse pb-24">
        <div className="h-10 w-44 bg-muted rounded" />
        <div className="h-36 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6 space-y-6 pb-24">
        <header className="flex items-center gap-3">
          <Link href="/settings/accounts">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Cuenta</h1>
        </header>
        <div className="text-center p-12 bg-card rounded-3xl shadow-sm">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No se encontró esta cuenta.</p>
        </div>
      </div>
    );
  }

  const Icon = getTypeIcon(account.type);

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings/accounts">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            data-testid="button-back-accounts"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{account.name}</h1>
          <p className="text-sm text-muted-foreground">{getTypeLabel(account.type)}</p>
        </div>
      </header>

      <Card className="bg-foreground text-background border-none rounded-[2rem] shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-background/70 font-medium mb-2">Balance actual</p>
              <h2 className="text-3xl font-bold tracking-tight tabular-nums">
                {formatCurrency(summary.currentBalance)}
              </h2>
              <p className="text-sm text-background/60 mt-2">
                Inicial {formatCurrency(summary.initialBalance)}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center bg-background/10 shrink-0"
              style={account.color ? { color: account.color } : undefined}
            >
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <Tabs value={period} onValueChange={value => setPeriod(value as AccountPeriod)}>
          <TabsList className="grid w-full grid-cols-5 rounded-xl bg-card">
            <TabsTrigger value="today" className="rounded-lg text-xs">Hoy</TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg text-xs">Semana</TabsTrigger>
            <TabsTrigger value="month" className="rounded-lg text-xs">Mes</TabsTrigger>
            <TabsTrigger value="year" className="rounded-lg text-xs">Año</TabsTrigger>
            <TabsTrigger value="custom" className="rounded-lg text-xs">Personal</TabsTrigger>
          </TabsList>
        </Tabs>

        {period === "custom" && (
          <div className="grid grid-cols-2 gap-3 p-4 bg-card rounded-2xl shadow-sm border border-border/40">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {format(parseISO(range.start), "d MMM, yyyy", { locale: es })} - {format(parseISO(range.end), "d MMM, yyyy", { locale: es })}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="Ingresos" value={summary.income} tone="text-primary" />
        <MetricCard label="Gastos" value={summary.expenses} tone="text-destructive" />
        <MetricCard label="Transf. recibidas" value={summary.transfersIn} tone="text-muted-foreground" />
        <MetricCard label="Transf. enviadas" value={summary.transfersOut} tone="text-muted-foreground" />
      </section>

      <Card className="rounded-2xl border-none shadow-sm bg-card">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ListOrdered className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Movimientos</p>
              <p className="text-sm text-muted-foreground">Dentro del período</p>
            </div>
          </div>
          <span className="text-2xl font-bold tabular-nums">{summary.movementCount}</span>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Últimos movimientos</h2>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map(tx => {
              const meta = getMovementMeta(tx, account.id);
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-card shadow-sm border border-border/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.iconClass}`}>
                      <meta.Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{meta.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {meta.detail} · {format(parseISO(tx.transaction_date), "d MMM", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold shrink-0 tabular-nums ${meta.tone}`}>{meta.amount}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-10 bg-card rounded-3xl shadow-sm">
            <ListOrdered className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Sin movimientos</p>
            <p className="text-sm text-muted-foreground">No hay movimientos en este período.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="rounded-2xl border-none shadow-sm bg-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <p className={`text-lg font-bold tabular-nums ${tone}`}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}
