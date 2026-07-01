import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Goals from "@/pages/goals";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings/index";
import AccountsSettings from "@/pages/settings/accounts";
import RecurringSettings from "@/pages/settings/recurring";
import CategoriesSettings from "@/pages/settings/categories";
import BudgetsSettings from "@/pages/settings/budgets";

const queryClient = new QueryClient();

function ProtectedApp() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/goals" component={Goals} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/accounts" component={AccountsSettings} />
          <Route path="/settings/recurring" component={RecurringSettings} />
          <Route path="/settings/categories" component={CategoriesSettings} />
          <Route path="/settings/budgets" component={BudgetsSettings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route component={ProtectedApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
