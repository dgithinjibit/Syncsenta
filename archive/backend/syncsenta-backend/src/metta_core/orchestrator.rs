//! System Orchestrator - MeTTa-powered service coordination
//!
//! This module implements the system orchestrator that coordinates all services
//! and executes MeTTa reasoning decisions across the SyncSenta dApp.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::config::AppConfig;
use super::{ExecutionStep, ReasoningRequest, ReasoningResponse, SystemState};
use super::interpreter::MeTTaInterpreter;
use super::knowledge_base::EducationalKnowledgeBase;

/// System orchestrator for service coordination
pub struct SystemOrchestrator {
    /// MeTTa interpreter reference
    interpreter: Arc<MeTTaInterpreter>,
    /// Knowledge base reference
    knowledge_base: Arc<RwLock<EducationalKnowledgeBase>>,
    /// Service registry
    services: Arc<RwLock<ServiceRegistry>>,
    /// Execution engine
    execution_engine: Arc<ExecutionEngine>,
    /// Health monitor
    health_monitor: Arc<HealthMonitor>,
    /// Configuration
    config: AppConfig,
}

/// Registry of all system services
#[derive(Debug)]
pub struct ServiceRegistry {
    /// Registered services
    pub services: HashMap<String, ServiceInfo>,
    /// Service dependencies
    pub dependencies: HashMap<String, Vec<String>>,
    /// Service health status
    pub health_status: HashMap<String, ServiceHealth>,
}

/// Information about a registered service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub service_type: ServiceType,
    pub endpoint: String,
    pub capabilities: Vec<String>,
    pub load_capacity: u32,
    pub current_load: u32,
    pub version: String,
}

/// Types of services in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceType {
    Authentication,
    Curriculum,
    Assessment,
    Translation,
    Storage,
    Blockchain,
    Analytics,
    Communication,
    UserInterface,
    External,
}

/// Health status of a service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub status: HealthStatus,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub response_time_ms: u64,
    pub error_rate: f64,
    pub uptime_percentage: f64,
}

/// Service health status levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

/// Execution engine for MeTTa decisions
pub struct ExecutionEngine {
    /// Active execution contexts
    contexts: Arc<RwLock<HashMap<Uuid, ExecutionContext>>>,
    /// Execution history
    history: Arc<RwLock<Vec<ExecutionRecord>>>,
}

/// Context for executing a MeTTa decision
#[derive(Debug)]
pub struct ExecutionContext {
    pub id: Uuid,
    pub request_id: Uuid,
    pub steps: Vec<ExecutionStep>,
    pub current_step: usize,
    pub status: ExecutionStatus,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub results: HashMap<u32, ExecutionResult>,
}

/// Status of execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// Result of executing a step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub step_id: u32,
    pub status: ExecutionStatus,
    pub output: serde_json::Value,
    pub error: Option<String>,
    pub execution_time_ms: u64,
}

/// Record of completed execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub id: Uuid,
    pub request_id: Uuid,
    pub status: ExecutionStatus,
    pub total_steps: usize,
    pub completed_steps: usize,
    pub total_time_ms: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Health monitoring system
pub struct HealthMonitor {
    /// Health metrics
    metrics: Arc<RwLock<HashMap<String, HealthMetric>>>,
    /// Alert rules
    alert_rules: Vec<AlertRule>,
}

/// Health metric for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetric {
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub threshold_warning: Option<f64>,
    pub threshold_critical: Option<f64>,
}

/// Alert rule for health monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub name: String,
    pub metric: String,
    pub condition: AlertCondition,
    pub threshold: f64,
    pub severity: AlertSeverity,
    pub action: String,
}

/// Alert condition types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertCondition {
    GreaterThan,
    LessThan,
    Equals,
    NotEquals,
}

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

// ─── Implementation ───────────────────────────────────────────────────────────

impl SystemOrchestrator {
    /// Create new system orchestrator
    pub async fn new(
        interpreter: Arc<MeTTaInterpreter>,
        knowledge_base: Arc<RwLock<EducationalKnowledgeBase>>,
        config: &AppConfig,
    ) -> Result<Self> {
        let services = Arc::new(RwLock::new(ServiceRegistry::new()));
        let execution_engine = Arc::new(ExecutionEngine::new());
        let health_monitor = Arc::new(HealthMonitor::new());
        
        let orchestrator = SystemOrchestrator {
            interpreter,
            knowledge_base,
            services,
            execution_engine,
            health_monitor,
            config: config.clone(),
        };
        
        // Register core services
        orchestrator.register_core_services().await?;
        
        // Start health monitoring
        orchestrator.start_health_monitoring().await?;
        
        Ok(orchestrator)
    }
    
    /// Register core system services
    async fn register_core_services(&self) -> Result<()> {
        let mut registry = self.services.write().await;
        
        // Authentication service
        registry.register_service(ServiceInfo {
            name: "auth_service".to_string(),
            service_type: ServiceType::Authentication,
            endpoint: "/api/auth".to_string(),
            capabilities: vec!["login".to_string(), "logout".to_string(), "verify".to_string()],
            load_capacity: 1000,
            current_load: 0,
            version: "1.0.0".to_string(),
        });
        
        // Curriculum service
        registry.register_service(ServiceInfo {
            name: "curriculum_service".to_string(),
            service_type: ServiceType::Curriculum,
            endpoint: "/api/curriculum".to_string(),
            capabilities: vec!["validate".to_string(), "search".to_string(), "recommend".to_string()],
            load_capacity: 500,
            current_load: 0,
            version: "1.0.0".to_string(),
        });
        
        // Assessment service
        registry.register_service(ServiceInfo {
            name: "assessment_service".to_string(),
            service_type: ServiceType::Assessment,
            endpoint: "/api/assessments".to_string(),
            capabilities: vec!["grade".to_string(), "analyze".to_string(), "feedback".to_string()],
            load_capacity: 200,
            current_load: 0,
            version: "1.0.0".to_string(),
        });
        
        // Translation service
        registry.register_service(ServiceInfo {
            name: "translation_service".to_string(),
            service_type: ServiceType::Translation,
            endpoint: "/api/translate".to_string(),
            capabilities: vec!["translate".to_string(), "preserve_terms".to_string()],
            load_capacity: 300,
            current_load: 0,
            version: "1.0.0".to_string(),
        });
        
        // Storage service
        registry.register_service(ServiceInfo {
            name: "storage_service".to_string(),
            service_type: ServiceType::Storage,
            endpoint: "/api/storage".to_string(),
            capabilities: vec!["upload".to_string(), "download".to_string(), "delete".to_string()],
            load_capacity: 100,
            current_load: 0,
            version: "1.0.0".to_string(),
        });
        
        // Blockchain service
        registry.register_service(ServiceInfo {
            name: "blockchain_service".to_string(),
            service_type: ServiceType::Blockchain,
            endpoint: "/api/blockchain".to_string(),
            capabilities: vec!["mint".to_string(), "transfer".to_string(), "verify".to_string()],
            load_capacity: 50,
            current_load: 0,
            version: "1.0.0".to_string(),
        });
        
        Ok(())
    }
    
    /// Start health monitoring for all services
    async fn start_health_monitoring(&self) -> Result<()> {
        // Start background health check tasks
        let services = self.services.clone();
        let health_monitor = self.health_monitor.clone();
        
        tokio::spawn(async move {
            loop {
                if let Err(e) = Self::perform_health_checks(services.clone(), health_monitor.clone()).await {
                    tracing::error!("Health check failed: {}", e);
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
            }
        });
        
        Ok(())
    }
    
    /// Perform health checks on all services
    async fn perform_health_checks(
        services: Arc<RwLock<ServiceRegistry>>,
        health_monitor: Arc<HealthMonitor>,
    ) -> Result<()> {
        let registry = services.read().await;
        
        for (service_name, service_info) in &registry.services {
            // Simulate health check - in production, make actual HTTP requests
            let health = ServiceHealth {
                status: HealthStatus::Healthy,
                last_check: chrono::Utc::now(),
                response_time_ms: 50,
                error_rate: 0.01,
                uptime_percentage: 99.9,
            };
            
            // Update health metrics
            let mut metrics = health_monitor.metrics.write().await;
            metrics.insert(format!("{}_response_time", service_name), HealthMetric {
                name: format!("{}_response_time", service_name),
                value: health.response_time_ms as f64,
                unit: "ms".to_string(),
                timestamp: chrono::Utc::now(),
                threshold_warning: Some(100.0),
                threshold_critical: Some(500.0),
            });
        }
        
        Ok(())
    }
    
    /// Execute MeTTa decision plan
    pub async fn execute_plan(&self, steps: Vec<ExecutionStep>) -> Result<()> {
        let execution_id = Uuid::new_v4();
        let request_id = Uuid::new_v4(); // In practice, this would come from the request
        
        // Create execution context
        let context = ExecutionContext {
            id: execution_id,
            request_id,
            steps: steps.clone(),
            current_step: 0,
            status: ExecutionStatus::Pending,
            started_at: chrono::Utc::now(),
            completed_at: None,
            results: HashMap::new(),
        };
        
        // Store context
        {
            let mut contexts = self.execution_engine.contexts.write().await;
            contexts.insert(execution_id, context);
        }
        
        // Execute steps
        self.execution_engine.execute_steps(execution_id, steps).await?;
        
        Ok(())
    }
    
    /// Get current system state
    pub async fn get_system_state(&self) -> Result<SystemState> {
        let registry = self.services.read().await;
        let metrics = self.health_monitor.metrics.read().await;
        
        // Calculate system metrics
        let total_services = registry.services.len() as u32;
        let healthy_services = registry.health_status.values()
            .filter(|h| matches!(h.status, HealthStatus::Healthy))
            .count() as u32;
        
        let database_health = metrics.get("database_response_time")
            .map(|m| if m.value < 100.0 { 1.0 } else { 0.5 })
            .unwrap_or(0.8);
        
        let cache_hit_rate = metrics.get("cache_hit_rate")
            .map(|m| m.value / 100.0)
            .unwrap_or(0.85);
        
        Ok(SystemState {
            load_level: 0.3, // Simplified calculation
            active_users: 150, // Would come from session store
            blockchain_sync_status: true,
            ipfs_connectivity: true,
            database_health,
            cache_hit_rate,
        })
    }
    
    /// Get active service count
    pub async fn active_service_count(&self) -> usize {
        let registry = self.services.read().await;
        registry.services.len()
    }
    
    /// Reason about system health
    pub async fn reason_system_health(&self, request: ReasoningRequest) -> Result<ReasoningResponse> {
        // Delegate to MeTTa interpreter for system health reasoning
        self.interpreter.reason_analytics(request).await
    }
}

impl ServiceRegistry {
    /// Create new service registry
    pub fn new() -> Self {
        ServiceRegistry {
            services: HashMap::new(),
            dependencies: HashMap::new(),
            health_status: HashMap::new(),
        }
    }
    
    /// Register a new service
    pub fn register_service(&mut self, service: ServiceInfo) {
        let service_name = service.name.clone();
        
        // Initialize health status
        self.health_status.insert(service_name.clone(), ServiceHealth {
            status: HealthStatus::Unknown,
            last_check: chrono::Utc::now(),
            response_time_ms: 0,
            error_rate: 0.0,
            uptime_percentage: 0.0,
        });
        
        // Register service
        self.services.insert(service_name, service);
    }
    
    /// Get service by name
    pub fn get_service(&self, name: &str) -> Option<&ServiceInfo> {
        self.services.get(name)
    }
    
    /// Update service health
    pub fn update_health(&mut self, service_name: &str, health: ServiceHealth) {
        self.health_status.insert(service_name.to_string(), health);
    }
}

impl ExecutionEngine {
    /// Create new execution engine
    pub fn new() -> Self {
        ExecutionEngine {
            contexts: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    /// Execute steps for a given execution context
    pub async fn execute_steps(&self, execution_id: Uuid, steps: Vec<ExecutionStep>) -> Result<()> {
        // Update context status
        {
            let mut contexts = self.contexts.write().await;
            if let Some(context) = contexts.get_mut(&execution_id) {
                context.status = ExecutionStatus::Running;
            }
        }
        
        // Execute each step
        for (index, step) in steps.iter().enumerate() {
            let result = self.execute_step(step).await?;
            
            // Update context with result
            {
                let mut contexts = self.contexts.write().await;
                if let Some(context) = contexts.get_mut(&execution_id) {
                    context.results.insert(step.step_id, result);
                    context.current_step = index + 1;
                }
            }
        }
        
        // Mark as completed
        {
            let mut contexts = self.contexts.write().await;
            if let Some(context) = contexts.get_mut(&execution_id) {
                context.status = ExecutionStatus::Completed;
                context.completed_at = Some(chrono::Utc::now());
            }
        }
        
        Ok(())
    }
    
    /// Execute a single step
    async fn execute_step(&self, step: &ExecutionStep) -> Result<ExecutionResult> {
        let start_time = std::time::Instant::now();
        
        // Simulate step execution based on action
        let output = match step.action.as_str() {
            "grant_access" => serde_json::json!({"access_granted": true}),
            "approve_content" => serde_json::json!({"content_approved": true}),
            "auto_grade" => serde_json::json!({"score": 85, "feedback": "Good work"}),
            "translate_with_preservation" => serde_json::json!({"translated_text": "Translated content"}),
            "store_on_ipfs" => serde_json::json!({"ipfs_cid": "QmExample123"}),
            _ => serde_json::json!({"status": "executed"}),
        };
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        Ok(ExecutionResult {
            step_id: step.step_id,
            status: ExecutionStatus::Completed,
            output,
            error: None,
            execution_time_ms: execution_time,
        })
    }
}

impl HealthMonitor {
    /// Create new health monitor
    pub fn new() -> Self {
        HealthMonitor {
            metrics: Arc::new(RwLock::new(HashMap::new())),
            alert_rules: vec![
                AlertRule {
                    name: "High Response Time".to_string(),
                    metric: "response_time".to_string(),
                    condition: AlertCondition::GreaterThan,
                    threshold: 500.0,
                    severity: AlertSeverity::Warning,
                    action: "notify_admin".to_string(),
                },
                AlertRule {
                    name: "High Error Rate".to_string(),
                    metric: "error_rate".to_string(),
                    condition: AlertCondition::GreaterThan,
                    threshold: 0.05,
                    severity: AlertSeverity::Error,
                    action: "scale_service".to_string(),
                },
            ],
        }
    }
    
    /// Add health metric
    pub async fn add_metric(&self, metric: HealthMetric) {
        let mut metrics = self.metrics.write().await;
        metrics.insert(metric.name.clone(), metric);
    }
    
    /// Get metric by name
    pub async fn get_metric(&self, name: &str) -> Option<HealthMetric> {
        let metrics = self.metrics.read().await;
        metrics.get(name).cloned()
    }
}