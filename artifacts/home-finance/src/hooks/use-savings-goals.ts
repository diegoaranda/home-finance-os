import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useSavingsGoals() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ["savings_goals", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("household_id", appUser.household_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!appUser?.household_id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["savings_goals", appUser?.household_id] });
  };

  const createGoal = useMutation({
    mutationFn: async (newGoal: any) => {
      const payload: Record<string, any> = {
        name: newGoal.name,
        target_amount: newGoal.target_amount,
        current_amount: 0,
        household_id: appUser?.household_id,
      };
      if (newGoal.deadline) {
        payload.deadline = newGoal.deadline;
      }

      const { data, error } = await supabase
        .from("savings_goals")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const addProgress = useMutation({
    mutationFn: async ({ goal, amount }: { goal: any; amount: number }) => {
      const current = Number(goal.current_amount || 0);
      const { data, error } = await supabase
        .from("savings_goals")
        .update({ current_amount: current + amount })
        .eq("id", goal.id)
        .eq("household_id", appUser?.household_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    goals: goalsQuery.data || [],
    isLoading: goalsQuery.isLoading,
    createGoal,
    addProgress,
  };
}
