import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const CONTRIBUTIONS_PENDING_MESSAGE = "Aportes reales pendiente de implementar.";

function isMissingColumnError(error: any, column: string) {
  const message = String(error?.message || error?.details || "");
  return message.includes(column) && message.includes("schema cache");
}

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
      if (!appUser?.household_id) throw new Error("No hay hogar activo.");

      const basePayload: Record<string, any> = {
        name: newGoal.name,
        target_amount: newGoal.target_amount,
        household_id: appUser.household_id,
      };

      const insertGoal = async (payload: Record<string, any>) => supabase
        .from("savings_goals")
        .insert([payload])
        .select()
        .single();

      if (newGoal.deadline) {
        const withDeadline = await insertGoal({ ...basePayload, deadline: newGoal.deadline });
        if (!withDeadline.error) return withDeadline.data;
        if (!isMissingColumnError(withDeadline.error, "deadline")) throw withDeadline.error;

        const withTargetDate = await insertGoal({ ...basePayload, target_date: newGoal.deadline });
        if (!withTargetDate.error) return withTargetDate.data;
        if (!isMissingColumnError(withTargetDate.error, "target_date")) throw withTargetDate.error;
      }

      const { data, error } = await insertGoal(basePayload);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const addProgress = useMutation({
    mutationFn: async (_payload: { goal: any; amount: number }) => {
      throw new Error(CONTRIBUTIONS_PENDING_MESSAGE);
    },
    onSuccess: invalidate,
  });

  return {
    goals: goalsQuery.data || [],
    isLoading: goalsQuery.isLoading,
    createGoal,
    addProgress,
    contributionsPendingMessage: CONTRIBUTIONS_PENDING_MESSAGE,
  };
}
