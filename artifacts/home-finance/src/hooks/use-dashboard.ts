import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth } from "date-fns";

export function useDashboard() {
  const { appUser } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return null;

      // Fetch accounts to sum total balance
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("current_balance")
        .eq("household_id", appUser.household_id);
      
      if (accountsError) throw accountsError;
      
      const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0) || 0;

      // Fetch this month's transactions
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();
      
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("household_id", appUser.household_id)
        .gte("transaction_date", start)
        .lte("transaction_date", end);

      if (txError) throw txError;

      let income = 0;
      let expenses = 0;

      transactions?.forEach((tx) => {
        if (tx.type === "income") {
          income += Number(tx.amount || 0);
        } else if (tx.type === "expense") {
          expenses += Number(tx.amount || 0);
        }
      });

      return {
        totalBalance,
        income,
        expenses,
      };
    },
    enabled: !!appUser?.household_id,
  });

  return {
    dashboard: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
  };
}
