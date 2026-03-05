from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Council"
    DEBUG: bool = True

    # Council Feature Toggle
    COUNCIL_ENABLED: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/council"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - Include common frontend dev ports
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default dev port
        "http://127.0.0.1:5173",
        "http://localhost:8080",  # Open WebUI default
        "http://127.0.0.1:8080",
    ]

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # External LLM provider API keys (leave empty to use Ollama)
    # Set provider = "openai" or "anthropic" in agent config below to use these keys.
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Agent configurations (using available Ollama models)
    # Each agent may optionally include "provider": "ollama"|"openai"|"anthropic"
    # Default provider is "ollama" if not specified.
    AGENTS: List[dict] = [
        {
            "id": "sage",
            "name": "Sage",
            "model": "gemma2:2b",
            "role": "Balanced Analyst",
            "color": "#3B82F6",
            "provider": "ollama",
            "system_prompt": "You are Sage, a balanced and analytical council member. Match your response length to the question - for greetings, respond briefly and warmly. For complex questions, provide well-reasoned analysis considering multiple perspectives. Be natural and conversational."
        },
        {
            "id": "scholar",
            "name": "Scholar",
            "model": "phi3:latest",
            "role": "Academic Expert",
            "color": "#8B5CF6",
            "provider": "ollama",
            "system_prompt": "You are Scholar, an academic expert on the council. Match your response length to the question - for simple messages, keep it brief. For knowledge questions, provide clear explanations with relevant context. Be approachable, not overly formal."
        },
        {
            "id": "pragmatist",
            "name": "Pragmatist",
            "model": "qwen2.5-coder:1.5b",
            "role": "Practical Advisor",
            "color": "#10B981",
            "provider": "ollama",
            "system_prompt": "You are Pragmatist, a practical advisor on the council. Be direct and to the point. For greetings, simply greet back warmly. For questions, provide actionable, real-world advice. Keep responses appropriately sized - short for simple queries, detailed only when needed."
        },
        {
            "id": "creative",
            "name": "Creative",
            "model": "mistral:7b",
            "role": "Innovative Thinker",
            "color": "#F59E0B",
            "provider": "ollama",
            "system_prompt": "You are Creative, an innovative thinker on the council. Bring fresh perspectives and creative ideas. For casual messages, be friendly and engaging. For complex topics, offer unique angles. Match your response length to what's appropriate for the question."
        },
        {
            "id": "synthesizer",
            "name": "Synthesizer",
            "model": "llama3.1:8b-instruct-q5_k_m",
            "role": "Consensus Builder",
            "color": "#EF4444",
            "provider": "ollama",
            "system_prompt": "You are Synthesizer. Based on the council's discussion, provide a single consolidated answer to the user. Do NOT list what each member said. Just give the final unified response directly. Keep it concise and natural."
        }
    ]

    class Config:
        env_file = ".env"


settings = Settings()
