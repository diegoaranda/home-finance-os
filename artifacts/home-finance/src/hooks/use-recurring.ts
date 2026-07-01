import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === "object" && "message" in e) {
    return new Error(String((e as any).message));
  }
  return new Error(String(e));
}

export function useRecurring() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const recurringQuery = useQuery({
    queryKey: ["recurring", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("recurring_tasks")
        .select("*, category:categories(*), account:accounts(*)")
        .eq("household_id", appUser.household_id)
        .order("due_day", { ascending: true });
      if (error) throw toError(error);
      return data ?? [];
    },
    enabled: !!appUser?.household_id,
  });

  const createRecurring = useMutation({
    mutationFn: async (newTask: any) => {
      const { data, error } = await supabase
        .from("recurring_tasks")
        .insert([{
          ...newTask,
          task_type: "expense",
          household_id: appUser?.household_id,
        }])
        .select()
        .single();
      if (error) throw toError(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    },
  });

  const updateRecurring = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from("recurring_tasks")
        .update(data)
        .eq("id", id)
        .eq("household_id", appUser?.household_id)
        .select()
        .single();
      if (error) throw toError(error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    },
  });

  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_tasks")
        .delete()
        .eq("id", id)
        .eq("household_id", appUser?.household_id);
      if (error) throw toError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    },
  });

  // Mark a recurring task as paid:
  // 1. Creates an expense transaction
  // 2. Invalidates recurring + transaction + dashboard queries
  const markAsPaid = useMutation({
    mutationFn: async (task: any) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("transactions")
        .insert([{
          household_id: appUser?.household_id,
          type: "expense",
          amount: task.amount,
          description: task.title,
          transaction_date: today,
          account_from_id: task.account_id ?? null,
          category_id: task.category_id ?? null,
        }]);
      if (error) throw toError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
    },
  });

  return {
    recurringTasks: recurringQuery.data || [],
    isLoading: recurringQuery.isLoading,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    markAsPaid,
  };
}
