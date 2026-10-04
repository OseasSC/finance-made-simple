import { STORAGE_KEY } from "./config";
import { newId } from "./format";

export const SCHEMA_VERSION = 1;

export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    balances: [],
    transactions: [],
    bills: [],
    savingsPlan: null,
    settings: { locale: "pt-BR", currency: "BRL" },
  };
}

function migrate(data) {
  if (!data || typeof data !== "object") return emptyState();
  const version = data.version ?? 0;
  if (version === SCHEMA_VERSION) return { ...emptyState(), ...data, version: SCHEMA_VERSION };
  if (version === 0 || version === 1) {
    return {
      ...emptyState(),
      ...data,
      version: SCHEMA_VERSION,
      settings: { locale: "pt-BR", currency: "BRL", ...data.settings },
    };
  }
  return emptyState();
}

export function loadState() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  if (typeof window === "undefined") return;
  const payload = { ...state, version: SCHEMA_VERSION };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function mergeExtracted(state, extracted, docType, sourceDoc) {
  const next = { ...state };
  const tag = sourceDoc || `upload-${Date.now()}`;

  if (docType === "balance" && extracted.balance) {
    next.balances = [
      ...next.balances,
      {
        id: newId(),
        source: extracted.balance.source || "Conta",
        amount: Number(extracted.balance.amount) || 0,
        currency: extracted.balance.currency || "BRL",
        asOf: extracted.balance.asOf || new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      },
    ];
  }

  if (docType === "bill" && Array.isArray(extracted.bills)) {
    const bills = extracted.bills.map((b) => ({
      id: newId(),
      name: b.name || "Conta",
      dueDate: b.dueDate || "",
      amount: Number(b.amount) || 0,
      status: b.status || "pending",
      sourceDoc: tag,
    }));
    next.bills = [...next.bills, ...bills];
    const asTx = bills.map((b) => ({
      id: newId(),
      date: b.dueDate || new Date().toISOString().slice(0, 10),
      description: b.name,
      category: "Contas",
      amount: b.amount,
      type: "expense",
      sourceDoc: tag,
    }));
    next.transactions = [...next.transactions, ...asTx];
  }

  if (docType === "extrato" && Array.isArray(extracted.transactions)) {
    const txs = extracted.transactions.map((t) => ({
      id: newId(),
      date: t.date || new Date().toISOString().slice(0, 10),
      description: t.description || "",
      category: t.category || "Outros",
      amount: Math.abs(Number(t.amount) || 0),
      type: t.type === "income" ? "income" : "expense",
      sourceDoc: tag,
    }));
    next.transactions = [...next.transactions, ...txs];
  }

  return next;
}

export function addManualBalance(state, { source, amount, asOf, currency = "BRL" }) {
  const next = { ...state };
  next.balances = [
    ...next.balances,
    {
      id: newId(),
      source: source?.trim() || "Conta",
      amount: Number(amount) || 0,
      currency,
      asOf: asOf || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    },
  ];
  return next;
}

export function addManualBill(
  state,
  { name, dueDate, amount, status = "pending" }
) {
  const tag = "manual";
  const billId = newId();
  const bill = {
    id: billId,
    name: name?.trim() || "Conta",
    dueDate: dueDate || new Date().toISOString().slice(0, 10),
    amount: Number(amount) || 0,
    status: status === "paid" ? "paid" : "pending",
    sourceDoc: tag,
  };
  const tx = {
    id: newId(),
    billId,
    date: bill.dueDate,
    description: bill.name,
    category: "Contas",
    amount: bill.amount,
    type: "expense",
    sourceDoc: tag,
  };
  return {
    ...state,
    bills: [...state.bills, bill],
    transactions: [...state.transactions, tx],
  };
}

export function addManualTransaction(
  state,
  { date, description, category, amount, type }
) {
  return {
    ...state,
    transactions: [
      ...state.transactions,
      {
        id: newId(),
        date: date || new Date().toISOString().slice(0, 10),
        description: description?.trim() || "",
        category: category?.trim() || "Outros",
        amount: Math.abs(Number(amount) || 0),
        type: type === "income" ? "income" : "expense",
        sourceDoc: "manual",
      },
    ],
  };
}

export function removeBalance(state, id) {
  return {
    ...state,
    balances: state.balances.filter((b) => b.id !== id),
  };
}

export function removeBill(state, id) {
  const bill = state.bills.find((b) => b.id === id);
  const nextBills = state.bills.filter((b) => b.id !== id);
  const nextTx = state.transactions.filter((t) => {
    if (t.billId === id) return false;
    if (!bill || t.billId) return true;
    return !(
      t.sourceDoc === bill.sourceDoc &&
      t.description === bill.name &&
      t.amount === bill.amount &&
      t.date === bill.dueDate
    );
  });
  return { ...state, bills: nextBills, transactions: nextTx };
}
