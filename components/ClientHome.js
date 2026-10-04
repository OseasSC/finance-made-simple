"use client";

import dynamic from "next/dynamic";

const FinanceApp = dynamic(() => import("@/components/FinanceApp"), {
  ssr: false,
  loading: () => (
    <div className="app-shell">
      <p className="muted">Carregando…</p>
    </div>
  ),
});

export default function ClientHome() {
  return <FinanceApp />;
}
