import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type CategoryType = "income" | "expense";

type CategoryPayload = {
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
};

const CATEGORY_IN_USE_MESSAGE =
  "No puedes eliminar esta categoría porque ya está vinculada a movimientos, presupuestos o gastos recurrentes.";

export function useCategories() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["budgets", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["recurring", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["reports", appUser?.household_id] });
  };

  const canDeleteCategory = async (id: string) => {
    if (!appUser?.household_id) return false;

    const checks = await Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("household_id", appUser.household_id)
        .eq("category_id", id),
      supabase
        .from("budgets")
        .select("id", { count: "exact", head: true })
        .eq("household_id", appUser.household_id)
        .eq("category_id", id),
      supabase
        .from("recurring_tasks")
        .select("id", { count: "exact", head: true })
        .eq("household_id", appUser.household_id)
        .eq("category_id", id),
    ]);

    const error = checks.find(check => check.error)?.error;
    if (error) throw error;

    return checks.every(check => (check.count ?? 0) === 0);
  };

  const createCategory = useMutation({
    mutationFn: async (newCategory: CategoryPayload) => {
      if (!appUser?.household_id) throw new Error("No hay hogar activo.");

      const { data, error } = await supabase
        .from("categories")
        .insert([{
          name: newCategory.name.trim(),
          type: newCategory.type,
          color: newCategory.color || null,
          icon: newCategory.icon || null,
          household_id: appUser.household_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, data: updates }: { id: string; data: CategoryPayload }) => {
      if (!appUser?.household_id) throw new Error("No hay hogar activo.");

      const { data, error } = await supabase
        .from("categories")
        .update({
          name: updates.name.trim(),
          type: updates.type,
          color: updates.color || null,
          icon: updates.icon || null,
        })
        .eq("id", id)
        .eq("household_id", appUser.household_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      if (!appUser?.household_id) throw new Error("No hay hogar activo.");

      const canDelete = await canDeleteCategory(id);
      if (!canDelete) throw new Error(CATEGORY_IN_USE_MESSAGE);

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("household_id", appUser.household_id);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    createCategory,
    updateCategory,
    deleteCategory,
    canDeleteCategory,
  };
}
