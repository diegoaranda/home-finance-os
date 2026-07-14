import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { withCurrentBalances } from "@/lib/account-balance";

function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === "object" && "message" in e) {
    return new Error(String((e as any).message));
  }
  return new Error(String(e));
}

const ACCOUNT_IN_USE_MESSAGE =
  "No puedes eliminar esta cuenta porque ya tiene movimientos asociados.";

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
          .select("type, amount, account_from_id, account_to_id, household_id")
          .eq("household_id", appUser.household_id),
      ]);
      if (accountsError) throw toError(accountsError);
      if (transactionsError) throw toError(transactionsError);

      return withCurrentBalances(
        accounts ?? [],
        transactions ?? [],
        appUser.household_id,
      );
    },
    enabled: !!appUser?.household_id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["accounts", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["transactions", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["reports", appUser?.household_id] });
    queryClient.invalidateQueries({ queryKey: ["budgets", appUser?.household_id] });
  };

  const canDeleteAccount = async (id: string) => {
    if (!appUser?.household_id) return false;

    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", appUser.household_id)
      .or(`account_from_id.eq.${id},account_to_id.eq.${id}`);

    if (error) throw toError(error);
    return (count ?? 0) === 0;
  };

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
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const canDelete = await canDeleteAccount(id);
      if (!canDelete) throw new Error(ACCOUNT_IN_USE_MESSAGE);

      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id)
        .eq("household_id", appUser?.household_id);
      if (error) throw toError(error);
    },
    onSuccess: invalidate,
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    canDeleteAccount,
  };
}
