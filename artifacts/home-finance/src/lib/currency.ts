export function formatCurrency(amount: number): string {
  // Force "Bs 1.250,50" format
  const formatted = amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Bs ${formatted}`;
}
