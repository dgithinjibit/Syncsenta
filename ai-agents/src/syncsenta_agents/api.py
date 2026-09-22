"""FastAPI application for SyncSenta AI Agents service."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import asyncio

from .core.config import config
from .core.logging import configure_logging, get_logger
from .orchestrator.main import SyncSentaOrchestrator

# Configure logging
configure_logging(debug=config.debug)
logger = get_logger("api")

# Create FastAPI app
app = FastAPI(
    title="SyncSenta AI Agents API",
    description="Multi-agent AI system for educational support",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance
orchestrator: Optional[SyncSentaOrchestrator] = None


class AgentRequest(BaseModel):
    """Request model for agent processing."""
    message: str
    context: Dict[str, Any]


class AgentResponse(BaseModel):
    """Response model from agent processing."""
    success: bool
    response: str
    primary_agent: str
    response_time_ms: float
    metadata: Optional[Dict[str, Any]] = None


@app.on_event("startup")
async def startup_event():
    """Initialize the orchestrator on startup."""
    global orchestrator
    logger.info("Initializing SyncSenta AI Agents system")
    
    try:
        orchestrator = SyncSentaOrchestrator()
        await orchestrator.initialize()
        logger.info("SyncSenta AI Agents system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize orchestrator: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down SyncSenta AI Agents system")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "syncsenta-ai-agents",
        "version": "1.0.0"
    }


@app.post("/api/agents/process", response_model=AgentResponse)
async def process_agent_request(request: AgentRequest):
    """
    Process a request through the multi-agent system.
    
    Args:
        request: AgentRequest with message and context
        
    Returns:
        AgentResponse with agent's response and metadata
    """
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        logger.info(f"Processing request: {request.message[:50]}...")
        
        response = await orchestrator.process_request({
            "message": request.message,
            "context": request.context
        })
        
        return AgentResponse(
            success=response.success,
            response=response.response,
            primary_agent=response.primary_agent,
            response_time_ms=response.response_time_ms,
            metadata=response.metadata if hasattr(response, 'metadata') else None
        )
        
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agents/status")
async def get_agents_status():
    """Get status of all agents in the system."""
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    return {
        "status": "operational",
        "agents": [
            "emotional_intelligence",
            "tutoring",
            "assessment",
            "translation",
            "analytics",
            "content",
            "teacher_orchestrator"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
