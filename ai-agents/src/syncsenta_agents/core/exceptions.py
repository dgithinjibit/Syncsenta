"""Custom exceptions for SyncSenta AI Agents."""


class SyncSentaAgentError(Exception):
    """Base exception for SyncSenta AI Agents."""
    pass


class AgentError(SyncSentaAgentError):
    """General agent error."""
    pass


class OrchestratorError(SyncSentaAgentError):
    """Orchestrator-specific error."""
    pass


class CircuitBreakerError(SyncSentaAgentError):
    """Raised when circuit breaker is open."""
    pass


class AgentTimeoutError(SyncSentaAgentError):
    """Raised when an agent operation times out."""
    pass


class AgentFailureError(SyncSentaAgentError):
    """Raised when an agent fails to process a request."""
    pass


class ModelUnavailableError(SyncSentaAgentError):
    """Raised when an Ollama model is unavailable."""
    pass


class NetworkError(SyncSentaAgentError):
    """Raised when network operations fail."""
    pass


class StellarTransactionError(SyncSentaAgentError):
    """Raised when Stellar blockchain transactions fail."""
    
    def __init__(self, message: str, error_code: str = None):
        super().__init__(message)
        self.error_code = error_code


class CurriculumValidationError(SyncSentaAgentError):
    """Raised when content fails CBC curriculum validation."""
    pass


class DataSyncError(SyncSentaAgentError):
    """Raised when offline data synchronization fails."""
    pass


class VoiceProcessingError(SyncSentaAgentError):
    """Raised when voice/multimodal processing fails."""
    pass


class ConfigurationError(SyncSentaAgentError):
    """Raised when system configuration is invalid."""
    pass