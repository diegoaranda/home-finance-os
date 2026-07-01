import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useCategories() {
  const { appUser } = useAuth();

  const categoriesQuery = useQuery({
    queryKey: ["categories", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("household_id", appUser.household_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!appUser?.household_id,
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
  };
}
