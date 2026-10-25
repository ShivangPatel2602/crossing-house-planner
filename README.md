# Crossing House Planner

Plans which crosses go into which crossing-house rooms each day. A Python optimization model
(`crossing_model.py`) sits behind a small API (`api.py`) and a React UI (`frontend/`).

## First-time setup

```bash
cd "/Users/shivupatel/Documents/College Use/bin-project"
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd frontend && npm install && cd ..
```

## Run it for breeders

```bash
cd frontend && npm run build && cd ..          # only after UI changes
.venv/bin/uvicorn api:app --port 8000
```

Open http://localhost:8000. To let others on the same network use it, add `--host 0.0.0.0`
and share `http://<this-computer's-IP>:8000`.

## Develop the UI

Two terminals:

```bash
.venv/bin/uvicorn api:app --reload --port 8000     # terminal 1: API
cd frontend && npm run dev                         # terminal 2: UI at http://localhost:5173
```

## Command line, tests and experiments

```bash
.venv/bin/python crossing_model.py toyexample.xlsx --rooms 2 --weights strict
.venv/bin/python -m unittest -v
.venv/bin/python experiments.py        # ~3 minutes
```
