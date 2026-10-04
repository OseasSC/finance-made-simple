"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { APP_NAME } from "@/lib/config";
import { formatCurrency, newId } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { downloadFinancePdf } from "@/lib/pdf";
import {
  generateSavingsPlan,
  computeTotals,
  balanceTrend,
} from "@/lib/savings";
import {
  loadState,
  saveState,
  mergeExtracted,
  emptyState,
  removeBalance,
  removeBill,
} from "@/lib/storage";
import ManualEntry from "@/components/ManualEntry";

const DOC_TYPES = [
  { id: "balance", label: "Saldo" },
  { id: "extrato", label: "Extrato" },
  { id: "bill", label: "Conta / fatura" },
];

const CHART_COLORS = ["#7c3aed", "#a855f7", "#4c1d95", "#c084fc", "#6d28d9", "#9333ea"];

export default function FinanceApp() {
  const [state, setState] = useState(loadState);
  const [docType, setDocType] = useState("extrato");
  const [draft, setDraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const persist = useCallback((updater) => {
    setState((prev) => {
      const base = prev || emptyState();
      return typeof updater === "function" ? updater(base) : updater;
    });
  }, []);

  const savingsPlan =
    state.transactions.length > 0
      ? state.savingsPlan || generateSavingsPlan(state.transactions)
      : null;

  const withSavings = useCallback((base) => {
    const plan = generateSavingsPlan(base.transactions || []);
    return { ...base, savingsPlan: plan };
  }, []);

  const totals = useMemo(
    () => computeTotals(state.transactions),
    [state.transactions]
  );

  const categoryData = useMemo(
    () =>
      Object.entries(totals.byCategory).map(([name, value]) => ({
        name,
        value,
      })),
    [totals.byCategory]
  );

  const cashflowData = useMemo(
    () => [
      { name: "Receitas", value: totals.income },
      { name: "Despesas", value: totals.expenses },
    ],
    [totals]
  );

  const balanceData = useMemo(
    () => balanceTrend(state.balances),
    [state.balances]
  );

  const sortedTransactions = useMemo(() => {
    const list = [...state.transactions];
    list.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "amount") {
        av = Number(av);
        bv = Number(bv);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [state.transactions, sortKey, sortDir]);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setError("");
    setLoading(true);
    const newDraft = [];

    try {
      for (const file of files) {
        const image = await compressImage(file);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, docType }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Falha na extração");
        newDraft.push({
          id: newId(),
          docType,
          sourceDoc: file.name,
          data: json.data,
        });
      }
      setDraft((d) => [...d, ...newDraft]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function commitDraft() {
    if (!draft.length) return;
    persist((s) => {
      let next = { ...s };
      for (const item of draft) {
        next = mergeExtracted(next, item.data, item.docType, item.sourceDoc);
      }
      return withSavings(next);
    });
    setDraft([]);
  }

  function clearDraft() {
    setDraft([]);
  }

  function updateDraftRow(id, field, value) {
    setDraft((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const data = { ...row.data };
        if (row.docType === "extrato" && data.transactions?.[0]) {
          data.transactions = data.transactions.map((t, i) =>
            i === 0 ? { ...t, [field]: value } : t
          );
        }
        return { ...row, data };
      })
    );
  }

  function updateTransaction(id, field, value) {
    persist((s) =>
      withSavings({
        ...s,
        transactions: s.transactions.map((t) =>
          t.id === id
            ? {
                ...t,
                [field]:
                  field === "amount" ? Math.abs(Number(value) || 0) : value,
              }
            : t
        ),
      })
    );
  }

  function removeTransaction(id) {
    persist((s) =>
      withSavings({
        ...s,
        transactions: s.transactions.filter((t) => t.id !== id),
      })
    );
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handlePdf() {
    await downloadFinancePdf({
      balances: state.balances,
      transactions: state.transactions,
      savingsPlan: state.savingsPlan || savingsPlan,
      chartElementId: "chart-category-export",
    });
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="hero-tag">Solo Leveling Finance</p>
        <h1>{APP_NAME}</h1>
        <p className="hero-sub">
          Envie fotos ou cadastre saldo, extrato e contas manualmente. Montamos
          sua planilha, gráficos e um plano para economizar — tudo no seu
          navegador.
        </p>
      </header>

      <section className="card" id="upload">
        <h2>Enviar documentos</h2>
        <div className="doc-type-row">
          {DOC_TYPES.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`chip ${docType === d.id ? "chip-active" : ""}`}
              onClick={() => setDocType(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="upload-zone">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFiles}
            disabled={loading}
          />
          <span>
            {loading
              ? "Analisando com IA…"
              : "Toque para câmera ou escolher imagens"}
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <ManualEntry
          docType={docType}
          balances={state.balances}
          bills={state.bills}
          onSave={(updater) => persist((s) => withSavings(updater(s)))}
          onRemoveBalance={(id) =>
            persist((s) => withSavings(removeBalance(s, id)))
          }
          onRemoveBill={(id) =>
            persist((s) => withSavings(removeBill(s, id)))
          }
        />
      </section>

      {draft.length > 0 && (
        <section className="card">
          <h2>Revisar antes de salvar</h2>
          <ul className="draft-list">
            {draft.map((item) => (
              <li key={item.id}>
                <strong>{item.sourceDoc}</strong> ({item.docType})
                <pre className="draft-json">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
                {item.docType === "extrato" &&
                  item.data.transactions?.[0] && (
                    <div className="inline-edit">
                      <input
                        value={item.data.transactions[0].description}
                        onChange={(e) =>
                          updateDraftRow(
                            item.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Descrição"
                      />
                      <input
                        type="number"
                        value={item.data.transactions[0].amount}
                        onChange={(e) =>
                          updateDraftRow(item.id, "amount", e.target.value)
                        }
                        placeholder="Valor"
                      />
                    </div>
                  )}
              </li>
            ))}
          </ul>
          <div className="row-actions">
            <button type="button" className="btn-primary" onClick={commitDraft}>
              Confirmar e adicionar à planilha
            </button>
            <button type="button" className="btn-ghost" onClick={clearDraft}>
              Descartar
            </button>
          </div>
        </section>
      )}

      <section className="card stats-row">
        <div className="stat">
          <span className="muted">Receitas</span>
          <strong>{formatCurrency(totals.income)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Despesas</span>
          <strong>{formatCurrency(totals.expenses)}</strong>
        </div>
        <div className="stat highlight">
          <span className="muted">Saldo líquido</span>
          <strong>{formatCurrency(totals.net)}</strong>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Planilha</h2>
          <button type="button" className="btn-primary" onClick={handlePdf}>
            Baixar PDF
          </button>
        </div>
        {sortedTransactions.length === 0 ? (
          <p className="muted">Nenhuma transação ainda.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    ["date", "Data"],
                    ["description", "Descrição"],
                    ["category", "Categoria"],
                    ["type", "Tipo"],
                    ["amount", "Valor"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button
                        type="button"
                        className="th-btn"
                        onClick={() => toggleSort(key)}
                      >
                        {label}
                        {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        className="cell-input"
                        value={t.date}
                        onChange={(e) =>
                          updateTransaction(t.id, "date", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        value={t.description}
                        onChange={(e) =>
                          updateTransaction(t.id, "description", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        value={t.category}
                        onChange={(e) =>
                          updateTransaction(t.id, "category", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="cell-input"
                        value={t.type}
                        onChange={(e) =>
                          updateTransaction(t.id, "type", e.target.value)
                        }
                      >
                        <option value="expense">Despesa</option>
                        <option value="income">Receita</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="number"
                        value={t.amount}
                        onChange={(e) =>
                          updateTransaction(t.id, "amount", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost small"
                        onClick={() => removeTransaction(t.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card charts">
        <h2>Gráficos</h2>
        <div className="chart-grid">
          <div className="chart-box" id="chart-category-export">
            <h3>Despesas por categoria</h3>
            {categoryData.length === 0 ? (
              <p className="muted">Sem dados de despesas.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {categoryData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{
                      background: "#12121a",
                      border: "1px solid #7c3aed",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="chart-box">
            <h3>Receitas vs despesas</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashflowData}>
                <CartesianGrid stroke="#2e1065" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#a78bfa" />
                <YAxis stroke="#a78bfa" />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{
                    background: "#12121a",
                    border: "1px solid #7c3aed",
                  }}
                />
                <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-box">
            <h3>Evolução do saldo</h3>
            {balanceData.length === 0 ? (
              <p className="muted">Envie fotos de saldo para ver a tendência.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={balanceData}>
                  <CartesianGrid stroke="#2e1065" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#a78bfa" />
                  <YAxis stroke="#a78bfa" />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{
                      background: "#12121a",
                      border: "1px solid #7c3aed",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: "#7c3aed" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Plano para economizar</h2>
        {!savingsPlan ? (
          <p className="muted">Adicione transações para gerar o plano.</p>
        ) : (
          <>
            <p className="plan-meta">
              Meta mensal:{" "}
              <strong>{formatCurrency(savingsPlan.monthlyTarget)}</strong> ·
              Semanal:{" "}
              <strong>{formatCurrency(savingsPlan.weeklyCheckpoint)}</strong>
            </p>
            <ol className="plan-steps">
              {savingsPlan.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        )}
      </section>

      <footer className="footer">
        <p className="muted">
          Dados salvos apenas neste dispositivo (localStorage). Versão 1.0.0
        </p>
      </footer>
    </div>
  );
}
