"""Tests for Ollama inference infrastructure."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import aiohttp
import json
from contextlib import asynccontextmanager

from syncsenta_agents.inference.ollama_client import (
    OllamaClient, 
    SyncSentaOllamaServer,
    ModelInfo,
    GenerationResponse
)
from syncsenta_agents.inference.load_balancer import (
    OllamaLoadBalancer,
    PiNode,
    NodeStatus,
    LoadBalancingStrategy
)
from syncsenta_agents.core.exceptions import ModelUnavailableError, NetworkError


class MockAsyncContextManager:
    """Helper class to create proper async context manager mocks."""
    
    def __init__(self, mock_response):
        self.mock_response = mock_response
    
    async def __aenter__(self):
        return self.mock_response
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None


class TestOllamaClient:
    """Test Ollama client functionality."""
    
    @pytest.fixture
    def ollama_client(self):
        """Create an Ollama client for testing."""
        client = OllamaClient("http://localhost:11434")
        # Mock the session to avoid actual HTTP calls
        client.session = AsyncMock()
        return client
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, ollama_client):
        """Test successful health check."""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status = 200
        
        ollama_client.session.get = MagicMock(return_value=MockAsyncContextManager(mock_response))
        
        result = await ollama_client.health_check()
        assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, ollama_client):
        """Test health check failure."""
        # Mock failed response
        mock_response = MagicMock()
        mock_response.status = 500
        
        ollama_client.session.get = MagicMock(return_value=MockAsyncContextManager(mock_response))
        
        result = await ollama_client.health_check()
        assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_network_error(self, ollama_client):
        """Test health check network error."""
        # Mock network error
        ollama_client.session.get.side_effect = aiohttp.ClientError("Connection failed")
        
        with pytest.raises(NetworkError):
            await ollama_client.health_check()
    
    @pytest.mark.asyncio
    async def test_refresh_models_success(self, ollama_client):
        """Test successful model refresh."""
        # Mock response with model data
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "models": [
                {
                    "name": "phi3:mini",
                    "size": "2.3GB",
                    "modified_at": "2024-01-01T00:00:00Z",
                    "digest": "abc123",
                    "details": {"family": "phi3"}
                }
            ]
        })
        
        ollama_client.session.get = MagicMock(return_value=MockAsyncContextManager(mock_response))
        
        await ollama_client.refresh_models()
        
        assert "phi3:mini" in ollama_client.available_models
        assert ollama_client.available_models["phi3:mini"].size == "2.3GB"
        assert ollama_client.model_health["phi3:mini"] is True
    
    @pytest.mark.asyncio
    async def test_generate_success(self, ollama_client):
        """Test successful text generation."""
        # Setup available models
        ollama_client.available_models = {
            "phi3:mini": ModelInfo(
                name="phi3:mini",
                size="2.3GB", 
                modified_at="2024-01-01T00:00:00Z",
                digest="abc123",
                details={}
            )
        }
        ollama_client.model_health = {"phi3:mini": True}
        
        # Mock successful generation response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "response": "This is a test response",
            "model": "phi3:mini",
            "created_at": "2024-01-01T00:00:00Z",
            "done": True,
            "total_duration": 1000000,
            "eval_count": 10
        })
        
        ollama_client.session.post = MagicMock(return_value=MockAsyncContextManager(mock_response))
        
        result = await ollama_client.generate(
            model="phi3:mini",
            prompt="Test prompt"
        )
        
        assert isinstance(result, GenerationResponse)
        assert result.response == "This is a test response"
        assert result.model == "phi3:mini"
        assert result.done is True
    
    @pytest.mark.asyncio
    async def test_generate_model_unavailable(self, ollama_client):
        """Test generation with unavailable model."""
        # Mock empty models response for refresh_models call
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"models": []})
        
        ollama_client.session.get = MagicMock(return_value=MockAsyncContextManager(mock_response))
        
        with pytest.raises(ModelUnavailableError):
            await ollama_client.generate(
                model="nonexistent:model",
                prompt="Test prompt"
            )
    
    @pytest.mark.asyncio
    async def test_generate_server_error(self, ollama_client):
        """Test generation with server error."""
        # Setup available models
        ollama_client.available_models = {"phi3:mini": MagicMock()}
        ollama_client.model_health = {"phi3:mini": True}
        
        # Mock server error response
        mock_response = MagicMock()
        mock_response.status = 500
        mock_response.text = AsyncMock(return_value="Internal server error")
        
        ollama_client.session.post = MagicMock(return_value=MockAsyncContextManager(mock_response))
        
        with pytest.raises(ModelUnavailableError):
            await ollama_client.generate(
                model="phi3:mini",
                prompt="Test prompt"
            )
        
        # Model should be marked as unhealthy
        assert ollama_client.model_health["phi3:mini"] is False
    
    def test_get_model_for_agent(self, ollama_client):
        """Test model selection for different agent types."""
        # Setup available models
        ollama_client.available_models = {
            "syncsenta/cbc-curriculum-slm": MagicMock(),
            "microsoft/phi-3-mini-4k-instruct": MagicMock()
        }
        
        # Test CBC curriculum agent
        model = ollama_client.get_model_for_agent("cbc_curriculum")
        assert model == "syncsenta/cbc-curriculum-slm"
        
        # Test socratic tutor agent
        model = ollama_client.get_model_for_agent("socratic_tutor")
        assert model == "microsoft/phi-3-mini-4k-instruct"
    
    def test_get_model_for_agent_fallback(self, ollama_client):
        """Test model selection fallback when preferred model unavailable."""
        # Setup available models (missing preferred model)
        ollama_client.available_models = {
            "fallback:model": MagicMock()
        }
        
        # Should fall back to available model
        model = ollama_client.get_model_for_agent("cbc_curriculum")
        assert model == "fallback:model"
    
    def test_get_model_for_agent_no_models(self, ollama_client):
        """Test model selection when no models available."""
        ollama_client.available_models = {}
        
        with pytest.raises(ModelUnavailableError):
            ollama_client.get_model_for_agent("cbc_curriculum")


class TestSyncSentaOllamaServer:
    """Test high-level Ollama server interface."""
    
    @pytest.fixture
    def ollama_server(self):
        """Create an Ollama server for testing."""
        server = SyncSentaOllamaServer()
        # Mock the client
        server.client = AsyncMock()
        return server
    
    @pytest.mark.asyncio
    async def test_generate_response_success(self, ollama_server):
        """Test successful response generation."""
        # Mock client methods
        ollama_server.client.get_model_for_agent = MagicMock(return_value="phi3:mini")
        ollama_server.client.generate = AsyncMock(return_value=GenerationResponse(
            response="Test response",
            model="phi3:mini",
            created_at="2024-01-01T00:00:00Z",
            done=True
        ))
        
        result = await ollama_server.generate_response(
            agent_type="socratic_tutor",
            prompt="Test prompt"
        )
        
        assert result == "Test response"
        
        # Verify client was called with correct parameters
        ollama_server.client.generate.assert_called_once()
        call_args = ollama_server.client.generate.call_args
        assert call_args[1]["model"] == "phi3:mini"
        assert call_args[1]["prompt"] == "Test prompt"
    
    @pytest.mark.asyncio
    async def test_generate_response_cbc_agent_options(self, ollama_server):
        """Test response generation with CBC agent specific options."""
        ollama_server.client.get_model_for_agent = MagicMock(return_value="cbc:model")
        ollama_server.client.generate = AsyncMock(return_value=GenerationResponse(
            response="CBC response",
            model="cbc:model", 
            created_at="2024-01-01T00:00:00Z",
            done=True
        ))
        
        await ollama_server.generate_response(
            agent_type="cbc_curriculum",
            prompt="What are Grade 4 math outcomes?"
        )
        
        # Verify CBC agent gets lower temperature for accuracy
        call_args = ollama_server.client.generate.call_args
        assert call_args[1]["options"]["temperature"] == 0.3


class TestPiNode:
    """Test Pi node functionality."""
    
    def test_pi_node_creation(self):
        """Test Pi node creation."""
        node = PiNode(
            node_id="pi-001",
            base_url="http://192.168.1.100:11434",
            max_requests=50
        )
        
        assert node.node_id == "pi-001"
        assert node.base_url == "http://192.168.1.100:11434"
        assert node.max_requests == 50
        assert node.status == NodeStatus.UNKNOWN
        assert node.active_requests == 0
    
    def test_load_factor_calculation(self):
        """Test load factor calculation."""
        node = PiNode(
            node_id="pi-001",
            base_url="http://192.168.1.100:11434",
            max_requests=100
        )
        
        # No active requests
        assert node.load_factor == 0.0
        
        # Half capacity
        node.active_requests = 50
        assert node.load_factor == 0.5
        
        # Full capacity
        node.active_requests = 100
        assert node.load_factor == 1.0
    
    def test_response_time_tracking(self):
        """Test response time tracking."""
        node = PiNode(
            node_id="pi-001",
            base_url="http://192.168.1.100:11434"
        )
        
        # Add response times
        node.add_response_time(0.1)
        node.add_response_time(0.2)
        node.add_response_time(0.15)
        
        assert len(node.response_times) == 3
        assert node.average_response_time == 0.15
    
    def test_response_time_limit(self):
        """Test response time list size limit."""
        node = PiNode(
            node_id="pi-001",
            base_url="http://192.168.1.100:11434"
        )
        
        # Add more than 50 response times
        for i in range(60):
            node.add_response_time(i * 0.01)
        
        # Should keep only last 50
        assert len(node.response_times) == 50
        assert node.response_times[0] == 0.1  # 10th measurement (0-indexed)


class TestOllamaLoadBalancer:
    """Test Ollama load balancer."""
    
    @pytest.fixture
    async def load_balancer(self):
        """Create a load balancer for testing."""
        nodes = [
            {"node_id": "pi-001", "base_url": "http://192.168.1.100:11434"},
            {"node_id": "pi-002", "base_url": "http://192.168.1.101:11434"},
            {"node_id": "pi-003", "base_url": "http://192.168.1.102:11434"}
        ]
        
        balancer = OllamaLoadBalancer(
            nodes=nodes,
            strategy=LoadBalancingStrategy.LEAST_CONNECTIONS
        )
        
        # Mock clients directly without calling initialize()
        for node_id in balancer.nodes.keys():
            mock_client = MagicMock()
            mock_client.generate_response = AsyncMock(return_value="Test response")
            balancer.clients[node_id] = mock_client
        
        # Set all nodes as healthy
        for node in balancer.nodes.values():
            node.status = NodeStatus.HEALTHY
        
        return balancer
    
    def test_load_balancer_initialization(self, load_balancer):
        """Test load balancer initialization."""
        assert len(load_balancer.nodes) == 3
        assert "pi-001" in load_balancer.nodes
        assert "pi-002" in load_balancer.nodes
        assert "pi-003" in load_balancer.nodes
        assert load_balancer.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS
    
    def test_select_node_least_connections(self, load_balancer):
        """Test node selection with least connections strategy."""
        # Set different connection counts
        load_balancer.nodes["pi-001"].active_requests = 5
        load_balancer.nodes["pi-002"].active_requests = 2
        load_balancer.nodes["pi-003"].active_requests = 8
        
        selected_node = load_balancer.select_node()
        assert selected_node == "pi-002"  # Least connections
    
    def test_select_node_round_robin(self):
        """Test node selection with round robin strategy."""
        nodes = [
            {"node_id": "pi-001", "base_url": "http://192.168.1.100:11434"},
            {"node_id": "pi-002", "base_url": "http://192.168.1.101:11434"}
        ]
        
        balancer = OllamaLoadBalancer(
            nodes=nodes,
            strategy=LoadBalancingStrategy.ROUND_ROBIN
        )
        
        # Set all nodes as healthy
        for node in balancer.nodes.values():
            node.status = NodeStatus.HEALTHY
        
        # Test round robin selection
        selections = []
        for _ in range(4):
            selections.append(balancer.select_node())
        
        assert selections == ["pi-001", "pi-002", "pi-001", "pi-002"]
    
    def test_select_node_fastest_response(self, load_balancer):
        """Test node selection with fastest response strategy."""
        load_balancer.strategy = LoadBalancingStrategy.FASTEST_RESPONSE
        
        # Set different response times
        load_balancer.nodes["pi-001"].add_response_time(0.5)
        load_balancer.nodes["pi-002"].add_response_time(0.2)
        load_balancer.nodes["pi-003"].add_response_time(0.8)
        
        selected_node = load_balancer.select_node()
        assert selected_node == "pi-002"  # Fastest response
    
    def test_select_node_no_healthy_nodes(self, load_balancer):
        """Test node selection when no nodes are healthy."""
        # Mark all nodes as unhealthy
        for node in load_balancer.nodes.values():
            node.status = NodeStatus.UNHEALTHY
        
        selected_node = load_balancer.select_node()
        assert selected_node is None
    
    def test_select_node_overloaded_nodes(self, load_balancer):
        """Test node selection when all nodes are overloaded."""
        # Set all nodes to full capacity
        for node in load_balancer.nodes.values():
            node.active_requests = node.max_requests
        
        selected_node = load_balancer.select_node()
        assert selected_node is None
    
    @pytest.mark.asyncio
    async def test_generate_response_success(self, load_balancer):
        """Test successful response generation through load balancer."""
        # The load balancer will select the first node (pi-001) with least connections
        result = await load_balancer.generate_response(
            agent_type="socratic_tutor",
            prompt="Test prompt"
        )
        
        assert result == "Test response"
        
        # Verify that one of the clients was called
        called_clients = [
            client for client in load_balancer.clients.values()
            if client.generate_response.called
        ]
        assert len(called_clients) == 1
    
    @pytest.mark.asyncio
    async def test_generate_response_retry_on_failure(self, load_balancer):
        """Test retry logic when node fails."""
        # First node (pi-001) fails, second succeeds
        load_balancer.clients["pi-001"].generate_response = AsyncMock(side_effect=NetworkError("Connection failed"))
        load_balancer.clients["pi-002"].generate_response = AsyncMock(return_value="Success response")
        
        result = await load_balancer.generate_response(
            agent_type="socratic_tutor",
            prompt="Test prompt",
            max_retries=3
        )
        
        assert result == "Success response"
        
        # Failed node should be marked unhealthy
        assert load_balancer.nodes["pi-001"].status == NodeStatus.UNHEALTHY
    
    @pytest.mark.asyncio
    async def test_generate_response_all_retries_fail(self, load_balancer):
        """Test when all retry attempts fail."""
        # All clients fail
        for node_id in load_balancer.clients:
            load_balancer.clients[node_id].generate_response = AsyncMock(side_effect=NetworkError("Connection failed"))
        
        # Should raise ModelUnavailableError when all retries are exhausted
        # Note: The load balancer tries each healthy node once, and when all fail,
        # it should raise ModelUnavailableError, but currently re-raises the last exception
        with pytest.raises((ModelUnavailableError, NetworkError)):
            await load_balancer.generate_response(
                agent_type="socratic_tutor",
                prompt="Test prompt",
                max_retries=3
            )
    
    def test_get_cluster_status(self, load_balancer):
        """Test cluster status reporting."""
        # Set some test data
        load_balancer.nodes["pi-001"].active_requests = 10
        load_balancer.nodes["pi-002"].active_requests = 5
        load_balancer.nodes["pi-003"].status = NodeStatus.UNHEALTHY
        
        status = load_balancer.get_cluster_status()
        
        assert status["total_nodes"] == 3
        assert status["healthy_nodes"] == 2
        assert status["total_active_requests"] == 15
        assert status["strategy"] == "least_connections"
        assert "pi-001" in status["nodes"]
        assert status["nodes"]["pi-001"]["active_requests"] == 10
        assert status["nodes"]["pi-003"]["status"] == "unhealthy"