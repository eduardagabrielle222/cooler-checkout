# Checkout PIX — Cooler Trailmate 66L (Velory)

Checkout PIX embutido na própria página de vendas (o cliente **não sai da página**),
integrado à API **Velory**. Produto único, **1 unidade por R$ 79,90**, **frete grátis** para todo o Brasil.

## Como funciona

1. O cliente clica em qualquer botão de compra → abre um **modal** sobre a página.
2. Preenche nome, CPF, telefone, e-mail e endereço (CEP com preenchimento automático).
3. O front chama `POST /api/checkout`, que cria a cobrança PIX na Velory e devolve o QR Code + copia-e-cola.
4. A tela do PIX **detecta o pagamento sozinha** (consulta `GET /api/status` a cada 4s) e mostra a confirmação.

A **chave secreta da Velory nunca vai ao navegador** — fica só nas funções serverless (`/api`).
O **preço é fixado no servidor** (`api/checkout.js`), então não dá pra adulterar pelo navegador.
O **endereço de entrega** é gravado no `metadata` da cobrança e aparece atrelado à venda no painel Velory.

## Estrutura

```
index.html          página de vendas (com o checkout injetado no fim do <body>)
js/checkout.css     estilos do modal (isolados sob #vchk-root)
js/checkout.js      lógica do checkout (vanilla JS, sem dependências)
api/checkout.js     cria a cobrança PIX (POST)
api/status.js       consulta o status da cobrança (GET) — usado no polling
api/simulate.js     força pagamento em sandbox (POST) — bloqueado em produção
lib/velory.js       cliente HTTP da API Velory (lado servidor)
lib/validate.js     validação de CPF, e-mail, telefone, CEP e endereço
```

## Variável de ambiente

| Nome | Valor |
|------|-------|
| `VELORY_SECRET_KEY` | `sk_test_…` (sandbox) ou `sk_live_…` (produção) |
| `VELORY_BASE_URL` | *(opcional)* padrão `https://api.velorybrasil.com/v1` |

## Rodar localmente (com o backend)

```bash
VELORY_SECRET_KEY=sk_test_xxx node scripts/dev-server.mjs
# abre http://localhost:4321
```

Com chave `sk_test_`, a tela do PIX mostra o botão **“Simular pagamento (sandbox)”**
para validar o fluxo ponta a ponta sem dinheiro real.

## Publicar na Vercel

```bash
npm i -g vercel              # se ainda não tiver
vercel                       # 1ª vez: cria/linka o projeto (deploy de preview)
vercel env add VELORY_SECRET_KEY    # cole a chave (sk_test_ ou sk_live_)
vercel env add FB_ACCESS_TOKEN      # token da Conversions API do Facebook (SECRETO)
vercel env add FB_PIXEL_ID          # 892365253404482 (opcional; já tem fallback no código)
vercel env add UTMIFY_API_TOKEN     # token da UTMify (SECRETO) — recebe a venda + valor
vercel --prod                # publica em produção
```

Para ir ao ar de verdade, use a chave `sk_live_…`. Depois é só apontar seu domínio
nas configurações do projeto na Vercel.

## Rastreio do Facebook (Pixel + Conversions API)

- **Pixel (navegador):** `js/fb-pixel.js` dispara `PageView` (load), `ViewContent` (scroll),
  `AddToCart` (abrir checkout), `InitiateCheckout` (começar a preencher) e `Purchase` (pago).
- **Conversions API (servidor):** `api/track-purchase.js` valida o pagamento na Velory e
  envia a `Purchase` com PII hasheada (SHA-256). Mesmo `event_id` (`pur_<id>`) do Pixel →
  o Facebook **deduplica**. O token fica só no servidor (`FB_ACCESS_TOKEN`).
- **Purchase só dispara em pagamento REAL (live)** — sandbox é ignorado pra não sujar o pixel.

### Webhook (recomendado — captura vendas mesmo se o cliente fechar a página)

No painel da Velory, cadastre um endpoint de webhook apontando para:

```
https://SEU-DOMINIO/api/webhook        evento: charge.paid
```

Assim, quando o PIX é pago (mesmo depois do cliente sair), a `Purchase` é enviada
pela Conversions API automaticamente.

## UTMify (notificação de venda + valor)

`lib/utmify.js` envia o pedido **pago** (`status: paid`) para a UTMify quando o PIX é
confirmado (do webhook e do confirm client-side, deduplicados pelo `orderId` próprio).
Não usa o pixel de front-end da UTMify — só reporta a venda (notificação + valor em BRL).

- Os **UTMs** do anúncio são capturados no navegador, salvos no `metadata.utm` da cobrança
  e enviados em `trackingParameters` → a UTMify atribui a venda à campanha certa.
- **Sandbox** vai como `isTest: true` (não conta nos KPIs).
- Token em `UTMIFY_API_TOKEN` (só servidor). Falha da UTMify nunca quebra o pagamento.
