import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { 
  User, 
  Wallet, 
  Tags, 
  CalendarClock, 
  PieChart, 
  LogOut, 
  ChevronRight,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { appUser, signOut } = useAuth();

  const menuItems = [
    { name: "Cuentas", icon: Wallet, path: "/settings/accounts" },
    { name: "Categorías", icon: Tags, path: "/settings/categories" },
    { name: "Gastos recurrentes", icon: CalendarClock, path: "/settings/recurring" },
    { name: "Presupuestos", icon: PieChart, path: "/settings/budgets" },
  ];

  return (
    <div className="p-6 space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      </header>

      <section className="bg-card rounded-3xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-xl font-semibold truncate">{appUser?.display_name || "Usuario"}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Shield className="w-3 h-3" />
            <span>Familia {appUser?.household_id ? "Activa" : "No asignada"}</span>
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">Finanzas</h3>
        <div className="bg-card rounded-3xl overflow-hidden shadow-sm divide-y divide-border/50">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">Cuenta</h3>
        <div className="bg-card rounded-3xl overflow-hidden shadow-sm divide-y divide-border/50">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-foreground" />
              </div>
              <span className="font-medium">Perfil</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </section>

      <Button 
        variant="outline" 
        className="w-full rounded-2xl h-12 text-destructive border-none shadow-sm hover:text-destructive hover:bg-destructive/10"
        onClick={() => signOut()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  );
}
