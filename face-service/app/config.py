from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    face_service_host: str = "127.0.0.1"
    face_service_port: int = 8001
    face_service_token: str = ""
    scrfd_model_path: str = "./models/det_2.5g.onnx"
    recognition_model_path: str = "./models/w600k_mbf.onnx"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
