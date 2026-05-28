# 🏛️ Legisla Monitor

Monitor automatizado de proposições legislativas da **Câmara Federal** e da **Câmara Municipal de Porto Alegre**. Acompanhe PLs por palavras-chave, receba notificações de novas proposições e tramitações, e leia resumos gerados por IA.

> Projeto de portfólio — demonstra integração com APIs públicas, web scraping, banco de dados relacional e IA generativa em um Next.js App Router moderno.

---

## 📸 Screenshots

| Dashboard | Proposições | Detalhe do PL |
|-----------|------------|---------------|
| Visão geral com stats e notificações | Lista filtrada por tema/casa | Tramitação + resumo por IA |

---

## ✨ Funcionalidades

### Versão atual
- **Monitor por keyword** — busca PLs que contenham suas palavras-chave na ementa
- **Duas fontes de dados**:
  - 🏛️ Câmara Federal via [API REST oficial](https://dadosabertos.camara.leg.br/swagger/api.html) (sem autenticação)
  - 🏙️ Câmara Municipal de Porto Alegre via web scraping
- **Feed de notificações** — nova proposição, mudança de status, votação próxima, resumo semanal
- **Histórico de tramitação** — linha do tempo de cada PL
- **Resumo por IA** — explicação acessível gerada pelo Claude (opcional)
- **Votações próximas** — alerta para votações nas próximas 48h
- **Agendamento automático** — Vercel Cron executa às 8h todo dia

### Roadmap
- [ ] Acompanhar PL específico por número
- [ ] Notificações por e-mail
- [ ] Comparativo entre versões de um PL
- [ ] Exportar relatório em PDF

---

## 🏗️ Arquitetura

```
legisla-monitor/
├── prisma/
│   ├── schema.prisma        # Modelos: Keyword, Proposicao, Tramitacao, Notification, Votacao
│   └── seed.ts              # Dados de exemplo para desenvolvimento
├── src/
│   ├── types/index.ts       # Tipos TypeScript compartilhados
│   ├── lib/
│   │   ├── db.ts            # Singleton do Prisma Client
│   │   ├── utils.ts         # Formatação, validação, helpers
│   │   ├── api/
│   │   │   ├── camara-federal.ts   # Cliente para a API da Câmara Federal
│   │   │   └── camara-poa.ts       # Scraper da Câmara Municipal de POA
│   │   └── ai/
│   │       └── summarizer.ts       # Resumos com Claude (Anthropic)
│   ├── components/
│   │   ├── layout/          # Sidebar + Header
│   │   ├── ProposicaoCard   # Card de PL com badges e destaque de keyword
│   │   ├── VotacaoCard      # Card de votação com alerta de proximidade
│   │   ├── NotificationItem # Item do feed com marcação de lido
│   │   ├── KeywordManager   # UI para adicionar/remover temas
│   │   ├── StatsCard        # Card de estatística com ícone e tendência
│   │   └── AISummary        # Geração de resumo por IA on-demand
│   └── app/
│       ├── page.tsx          # Dashboard
│       ├── temas/            # Gerenciar palavras-chave
│       ├── proposicoes/      # Listagem + filtros
│       ├── proposicoes/[id]/ # Detalhe + tramitação + IA
│       ├── votacoes/         # Votações próximas e recentes
│       └── api/
│           ├── keywords/     # CRUD de keywords
│           ├── proposicoes/  # Leitura de proposições + resumo IA
│           ├── votacoes/     # Leitura de votações
│           ├── notifications/# Feed + marcar como lido
│           └── monitor/      # Trigger do monitor (manual + cron)
└── vercel.json               # Cron: diário às 8h + semanal às segundas
```

### Fluxo de dados

```
Usuário → adiciona keyword
    ↓
/api/monitor (POST)
    ├── Câmara Federal API  → busca por keyword → normaliza → salva Proposicao
    ├── Câmara POA scraping → busca por keyword → normaliza → salva Proposicao
    └── Para cada nova proposição → cria Notification
         └── (opcional) Câmara Federal API → busca tramitações → salva Tramitacao
    ↓
Dashboard → exibe notificações + stats
    ↓
Usuário clica em PL → detalhe + tramitação
    ↓
(opcional) Gera resumo → /api/proposicoes/:id/summary → Claude API → salva aiSummary
```

---

## 🚀 Como executar localmente

### Pré-requisitos

- Node.js 20+
- npm 10+

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/legisla-monitor.git
cd legisla-monitor
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Banco de dados SQLite (gerado automaticamente)
DATABASE_URL="file:./dev.db"

# (Opcional) Para resumos por IA
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Configure o banco de dados

```bash
npm run db:push    # cria as tabelas
npm run db:seed    # popula com dados de exemplo
```

### 4. Inicie o servidor

```bash
npm run dev
```

Acesse **http://localhost:3000**

---

## 🌐 Deploy na Vercel

### 1. Variáveis de ambiente

No painel da Vercel, adicione:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | URL do seu banco (ex: Neon, PlanetScale, Supabase) |
| `CRON_SECRET` | String aleatória para proteger o endpoint de cron |

> Para produção, substitua o SQLite por PostgreSQL. Altere o `provider` no `prisma/schema.prisma`.

### 2. Cron Jobs

O `vercel.json` configura dois jobs automáticos:
- **Diário (8h)** — busca novas proposições
- **Semanal (segunda, 9h)** — gera resumo semanal com IA

---

## 🔌 APIs utilizadas

### Câmara Federal — API REST

Documentação: https://dadosabertos.camara.leg.br/swagger/api.html

```
GET /api/v2/proposicoes?keywords=inteligência+artificial
GET /api/v2/proposicoes/{id}
GET /api/v2/proposicoes/{id}/tramitacoes
GET /api/v2/votacoes?dataInicio=...&dataFim=...
```

**Sem autenticação.** Paginação com parâmetros `pagina` e `itens`.

### Câmara Municipal de Porto Alegre — Web Scraping

Site: https://www.camarapoa.rs.gov.br/pesquisa-de-proposicoes

A Câmara Municipal de POA não disponibiliza API pública documentada.
O módulo `camara-poa.ts` realiza scraping com [Cheerio](https://cheerio.js.org/).

> ⚠️ Scrapers são frágeis a mudanças de layout. Se parar de funcionar, inspecione o HTML do site e atualize os seletores em `src/lib/api/camara-poa.ts`.

---

## 🤖 Integração com IA (Claude)

O resumo por IA usa o modelo `claude-haiku-4-5` para minimizar custos:

```typescript
// src/lib/ai/summarizer.ts
const response = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 600,
  messages: [{ role: "user", content: prompt }],
});
```

O resumo é gerado **sob demanda** (ao clicar no botão) e salvo no banco para evitar chamadas repetidas.

---

## 🛠️ Stack técnica

| Categoria | Tecnologia |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Banco de dados | SQLite (dev) / PostgreSQL (prod) via Prisma |
| Estilização | Tailwind CSS |
| HTTP Client | Axios |
| HTML Parsing | Cheerio |
| IA | Anthropic SDK (Claude) |
| Deploy | Vercel |
| Cron | Vercel Cron Jobs |

---

## 📄 Licença

MIT — use e adapte à vontade.

---

*Dados legislativos fornecidos pelos sistemas de dados abertos da Câmara dos Deputados e da Câmara Municipal de Porto Alegre.*
