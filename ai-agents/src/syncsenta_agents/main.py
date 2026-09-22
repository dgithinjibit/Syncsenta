"""Main entry point for SyncSenta AI Agents system."""

import asyncio
from typing import Dict, Any

from .core.config import config
from .core.logging import configure_logging, get_logger
from .core.models import AgentRequest
from .orchestrator.main import SyncSentaOrchestrator


async def main() -> None:
    """Main application entry point."""
    
    # Configure logging
    configure_logging(debug=config.debug)
    logger = get_logger("main")
    
    logger.info(
        "Starting SyncSenta AI Agents system",
        environment=config.environment,
        ollama_url=config.ollama_base_url,
        stellar_network=config.stellar_network
    )
    
    try:
        # Initialize orchestrator
        orchestrator = SyncSentaOrchestrator()
        await orchestrator.initialize()
        
        logger.info("SyncSenta AI Agents system initialized successfully")
        
        # Example usage
        test_request = AgentRequest(
            message="What are the Grade 4 Mathematics learning outcomes for fractions?",
            user_id="user1",
            grade="g4",
            subject="Mathematics",
            role="student",
        )

        logger.info("Processing test request", request=test_request.model_dump())
        response = await orchestrator.process_request(test_request)
        
        logger.info(
            "Test request completed",
            success=response.success,
            primary_agent=response.primary_agent,
            response_time_ms=response.response_time_ms
        )
        
        print(f"\n🤖 Agent Response:")
        print(f"Primary Agent: {response.primary_agent}")
        print(f"Response: {response.response}")
        print(f"Response Time: {response.response_time_ms}ms")
        
    except Exception as e:
        logger.error("Failed to start SyncSenta AI Agents system", error=str(e))
        raise


if __name__ == "__main__":
    asyncio.run(main())