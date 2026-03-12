# DevZapp — DevGrupos

Plataforma de disparo em massa para grupos do WhatsApp.

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma (PostgreSQL)
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Recharts
- **Realtime**: Socket.IO (WebSocket)
- **Infra**: Docker + Docker Compose

## Módulos implementados

| Módulo | Descrição |
|--------|-----------|
| Campanhas | CRUD completo, links automáticos, planos (Basic/Advanced/Premium/Black) |
| Tipos de Links | Main, Deep, Cookie, Redirect, Links Extras |
| Visão Geral | Dashboard com métricas em tempo real + configurações |
| Grupos | Gestão completa, toggle de captação, ações em lote, pastas |
| Comunidades | Criação/importação de comunidades WhatsApp |
| Mensagens | Banco de mensagens, Dev.IA, tipos (texto/link/enquete/evento/contato) |
| Agendamentos | 10 tipos de automação, calendário, status de execução |
| Relatórios | 4 tipos com controle de plano (Basic/Premium/Black) |
| Métricas de Cliques | Por data/hora/dispositivo/origem com gráficos |
| Monitoramento | Webhooks de entrada/saída por grupo |
| Links Extras | Links segmentados por público |
| Canais | Canais WhatsApp para transmissão |
| WhatsApp Sessions | Múltiplos números, QR Code, pareamento |

## Início rápido

### Com Docker

```bash
docker-compose up -d
```

Acesse: http://localhost:5173
Login demo: admin@devzapp.com / admin123

### Desenvolvimento local

```bash
# 1. Backend
cd backend
cp .env.example .env
# edite .env com sua DATABASE_URL
npm install
npm run db:push
npm run db:seed
npm run dev

# 2. Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

## Estrutura

```
enviodemensagens/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # 12 modelos de dados
│   │   └── seed.ts            # Dados de demo
│   └── src/
│       ├── index.ts           # Entry point + Socket.IO
│       ├── lib/               # Prisma client, logger
│       ├── middleware/        # Auth JWT
│       ├── routes/            # 10 routers REST
│       └── services/          # Scheduler (cron)
└── frontend/
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── Layout.tsx
        │   └── campaign/      # 10 abas da campanha
        ├── pages/             # Login, CampaignList, CampaignDetail
        ├── store/             # Zustand (auth)
        └── lib/               # Axios API client
```

## API REST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Registro |
| GET/POST | /api/campaigns | Listar/criar campanhas |
| GET/PATCH/DELETE | /api/campaigns/:id | Detalhes/editar/excluir |
| GET | /api/campaigns/:id/overview | Métricas da campanha |
| GET/POST | /api/campaigns/:id/groups | Grupos |
| GET/POST | /api/campaigns/:id/messages | Mensagens |
| GET/POST | /api/campaigns/:id/schedules | Agendamentos |
| GET | /api/campaigns/:id/clicks | Métricas de cliques |
| GET/POST | /api/campaigns/:id/monitoring | Monitoramento |
| GET/POST | /api/campaigns/:id/links | Links |
| GET/POST | /api/campaigns/:id/reports | Relatórios |
| GET/PATCH/DELETE | /api/whatsapp/sessions | Sessões WhatsApp |
| GET | /r/track/:slug | Rastreamento de clique (público) |

## Integração WhatsApp (produção)

Para disparo real, integre a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys) ou WA-Web no service `WhatsappSession`. O scheduler em `src/services/scheduler.ts` já está preparado para executar as automações; basta substituir o `// TODO` pelo dispatch real.
