import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { APP_NAME } from "./config";
import { formatCurrency, formatDate } from "./format";

const PURPLE = [124, 58, 237];
const DARK = [18, 18, 26];
const TEXT = [243, 232, 255];

export async function downloadFinancePdf({
  balances,
  transactions,
  savingsPlan,
  chartElementId,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(...TEXT);
  doc.setFontSize(18);
  doc.text(APP_NAME, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(...PURPLE);
  doc.text(`Relatório — ${formatDate(new Date().toISOString())}`, 14, 28);

  y = 48;
  doc.setTextColor(40, 40, 50);
  doc.setFontSize(12);
  doc.text("Saldo", 14, y);
  y += 6;
  doc.setFontSize(10);
  if (balances.length === 0) {
    doc.text("Nenhum saldo registrado.", 14, y);
    y += 8;
  } else {
    const latest = balances[balances.length - 1];
    doc.text(
      `${latest.source}: ${formatCurrency(latest.amount)} (${formatDate(latest.asOf)})`,
      14,
      y
    );
    y += 10;
  }

  doc.setFontSize(12);
  doc.text("Planilha (transações)", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
    body: transactions.map((t) => [
      formatDate(t.date),
      t.description,
      t.category,
      t.type === "income" ? "Receita" : "Despesa",
      formatCurrency(t.amount),
    ]),
    headStyles: { fillColor: PURPLE, textColor: TEXT },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
  });

  y = doc.lastAutoTable.finalY + 10;

  if (savingsPlan?.steps?.length) {
    doc.setFontSize(12);
    doc.text("Plano de economia", 14, y);
    y += 6;
    doc.setFontSize(9);
    savingsPlan.steps.forEach((step, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${step}`, pageW - 28);
      if (y + lines.length * 5 > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 14, y);
      y += lines.length * 5 + 2;
    });
  }

  if (chartElementId && typeof document !== "undefined") {
    const el = document.getElementById(chartElementId);
    if (el) {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#12121a",
        scale: 2,
      });
      const img = canvas.toDataURL("image/png");
      if (y + 60 > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text("Gráfico — despesas por categoria", 14, y);
      y += 4;
      const imgW = pageW - 28;
      const imgH = (canvas.height / canvas.width) * imgW;
      doc.addImage(img, "PNG", 14, y, imgW, Math.min(imgH, 80));
    }
  }

  doc.save(`${APP_NAME.replace(/\s+/g, "-").toLowerCase()}-relatorio.pdf`);
}
