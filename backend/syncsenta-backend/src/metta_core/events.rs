//! Event Processing - Real-time MeTTa-powered event handling
//!
//! This module handles real-time events and notifications throughout the system
//! using MeTTa reasoning for intelligent event routing and processing.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::config::AppConfig;
use super::{ReasoningRequest, ReasoningResponse};
use super::interpreter::MeTTaInterpreter;

/// Event processor for real-time system events
pub struct EventProcessor {
    /// MeTTa interpreter for event reasoning
    interpreter: Arc<MeTTaInterpreter>,
    /// Event channels
    channels: Arc<RwLock<HashMap<String, broadcast::Sender<SystemEvent>>>>,
    /// Event handlers
    handlers: Arc<RwLock<HashMap<String, EventHandler>>>,
    /// Event statistics
    stats: Arc<RwLock<EventStats>>,
    /// Configuration
    config: AppConfig,
}

/// System event that can be processed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEvent {
    pub id: Uuid,
    pub event_type: EventType,
    pub source: String,
    pub target: Option<String>,
    pub payload: serde_json::Value,
    pub priority: EventPriority,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub correlation_id: Option<Uuid>,
}

/// Types of system events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    UserAction,
    SystemAlert,
    DataChange,
    Communication,
    Assessment,
    Learning,
    Blockchain,
    Storage,
    Health,
}

/// Event priority levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventPriority {
    Critical,
    High,
    Medium,
    Low,
}

/// Event handler configuration
#[derive(Debug, Clone)]
pub struct EventHandler {
    pub name: String,
    pub event_types: Vec<EventType>,
    pub handler_fn: Arc<dyn Fn(SystemEvent) -> Result<()> + Send + Sync>,
    pub enabled: bool,
}

/// Event processing statistics
#[derive(Debug, Default)]
pub struct EventStats {
    pub total_events: u64,
    pub events_by_type: HashMap<String, u64>,
    pub processing_times: Vec<u64>,
    pub errors: u64,
}

impl EventProcessor {
    /// Create new event processor
    pub async fn new(interpreter: Arc<MeTTaInterpreter>, config: &AppConfig) -> Result<Self> {
        let channels = Arc::new(RwLock::new(HashMap::new()));
        let handlers = Arc::new(RwLock::new(HashMap::new()));
        let stats = Arc::new(RwLock::new(EventStats::default()));
        
        let processor = EventProcessor {
            interpreter,
            channels,
            handlers,
            stats,
            config: config.clone(),
        };
        
        // Register default event handlers
        processor.register_default_handlers().await?;
        
        Ok(processor)
    }
    
    /// Register default event handlers
    async fn register_default_handlers(&self) -> Result<()> {
        // User action handler
        self.register_handler(EventHandler {
            name: "user_action_handler".to_string(),
            event_types: vec![EventType::UserAction],
            handler_fn: Arc::new(|event| {
                tracing::info!("Processing user action: {:?}", event.payload);
                Ok(())
            }),
            enabled: true,
        }).await;
        
        // System alert handler
        self.register_handler(EventHandler {
            name: "system_alert_handler".to_string(),
            event_types: vec![EventType::SystemAlert],
            handler_fn: Arc::new(|event| {
                tracing::warn!("System alert: {:?}", event.payload);
                Ok(())
            }),
            enabled: true,
        }).await;
        
        // Assessment event handler
        self.register_handler(EventHandler {
            name: "assessment_handler".to_string(),
            event_types: vec![EventType::Assessment],
            handler_fn: Arc::new(|event| {
                tracing::info!("Assessment event: {:?}", event.payload);
                Ok(())
            }),
            enabled: true,
        }).await;
        
        Ok(())
    }
    
    /// Register an event handler
    pub async fn register_handler(&self, handler: EventHandler) {
        let mut handlers = self.handlers.write().await;
        handlers.insert(handler.name.clone(), handler);
    }
    
    /// Process a system event
    pub async fn process_event(&self, event: SystemEvent) -> Result<()> {
        let start_time = std::time::Instant::now();
        
        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_events += 1;
            *stats.events_by_type.entry(format!("{:?}", event.event_type)).or_insert(0) += 1;
        }
        
        // Find matching handlers
        let handlers = self.handlers.read().await;
        let matching_handlers: Vec<_> = handlers.values()
            .filter(|h| h.enabled && h.event_types.contains(&event.event_type))
            .collect();
        
        // Process with each handler
        for handler in matching_handlers {
            if let Err(e) = (handler.handler_fn)(event.clone()) {
                tracing::error!("Event handler {} failed: {}", handler.name, e);
                let mut stats = self.stats.write().await;
                stats.errors += 1;
            }
        }
        
        // Broadcast to channels
        self.broadcast_event(event).await?;
        
        // Update processing time
        {
            let mut stats = self.stats.write().await;
            stats.processing_times.push(start_time.elapsed().as_millis() as u64);
        }
        
        Ok(())
    }
    
    /// Broadcast event to subscribers
    async fn broadcast_event(&self, event: SystemEvent) -> Result<()> {
        let channels = self.channels.read().await;
        let event_type_key = format!("{:?}", event.event_type);
        
        if let Some(sender) = channels.get(&event_type_key) {
            if let Err(e) = sender.send(event) {
                tracing::warn!("Failed to broadcast event: {}", e);
            }
        }
        
        Ok(())
    }
    
    /// Subscribe to events of a specific type
    pub async fn subscribe(&self, event_type: EventType) -> broadcast::Receiver<SystemEvent> {
        let mut channels = self.channels.write().await;
        let event_type_key = format!("{:?}", event_type);
        
        let sender = channels.entry(event_type_key).or_insert_with(|| {
            let (tx, _) = broadcast::channel(1000);
            tx
        });
        
        sender.subscribe()
    }
    
    /// Reason about communication events
    pub async fn reason_communication(&self, request: ReasoningRequest) -> Result<ReasoningResponse> {
        // Use MeTTa interpreter for communication reasoning
        self.interpreter.reason_user_experience(request).await
    }
    
    /// Get event processing statistics
    pub async fn get_stats(&self) -> EventStats {
        let stats = self.stats.read().await;
        EventStats {
            total_events: stats.total_events,
            events_by_type: stats.events_by_type.clone(),
            processing_times: stats.processing_times.clone(),
            errors: stats.errors,
        }
    }
    
    /// Create and process a new event
    pub async fn emit_event(
        &self,
        event_type: EventType,
        source: String,
        payload: serde_json::Value,
        priority: EventPriority,
    ) -> Result<()> {
        let event = SystemEvent {
            id: Uuid::new_v4(),
            event_type,
            source,
            target: None,
            payload,
            priority,
            timestamp: chrono::Utc::now(),
            correlation_id: None,
        };
        
        self.process_event(event).await
    }
}