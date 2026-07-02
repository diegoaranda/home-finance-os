import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useBudgets(month: number, year: number) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: ["budgets", appUser?.household_id, month, year],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("budgets")
        .select("*, category:categories(*)")
        .eq("household_id", appUser.household_id)
        .eq("month", month)
        .eq("year", year)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!appUser?.household_id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["budgets", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["reports", appUser?.household_id] });
  };

  const createBudget = useMutation({
    mutationFn: async (newBudget: any) => {
      const { data, error } = await supabase
        .from("budgets")
        .insert([{ ...newBudget, household_id: appUser?.household_id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, data: updates }: { id: string; data: any }) => {
      const { data, error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", id)
        .eq("household_id", appUser?.household_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id)
        .eq("household_id", appUser?.household_id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    budgets: budgetsQuery.data || [],
    isLoading: budgetsQuery.isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
