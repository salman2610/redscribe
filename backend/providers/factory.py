from providers.base import BaseAIProvider

def get_provider(name: str = None) -> BaseAIProvider:
    import os
    provider = name or os.getenv("DEFAULT_AI_PROVIDER", "gemini")

    if provider == "gemini":
        from providers.gemini import GeminiProvider
        return GeminiProvider()
    elif provider == "groq":
        from providers.groq import GroqProvider
        return GroqProvider()
    elif provider == "anthropic":
        from providers.anthropic import AnthropicProvider
        return AnthropicProvider()
    elif provider == "openai":
        from providers.openai import OpenAIProvider
        return OpenAIProvider()
    elif provider == "ollama":
        from providers.ollama import OllamaProvider
        return OllamaProvider()
    else:
        raise ValueError(f"Unknown AI provider: {provider}")
