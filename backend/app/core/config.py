import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "9e3c98d6c703b41d4013ee42a8b945b9cd98fc1bc2e11894d0c159286d9a9f24")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # MongoDB fallback configuration
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = "sipms_db"
    LOCAL_DB_PATH: str = os.getenv("LOCAL_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "local_db.json"))

    class Config:
        env_file = ".env"

settings = Settings()
