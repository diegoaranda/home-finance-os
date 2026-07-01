import { PieChart, BarChart2, TrendingUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-none bg-card shadow-sm">
          <Filter className="h-4 w-4" />
        </Button>
      </header>

      <div className="space-y-6">
        <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Gastos por categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/40 mt-2 bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">Gráfico disponible próximamente</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Ingresos vs Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/40 mt-2 bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">Gráfico disponible próximamente</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolución mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-t border-border/40 mt-2 bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">Gráfico disponible próximamente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
