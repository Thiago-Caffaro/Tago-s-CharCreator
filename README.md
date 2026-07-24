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
cd ..
```

Copie `.env.example` para `.env` (na raiz do projeto) e configure sua API key:
```
OPENROUTER_API_KEY=sk-or-v1-...
```

Inicie o backend a partir da raiz do projeto — os imports do backend são relativos,
então precisa rodar como pacote (`backend.main:app`), não de dentro da pasta `backend/`:
```powershell
backend\venv\Scripts\python.exe -m uvicorn backend.main:app --reload
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
# edite .env com sua OPENROUTER_API_KEY
docker compose up -d
```

Acesse em http://localhost:3000

---

## Estrutura
- `backend/` — FastAPI + SQLModel + SQLite
- `frontend/` — React 18 + TypeScript + Vite + Tailwind
- `docker-compose.yml` — deploy para homelab

## Features
- **Context Cards** modulares com drag-and-drop, templates reutilizáveis e ações em lote
- Geração de card completo ou campo individual via streaming
- Refinamento de campos com instrução customizada
- "Voz" reutilizável do personagem — aplica um tom/estilo consistente a todos os campos
- Configuração de geração (modelo/temperature/top_p) global ou por projeto
- Lorebook editor completo com geração por IA, testador de keywords e import/export
- Quality checklist automático para o card gerado
- Histórico de gerações por projeto, com restauração de versões anteriores
- Exportação de `.json` e `.png` (com avatar embutido) compatível com SillyTavern
- Importação de character cards de outros apps (SillyTavern/Chub, `.png` ou `.json`)
- Seed automático de regras globais e field presets
