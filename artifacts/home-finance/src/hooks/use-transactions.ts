import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useTransactions() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["transactions", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*, category:categories(*), account_from:accounts!account_from_id(*), account_to:accounts!account_to_id(*)")
        .eq("household_id", appUser.household_id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!appUser?.household_id,
  });

  const createTransaction = useMutation({
    mutationFn: async (newTx: any) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert([{ ...newTx, household_id: appUser?.household_id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, data: updates }: { id: string; data: any }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .eq("household_id", appUser?.household_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("household_id", appUser?.household_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
