#!/usr/bin/env python3
"""Script to deploy language models to Ollama server on Raspberry Pi nodes.

This script deploys:
1. Phi-3-mini (3.8B) - Primary reasoning model
2. Gemma-2B - Efficient assessment processing
3. Qwen-2.5 (3B) - Intelligence and analytics
4. Custom CBC SLM - Fine-tuned on KICD curriculum documents

Usage:
    python scripts/deploy_models.py [--force] [--verify-only]
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from syncsenta_agents.inference.model_deployment import (
    ModelDeploymentManager,
    ModelRouter,
    ModelType
)
from syncsenta_agents.inference.ollama_client import OllamaClient
from syncsenta_agents.core.logging import AgentLogger
from syncsenta_agents.core.config import config


logger = AgentLogger("deploy_models_script")


async def deploy_models(force_redeploy: bool = False) -> bool:
    """Deploy all required models to Ollama server."""
    
    logger.info("=" * 60)
    logger.info("SyncSenta Model Deployment Script")
    logger.info("=" * 60)
    logger.info(f"Ollama Server: {config.ollama_base_url}")
    logger.info(f"Force Redeploy: {force_redeploy}")
    logger.info("=" * 60)
    
    # Initialize deployment manager
    deployment_manager = ModelDeploymentManager()
    
    try:
        # Initialize connection to Ollama
        logger.info("Initializing connection to Ollama server...")
        await deployment_manager.initialize()
        logger.info("✓ Connected to Ollama server")
        
        # Deploy all models
        logger.info("\nDeploying models...")
        deployment_results = await deployment_manager.deploy_all_models(
            force_redeploy=force_redeploy
        )
        
        # Print deployment results
        logger.info("\n" + "=" * 60)
        logger.info("Deployment Results:")
        logger.info("=" * 60)
        
        for model_type, success in deployment_results.items():
            status = "✓ SUCCESS" if success else "✗ FAILED"
            logger.info(f"{model_type:20s} {status}")
        
        # Verify model health
        logger.info("\n" + "=" * 60)
        logger.info("Verifying Model Health...")
        logger.info("=" * 60)
        
        health_results = await deployment_manager.verify_all_models()
        
        for model_name, healthy in health_results.items():
            status = "✓ HEALTHY" if healthy else "✗ UNHEALTHY"
            logger.info(f"{model_name:50s} {status}")
        
        # Get deployment status
        status = deployment_manager.get_deployment_status()
        
        logger.info("\n" + "=" * 60)
        logger.info("Deployment Summary:")
        logger.info("=" * 60)
        logger.info(f"Total Models:    {status['total_models']}")
        logger.info(f"Deployed:        {status['deployed_models']}")
        logger.info(f"Required:        {status['required_models']}")
        logger.info(f"Healthy:         {sum(1 for v in health_results.values() if v)}")
        
        # Print detailed model information
        logger.info("\n" + "=" * 60)
        logger.info("Model Details:")
        logger.info("=" * 60)
        
        for model_type, model_info in status['models'].items():
            logger.info(f"\n{model_type.upper()}:")
            logger.info(f"  Name:        {model_info['model_name']}")
            logger.info(f"  Description: {model_info['description']}")
            logger.info(f"  Parameters:  {model_info['parameters']}")
            logger.info(f"  Quantization: {model_info['quantization']}")
            logger.info(f"  Use Cases:   {', '.join(model_info['use_cases'])}")
            logger.info(f"  Deployed:    {'Yes' if model_info['deployed'] else 'No'}")
            logger.info(f"  Healthy:     {'Yes' if model_info['healthy'] else 'No'}")
            
            if model_info['deployed']:
                logger.info(f"  Size:        {model_info['size']}")
        
        # Check if all required models are healthy
        all_healthy = all(health_results.values())
        all_deployed = status['deployed_models'] == status['required_models']
        
        logger.info("\n" + "=" * 60)
        if all_deployed and all_healthy:
            logger.info("✓ All models deployed and healthy!")
            logger.info("=" * 60)
            return True
        else:
            logger.error("✗ Some models failed deployment or health check")
            logger.info("=" * 60)
            return False
            
    except Exception as e:
        logger.error(f"Deployment failed with error: {e}")
        return False
        
    finally:
        await deployment_manager.close()


async def verify_models_only() -> bool:
    """Verify health of already deployed models without deploying new ones."""
    
    logger.info("=" * 60)
    logger.info("SyncSenta Model Verification")
    logger.info("=" * 60)
    logger.info(f"Ollama Server: {config.ollama_base_url}")
    logger.info("=" * 60)
    
    deployment_manager = ModelDeploymentManager()
    
    try:
        # Initialize connection
        logger.info("Initializing connection to Ollama server...")
        await deployment_manager.initialize()
        logger.info("✓ Connected to Ollama server")
        
        # Get current status
        status = deployment_manager.get_deployment_status()
        
        logger.info("\n" + "=" * 60)
        logger.info("Current Deployment Status:")
        logger.info("=" * 60)
        logger.info(f"Total Models:    {status['total_models']}")
        logger.info(f"Deployed:        {status['deployed_models']}")
        logger.info(f"Required:        {status['required_models']}")
        
        # Verify health
        logger.info("\n" + "=" * 60)
        logger.info("Verifying Model Health...")
        logger.info("=" * 60)
        
        health_results = await deployment_manager.verify_all_models()
        
        for model_name, healthy in health_results.items():
            status_str = "✓ HEALTHY" if healthy else "✗ UNHEALTHY"
            logger.info(f"{model_name:50s} {status_str}")
        
        all_healthy = all(health_results.values())
        
        logger.info("\n" + "=" * 60)
        if all_healthy:
            logger.info("✓ All deployed models are healthy!")
        else:
            logger.error("✗ Some models are unhealthy")
        logger.info("=" * 60)
        
        return all_healthy
        
    except Exception as e:
        logger.error(f"Verification failed with error: {e}")
        return False
        
    finally:
        await deployment_manager.close()


async def test_model_routing() -> bool:
    """Test model routing for different agent types."""
    
    logger.info("\n" + "=" * 60)
    logger.info("Testing Model Routing...")
    logger.info("=" * 60)
    
    deployment_manager = ModelDeploymentManager()
    
    try:
        await deployment_manager.initialize()
        
        router = ModelRouter(deployment_manager)
        
        # Test routing for each agent type
        agent_types = [
            "socratic_tutor",
            "cbc_curriculum",
            "lesson_architect",
            "assessment",
            "intelligence",
            "career_pathways"
        ]
        
        logger.info("\nAgent Type Routing:")
        logger.info("-" * 60)
        
        for agent_type in agent_types:
            try:
                model = router.route_request(agent_type)
                logger.info(f"{agent_type:20s} → {model}")
            except Exception as e:
                logger.error(f"{agent_type:20s} → ERROR: {e}")
        
        # Test context-based routing
        logger.info("\nContext-Based Routing:")
        logger.info("-" * 60)
        
        test_contexts = [
            ("socratic_tutor", {"complexity": "high"}),
            ("assessment", {"curriculum_specific": True}),
            ("lesson_architect", {"task_type": "generate_worksheet"})
        ]
        
        for agent_type, context in test_contexts:
            try:
                model = router.route_request(agent_type, context)
                logger.info(f"{agent_type:20s} (context: {context}) → {model}")
            except Exception as e:
                logger.error(f"{agent_type:20s} → ERROR: {e}")
        
        logger.info("\n✓ Model routing test completed")
        return True
        
    except Exception as e:
        logger.error(f"Routing test failed: {e}")
        return False
        
    finally:
        await deployment_manager.close()


def main():
    """Main entry point for the deployment script."""
    
    parser = argparse.ArgumentParser(
        description="Deploy language models to Ollama server for SyncSenta AI Agents"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force redeployment of all models even if already deployed"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify health of deployed models without deploying new ones"
    )
    parser.add_argument(
        "--test-routing",
        action="store_true",
        help="Test model routing after deployment"
    )
    
    args = parser.parse_args()
    
    try:
        if args.verify_only:
            # Only verify existing models
            success = asyncio.run(verify_models_only())
        else:
            # Deploy models
            success = asyncio.run(deploy_models(force_redeploy=args.force))
            
            # Test routing if requested
            if success and args.test_routing:
                asyncio.run(test_model_routing())
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        logger.info("\nDeployment interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
