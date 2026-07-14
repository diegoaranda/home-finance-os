export type BalanceTransaction = {
  type: string;
  amount: number | string | null;
  account_from_id?: string | null;
  account_to_id?: string | null;
  household_id?: string | null;
};

export type BalanceAccount = {
  id: string;
  initial_balance?: number | string | null;
  household_id?: string | null;
};

export function getAccountBalance(
  account: BalanceAccount,
  transactions: BalanceTransaction[],
  householdId?: string | null,
) {
  const transactionNet = transactions.reduce((balance, transaction) => {
    if (householdId && transaction.household_id !== householdId) return balance;

    const amount = Number(transaction.amount || 0);

    if (transaction.type === "income") {
      return transaction.account_to_id === account.id ? balance + amount : balance;
    }
    if (transaction.type === "expense") {
      return transaction.account_from_id === account.id ? balance - amount : balance;
    }
    if (transaction.type === "transfer") {
      const sent = transaction.account_from_id === account.id ? amount : 0;
      const received = transaction.account_to_id === account.id ? amount : 0;
      return balance - sent + received;
    }

    return balance;
  }, 0);

  return Number(account.initial_balance || 0) + transactionNet;
}

export function withCurrentBalances<T extends BalanceAccount>(
  accounts: T[],
  transactions: BalanceTransaction[],
  householdId: string,
) {
  return accounts
    .filter(account => account.household_id === householdId)
    .map(account => ({
      ...account,
      current_balance: getAccountBalance(account, transactions, householdId),
    }));
}
