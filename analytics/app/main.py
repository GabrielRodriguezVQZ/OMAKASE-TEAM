from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import pandas as pd
import sqlalchemy
from sqlalchemy import create_engine, text

app = FastAPI(title="Surgical Safety Analytics")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USERNAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_DATABASE", "surgical_safety")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)

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
    Estima la duración de un tipo de cirugía basado en el histórico real.
    """
    try:
        query = """
        SELECT 
            s.procedimiento,
            st.timestamp as inicio_time,
            et.timestamp as fin_time,
            EXTRACT(EPOCH FROM (et.timestamp - st.timestamp)) / 60 as duracion_minutos
        FROM surgeries s
        JOIN surgery_times st ON s.id = st.surgery_id AND st.evento = 'INICIO_CIRUGIA'
        JOIN surgery_times et ON s.id = et.surgery_id AND et.evento = 'FIN_CIRUGIA'
        WHERE s.procedimiento ILIKE :procedimiento
          AND s.estado = 'FINALIZADA'
        """
        
        df = pd.read_sql(query, engine, params={"procedimiento": f"%{request.procedimiento}%"})
        
        if df.empty:
            # Si no hay datos, retornar valor ficticio
            duraciones_estimadas = {
                "apendicectomía": 45,
                "cesárea": 60,
                "colecistectomía": 90,
                "herniorrafia": 30,
                "artroscopia": 75,
                "mastectomía": 120,
                "prostatectomía": 180,
            }
            duracion = duraciones_estimadas.get(request.procedimiento.lower(), 60)
            
            return {
                "procedimiento": request.procedimiento,
                "duracion_estimada_minutos": duracion,
                "fuente": "datos_historicos_ficticios"
            }
        
        # Calcular estadísticas reales
        duracion_promedio = df['duracion_minutos'].mean()
        duracion_mediana = df['duracion_minutos'].median()
        
        return {
            "procedimiento": request.procedimiento,
            "duracion_estimada_minutos": round(duracion_promedio),
            "duracion_mediana_minutos": round(duracion_mediana),
            "total_cirugias_analizadas": len(df),
            "fuente": "datos_historicos_reales"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/omisiones-frecuentes")
async def omisiones_frecuentes():
    """
    Retorna los items del checklist más omitidos o completados fuera de orden.
    """
    try:
        query = """
        SELECT 
            ci.item,
            ci.momento,
            COUNT(*) as total_items,
            SUM(CASE WHEN ci.completado = false THEN 1 ELSE 0 END) as omisiones
        FROM checklist_items ci
        JOIN surgeries s ON ci.surgery_id = s.id
        WHERE s.fecha_programada >= NOW() - INTERVAL '30 days'
        GROUP BY ci.item, ci.momento
        ORDER BY omisiones DESC
        LIMIT 10
        """
        
        df = pd.read_sql(query, engine)
        
        if df.empty:
            # Datos ficticios si no hay suficientes datos
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
        
        omisiones = [
            OmisionFrecuente(
                item=row['item'],
                momento=row['momento'],
                omisiones=int(row['omisiones'])
            )
            for _, row in df.iterrows()
        ]
        
        return {
            "omisiones": omisiones,
            "total_checklists_analizados": int(df['total_items'].sum()),
            "fuente": "datos_historicos_reales"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
