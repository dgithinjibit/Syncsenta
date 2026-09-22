# Requirements Document

## Introduction

SyncSenta Core MVP is a focused prototype demonstrating intelligent multi-agent AI support for personalized learning in Kenya. The system enables 2 students (one in Turkana, one in Nairobi) to learn via AI chatbot while 1 teacher manages them through a dashboard. A multi-agent AI system (inspired by AI Debators with 26 agents, using MoE pattern and consensus detection) provides intelligent support, with all agents reporting to a Teacher Agent orchestrator.

This MVP excludes blockchain, payments, virtual classrooms, multi-school deployment, and approval workflows to focus on the core learning experience with AI agent coordination.

## Glossary

- **Student_Chatbot**: AI-powered conversational interface for student learning interactions
- **Teacher_Dashboard**: Web interface showing student list, progress, analytics, and AI agent activity
- **Multi_Agent_System**: Collection of specialized AI agents coordinating via MoE pattern
- **Teacher_Agent**: Orchestrator agent that coordinates all other AI agents and provides teacher insights
- **Emotional_Intelligence_Agent**: Agent detecting student frustration, confusion, and motivation levels
- **Tutoring_Agent**: Agent handling subject-specific questions and explanations
- **Assessment_Agent**: Agent generating quizzes and evaluating student answers
- **Translation_Agent**: Agent handling Gikuyu, Swahili, and English language translation
- **Analytics_Agent**: Agent tracking student progress and identifying weak areas
- **Content_Agent**: Agent generating learning materials and resources
- **MoE_Pattern**: Mixture of Experts pattern where multiple agents contribute and consensus is detected
- **Consensus_Detection**: Process where multiple agents agree on recommendations or decisions
- **WebSocket_Connection**: Real-time bidirectional communication channel between client and server
- **Mwalimu_AI**: Base AI model for educational interactions
- **Gikuyu_Model**: Fine-tuned language model for Gikuyu language support
- **Frontend_Service**: Next.js/React application serving the user interface
- **Backend_Service**: Rust/Axum API server handling business logic and data
- **AI_Agents_Service**: Python service running CrewAI framework for agent coordination
- **PostgreSQL_Database**: Relational database storing student, teacher, and interaction data
- **Redis_Cache**: In-memory cache for session data and real-time updates
- **Render_Platform**: Cloud deployment platform hosting all services

## Requirements

### Requirement 1: Student Chatbot Interface

**User Story:** As a student, I want to interact with an AI chatbot, so that I can ask questions and receive personalized learning support.

#### Acceptance Criteria

1. WHEN a student opens the chatbot interface, THE Student_Chatbot SHALL display a welcome message in the student's preferred language
2. WHEN a student sends a message, THE Student_Chatbot SHALL respond within 3 seconds
3. WHEN a student message is in Gikuyu or Swahili, THE Translation_Agent SHALL translate it to English for processing
4. WHEN the chatbot responds, THE Translation_Agent SHALL translate the response back to the student's preferred language
5. THE Student_Chatbot SHALL maintain conversation context for the entire learning session
6. WHEN a student asks a subject-specific question, THE Tutoring_Agent SHALL provide an accurate explanation
7. THE Student_Chatbot SHALL integrate with both Mwalimu_AI and Gikuyu_Model for language processing
8. FOR ALL valid student messages, sending then receiving a response SHALL preserve conversation context (round-trip property)

### Requirement 2: Teacher Dashboard Student Management

**User Story:** As a teacher, I want to view a list of my students with real-time status, so that I can monitor who is actively learning.

#### Acceptance Criteria

1. WHEN a teacher opens the dashboard, THE Teacher_Dashboard SHALL display a list of all assigned students
2. THE Teacher_Dashboard SHALL show each student's current status (online, offline, active in chat, idle)
3. WHEN a student's status changes, THE Teacher_Dashboard SHALL update within 2 seconds via WebSocket_Connection
4. THE Teacher_Dashboard SHALL display the student's location (Turkana or Nairobi)
5. WHEN a teacher clicks on a student, THE Teacher_Dashboard SHALL display detailed student information
6. THE Teacher_Dashboard SHALL show the number of active learning sessions for each student

### Requirement 3: Student Progress and Analytics Display

**User Story:** As a teacher, I want to see student progress and analytics, so that I can identify students who need additional support.

#### Acceptance Criteria

1. THE Teacher_Dashboard SHALL display each student's overall progress percentage
2. THE Teacher_Dashboard SHALL show the number of questions asked by each student in the current session
3. WHEN the Analytics_Agent identifies a weak area, THE Teacher_Dashboard SHALL display it with the subject and topic
4. THE Teacher_Dashboard SHALL show quiz scores and completion rates for each student
5. THE Teacher_Dashboard SHALL display a timeline of student activity for the current day
6. WHEN a student shows signs of struggle, THE Teacher_Dashboard SHALL highlight the student with a warning indicator

### Requirement 4: AI Agent Activity Monitoring

**User Story:** As a teacher, I want to see AI agent activity and recommendations, so that I can understand how the system is supporting my students.

#### Acceptance Criteria

1. THE Teacher_Dashboard SHALL display a list of active AI agents and their current tasks
2. WHEN an agent makes a recommendation, THE Teacher_Dashboard SHALL display it with the agent name and reasoning
3. THE Teacher_Dashboard SHALL show the confidence level for each agent recommendation
4. WHEN multiple agents reach consensus, THE Teacher_Dashboard SHALL display the consensus decision with participating agents
5. THE Teacher_Dashboard SHALL show the number of interventions made by each agent type
6. WHEN the Teacher_Agent orchestrates a decision, THE Teacher_Dashboard SHALL display the orchestration flow

### Requirement 5: Student Chat History and Interventions

**User Story:** As a teacher, I want to view student chat history and intervene when needed, so that I can provide direct support during learning sessions.

#### Acceptance Criteria

1. WHEN a teacher selects a student, THE Teacher_Dashboard SHALL display the complete chat history for the current session
2. THE Teacher_Dashboard SHALL show timestamps for each message in the chat history
3. WHEN a teacher types a message, THE Teacher_Dashboard SHALL send it directly to the student's chatbot within 1 second
4. WHEN a teacher sends a message, THE Student_Chatbot SHALL display it with a "Teacher" label
5. THE Teacher_Dashboard SHALL show which AI agent responded to each student message
6. WHEN the Emotional_Intelligence_Agent detects frustration, THE Teacher_Dashboard SHALL highlight the relevant chat messages

### Requirement 6: Emotional Intelligence Detection

**User Story:** As a teacher, I want the system to detect student emotions, so that I can intervene when students are frustrated or confused.

#### Acceptance Criteria

1. WHEN a student sends a message, THE Emotional_Intelligence_Agent SHALL analyze it for emotional indicators
2. WHEN frustration is detected, THE Emotional_Intelligence_Agent SHALL assign a frustration score between 0 and 1
3. WHEN confusion is detected, THE Emotional_Intelligence_Agent SHALL assign a confusion score between 0 and 1
4. WHEN high motivation is detected, THE Emotional_Intelligence_Agent SHALL assign a motivation score between 0 and 1
5. WHEN frustration score exceeds 0.7, THE Teacher_Agent SHALL notify the teacher via the Teacher_Dashboard
6. THE Emotional_Intelligence_Agent SHALL track emotional trends over the learning session
7. WHEN emotional state changes significantly, THE Emotional_Intelligence_Agent SHALL trigger a consensus check with other agents

### Requirement 7: Multi-Agent Tutoring Coordination

**User Story:** As a student, I want accurate answers to my questions, so that I can learn effectively.

#### Acceptance Criteria

1. WHEN a student asks a question, THE Teacher_Agent SHALL route it to the appropriate specialist agent
2. WHEN the question is subject-specific, THE Tutoring_Agent SHALL generate an explanation
3. WHEN the question requires assessment, THE Assessment_Agent SHALL generate a quiz question
4. WHEN the question requires new content, THE Content_Agent SHALL generate learning materials
5. WHEN multiple agents can answer, THE Teacher_Agent SHALL use MoE_Pattern to select the best response
6. WHEN agent responses conflict, THE Teacher_Agent SHALL use Consensus_Detection to resolve the conflict
7. THE Teacher_Agent SHALL ensure response time remains under 3 seconds despite multi-agent coordination

### Requirement 8: Assessment Generation and Evaluation

**User Story:** As a student, I want to take quizzes to test my knowledge, so that I can verify my understanding.

#### Acceptance Criteria

1. WHEN a student completes a learning topic, THE Assessment_Agent SHALL generate a quiz with 3 to 5 questions
2. THE Assessment_Agent SHALL generate questions appropriate to the student's current level
3. WHEN a student submits an answer, THE Assessment_Agent SHALL evaluate it within 2 seconds
4. WHEN an answer is incorrect, THE Assessment_Agent SHALL provide an explanation of the correct answer
5. THE Assessment_Agent SHALL calculate a quiz score as a percentage
6. WHEN a quiz is completed, THE Analytics_Agent SHALL update the student's progress metrics
7. FOR ALL generated quizzes, the questions SHALL be relevant to the preceding learning content

### Requirement 9: Multi-Language Translation Support

**User Story:** As a student, I want to learn in my native language, so that I can understand concepts more easily.

#### Acceptance Criteria

1. THE Translation_Agent SHALL support Gikuyu, Swahili, and English languages
2. WHEN a message is in Gikuyu, THE Translation_Agent SHALL use the Gikuyu_Model for translation
3. WHEN a message is in Swahili or English, THE Translation_Agent SHALL use Mwalimu_AI for translation
4. THE Translation_Agent SHALL preserve technical terms and subject-specific vocabulary during translation
5. WHEN translation confidence is below 0.8, THE Translation_Agent SHALL flag the message for review
6. THE Translation_Agent SHALL translate within 500 milliseconds
7. FOR ALL translations, translating from language A to B then back to A SHALL preserve core meaning (round-trip property)

### Requirement 10: Real-Time Updates via WebSocket

**User Story:** As a teacher, I want real-time updates on the dashboard, so that I can monitor students without refreshing the page.

#### Acceptance Criteria

1. WHEN a teacher opens the dashboard, THE Frontend_Service SHALL establish a WebSocket_Connection to the Backend_Service
2. WHEN a student sends a message, THE Backend_Service SHALL broadcast the update via WebSocket_Connection within 500 milliseconds
3. WHEN a student's status changes, THE Backend_Service SHALL broadcast the status update via WebSocket_Connection
4. WHEN an AI agent makes a recommendation, THE Backend_Service SHALL broadcast it via WebSocket_Connection
5. WHEN the WebSocket_Connection is interrupted, THE Frontend_Service SHALL attempt to reconnect every 5 seconds
6. WHEN the WebSocket_Connection is re-established, THE Frontend_Service SHALL request missed updates from the Backend_Service
7. THE WebSocket_Connection SHALL remain stable for at least 1 hour of continuous use

### Requirement 11: Frontend Service Deployment

**User Story:** As a developer, I want the frontend deployed on Render, so that users can access the application.

#### Acceptance Criteria

1. THE Frontend_Service SHALL be deployed as a Next.js application on Render_Platform
2. THE Frontend_Service SHALL serve the Student_Chatbot interface at `/student` route
3. THE Frontend_Service SHALL serve the Teacher_Dashboard at `/teacher` route
4. THE Frontend_Service SHALL load within 3 seconds on a 3G connection
5. THE Frontend_Service SHALL use environment variables for API endpoint configuration
6. WHEN the Frontend_Service starts, it SHALL connect to the Backend_Service within 5 seconds
7. THE Frontend_Service SHALL handle TypeScript compilation without errors

### Requirement 12: Backend Service Deployment

**User Story:** As a developer, I want the backend deployed on Render, so that it can handle API requests and WebSocket connections.

#### Acceptance Criteria

1. THE Backend_Service SHALL be deployed as a Rust/Axum application on Render_Platform
2. THE Backend_Service SHALL expose REST API endpoints for student and teacher operations
3. THE Backend_Service SHALL handle WebSocket_Connection upgrades for real-time communication
4. THE Backend_Service SHALL connect to PostgreSQL_Database on startup
5. THE Backend_Service SHALL connect to Redis_Cache on startup
6. THE Backend_Service SHALL use environment variables for database and cache configuration
7. WHEN the Backend_Service receives a request, it SHALL respond within 200 milliseconds for cached data
8. THE Backend_Service SHALL compile without errors using `cargo check`

### Requirement 13: AI Agents Service Deployment

**User Story:** As a developer, I want the AI agents service deployed on Render, so that intelligent agent coordination is available.

#### Acceptance Criteria

1. THE AI_Agents_Service SHALL be deployed as a Python application using CrewAI framework on Render_Platform
2. THE AI_Agents_Service SHALL initialize all seven agents (Emotional_Intelligence_Agent, Tutoring_Agent, Assessment_Agent, Translation_Agent, Analytics_Agent, Content_Agent, Teacher_Agent) on startup
3. THE AI_Agents_Service SHALL expose REST API endpoints for agent task execution
4. THE AI_Agents_Service SHALL connect to GPT-4o for general reasoning tasks
5. THE AI_Agents_Service SHALL connect to Gemini Pro for alternative reasoning paths
6. THE AI_Agents_Service SHALL connect to the Gikuyu_Model for Gikuyu language processing
7. THE AI_Agents_Service SHALL use environment variables for API keys and model endpoints
8. WHEN the AI_Agents_Service receives a task, it SHALL route it to the Teacher_Agent for orchestration

### Requirement 14: Database and Cache Configuration

**User Story:** As a developer, I want PostgreSQL and Redis properly configured, so that data persistence and caching work correctly.

#### Acceptance Criteria

1. THE PostgreSQL_Database SHALL store student profiles, chat history, and progress data
2. THE PostgreSQL_Database SHALL use connection pooling with a minimum of 5 connections
3. THE Redis_Cache SHALL store active session data with a TTL of 24 hours
4. THE Redis_Cache SHALL store WebSocket_Connection state for all active users
5. WHEN the Backend_Service writes to PostgreSQL_Database, the write SHALL complete within 100 milliseconds
6. WHEN the Backend_Service reads from Redis_Cache, the read SHALL complete within 10 milliseconds
7. THE PostgreSQL_Database SHALL be backed up daily on Render_Platform

### Requirement 15: Environment Variables and Configuration

**User Story:** As a developer, I want environment variables properly configured across all services, so that deployment succeeds without errors.

#### Acceptance Criteria

1. THE Frontend_Service SHALL read `NEXT_PUBLIC_API_URL` for Backend_Service endpoint
2. THE Backend_Service SHALL read `DATABASE_URL` for PostgreSQL_Database connection
3. THE Backend_Service SHALL read `REDIS_URL` for Redis_Cache connection
4. THE AI_Agents_Service SHALL read `OPENAI_API_KEY` for GPT-4o access
5. THE AI_Agents_Service SHALL read `GEMINI_API_KEY` for Gemini Pro access
6. THE AI_Agents_Service SHALL read `GIKUYU_MODEL_ENDPOINT` for Gikuyu_Model access
7. WHEN any required environment variable is missing, THE service SHALL log a clear error message and fail to start
8. THE Render_Platform SHALL provide all environment variables via the deployment configuration interface

### Requirement 16: Agent Consensus Detection

**User Story:** As a teacher, I want agents to reach consensus on important decisions, so that recommendations are reliable and well-reasoned.

#### Acceptance Criteria

1. WHEN multiple agents provide recommendations, THE Teacher_Agent SHALL collect all recommendations
2. THE Teacher_Agent SHALL calculate agreement scores between agent recommendations
3. WHEN agreement score exceeds 0.8, THE Teacher_Agent SHALL declare consensus reached
4. WHEN consensus is reached, THE Teacher_Agent SHALL combine agent reasoning into a unified recommendation
5. WHEN consensus is not reached, THE Teacher_Agent SHALL present multiple options to the teacher
6. THE Teacher_Agent SHALL track consensus patterns over time for each agent combination
7. WHEN consensus detection takes longer than 2 seconds, THE Teacher_Agent SHALL return the highest-confidence single agent recommendation

### Requirement 17: Content Generation for Learning

**User Story:** As a student, I want the system to generate learning materials, so that I have resources to study topics I'm struggling with.

#### Acceptance Criteria

1. WHEN a student requests learning materials, THE Content_Agent SHALL generate content appropriate to the topic
2. THE Content_Agent SHALL generate content at the student's current comprehension level
3. THE Content_Agent SHALL include examples and explanations in the generated content
4. WHEN the student's preferred language is not English, THE Translation_Agent SHALL translate the generated content
5. THE Content_Agent SHALL generate content within 5 seconds
6. THE Content_Agent SHALL format content with proper headings, bullet points, and structure
7. WHEN the Analytics_Agent identifies a weak area, THE Content_Agent SHALL proactively generate remedial materials

### Requirement 18: Analytics and Progress Tracking

**User Story:** As a teacher, I want detailed analytics on student progress, so that I can make data-driven decisions about interventions.

#### Acceptance Criteria

1. THE Analytics_Agent SHALL track the number of questions asked per subject per student
2. THE Analytics_Agent SHALL calculate average quiz scores per subject per student
3. THE Analytics_Agent SHALL identify topics where a student scores below 60 percent
4. WHEN a weak area is identified, THE Analytics_Agent SHALL notify the Teacher_Agent
5. THE Analytics_Agent SHALL calculate daily active learning time per student
6. THE Analytics_Agent SHALL track emotional state trends using data from Emotional_Intelligence_Agent
7. THE Analytics_Agent SHALL generate a daily summary report for each student

### Requirement 19: Teacher Agent Orchestration

**User Story:** As a system, I want all AI agents coordinated by the Teacher Agent, so that agent activities are coherent and aligned with educational goals.

#### Acceptance Criteria

1. THE Teacher_Agent SHALL receive all student messages before routing to specialist agents
2. THE Teacher_Agent SHALL maintain a priority queue of agent tasks
3. WHEN multiple agents need to respond, THE Teacher_Agent SHALL coordinate response timing to avoid conflicts
4. THE Teacher_Agent SHALL monitor agent performance and adjust routing based on success rates
5. WHEN an agent fails to respond within 5 seconds, THE Teacher_Agent SHALL route the task to an alternative agent
6. THE Teacher_Agent SHALL log all orchestration decisions for teacher review
7. THE Teacher_Agent SHALL provide explanations for orchestration decisions when requested by the teacher

### Requirement 20: Error Handling and Recovery

**User Story:** As a user, I want the system to handle errors gracefully, so that my learning experience is not disrupted.

#### Acceptance Criteria

1. WHEN an AI agent fails to respond, THE Teacher_Agent SHALL retry with an alternative agent
2. WHEN the Backend_Service loses database connection, it SHALL attempt to reconnect every 10 seconds
3. WHEN the WebSocket_Connection fails, THE Frontend_Service SHALL display a reconnection message
4. WHEN an API request fails, THE Frontend_Service SHALL retry up to 3 times with exponential backoff
5. WHEN the AI_Agents_Service is unavailable, THE Backend_Service SHALL return a fallback response
6. WHEN translation fails, THE Translation_Agent SHALL return the original message with a translation failure notice
7. THE system SHALL log all errors with sufficient context for debugging
