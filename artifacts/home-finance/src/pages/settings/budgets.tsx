import { ChevronLeft, PieChart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function BudgetsSettings() {
  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border-none">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Presupuestos</h1>
      </header>
      
      <div className="text-center p-12 bg-card rounded-3xl border-none shadow-sm mt-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <PieChart className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">Módulo en construcción</h3>
        <p className="text-sm text-muted-foreground">La funcionalidad de presupuestos estará disponible en la próxima actualización.</p>
      </div>
    </div>
  );
}
