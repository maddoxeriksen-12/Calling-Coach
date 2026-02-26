# Calling Coach — Voice AI Sales Training

Practice your product pitch against AI-simulated prospects. Upload product docs, choose a client personality, and get scored on terminology, conciseness, objection handling, and more.

## Prerequisites

- Python 3.10+
- Node.js 18+
- [Vapi](https://vapi.ai) account (public + private API keys)
- [OpenAI](https://platform.openai.com) API key

## Quick Start

### 1. Configure environment variables

```bash
# Root .env (backend)
cp .env.example .env
# Edit .env with your real keys:
#   OPENAI_API_KEY, VAPI_PUBLIC_KEY, VAPI_PRIVATE_KEY, WEBHOOK_BASE_URL

# Frontend .env
echo "VITE_VAPI_PUBLIC_KEY=your-vapi-public-key" > frontend/.env
```

**WEBHOOK_BASE_URL**: The public URL where Vapi can reach your backend webhook.
For local development, use [ngrok](https://ngrok.com): `ngrok http 8000`, then set
`WEBHOOK_BASE_URL=https://xxxx.ngrok.io` in `.env`.

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## How It Works

1. **Register/Login** — Create an account
2. **Upload Product Doc** — PDF or text file. GPT-4o extracts USPs, key terms, and common objections
3. **Pick a Personality** — Choose from 6 prospect archetypes:
   - Skeptical Buyer
   - Analytical Decision-Maker
   - Busy Executive
   - Friendly but Non-Committal
   - Technical Expert
   - Price-Focused Negotiator
4. **Start the Call** — Voice conversation via Vapi. The AI prospect asks questions, raises objections, and interrupts if you ramble
5. **Get Scored** — After the call, see your scorecard:
   - Term Understanding
   - Description Breadth
   - Conciseness
   - Objection Handling
   - USP Framing
   - Confidence
6. **Track Progress** — Dashboard shows score trends, per-personality averages, and session history

## Project Structure

```
backend/
  main.py              # FastAPI entry point
  auth.py              # JWT authentication
  models.py            # SQLAlchemy models
  database.py          # DB setup
  routers/
    products.py        # Product upload + CRUD
    sessions.py        # Session management + Vapi config builder
    scores.py          # Dashboard analytics
    webhook.py         # Vapi webhook handler
  services/
    usps_extractor.py  # GPT-4o USP extraction
    scoring.py         # Post-call scoring engine
    personality.py     # 6 personality prompt templates

frontend/
  src/
    pages/
      Login.jsx        # Auth page
      Dashboard.jsx    # Score trends + history
      SessionSetup.jsx # Product + personality selection
      LiveCall.jsx     # Vapi voice call interface
      Scorecard.jsx    # Post-call scorecard
    services/
      api.js           # Backend API client
      vapi.js          # Vapi SDK wrapper
    components/
      Layout.jsx       # Sidebar navigation
```
