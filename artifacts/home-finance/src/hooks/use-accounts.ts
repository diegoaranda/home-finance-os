import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useAccounts() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["accounts", appUser?.household_id],
    queryFn: async () => {
      if (!appUser?.household_id) return [];
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("household_id", appUser.household_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!appUser?.household_id,
  });

  const createAccount = useMutation({
    mutationFn: async (newAccount: any) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert([{ ...newAccount, household_id: appUser?.household_id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from("accounts")
        .update(data)
        .eq("id", id)
        .eq("household_id", appUser?.household_id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id)
        .eq("household_id", appUser?.household_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
