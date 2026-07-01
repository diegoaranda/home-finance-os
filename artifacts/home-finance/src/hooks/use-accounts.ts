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
      const [
        { data: accounts, error: accountsError },
        { data: transactions, error: transactionsError },
      ] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("household_id", appUser.household_id)
          .order("name"),
        supabase
          .from("transactions")
          .select("type, amount, account_from_id, account_to_id")
          .eq("household_id", appUser.household_id),
      ]);
      if (accountsError) throw toError(accountsError);
      if (transactionsError) throw toError(transactionsError);

      return (accounts ?? []).map(account => {
        const txNet = (transactions ?? []).reduce((sum, tx) => {
          const amount = Number(tx.amount || 0);
          if (tx.type === "income" && tx.account_to_id === account.id) return sum + amount;
          if (tx.type === "expense" && tx.account_from_id === account.id) return sum - amount;
          if (tx.type === "transfer" && tx.account_from_id === account.id) return sum - amount;
          if (tx.type === "transfer" && tx.account_to_id === account.id) return sum + amount;
          return sum;
        }, 0);

        return {
          ...account,
          current_balance: Number(account.initial_balance || 0) + txNet,
        };
      });
    },
    enabled: !!appUser?.household_id,
  });

  const createAccount = useMutation({
    mutationFn: async (newAccount: any) => {
      const initial = parseFloat(newAccount.initial_balance) || 0;
      const { data, error } = await supabase
        .from("accounts")
        .insert([{
          ...newAccount,
          initial_balance: initial,
          household_id: appUser?.household_id,
        }])
        .select()
        .single();
      if (error) throw toError(error);
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
