from fastapi import APIRouter, UploadFile, File

from backend.csv_importer import import_csv

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/csv")
async def import_csv_file(file: UploadFile = File(...)):
    """Import trades from a Webull CSV export file."""
    content = await file.read()
    text = content.decode("utf-8")
    result = await import_csv(text)
    return result.model_dump()
