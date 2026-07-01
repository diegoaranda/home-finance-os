import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useSavingsGoals() {
  const { appUser } = useAuth();

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

  return {
    goals: goalsQuery.data || [],
    isLoading: goalsQuery.isLoading,
  };
}
