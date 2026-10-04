import OpenAI from "openai";
import { OPENAI_MODEL, MAX_IMAGE_BYTES } from "@/lib/config";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const PROMPTS = {
  balance: `Extraia o saldo bancário desta imagem (Brasil). Retorne JSON estrito:
{"balance":{"source":"nome do banco/conta","amount":number,"currency":"BRL","asOf":"YYYY-MM-DD"}}`,
  extrato: `Extraia transações de extrato bancário (Brasil). Retorne JSON estrito:
{"transactions":[{"date":"YYYY-MM-DD","description":"string","category":"string","amount":number,"type":"income"|"expense"}]}
Use valores positivos. Classifique entradas como income e saídas como expense.`,
  bill: `Extraia contas/faturas desta imagem (Brasil). Retorne JSON estrito:
{"bills":[{"name":"string","dueDate":"YYYY-MM-DD","amount":number,"status":"pending"|"paid"}]}`,
};

function estimateBase64Bytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

export async function POST(request) {
  try {
    const openai = getOpenAI();
    if (!openai) {
      return Response.json(
        { error: "OPENAI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image, docType } = body;

    if (!image || !docType || !PROMPTS[docType]) {
      return Response.json(
        { error: "Envie image (data URL) e docType: balance | extrato | bill." },
        { status: 400 }
      );
    }

    if (!image.startsWith("data:image/")) {
      return Response.json({ error: "Imagem inválida." }, { status: 400 });
    }

    if (estimateBase64Bytes(image) > MAX_IMAGE_BYTES) {
      return Response.json(
        { error: "Imagem muito grande. Comprima e tente novamente." },
        { status: 413 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPTS[docType] },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return Response.json({ error: "Resposta vazia da IA." }, { status: 502 });
    }

    const parsed = JSON.parse(raw);
    return Response.json({ data: parsed, docType });
  } catch (err) {
    console.error("extract error", err);
    return Response.json(
      { error: err.message || "Falha ao processar imagem." },
      { status: 500 }
    );
  }
}
