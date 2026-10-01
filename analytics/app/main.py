from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Surgical Safety Analytics", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DuracionEstimadaRequest(BaseModel):
    procedimiento: str

class OmisionFrecuente(BaseModel):
    item: str
    momento: str
    omisiones: int

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics"}

@app.get("/")
async def root():
    return {
        "message": "Microservicio de Analítica - Tablero Inteligente de Seguridad Quirúrgica",
        "version": "1.0.0"
    }

@app.post("/analytics/duracion-estimada")
async def duracion_estimada(request: DuracionEstimadaRequest):
    """
    Estima la duración de un tipo de cirugía basado en el histórico.
    MVP: Retorna valores ficticios basados en el procedimiento.
    """
    procedimiento = request.procedimiento.lower()
    
    # Valores ficticios para MVP
    duraciones_estimadas = {
        "apendicectomía": 45,
        "cesárea": 60,
        "colecistectomía": 90,
        "herniorrafia": 30,
        "artroscopia": 75,
        "mastectomía": 120,
        "prostatectomía": 180,
    }
    
    duracion = duraciones_estimadas.get(procedimiento, 60)  # Default 60 minutos
    
    return {
        "procedimiento": request.procedimiento,
        "duracion_estimada_minutos": duracion,
        "fuente": "datos_historicos_ficticios"
    }

@app.get("/analytics/omisiones-frecuentes")
async def omisiones_frecuentes():
    """
    Retorna los items del checklist más omitidos o completados fuera de orden.
    MVP: Retorna datos ficticios.
    """
    omisiones = [
        OmisionFrecuente(item="Antibiótico profiláctico", momento="ANTES_INCISION", omisiones=5),
        OmisionFrecuente(item="Recuento de gasas", momento="ANTES_SALIR", omisiones=3),
        OmisionFrecuente(item="Verificación del sitio quirúrgico", momento="ANTES_INCISION", omisiones=2),
        OmisionFrecuente(item="Confirmación de alergias", momento="ANTES_ANESTESIA", omisiones=2),
    ]
    
    return {
        "omisiones": omisiones,
        "total_checklists_analizados": 50,
        "fuente": "datos_historicos_ficticios"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
