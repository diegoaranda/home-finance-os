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

      const start = startOfMonth(new Date()).toISOString().split("T")[0];
      const end = endOfMonth(new Date()).toISOString().split("T")[0];

      const [
        { data: accounts, error: accountsError },
        { data: allTx, error: allTxError },
        { data: monthTx, error: monthTxError },
      ] = await Promise.all([
        supabase
          .from("accounts")
          .select("initial_balance, active")
          .eq("household_id", appUser.household_id),
        supabase
          .from("transactions")
          .select("type, amount")
          .eq("household_id", appUser.household_id),
        supabase
          .from("transactions")
          .select("type, amount")
          .eq("household_id", appUser.household_id)
          .gte("transaction_date", start)
          .lte("transaction_date", end),
      ]);

      if (accountsError) throw accountsError;
      if (allTxError) throw allTxError;
      if (monthTxError) throw monthTxError;

      // Total balance keeps inactive accounts in historical calculations.
      const initialSum = (accounts ?? [])
        .reduce((s, a) => s + Number(a.initial_balance || 0), 0);

      const allTxNet = (allTx ?? []).reduce((s, tx) => {
        if (tx.type === "income") return s + Number(tx.amount || 0);
        if (tx.type === "expense") return s - Number(tx.amount || 0);
        return s;
      }, 0);

      const totalBalance = initialSum + allTxNet;

      let income = 0;
      let expenses = 0;
      (monthTx ?? []).forEach(tx => {
        if (tx.type === "income") income += Number(tx.amount || 0);
        else if (tx.type === "expense") expenses += Number(tx.amount || 0);
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
