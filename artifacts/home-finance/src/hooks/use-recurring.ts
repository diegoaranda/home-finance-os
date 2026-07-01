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

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

      const [{ data, error }, { data: paidTx }] = await Promise.all([
        supabase
          .from("recurring_tasks")
          .select("*, category:categories(*), account:accounts(*)")
          .eq("household_id", appUser.household_id)
          .order("due_day", { ascending: true }),
        supabase
          .from("transactions")
          .select("description, account_from_id")
          .eq("household_id", appUser.household_id)
          .eq("type", "expense")
          .gte("transaction_date", monthStart)
          .lt("transaction_date", monthEnd),
      ]);

      if (error) throw toError(error);

      const paidKeys = new Set(
        (paidTx ?? []).map(t => `${t.description}__${t.account_from_id}`)
      );

      return (data ?? []).map(task => ({
        ...task,
        _paidThisMonth: task.account_id
          ? paidKeys.has(`${task.title}__${task.account_id}`)
          : false,
      }));
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
  // 1. Guards null account_id
  // 2. Creates an expense transaction using the task's account_id
  // 3. Optimistically removes the task from this month's list
  // 4. Invalidates recurring + transactions + accounts + dashboard
  const markAsPaid = useMutation({
    mutationFn: async (task: any) => {
      if (!task.account_id) {
        throw new Error(
          "Seleccione una cuenta para este gasto antes de registrarlo como pagado."
        );
      }
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("transactions")
        .insert([{
          household_id: appUser?.household_id,
          type: "expense",
          amount: task.amount,
          description: task.title,
          transaction_date: today,
          account_from_id: task.account_id,
          category_id: task.category_id ?? null,
        }]);
      if (error) throw toError(error);
      return task;
    },
    onSuccess: (_, task) => {
      // Optimistically mark the task as paid so it disappears from the list immediately
      queryClient.setQueryData(
        ["recurring", appUser?.household_id],
        (old: any[]) =>
          (old ?? []).map(t =>
            t.id === task.id ? { ...t, _paidThisMonth: true } : t
          )
      );
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
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
