/**
 * JSON Schema for CBC Lesson Scripts
 * Used for validation of lesson script JSON files
 */

export const lessonSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CBC Lesson Script Schema",
  "description": "Schema for interactive, state machine-driven CBC curriculum lessons",
  "type": "object",
  "required": ["metadata", "initialNode", "nodes"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["id", "title", "subject", "grade", "topic", "cbcStrand", "cbcSubStrand", "estimatedTime", "difficulty", "learningOutcomes"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "title": { "type": "string", "minLength": 1 },
        "subject": { "enum": ["Mathematics", "English", "Science", "Social Studies", "Kiswahili"] },
        "grade": { "enum": ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
        "topic": { "type": "string", "minLength": 1 },
        "cbcStrand": { "enum": ["Numbers", "Algebra", "Geometry", "Measurement", "Data Handling", "Probability"] },
        "cbcSubStrand": { "type": "string", "minLength": 1 },
        "estimatedTime": { "type": "number", "minimum": 1 },
        "difficulty": { "enum": ["beginner", "intermediate", "advanced"] },
        "prerequisites": { "type": "array", "items": { "type": "string" } },
        "learningOutcomes": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "culturalContext": { "type": "string" }
      }
    },
    "initialNode": { "type": "string" },
    "nodes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "oneOf": [
          { "$ref": "#/definitions/teachingNode" },
          { "$ref": "#/definitions/microEvalNode" },
          { "$ref": "#/definitions/scaffoldingNode" },
          { "$ref": "#/definitions/practiceNode" },
          { "$ref": "#/definitions/summaryNode" }
        ]
      }
    }
  },
  "definitions": {
    "widgetConfig": {
      "type": "object",
      "required": ["type", "config"],
      "properties": {
        "type": { "enum": ["number-line", "fraction-builder", "block-manipulator", "binary-counter", "word-problem-visualizer"] },
        "config": { "type": "object" }
      }
    },
    "teachingNode": {
      "type": "object",
      "required": ["id", "type", "explanation", "transitions"],
      "properties": {
        "id": { "type": "string" },
        "type": { "const": "teaching" },
        "explanation": {
          "type": "object",
          "required": ["text"],
          "properties": {
            "text": { "type": "string", "minLength": 1 },
            "voiceOver": { "type": "string" },
            "culturalContext": { "type": "string" }
          }
        },
        "widget": { "$ref": "#/definitions/widgetConfig" },
        "transitions": {
          "type": "object",
          "required": ["onNext"],
          "properties": {
            "onNext": { "type": "string" }
          }
        }
      }
    },
    "microEvalNode": {
      "type": "object",
      "required": ["id", "type", "question", "knowledgeComponent", "transitions"],
      "properties": {
        "id": { "type": "string" },
        "type": { "const": "micro-eval" },
        "question": {
          "type": "object",
          "required": ["text", "type", "correctAnswer", "hints"],
          "properties": {
            "text": { "type": "string", "minLength": 1 },
            "type": { "enum": ["mcq", "numeric", "widget-based", "free-response"] },
            "correctAnswer": {},
            "options": { "type": "array", "items": { "type": "string" } },
            "hints": { "type": "array", "items": { "type": "string" }, "maxItems": 3 },
            "explanation": { "type": "string" }
          }
        },
        "widget": { "$ref": "#/definitions/widgetConfig" },
        "knowledgeComponent": { "type": "string" },
        "transitions": {
          "type": "object",
          "required": ["onCorrect", "onIncorrect"],
          "properties": {
            "onCorrect": { "type": "string" },
            "onIncorrect": { "type": "string" },
            "onTimeout": { "type": "string" }
          }
        },
        "scaffolding": {
          "type": "object",
          "properties": {
            "lockUI": { "type": "boolean" },
            "highlightElements": { "type": "array", "items": { "type": "string" } },
            "simplifyWidget": { "type": "boolean" },
            "message": { "type": "string" }
          }
        }
      }
    },
    "scaffoldingNode": {
      "type": "object",
      "required": ["id", "type", "explanation", "scaffolding", "transitions"],
      "properties": {
        "id": { "type": "string" },
        "type": { "const": "scaffolding" },
        "explanation": {
          "type": "object",
          "required": ["text"],
          "properties": {
            "text": { "type": "string", "minLength": 1 },
            "culturalContext": { "type": "string" }
          }
        },
        "scaffolding": {
          "type": "object",
          "properties": {
            "lockUI": { "type": "boolean" },
            "highlightElements": { "type": "array", "items": { "type": "string" } },
            "simplifyWidget": { "type": "boolean" },
            "message": { "type": "string" }
          }
        },
        "transitions": {
          "type": "object",
          "required": ["onRetry"],
          "properties": {
            "onRetry": { "type": "string" }
          }
        }
      }
    },
    "practiceNode": {
      "type": "object",
      "required": ["id", "type", "instructions", "widget", "transitions"],
      "properties": {
        "id": { "type": "string" },
        "type": { "const": "practice" },
        "instructions": { "type": "string", "minLength": 1 },
        "widget": { "$ref": "#/definitions/widgetConfig" },
        "transitions": {
          "type": "object",
          "required": ["onComplete"],
          "properties": {
            "onComplete": { "type": "string" }
          }
        }
      }
    },
    "summaryNode": {
      "type": "object",
      "required": ["id", "type", "summary", "transitions"],
      "properties": {
        "id": { "type": "string" },
        "type": { "const": "summary" },
        "summary": {
          "type": "object",
          "required": ["text", "keyTakeaways"],
          "properties": {
            "text": { "type": "string", "minLength": 1 },
            "keyTakeaways": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
            "masteryIndicators": { "type": "array", "items": { "type": "string" } }
          }
        },
        "transitions": {
          "type": "object",
          "required": ["onComplete"],
          "properties": {
            "onComplete": { "const": "completed" }
          }
        }
      }
    }
  }
} as const;
