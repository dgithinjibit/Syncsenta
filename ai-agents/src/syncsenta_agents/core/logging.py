"""Structured logging configuration for SyncSenta AI Agents."""

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.stdlib import LoggerFactory


def configure_logging(debug: bool = False) -> None:
    """Configure structured logging for the application."""
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if not debug else structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.DEBUG if debug else logging.INFO,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


class AgentLogger:
    """Logger with agent-specific context."""
    
    def __init__(self, agent_name: str):
        self.logger = get_logger(agent_name)
        self.agent_name = agent_name
    
    def info(self, message: str, **kwargs: Any) -> None:
        """Log info message with agent context."""
        self.logger.info(message, agent=self.agent_name, **kwargs)
    
    def error(self, message: str, **kwargs: Any) -> None:
        """Log error message with agent context."""
        self.logger.error(message, agent=self.agent_name, **kwargs)
    
    def warning(self, message: str, **kwargs: Any) -> None:
        """Log warning message with agent context."""
        self.logger.warning(message, agent=self.agent_name, **kwargs)
    
    def debug(self, message: str, **kwargs: Any) -> None:
        """Log debug message with agent context."""
        self.logger.debug(message, agent=self.agent_name, **kwargs)
    
    def log_request(self, request_id: str, user_id: str, message: str) -> None:
        """Log incoming agent request."""
        self.info(
            "Agent request received",
            request_id=request_id,
            user_id=user_id,
            message_preview=message[:100] + "..." if len(message) > 100 else message
        )
    
    def log_response(self, request_id: str, response_time_ms: int, success: bool) -> None:
        """Log agent response."""
        self.info(
            "Agent response sent",
            request_id=request_id,
            response_time_ms=response_time_ms,
            success=success
        )
    
    def log_error(self, request_id: str, error: Exception) -> None:
        """Log agent error."""
        self.error(
            "Agent error occurred",
            request_id=request_id,
            error_type=type(error).__name__,
            error_message=str(error)
        )