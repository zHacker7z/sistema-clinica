# Sistema de Atendimento Inteligente (Clínicas)

Aplicação web acadêmica com:

- Backend Node.js + Express (MongoDB Atlas + JWT)
- Frontend Vue.js (Vite)
- Agendamento com verificação de conflito de horário
- Agendamento com slots fixos por hora (08:00-17:00)
- Consulta automática de endereço por CEP (ViaCEP)
- Previsão de chuva/limpo no dia do agendamento (Open-Meteo gratuita)
- Painel administrativo para secretárias (ver/gerenciar todos os agendamentos)
- Remarcação e atualização de status de atendimento (admin)

## Tecnologias

- Backend: Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs
- Frontend: Vue 3, Vite, Vue Router, Axios
- APIs externas:
  - CEP: ViaCEP
  - Clima: Open-Meteo (previsão por probabilidade de precipitação)

## Requisitos

- Conta no MongoDB Atlas
- Chave secreta JWT
- (Opcional) URL do frontend para configurar CORS no backend

## Estrutura

- `backend/` (API)
- `frontend/` (app Vue)

## Variáveis de ambiente

### Backend (`backend/.env.example`)

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS` (inclua a origem do seu frontend local e a origem do Vercel)

### Frontend (`frontend/.env.example`)

- `VITE_API_BASE_URL`

## Rodar localmente

1. Backend
   - `cd backend`
   - `npm install`
   - criar `.env` com base em `.env.example`
   - `npm run dev`

2. Frontend
   - `cd frontend`
   - `npm install`
   - criar `.env` com base em `.env.example`
   - `npm run dev`

3. Abrir no navegador:
   - Frontend (geralmente `http://localhost:5173`)

## Fluxo de autenticação e papéis

- `patient`: vê apenas os próprios agendamentos
- `secretary`: vê/gerencia todos os agendamentos e tem acesso à rota `/admin`

## Endpoints principais (visão rápida)

- `POST /api/auth/register` (cadastro)
- `POST /api/auth/login` (login)
- `GET /api/auth/me` (meu perfil)
- `GET /api/address/cep/:cep` (ViaCEP)
- `GET /api/appointments?date=YYYY-MM-DD` (agendamentos do dia)
- `GET /api/appointments/slots?date=YYYY-MM-DD` (slots disponíveis)
- `GET /api/appointments/weather-preview?dateISO=YYYY-MM-DD&cep=...` (preview de clima)
- `POST /api/appointments` (criar agendamento)
- `GET /api/admin/appointments?date=YYYY-MM-DD` (admin)
- `GET /api/admin/appointments?date=YYYY-MM-DD&status=all|scheduled|completed|cancelled&patientId=...&page=1&limit=10` (admin com filtros + paginação)
- `PATCH /api/admin/appointments/:id/cancel` (cancelar)
- `PATCH /api/admin/appointments/:id/reschedule` (remarcar)
- `PATCH /api/admin/appointments/:id/status` (agendado/concluído/cancelado)
- `GET /api/admin/patients` (lista de pacientes para a secretária)

## Deploy (Render + Vercel)

### Backend no Render

1. Crie um **Web Service** apontando para a pasta `backend/`
2. Runtime: Node
3. Comandos:
   - Start Command: `npm start`
4. Environment Variables:
   - Preencha `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `PORT` (se necessário)
5. Garanta que `CORS_ORIGINS` inclua a URL do frontend em produção (Vercel).

### Frontend no Vercel

1. Crie um projeto apontando para a pasta `frontend/`
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variables:
   - `VITE_API_BASE_URL` para apontar ao backend Render.

## Sobre o clima (escopo acadêmico)

- Ao criar um agendamento, o sistema:
  1. consulta o endereço pelo CEP (ViaCEP),
  2. resolve coordenadas via Open-Meteo (geocoding),
  3. busca a previsão diária (probabilidade de precipitação) no dia do agendamento,
  4. salva um `weatherSnapshot` no banco,
  5. mostra no frontend como “Chuva” ou “Limpo” (com fallback “Clima?” quando indisponível).

> Observação: Como é uma API gratuita, pode haver limitações de cobertura/precisão.

## Regras de horário

- Slots de atendimento: `08:00` até `17:00` (1h).
- O sistema bloqueia:
  - datas passadas;
  - horários já passados no dia atual (considerando o horário atual).

## Demonstração

- Login de usuário (JWT)
- Criação de agendamento com validação de horário
- Preenchimento automático de endereço via CEP
- Exibição de previsão do tempo no dia da consulta
- Painel administrativo com gerenciamento completo

## Link do projeto

- Frontend: https://sistema-clinica-tau.vercel.app/login
- Backend: https://sistema-clinica-mm9x.onrender.com
