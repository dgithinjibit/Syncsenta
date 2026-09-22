"""Agent registry - placeholder for now."""

from typing import Dict, Any


class AgentRegistry:
    """Registry for managing SyncSenta AI agents."""
    
    def __init__(self):
        self.agents = {}
    
    def register_agent(self, name: str, agent: Any) -> None:
        """Register an agent."""
        self.agents[name] = agent
    
    def get_agent(self, name: str) -> Any:
        """Get an agent by name."""
        return self.agents.get(name)