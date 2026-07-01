import { Link, useLocation } from "wouter";
import { Home, ListOrdered, Target, PieChart, Settings } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { name: "Inicio", path: "/", icon: Home },
    { name: "Movimientos", path: "/transactions", icon: ListOrdered },
    { name: "Metas", path: "/goals", icon: Target },
    { name: "Reportes", path: "/reports", icon: PieChart },
    { name: "Ajustes", path: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
