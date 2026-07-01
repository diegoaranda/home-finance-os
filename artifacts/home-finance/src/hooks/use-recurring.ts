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

      const [{ data, error }, { data: paidTx, error: paidTxError }] = await Promise.all([
        supabase
          .from("recurring_tasks")
          .select("*, category:categories(*), account:accounts(*)")
          .eq("household_id", appUser.household_id)
          .order("due_day", { ascending: true }),
        supabase
          .from("transactions")
          .select("recurring_task_id")
          .eq("household_id", appUser.household_id)
          .eq("type", "expense")
          .not("recurring_task_id", "is", null)
          .gte("transaction_date", monthStart)
          .lt("transaction_date", monthEnd),
      ]);

      if (error) throw toError(error);
      if (paidTxError) throw toError(paidTxError);

      const paidTaskIds = new Set(
        (paidTx ?? []).map(t => t.recurring_task_id)
      );

      return (data ?? []).map(task => ({
        ...task,
        _paidThisMonth: paidTaskIds.has(task.id),
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
  // 2. Skips duplicates when this task already has an expense transaction this month
  // 3. Creates an expense transaction linked by recurring_task_id
  // 4. Optimistically removes the task from this month's list
  // 5. Invalidates recurring + transactions + accounts + dashboard
  const markAsPaid = useMutation({
    mutationFn: async (task: any) => {
      if (!task.account_id) {
        throw new Error(
          "Seleccione una cuenta para este gasto antes de registrarlo como pagado."
        );
      }
      if (!appUser?.household_id) {
        throw new Error("No se encontró el hogar activo.");
      }

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const today = format(new Date(), "yyyy-MM-dd");

      const { data: existingTx, error: existingError } = await supabase
        .from("transactions")
        .select("id")
        .eq("household_id", appUser.household_id)
        .eq("type", "expense")
        .eq("recurring_task_id", task.id)
        .gte("transaction_date", monthStart)
        .lt("transaction_date", monthEnd)
        .limit(1)
        .maybeSingle();

      if (existingError) throw toError(existingError);
      if (existingTx) return task;

      const { error } = await supabase
        .from("transactions")
        .insert([{
          household_id: appUser.household_id,
          type: "expense",
          amount: task.amount,
          description: task.title,
          transaction_date: today,
          account_from_id: task.account_id,
          category_id: task.category_id ?? null,
          recurring_task_id: task.id,
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
