# Finance Made Simple

Planejamento financeiro a partir de fotos: saldo, extrato e contas viram planilha, gráficos, plano de economia e PDF. Dados ficam no **localStorage** do navegador. Deploy na **Vercel** com **Next.js** (React, JavaScript).

## Funcionalidades

- Upload de imagens (câmera ou arquivo)
- Extração com OpenAI Vision (`gpt-4o-mini`)
- Planilha editável de transações
- Gráficos (Recharts)
- Plano de economia automático
- Download em PDF

## Requisitos

- Node.js 20+
- Conta OpenAI com API key

## Configuração local

```bash
npm install
cp .env.example .env.local
```

Edite `.env.local` e defina:

```
OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Deploy na Vercel

1. Importe o repositório no [Vercel](https://vercel.com).
2. Framework preset: **Next.js**.
3. Em **Environment Variables**, adicione `OPENAI_API_KEY` (Production, Preview, Development).
4. Deploy.

A rota `app/api/extract/route.js` usa a chave apenas no servidor; nunca exponha a key no cliente.

## Estrutura

| Caminho | Descrição |
|---------|-----------|
| `app/page.js` | Página principal |
| `components/FinanceApp.js` | UI e fluxo completo |
| `app/api/extract/route.js` | Extração Vision |
| `lib/storage.js` | localStorage schema v1 |
| `lib/savings.js` | Regras do plano de economia |
| `lib/pdf.js` | Exportação PDF |
| `docs/VERSIONING.md` | Política de versionamento |

## Versão

Aplicação **1.0.0** — ver [CHANGELOG.md](./CHANGELOG.md) e [docs/VERSIONING.md](./docs/VERSIONING.md).
