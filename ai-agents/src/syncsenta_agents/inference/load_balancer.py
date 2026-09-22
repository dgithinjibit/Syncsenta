"""Load balancer for Ollama servers across multiple Raspberry Pi nodes."""

import asyncio
import random
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

from .ollama_client import OllamaClient, SyncSentaOllamaServer
from ..core.logging import AgentLogger
from ..core.exceptions import ModelUnavailableError, NetworkError


class NodeStatus(Enum):
    """Status of a Pi node."""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class PiNode:
    """Represents a Raspberry Pi node running Ollama."""
    node_id: str
    base_url: str
    status: NodeStatus = NodeStatus.UNKNOWN
    last_health_check: float = 0.0
    response_times: List[float] = field(default_factory=list)
    active_requests: int = 0
    max_requests: int = 100  # Per node limit
    
    @property
    def average_response_time(self) -> float:
        """Calculate average response time."""
        if not self.response_times:
            return 0.0
        return sum(self.response_times[-10:]) / len(self.response_times[-10:])  # Last 10
    
    @property
    def load_factor(self) -> float:
        """Calculate current load factor (0.0 to 1.0)."""
        return self.active_requests / self.max_requests
    
    def add_response_time(self, response_time: float) -> None:
        """Add a response time measurement."""
        self.response_times.append(response_time)
        # Keep only last 50 measurements
        if len(self.response_times) > 50:
            self.response_times = self.response_times[-50:]


class LoadBalancingStrategy(Enum):
    """Load balancing strategies."""
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    FASTEST_RESPONSE = "fastest_response"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"


class OllamaLoadBalancer:
    """Load balancer for distributing requests across multiple Pi nodes."""
    
    def __init__(
        self,
        nodes: List[Dict[str, str]] = None,
        strategy: LoadBalancingStrategy = LoadBalancingStrategy.LEAST_CONNECTIONS,
        health_check_interval: int = 30
    ):
        self.logger = AgentLogger("ollama_load_balancer")
        self.strategy = strategy
        self.health_check_interval = health_check_interval
        
        # Initialize nodes
        self.nodes: Dict[str, PiNode] = {}
        if nodes:
            for node_config in nodes:
                node = PiNode(
                    node_id=node_config["node_id"],
                    base_url=node_config["base_url"],
                    max_requests=node_config.get("max_requests", 100)
                )
                self.nodes[node.node_id] = node
        
        # Ollama clients for each node
        self.clients: Dict[str, SyncSentaOllamaServer] = {}
        
        # Round robin counter
        self.round_robin_counter = 0
        
        # Health check task
        self.health_check_task: Optional[asyncio.Task] = None
        
        self.logger.info(
            "Load balancer initialized",
            node_count=len(self.nodes),
            strategy=strategy.value
        )
    
    async def initialize(self) -> None:
        """Initialize the load balancer and all node clients."""
        
        # Initialize clients for each node
        for node_id, node in self.nodes.items():
            try:
                client = SyncSentaOllamaServer()
                client.client.base_url = node.base_url
                await client.initialize()
                
                self.clients[node_id] = client
                node.status = NodeStatus.HEALTHY
                
                self.logger.info(f"Node {node_id} initialized successfully")
                
            except Exception as e:
                self.logger.error(
                    f"Failed to initialize node {node_id}",
                    error=str(e)
                )
                node.status = NodeStatus.UNHEALTHY
        
        # Start health check task
        self.health_check_task = asyncio.create_task(self.health_check_loop())
        
        healthy_nodes = [n for n in self.nodes.values() if n.status == NodeStatus.HEALTHY]
        self.logger.info(
            "Load balancer initialization complete",
            healthy_nodes=len(healthy_nodes),
            total_nodes=len(self.nodes)
        )
    
    async def close(self) -> None:
        """Close the load balancer and all clients."""
        
        # Cancel health check task
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        
        # Close all clients
        for client in self.clients.values():
            await client.close()
        
        self.logger.info("Load balancer closed")
    
    async def health_check_loop(self) -> None:
        """Continuous health checking of all nodes."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self.check_all_nodes_health()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error("Error in health check loop", error=str(e))
    
    async def check_all_nodes_health(self) -> None:
        """Check health of all nodes."""
        health_tasks = []
        
        for node_id in self.nodes.keys():
            task = asyncio.create_task(self.check_node_health(node_id))
            health_tasks.append(task)
        
        await asyncio.gather(*health_tasks, return_exceptions=True)
        
        healthy_count = sum(
            1 for node in self.nodes.values() 
            if node.status == NodeStatus.HEALTHY
        )
        
        self.logger.debug(
            "Health check completed",
            healthy_nodes=healthy_count,
            total_nodes=len(self.nodes)
        )
    
    async def check_node_health(self, node_id: str) -> None:
        """Check health of a specific node."""
        node = self.nodes[node_id]
        client = self.clients.get(node_id)
        
        if not client:
            node.status = NodeStatus.UNHEALTHY
            return
        
        try:
            start_time = time.time()
            
            # Simple health check - try to get available models
            await client.client.health_check()
            
            response_time = time.time() - start_time
            node.add_response_time(response_time)
            node.status = NodeStatus.HEALTHY
            node.last_health_check = time.time()
            
        except Exception as e:
            self.logger.warning(
                f"Node {node_id} health check failed",
                error=str(e)
            )
            node.status = NodeStatus.UNHEALTHY
    
    def select_node(self) -> Optional[str]:
        """Select the best node based on the load balancing strategy."""
        
        # Filter healthy nodes
        healthy_nodes = [
            (node_id, node) for node_id, node in self.nodes.items()
            if node.status == NodeStatus.HEALTHY and node.load_factor < 1.0
        ]
        
        if not healthy_nodes:
            self.logger.error("No healthy nodes available")
            return None
        
        if self.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            return self._select_round_robin(healthy_nodes)
        elif self.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            return self._select_least_connections(healthy_nodes)
        elif self.strategy == LoadBalancingStrategy.FASTEST_RESPONSE:
            return self._select_fastest_response(healthy_nodes)
        elif self.strategy == LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
            return self._select_weighted_round_robin(healthy_nodes)
        else:
            # Default to least connections
            return self._select_least_connections(healthy_nodes)
    
    def _select_round_robin(self, healthy_nodes: List[tuple]) -> str:
        """Round robin selection."""
        if not healthy_nodes:
            return None
        
        selected_index = self.round_robin_counter % len(healthy_nodes)
        self.round_robin_counter += 1
        
        return healthy_nodes[selected_index][0]
    
    def _select_least_connections(self, healthy_nodes: List[tuple]) -> str:
        """Select node with least active connections."""
        return min(healthy_nodes, key=lambda x: x[1].active_requests)[0]
    
    def _select_fastest_response(self, healthy_nodes: List[tuple]) -> str:
        """Select node with fastest average response time."""
        return min(healthy_nodes, key=lambda x: x[1].average_response_time)[0]
    
    def _select_weighted_round_robin(self, healthy_nodes: List[tuple]) -> str:
        """Weighted round robin based on node capacity and performance."""
        # Calculate weights based on inverse load factor and response time
        weights = []
        for node_id, node in healthy_nodes:
            # Higher weight for lower load and faster response
            load_weight = 1.0 - node.load_factor
            response_weight = 1.0 / (node.average_response_time + 0.001)  # Avoid division by zero
            combined_weight = load_weight * response_weight
            weights.append(combined_weight)
        
        # Weighted random selection
        total_weight = sum(weights)
        if total_weight == 0:
            return healthy_nodes[0][0]  # Fallback to first node
        
        random_value = random.uniform(0, total_weight)
        cumulative_weight = 0
        
        for i, weight in enumerate(weights):
            cumulative_weight += weight
            if random_value <= cumulative_weight:
                return healthy_nodes[i][0]
        
        return healthy_nodes[-1][0]  # Fallback to last node
    
    async def generate_response(
        self,
        agent_type: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
        max_retries: int = 3
    ) -> str:
        """Generate response using load balancing across nodes."""
        
        for attempt in range(max_retries):
            node_id = self.select_node()
            
            if not node_id:
                if attempt == max_retries - 1:
                    raise ModelUnavailableError("No healthy nodes available")
                await asyncio.sleep(1)  # Wait before retry
                continue
            
            node = self.nodes[node_id]
            client = self.clients[node_id]
            
            # Increment active requests
            node.active_requests += 1
            
            try:
                start_time = time.time()
                
                response = await client.generate_response(
                    agent_type=agent_type,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    options=options
                )
                
                # Record successful response time
                response_time = time.time() - start_time
                node.add_response_time(response_time)
                
                self.logger.debug(
                    "Request completed successfully",
                    node_id=node_id,
                    agent_type=agent_type,
                    response_time_ms=int(response_time * 1000)
                )
                
                return response
                
            except Exception as e:
                self.logger.warning(
                    f"Request failed on node {node_id}",
                    agent_type=agent_type,
                    attempt=attempt + 1,
                    error=str(e)
                )
                
                # Mark node as potentially unhealthy
                if isinstance(e, (ModelUnavailableError, NetworkError)):
                    node.status = NodeStatus.UNHEALTHY
                
                if attempt == max_retries - 1:
                    raise
                
            finally:
                # Decrement active requests
                node.active_requests = max(0, node.active_requests - 1)
        
        raise ModelUnavailableError("All retry attempts failed")
    
    def get_cluster_status(self) -> Dict[str, Any]:
        """Get status of the entire cluster."""
        total_nodes = len(self.nodes)
        healthy_nodes = sum(
            1 for node in self.nodes.values() 
            if node.status == NodeStatus.HEALTHY
        )
        
        total_active_requests = sum(
            node.active_requests for node in self.nodes.values()
        )
        
        average_load = (
            sum(node.load_factor for node in self.nodes.values()) / total_nodes
            if total_nodes > 0 else 0
        )
        
        node_details = {}
        for node_id, node in self.nodes.items():
            node_details[node_id] = {
                "status": node.status.value,
                "base_url": node.base_url,
                "active_requests": node.active_requests,
                "load_factor": node.load_factor,
                "average_response_time": node.average_response_time,
                "last_health_check": node.last_health_check
            }
        
        return {
            "total_nodes": total_nodes,
            "healthy_nodes": healthy_nodes,
            "total_active_requests": total_active_requests,
            "average_load": average_load,
            "strategy": self.strategy.value,
            "nodes": node_details
        }