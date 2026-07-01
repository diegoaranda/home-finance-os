import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useRecurring() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const recurringQuery = useQuery({
    queryKey: ["recurring", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("recurring_tasks")
        .select("*, category:categories(*)")
        .eq("household_id", appUser.household_id)
        .order("due_day", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!appUser?.household_id,
  });

  const createRecurring = useMutation({
    mutationFn: async (newTask: any) => {
      const { data, error } = await supabase
        .from("recurring_tasks")
        .insert([{ ...newTask, household_id: appUser?.household_id }])
        .select()
        .single();
      if (error) throw error;
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
      if (error) throw error;
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
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    },
  });

  return {
    recurringTasks: recurringQuery.data || [],
    isLoading: recurringQuery.isLoading,
    createRecurring,
    updateRecurring,
    deleteRecurring,
  };
}
