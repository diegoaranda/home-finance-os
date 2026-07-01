import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === "object" && "message" in e) {
    return new Error(String((e as any).message));
  }
  return new Error(String(e));
}

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
      if (error) throw toError(error);
      return data ?? [];
    },
    enabled: !!appUser?.household_id,
  });

  const createAccount = useMutation({
    mutationFn: async (newAccount: any) => {
      console.log("STEP 9 - mutationFn entered, newAccount:", JSON.stringify(newAccount));
      console.log("STEP 10 - appUser:", JSON.stringify(appUser));
      const initial = parseFloat(newAccount.initial_balance) || 0;
      const insertPayload = {
        ...newAccount,
        initial_balance: initial,
        household_id: appUser?.household_id,
      };
      console.log("INSERT PAYLOAD", JSON.stringify(insertPayload));
      const { data, error } = await supabase
        .from("accounts")
        .insert([insertPayload])
        .select()
        .single();
      if (error) {
        console.log("=== SUPABASE INSERT ERROR ===");
        console.log("table:", "accounts");
        console.log("user_id:", appUser?.id);
        console.log("household_id:", appUser?.household_id);
        console.log("columns sent:", JSON.stringify({ ...newAccount, initial_balance: initial, household_id: appUser?.household_id }));
        console.log("error.code:", error.code);
        console.log("error.message:", error.message);
        console.log("error.details:", error.details);
        console.log("error.hint:", error.hint);
        console.log("full error object:", JSON.stringify(error));
        throw toError(error);
      }
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
      if (error) throw toError(error);
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
      if (error) throw toError(error);
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
