from abc import ABC, abstractmethod

class BaseAIProvider(ABC):
    @abstractmethod
    async def enrich_finding(self, finding: dict) -> dict: ...

    @abstractmethod
    async def executive_summary(self, findings: list) -> str: ...

    @abstractmethod
    async def rewrite(self, text: str, tone: str) -> str: ...
