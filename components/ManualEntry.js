"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  addManualBalance,
  addManualBill,
  addManualTransaction,
} from "@/lib/storage";

const today = () => new Date().toISOString().slice(0, 10);

export default function ManualEntry({ docType, onSave, balances, bills, onRemoveBalance, onRemoveBill }) {
  const [balanceForm, setBalanceForm] = useState({
    source: "",
    amount: "",
    asOf: today(),
  });
  const [billForm, setBillForm] = useState({
    name: "",
    dueDate: today(),
    amount: "",
    status: "pending",
  });
  const [txForm, setTxForm] = useState({
    date: today(),
    description: "",
    category: "",
    amount: "",
    type: "expense",
  });
  const [msg, setMsg] = useState("");

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  }

  function submitBalance(e) {
    e.preventDefault();
    if (!balanceForm.amount) return;
    onSave((s) =>
      addManualBalance(s, {
        source: balanceForm.source,
        amount: balanceForm.amount,
        asOf: balanceForm.asOf,
      })
    );
    setBalanceForm({ source: "", amount: "", asOf: today() });
    flash("Saldo adicionado.");
  }

  function submitBill(e) {
    e.preventDefault();
    if (!billForm.amount) return;
    onSave((s) =>
      addManualBill(s, {
        name: billForm.name,
        dueDate: billForm.dueDate,
        amount: billForm.amount,
        status: billForm.status,
      })
    );
    setBillForm({
      name: "",
      dueDate: today(),
      amount: "",
      status: "pending",
    });
    flash("Conta adicionada à planilha.");
  }

  function submitTransaction(e) {
    e.preventDefault();
    if (!txForm.amount) return;
    onSave((s) =>
      addManualTransaction(s, {
        date: txForm.date,
        description: txForm.description,
        category: txForm.category,
        amount: txForm.amount,
        type: txForm.type,
      })
    );
    setTxForm({
      date: today(),
      description: "",
      category: "",
      amount: "",
      type: "expense",
    });
    flash("Lançamento adicionado.");
  }

  return (
    <div className="manual-entry">
      <h3 className="manual-title">Ou adicione manualmente</h3>

      {docType === "balance" && (
        <form className="manual-form" onSubmit={submitBalance}>
          <label>
            Conta / banco
            <input
              value={balanceForm.source}
              onChange={(e) =>
                setBalanceForm((f) => ({ ...f, source: e.target.value }))
              }
              placeholder="Ex.: Nubank"
            />
          </label>
          <label>
            Valor (R$)
            <input
              type="number"
              step="0.01"
              required
              value={balanceForm.amount}
              onChange={(e) =>
                setBalanceForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </label>
          <label>
            Data do saldo
            <input
              type="date"
              value={balanceForm.asOf}
              onChange={(e) =>
                setBalanceForm((f) => ({ ...f, asOf: e.target.value }))
              }
            />
          </label>
          <button type="submit" className="btn-primary">Adicionar saldo</button>
        </form>
      )}

      {docType === "bill" && (
        <form className="manual-form" onSubmit={submitBill}>
          <label>
            Nome da conta
            <input
              value={billForm.name}
              onChange={(e) =>
                setBillForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ex.: Luz, internet"
            />
          </label>
          <label>
            Vencimento
            <input
              type="date"
              value={billForm.dueDate}
              onChange={(e) =>
                setBillForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
          </label>
          <label>
            Valor (R$)
            <input
              type="number"
              step="0.01"
              required
              value={billForm.amount}
              onChange={(e) =>
                setBillForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </label>
          <label>
            Status
            <select
              value={billForm.status}
              onChange={(e) =>
                setBillForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="pending">A pagar</option>
              <option value="paid">Paga</option>
            </select>
          </label>
          <button type="submit" className="btn-primary">Adicionar conta</button>
        </form>
      )}

      {docType === "extrato" && (
        <form className="manual-form" onSubmit={submitTransaction}>
          <label>
            Data
            <input
              type="date"
              value={txForm.date}
              onChange={(e) =>
                setTxForm((f) => ({ ...f, date: e.target.value }))
              }
            />
          </label>
          <label>
            Descrição
            <input
              value={txForm.description}
              onChange={(e) =>
                setTxForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Ex.: PIX recebido"
            />
          </label>
          <label>
            Categoria
            <input
              value={txForm.category}
              onChange={(e) =>
                setTxForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Ex.: Alimentação"
            />
          </label>
          <label>
            Tipo
            <select
              value={txForm.type}
              onChange={(e) =>
                setTxForm((f) => ({ ...f, type: e.target.value }))
              }
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </label>
          <label>
            Valor (R$)
            <input
              type="number"
              step="0.01"
              required
              value={txForm.amount}
              onChange={(e) =>
                setTxForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </label>
          <button type="submit" className="btn-primary">
            Adicionar lançamento
          </button>
        </form>
      )}

      {msg && <p className="manual-msg">{msg}</p>}

      {docType === "balance" && balances.length > 0 && (
        <ul className="manual-list">
          {balances.map((b) => (
            <li key={b.id}>
              <span>
                {b.source}: {formatCurrency(b.amount)} ({formatDate(b.asOf)})
              </span>
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => onRemoveBalance(b.id)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {docType === "bill" && bills.length > 0 && (
        <ul className="manual-list">
          {bills.map((b) => (
            <li key={b.id}>
              <span>
                {b.name}: {formatCurrency(b.amount)} — venc.{" "}
                {formatDate(b.dueDate)} (
                {b.status === "paid" ? "paga" : "a pagar"})
              </span>
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => onRemoveBill(b.id)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
