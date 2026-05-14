# Tago's CharCreator

Aplicação web local para criação assistida por IA de character cards no formato SillyTavern `chara_card_v2`.

## Setup Rápido

### 1. Instalar Python 3.11+
Baixe em https://python.org/downloads — marque "Add to PATH" durante a instalação.

### 2. Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copie `.env.example` para `.env` e configure sua API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Inicie o backend:
```powershell
uvicorn main:app --reload --app-dir .
```
O backend sobe em http://localhost:8000

### 3. Frontend
```powershell
cd frontend
npm install   # (já feito)
npm run dev
```
O frontend sobe em http://localhost:5173

---

## Rodar com Docker Compose (homelab)

```bash
cp .env.example .env
# edite .env com sua ANTHROPIC_API_KEY
docker compose up -d
```

Acesse em http://localhost:3000

---

## Estrutura
- `backend/` — FastAPI + SQLModel + SQLite
- `frontend/` — React 18 + TypeScript + Vite + Tailwind
- `docker-compose.yml` — deploy para homelab

## Features
- **Context Cards** modulares com drag-and-drop
- Geração de card completo ou campo individual via streaming
- Refinamento de campos com instrução customizada
- Lorebook editor completo com geração por IA
- Quality checklist automático para o card gerado
- Exportação de `.json` compatível com SillyTavern
- Seed automático de regras globais e field presets
