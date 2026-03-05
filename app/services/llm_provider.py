"""
LLM Provider Abstraction Layer

Supports Ollama (default), OpenAI, and Anthropic backends.
Agents select their provider via the "provider" key in their config dict.
API keys are set via environment / config — no UI for switching providers.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Callable, Optional

import httpx

log = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def stream_completion(
        self,
        messages: list[dict],
        model: str,
        on_token: Optional[Callable[[str], None]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from the model. Yields each token as a string."""
        ...  # pragma: no cover

    @abstractmethod
    async def complete(self, messages: list[dict], model: str) -> str:
        """Return full completion (non-streaming)."""
        ...  # pragma: no cover


# ---------------------------------------------------------------------------
# Ollama Provider
# ---------------------------------------------------------------------------

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    async def stream_completion(
        self,
        messages: list[dict],
        model: str,
        on_token: Optional[Callable[[str], None]] = None
    ) -> AsyncGenerator[str, None]:
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json={"model": model, "messages": messages, "stream": True}
                ) as response:
                    token_count = 0
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    token = data["message"]["content"]
                                    token_count += 1
                                    if on_token:
                                        on_token(token)
                                    yield token
                                if "error" in data:
                                    log.error(f"Ollama error: {data['error']}")
                                    yield f"[Error: {data['error']}]"
                            except json.JSONDecodeError:
                                continue
                    if token_count == 0:
                        log.warning(f"Ollama model {model} returned no tokens")
        except httpx.ConnectError:
            log.error(f"Cannot connect to Ollama at {self.base_url}")
            yield f"[Connection failed to Ollama at {self.base_url}]"
        except httpx.TimeoutException:
            log.error(f"Ollama model {model} timed out")
            yield f"[Timeout: model {model}]"
        except Exception as e:
            log.error(f"Ollama stream error: {e}")
            yield f"[Error: {e}]"

    async def complete(self, messages: list[dict], model: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json={"model": model, "messages": messages, "stream": False}
                )
                resp.raise_for_status()
                return resp.json().get("message", {}).get("content", "")
        except Exception as e:
            log.error(f"Ollama complete error: {e}")
            return ""


# ---------------------------------------------------------------------------
# OpenAI Provider
# ---------------------------------------------------------------------------

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url  # None = use default OpenAI endpoint

    async def stream_completion(
        self,
        messages: list[dict],
        model: str,
        on_token: Optional[Callable[[str], None]] = None
    ) -> AsyncGenerator[str, None]:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(
                api_key=self.api_key,
                **({"base_url": self.base_url} if self.base_url else {})
            )
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    if on_token:
                        on_token(token)
                    yield token
        except Exception as e:
            log.error(f"OpenAI stream error: {e}")
            yield f"[OpenAI Error: {e}]"

    async def complete(self, messages: list[dict], model: str) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(
                api_key=self.api_key,
                **({"base_url": self.base_url} if self.base_url else {})
            )
            resp = await client.chat.completions.create(
                model=model, messages=messages, stream=False
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            log.error(f"OpenAI complete error: {e}")
            return ""


# ---------------------------------------------------------------------------
# Anthropic Provider
# ---------------------------------------------------------------------------

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def stream_completion(
        self,
        messages: list[dict],
        model: str,
        on_token: Optional[Callable[[str], None]] = None
    ) -> AsyncGenerator[str, None]:
        try:
            import anthropic
            # Separate system message from user/assistant turns
            system_msg = ""
            conv_messages = []
            for m in messages:
                if m["role"] == "system":
                    system_msg = m["content"]
                else:
                    conv_messages.append(m)

            client = anthropic.AsyncAnthropic(api_key=self.api_key)
            async with client.messages.stream(
                model=model,
                max_tokens=2048,
                system=system_msg,
                messages=conv_messages
            ) as stream:
                async for token in stream.text_stream:
                    if on_token:
                        on_token(token)
                    yield token
        except Exception as e:
            log.error(f"Anthropic stream error: {e}")
            yield f"[Anthropic Error: {e}]"

    async def complete(self, messages: list[dict], model: str) -> str:
        try:
            import anthropic
            system_msg = ""
            conv_messages = []
            for m in messages:
                if m["role"] == "system":
                    system_msg = m["content"]
                else:
                    conv_messages.append(m)

            client = anthropic.AsyncAnthropic(api_key=self.api_key)
            resp = await client.messages.create(
                model=model, max_tokens=2048,
                system=system_msg, messages=conv_messages
            )
            return resp.content[0].text if resp.content else ""
        except Exception as e:
            log.error(f"Anthropic complete error: {e}")
            return ""


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_provider(provider_name: str, settings) -> LLMProvider:
    """Return the appropriate LLMProvider based on the provider name and settings."""
    name = (provider_name or "ollama").lower()
    if name == "openai":
        if not settings.OPENAI_API_KEY:
            log.warning("OPENAI_API_KEY not set; falling back to Ollama")
            return OllamaProvider(settings.OLLAMA_BASE_URL)
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY)
    elif name == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            log.warning("ANTHROPIC_API_KEY not set; falling back to Ollama")
            return OllamaProvider(settings.OLLAMA_BASE_URL)
        return AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY)
    else:
        return OllamaProvider(settings.OLLAMA_BASE_URL)
