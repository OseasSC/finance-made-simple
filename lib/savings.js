import { formatCurrency } from "./format";

export function computeTotals(transactions) {
  let income = 0;
  let expenses = 0;
  const byCategory = {};

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      income += amt;
    } else {
      expenses += amt;
      const cat = t.category || "Outros";
      byCategory[cat] = (byCategory[cat] || 0) + amt;
    }
  }

  return {
    income,
    expenses,
    net: income - expenses,
    byCategory,
  };
}

export function generateSavingsPlan(transactions, options = {}) {
  const { income, expenses, net, byCategory } = computeTotals(transactions);
  const savingsRate = options.savingsRate ?? 0.2;
  const monthlyTarget =
    options.monthlyTargetOverride != null
      ? Math.max(0, options.monthlyTargetOverride)
      : Math.max(0, income * savingsRate);

  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const top3 = sortedCats.slice(0, 3);

  const steps = [];

  if (income <= 0 && expenses <= 0) {
    steps.push(
      "Adicione extratos ou contas para gerar um plano de economia personalizado."
    );
  } else {
    steps.push(
      `Sua meta de economia mensal: ${formatCurrency(monthlyTarget)} (${Math.round(savingsRate * 100)}% da renda estimada).`
    );
    steps.push(
      `Fluxo líquido atual: ${formatCurrency(net)} (receitas ${formatCurrency(income)} − despesas ${formatCurrency(expenses)}).`
    );
    if (net < monthlyTarget) {
      const gap = monthlyTarget - net;
      steps.push(
        `Você precisa reduzir despesas em cerca de ${formatCurrency(gap)} para atingir a meta.`
      );
    } else {
      steps.push("Parabéns: seu fluxo líquido cobre a meta de economia deste período.");
    }
    for (const [cat, total] of top3) {
      const cut = total * 0.1;
      steps.push(
        `Corte 10% em "${cat}" (${formatCurrency(cut)}/mês) — hoje você gasta ${formatCurrency(total)}.`
      );
    }
    steps.push(
      `Checkpoint semanal: reserve ${formatCurrency(monthlyTarget / 4)} toda semana.`
    );
    steps.push(
      "Regra 50/30/20: ~50% necessidades, ~30% desejos, ~20% poupança — ajuste categorias na planilha."
    );
  }

  return {
    monthlyTarget,
    weeklyCheckpoint: monthlyTarget / 4,
    steps,
    generatedAt: new Date().toISOString(),
    summary: { income, expenses, net, topCategories: top3.map(([c, v]) => ({ category: c, amount: v })) },
  };
}

export function balanceTrend(balances) {
  return [...balances]
    .sort((a, b) => String(a.asOf).localeCompare(String(b.asOf)))
    .map((b) => ({
      date: b.asOf,
      balance: Number(b.amount) || 0,
      label: b.source,
    }));
}
