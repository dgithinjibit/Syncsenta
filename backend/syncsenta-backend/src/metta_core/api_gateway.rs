//! API Gateway - MeTTa-powered request routing and control
//!
//! This module implements the MeTTa-controlled API gateway that handles
//! all incoming requests with intelligent routing, rate limiting, and access control.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::config::AppConfig;
use super::{ReasoningRequest, ReasoningResponse, Decision};
use super::interpreter::MeTTaInterpreter;

/// MeTTa-powered API gateway
pub struct MeTTaGateway {
    /// MeTTa interpreter for routing decisions
    interpreter: Arc<MeTTaInterpreter>,
    /// Route registry
    routes: Arc<RwLock<RouteRegistry>>,
    /// Rate limiter
    rate_limiter: Arc<RwLock<RateLimiter>>,
    /// Access control
    access_control: Arc<AccessController>,
    /// Configuration
    config: AppConfig,
}

/// Registry of API routes
#[derive(Debug)]
pub struct RouteRegistry {
    /// Registered routes
    pub routes: HashMap<String, RouteInfo>,
    /// Route patterns
    pub patterns: Vec<RoutePattern>,
}

/// Information about an API route
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteInfo {
    pub path: String,
    pub method: String,
    pub service: String,
    pub handler: String,
    pub auth_required: bool,
    pub rate_limit: Option<RateLimit>,
    pub permissions: Vec<String>,
}

/// Route pattern for dynamic routing
#[derive(Debug, Clone)]
pub struct RoutePattern {
    pub pattern: String,
    pub service: String,
    pub priority: u8,
}

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimit {
    pub requests_per_minute: u32,
    pub burst_size: u32,
    pub window_size_seconds: u64,
}

/// Rate limiter implementation
#[derive(Debug)]
pub struct RateLimiter {
    /// Rate limit buckets by client ID
    pub buckets: HashMap<String, RateLimitBucket>,
    /// Global rate limits
    pub global_limits: HashMap<String, RateLimit>,
}

/// Rate limit bucket for a client
#[derive(Debug, Clone)]
pub struct RateLimitBucket {
    pub client_id: String,
    pub tokens: u32,
    pub last_refill: chrono::DateTime<chrono::Utc>,
    pub requests_in_window: u32,
    pub window_start: chrono::DateTime<chrono::Utc>,
}

/// Access control system
pub struct AccessController {
    /// Permission rules
    rules: HashMap<String, AccessRule>,
    /// Role definitions
    roles: HashMap<String, Role>,
}

/// Access control rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessRule {
    pub resource: String,
    pub action: String,
    pub required_permissions: Vec<String>,
    pub required_roles: Vec<String>,
    pub conditions: Vec<AccessCondition>,
}

/// Access condition for fine-grained control
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessCondition {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

/// Role definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub name: String,
    pub permissions: Vec<String>,
    pub inherits_from: Vec<String>,
}

/// Gateway request for processing
#[derive(Debug, Clone)]
pub struct GatewayRequest {
    pub id: Uuid,
    pub path: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub query_params: HashMap<String, String>,
    pub body: Option<serde_json::Value>,
    pub client_ip: String,
    pub user_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Gateway response
#[derive(Debug, Clone)]
pub struct GatewayResponse {
    pub request_id: Uuid,
    pub status_code: u16,
    pub headers: HashMap<String, String>,
    pub body: Option<serde_json::Value>,
    pub processing_time_ms: u64,
}

impl MeTTaGateway {
    /// Create new MeTTa gateway
    pub async fn new(
        interpreter: Arc<MeTTaInterpreter>,
        config: &AppConfig,
    ) -> Result<Self> {
        let routes = Arc::new(RwLock::new(RouteRegistry::new()));
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new()));
        let access_control = Arc::new(AccessController::new());
        
        let gateway = MeTTaGateway {
            interpreter,
            routes,
            rate_limiter,
            access_control,
            config: config.clone(),
        };
        
        // Register default routes
        gateway.register_default_routes().await?;
        
        Ok(gateway)
    }
    
    /// Register default API routes
    async fn register_default_routes(&self) -> Result<()> {
        let mut registry = self.routes.write().await;
        
        // Authentication routes
        registry.register_route(RouteInfo {
            path: "/api/auth/login".to_string(),
            method: "POST".to_string(),
            service: "auth_service".to_string(),
            handler: "login".to_string(),
            auth_required: false,
            rate_limit: Some(RateLimit {
                requests_per_minute: 10,
                burst_size: 5,
                window_size_seconds: 60,
            }),
            permissions: vec![],
        });
        
        // Curriculum routes
        registry.register_route(RouteInfo {
            path: "/api/curriculum/*".to_string(),
            method: "GET".to_string(),
            service: "curriculum_service".to_string(),
            handler: "get_curriculum".to_string(),
            auth_required: true,
            rate_limit: Some(RateLimit {
                requests_per_minute: 100,
                burst_size: 20,
                window_size_seconds: 60,
            }),
            permissions: vec!["curriculum:read".to_string()],
        });
        
        // Assessment routes
        registry.register_route(RouteInfo {
            path: "/api/assessments/*".to_string(),
            method: "POST".to_string(),
            service: "assessment_service".to_string(),
            handler: "submit_assessment".to_string(),
            auth_required: true,
            rate_limit: Some(RateLimit {
                requests_per_minute: 50,
                burst_size: 10,
                window_size_seconds: 60,
            }),
            permissions: vec!["assessment:submit".to_string()],
        });
        
        // Translation routes
        registry.register_route(RouteInfo {
            path: "/api/translate".to_string(),
            method: "POST".to_string(),
            service: "translation_service".to_string(),
            handler: "translate".to_string(),
            auth_required: true,
            rate_limit: Some(RateLimit {
                requests_per_minute: 200,
                burst_size: 50,
                window_size_seconds: 60,
            }),
            permissions: vec!["translation:use".to_string()],
        });
        
        Ok(())
    }
    
    /// Process incoming gateway request
    pub async fn process_request(&self, request: GatewayRequest) -> Result<GatewayResponse> {
        let start_time = std::time::Instant::now();
        
        // 1. Route matching
        let route = self.match_route(&request).await?;
        
        // 2. Rate limiting
        if let Some(rate_limit) = &route.rate_limit {
            if !self.check_rate_limit(&request, rate_limit).await? {
                return Ok(GatewayResponse {
                    request_id: request.id,
                    status_code: 429,
                    headers: HashMap::from([
                        ("Content-Type".to_string(), "application/json".to_string()),
                    ]),
                    body: Some(serde_json::json!({"error": "Rate limit exceeded"})),
                    processing_time_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }
        
        // 3. Authentication check
        if route.auth_required && request.user_id.is_none() {
            return Ok(GatewayResponse {
                request_id: request.id,
                status_code: 401,
                headers: HashMap::from([
                    ("Content-Type".to_string(), "application/json".to_string()),
                ]),
                body: Some(serde_json::json!({"error": "Authentication required"})),
                processing_time_ms: start_time.elapsed().as_millis() as u64,
            });
        }
        
        // 4. Authorization check
        if !route.permissions.is_empty() {
            if !self.check_permissions(&request, &route.permissions).await? {
                return Ok(GatewayResponse {
                    request_id: request.id,
                    status_code: 403,
                    headers: HashMap::from([
                        ("Content-Type".to_string(), "application/json".to_string()),
                    ]),
                    body: Some(serde_json::json!({"error": "Insufficient permissions"})),
                    processing_time_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }
        
        // 5. MeTTa reasoning for request handling
        let reasoning_request = ReasoningRequest {
            id: request.id,
            operation: format!("{}:{}", request.method, request.path),
            context: super::ReasoningContext {
                domain: self.path_to_domain(&request.path),
                user_id: request.user_id.as_ref().and_then(|id| Uuid::parse_str(id).ok()),
                session_id: None,
                educational_context: None,
                system_state: super::SystemState {
                    load_level: 0.3,
                    active_users: 100,
                    blockchain_sync_status: true,
                    ipfs_connectivity: true,
                    database_health: 0.9,
                    cache_hit_rate: 0.85,
                },
            },
            parameters: HashMap::from([
                ("path".to_string(), serde_json::Value::String(request.path.clone())),
                ("method".to_string(), serde_json::Value::String(request.method.clone())),
                ("service".to_string(), serde_json::Value::String(route.service.clone())),
            ]),
            priority: super::Priority::Medium,
            timeout_ms: Some(5000),
        };
        
        let reasoning_response = self.interpreter.reason_user_experience(reasoning_request).await?;
        
        // 6. Execute based on MeTTa decision
        let response = match reasoning_response.decision {
            Decision::Allow => {
                // Forward to service
                self.forward_to_service(&request, &route).await?
            }
            Decision::Deny => GatewayResponse {
                request_id: request.id,
                status_code: 403,
                headers: HashMap::from([
                    ("Content-Type".to_string(), "application/json".to_string()),
                ]),
                body: Some(serde_json::json!({"error": "Request denied by MeTTa reasoning"})),
                processing_time_ms: start_time.elapsed().as_millis() as u64,
            },
            Decision::Redirect(target) => GatewayResponse {
                request_id: request.id,
                status_code: 302,
                headers: HashMap::from([
                    ("Location".to_string(), target),
                ]),
                body: None,
                processing_time_ms: start_time.elapsed().as_millis() as u64,
            },
            _ => GatewayResponse {
                request_id: request.id,
                status_code: 500,
                headers: HashMap::from([
                    ("Content-Type".to_string(), "application/json".to_string()),
                ]),
                body: Some(serde_json::json!({"error": "Unexpected MeTTa decision"})),
                processing_time_ms: start_time.elapsed().as_millis() as u64,
            },
        };
        
        Ok(response)
    }
    
    /// Match request to route
    async fn match_route(&self, request: &GatewayRequest) -> Result<RouteInfo> {
        let registry = self.routes.read().await;
        
        // Try exact match first
        let route_key = format!("{}:{}", request.method, request.path);
        if let Some(route) = registry.routes.get(&route_key) {
            return Ok(route.clone());
        }
        
        // Try pattern matching
        for pattern in &registry.patterns {
            if self.matches_pattern(&request.path, &pattern.pattern) {
                if let Some(route) = registry.routes.values()
                    .find(|r| r.service == pattern.service) {
                    return Ok(route.clone());
                }
            }
        }
        
        Err(anyhow::anyhow!("No matching route found"))
    }
    
    /// Check if path matches pattern
    fn matches_pattern(&self, path: &str, pattern: &str) -> bool {
        if pattern.ends_with("/*") {
            let prefix = &pattern[..pattern.len() - 2];
            path.starts_with(prefix)
        } else {
            path == pattern
        }
    }
    
    /// Check rate limit for request
    async fn check_rate_limit(&self, request: &GatewayRequest, limit: &RateLimit) -> Result<bool> {
        let mut limiter = self.rate_limiter.write().await;
        let client_id = request.user_id.clone().unwrap_or_else(|| request.client_ip.clone());
        
        limiter.check_limit(&client_id, limit)
    }
    
    /// Check permissions for request
    async fn check_permissions(&self, request: &GatewayRequest, permissions: &[String]) -> Result<bool> {
        // Simplified permission check - in production, integrate with user roles
        Ok(request.user_id.is_some())
    }
    
    /// Convert path to domain
    fn path_to_domain(&self, path: &str) -> super::Domain {
        if path.starts_with("/api/auth") {
            super::Domain::Authentication
        } else if path.starts_with("/api/curriculum") {
            super::Domain::Curriculum
        } else if path.starts_with("/api/assessments") {
            super::Domain::Assessment
        } else if path.starts_with("/api/translate") {
            super::Domain::Translation
        } else if path.starts_with("/api/blockchain") {
            super::Domain::Blockchain
        } else if path.starts_with("/api/storage") {
            super::Domain::Storage
        } else if path.starts_with("/api/analytics") {
            super::Domain::Analytics
        } else {
            super::Domain::UserExperience
        }
    }
    
    /// Forward request to service
    async fn forward_to_service(&self, request: &GatewayRequest, route: &RouteInfo) -> Result<GatewayResponse> {
        // Simulate service call - in production, make actual HTTP request
        let response_body = serde_json::json!({
            "service": route.service,
            "handler": route.handler,
            "path": request.path,
            "method": request.method,
            "processed_at": chrono::Utc::now()
        });
        
        Ok(GatewayResponse {
            request_id: request.id,
            status_code: 200,
            headers: HashMap::from([
                ("Content-Type".to_string(), "application/json".to_string()),
            ]),
            body: Some(response_body),
            processing_time_ms: 50, // Simulated processing time
        })
    }
}

impl RouteRegistry {
    /// Create new route registry
    pub fn new() -> Self {
        RouteRegistry {
            routes: HashMap::new(),
            patterns: Vec::new(),
        }
    }
    
    /// Register a new route
    pub fn register_route(&mut self, route: RouteInfo) {
        let key = format!("{}:{}", route.method, route.path);
        
        // Add pattern if path contains wildcards
        if route.path.contains('*') {
            self.patterns.push(RoutePattern {
                pattern: route.path.clone(),
                service: route.service.clone(),
                priority: 1,
            });
        }
        
        self.routes.insert(key, route);
    }
}

impl RateLimiter {
    /// Create new rate limiter
    pub fn new() -> Self {
        RateLimiter {
            buckets: HashMap::new(),
            global_limits: HashMap::new(),
        }
    }
    
    /// Check rate limit for client
    pub fn check_limit(&mut self, client_id: &str, limit: &RateLimit) -> Result<bool> {
        let now = chrono::Utc::now();
        
        let bucket = self.buckets.entry(client_id.to_string()).or_insert_with(|| {
            RateLimitBucket {
                client_id: client_id.to_string(),
                tokens: limit.burst_size,
                last_refill: now,
                requests_in_window: 0,
                window_start: now,
            }
        });
        
        // Refill tokens based on time elapsed
        let time_elapsed = (now - bucket.last_refill).num_seconds() as u64;
        let tokens_to_add = (time_elapsed * limit.requests_per_minute as u64) / 60;
        bucket.tokens = (bucket.tokens + tokens_to_add as u32).min(limit.burst_size);
        bucket.last_refill = now;
        
        // Check window-based limit
        if (now - bucket.window_start).num_seconds() as u64 >= limit.window_size_seconds {
            bucket.requests_in_window = 0;
            bucket.window_start = now;
        }
        
        // Check limits
        if bucket.tokens > 0 && bucket.requests_in_window < limit.requests_per_minute {
            bucket.tokens -= 1;
            bucket.requests_in_window += 1;
            Ok(true)
        } else {
            Ok(false)
        }
    }
}

impl AccessController {
    /// Create new access controller
    pub fn new() -> Self {
        let mut rules = HashMap::new();
        let mut roles = HashMap::new();
        
        // Define default roles
        roles.insert("student".to_string(), Role {
            name: "student".to_string(),
            permissions: vec![
                "curriculum:read".to_string(),
                "assessment:submit".to_string(),
                "translation:use".to_string(),
            ],
            inherits_from: vec![],
        });
        
        roles.insert("teacher".to_string(), Role {
            name: "teacher".to_string(),
            permissions: vec![
                "curriculum:read".to_string(),
                "curriculum:write".to_string(),
                "assessment:create".to_string(),
                "assessment:grade".to_string(),
                "translation:use".to_string(),
            ],
            inherits_from: vec!["student".to_string()],
        });
        
        AccessController { rules, roles }
    }
}