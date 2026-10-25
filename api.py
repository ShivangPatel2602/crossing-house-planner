"""HTTP API for the crossing-house planner UI.

Dev:  .venv/bin/uvicorn api:app --reload --port 8000   (UI via `npm run dev` in frontend/)
Prod: build the UI once (`npm run build` in frontend/), then the same uvicorn
      command serves both the API and the UI at http://localhost:8000
"""

import io
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from crossing_model import FEMALE, MALE, flowers_used, read_workbook, solve, validate

HERE = Path(__file__).parent
app = FastAPI(title="Crossing House Planner")


class CrossIn(BaseModel):
    male: str
    female: str
    priority: int = Field(ge=1, le=3)


class ParentIn(BaseModel):
    parent: str
    sex: str = Field(pattern="^(male|female)$")
    available: int = Field(ge=0)


class Settings(BaseModel):
    rooms: int = Field(5, ge=0, le=50)
    capacity: int = Field(8, ge=1, le=100)
    ratio: int = Field(3, ge=1, le=20)
    min_female_stalks: int = Field(1, ge=1, le=20)
    weights: str = Field("strict", pattern="^(linear|strict)$")
    fill: bool = True


class PlanRequest(BaseModel):
    crosses: list[CrossIn]
    parents: list[ParentIn]
    settings: Settings = Settings()


def tables(src):
    """Turn a workbook into the editable tables the UI shows."""
    try:
        raw_crosses, available, sex = read_workbook(src)
    except Exception as e:
        raise HTTPException(400, f"Could not read that spreadsheet: {e}")
    return {
        "crosses": [{"male": str(m), "female": str(f), "priority": int(p)} for m, f, p in raw_crosses],
        "parents": [{"parent": p, "sex": "male" if sex[p] == MALE else "female", "available": n}
                    for p, n in available.items()],
    }


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    return tables(io.BytesIO(await file.read()))


@app.get("/api/example")
def example():
    return tables(HERE / "toyexample.xlsx")


@app.post("/api/plan")
def plan(req: PlanRequest):
    s = req.settings
    names = [p.parent.strip() for p in req.parents]
    if len(set(names)) != len(names):
        raise HTTPException(400, "Each parent can only be listed once in the flower inventory.")
    sex = {p.parent.strip(): MALE if p.sex == "male" else FEMALE for p in req.parents}
    available = {p.parent.strip(): p.available for p in req.parents}
    raw = [(c.male.strip(), c.female.strip(), c.priority) for c in req.crosses]
    inst = validate(raw, available, sex, rooms=s.rooms, capacity=s.capacity, ratio=s.ratio,
                    min_female_stalks=s.min_female_stalks)
    sol = solve(inst, s.weights, fill=s.fill)
    if sol.status != "Optimal":
        raise HTTPException(500, f"The planner could not find a plan (solver status: {sol.status}).")
    used = flowers_used(sol.rooms)
    return {
        "warnings": inst.warnings,
        "rooms": [{"male": r.male, "maleStalks": r.male_stalks,
                   "females": [{"female": f, "stalks": n} for f, n in r.females.items()],
                   "size": r.size} for r in sol.rooms],
        "made": [{"male": c.male, "female": c.female, "priority": c.priority}
                 for c in sorted(sol.made, key=lambda c: (c.priority, c.key))],
        "unmade": [{"male": c.male, "female": c.female, "priority": c.priority, "reason": why}
                   for c, why in sorted(sol.unmade.items(), key=lambda kv: (kv[0].priority, kv[0].key))],
        "flowers": [{"parent": p, "used": used.get(p, 0), "available": available[p]}
                    for p in sorted(available)],
        "totalCrosses": len(inst.crosses),
        "settings": s.model_dump(),
    }


# In production, serve the built React app (frontend/dist) from the same server.
if (HERE / "frontend" / "dist").is_dir():
    app.mount("/", StaticFiles(directory=HERE / "frontend" / "dist", html=True), name="ui")
