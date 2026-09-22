/**
 * Lesson Script Parser
 * 
 * Parses and validates lesson script JSON files against the schema.
 * Ensures all node references are valid and CBC metadata is correct.
 */

import type { LessonScript, LessonNode } from '../types/lesson-script';

export class LessonParseError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'LessonParseError';
  }
}

/**
 * Parse a lesson script from JSON string
 */
export function parseLessonScript(jsonString: string): LessonScript {
  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new LessonParseError(
      'Invalid JSON format',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }

  // Validate structure
  validateLessonStructure(parsed);

  // Validate node references
  validateNodeReferences(parsed);

  // Validate CBC metadata
  validateCBCMetadata(parsed);

  return parsed as LessonScript;
}

/**
 * Validate basic lesson structure
 */
function validateLessonStructure(lesson: any): void {
  if (!lesson || typeof lesson !== 'object') {
    throw new LessonParseError('Lesson must be an object');
  }

  // Check required top-level fields
  if (!lesson.metadata) {
    throw new LessonParseError('Missing required field: metadata');
  }
  if (!lesson.initialNode) {
    throw new LessonParseError('Missing required field: initialNode');
  }
  if (!lesson.nodes || !Array.isArray(lesson.nodes)) {
    throw new LessonParseError('Missing or invalid field: nodes (must be an array)');
  }
  if (lesson.nodes.length === 0) {
    throw new LessonParseError('Lesson must have at least one node');
  }

  // Validate metadata
  const meta = lesson.metadata;
  const requiredMetaFields = [
    'id', 'title', 'subject', 'grade', 'topic',
    'cbcStrand', 'cbcSubStrand', 'estimatedTime', 'difficulty', 'learningOutcomes'
  ];

  for (const field of requiredMetaFields) {
    if (!meta[field]) {
      throw new LessonParseError(`Missing required metadata field: ${field}`);
    }
  }

  // Validate learning outcomes
  if (!Array.isArray(meta.learningOutcomes) || meta.learningOutcomes.length === 0) {
    throw new LessonParseError('learningOutcomes must be a non-empty array');
  }

  // Validate each node
  for (let i = 0; i < lesson.nodes.length; i++) {
    const node = lesson.nodes[i];
    if (!node.id) {
      throw new LessonParseError(`Node at index ${i} is missing required field: id`);
    }
    if (!node.type) {
      throw new LessonParseError(`Node ${node.id} is missing required field: type`);
    }

    // Validate node-specific structure
    validateNodeType(node, i);
  }
}

/**
 * Validate node type-specific structure
 */
function validateNodeType(node: any, index: number): void {
  switch (node.type) {
    case 'teaching':
      if (!node.explanation || !node.explanation.text) {
        throw new LessonParseError(`Teaching node ${node.id} missing explanation.text`);
      }
      if (!node.transitions || !node.transitions.onNext) {
        throw new LessonParseError(`Teaching node ${node.id} missing transitions.onNext`);
      }
      break;

    case 'micro-eval':
      if (!node.question) {
        throw new LessonParseError(`Micro-eval node ${node.id} missing question`);
      }
      if (!node.question.text || !node.question.type || node.question.correctAnswer === undefined) {
        throw new LessonParseError(`Micro-eval node ${node.id} has incomplete question`);
      }
      if (!Array.isArray(node.question.hints)) {
        throw new LessonParseError(`Micro-eval node ${node.id} missing hints array`);
      }
      if (node.question.hints.length > 3) {
        throw new LessonParseError(`Micro-eval node ${node.id} has more than 3 hints (max allowed)`);
      }
      if (!node.knowledgeComponent) {
        throw new LessonParseError(`Micro-eval node ${node.id} missing knowledgeComponent`);
      }
      if (!node.transitions || !node.transitions.onCorrect || !node.transitions.onIncorrect) {
        throw new LessonParseError(`Micro-eval node ${node.id} missing required transitions`);
      }
      break;

    case 'scaffolding':
      if (!node.explanation || !node.explanation.text) {
        throw new LessonParseError(`Scaffolding node ${node.id} missing explanation.text`);
      }
      if (!node.scaffolding) {
        throw new LessonParseError(`Scaffolding node ${node.id} missing scaffolding config`);
      }
      if (!node.transitions || !node.transitions.onRetry) {
        throw new LessonParseError(`Scaffolding node ${node.id} missing transitions.onRetry`);
      }
      break;

    case 'practice':
      if (!node.instructions) {
        throw new LessonParseError(`Practice node ${node.id} missing instructions`);
      }
      if (!node.widget) {
        throw new LessonParseError(`Practice node ${node.id} missing widget`);
      }
      if (!node.transitions || !node.transitions.onComplete) {
        throw new LessonParseError(`Practice node ${node.id} missing transitions.onComplete`);
      }
      break;

    case 'summary':
      if (!node.summary || !node.summary.text || !Array.isArray(node.summary.keyTakeaways)) {
        throw new LessonParseError(`Summary node ${node.id} has incomplete summary`);
      }
      if (node.summary.keyTakeaways.length === 0) {
        throw new LessonParseError(`Summary node ${node.id} must have at least one key takeaway`);
      }
      if (!node.transitions || node.transitions.onComplete !== 'completed') {
        throw new LessonParseError(`Summary node ${node.id} must transition to 'completed'`);
      }
      break;

    default:
      throw new LessonParseError(`Node ${node.id} has invalid type: ${node.type}`);
  }
}

/**
 * Validate all node ID references
 */
function validateNodeReferences(lesson: any): void {
  // Build set of all node IDs
  const nodeIds = new Set<string>();
  for (const node of lesson.nodes) {
    if (nodeIds.has(node.id)) {
      throw new LessonParseError(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // Check initialNode exists
  if (!nodeIds.has(lesson.initialNode)) {
    throw new LessonParseError(
      `initialNode references non-existent node: ${lesson.initialNode}`,
      { availableNodes: Array.from(nodeIds) }
    );
  }

  // Check all transition references
  for (const node of lesson.nodes) {
    const transitions = node.transitions;
    if (!transitions) continue;

    // Check each transition target
    for (const [key, targetId] of Object.entries(transitions)) {
      if (targetId === 'completed') continue; // Special case for summary nodes

      if (typeof targetId !== 'string') {
        throw new LessonParseError(`Node ${node.id} has invalid transition ${key}: not a string`);
      }

      if (!nodeIds.has(targetId)) {
        throw new LessonParseError(
          `Node ${node.id} transition ${key} references non-existent node: ${targetId}`,
          { availableNodes: Array.from(nodeIds) }
        );
      }
    }
  }
}

/**
 * Validate CBC metadata
 */
function validateCBCMetadata(lesson: any): void {
  const meta = lesson.metadata;

  // Validate subject
  const validSubjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Kiswahili'];
  if (!validSubjects.includes(meta.subject)) {
    throw new LessonParseError(
      `Invalid subject: ${meta.subject}`,
      { validSubjects }
    );
  }

  // Validate grade
  const validGrades = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'
  ];
  if (!validGrades.includes(meta.grade)) {
    throw new LessonParseError(
      `Invalid grade: ${meta.grade}`,
      { validGrades }
    );
  }

  // Validate CBC strand
  const validStrands = ['Numbers', 'Algebra', 'Geometry', 'Measurement', 'Data Handling', 'Probability'];
  if (!validStrands.includes(meta.cbcStrand)) {
    throw new LessonParseError(
      `Invalid CBC strand: ${meta.cbcStrand}`,
      { validStrands }
    );
  }

  // Validate difficulty
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  if (!validDifficulties.includes(meta.difficulty)) {
    throw new LessonParseError(
      `Invalid difficulty: ${meta.difficulty}`,
      { validDifficulties }
    );
  }

  // Validate estimated time
  if (typeof meta.estimatedTime !== 'number' || meta.estimatedTime < 1) {
    throw new LessonParseError('estimatedTime must be a positive number');
  }
}

/**
 * Load lesson script from file path (for use in Node.js/build time)
 */
export async function loadLessonScript(filePath: string): Promise<LessonScript> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load lesson: ${response.statusText}`);
    }
    const jsonString = await response.text();
    return parseLessonScript(jsonString);
  } catch (error) {
    if (error instanceof LessonParseError) {
      throw error;
    }
    throw new LessonParseError(
      'Failed to load lesson script',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Validate a lesson script object (already parsed)
 */
export function validateLessonScript(lesson: any): lesson is LessonScript {
  try {
    validateLessonStructure(lesson);
    validateNodeReferences(lesson);
    validateCBCMetadata(lesson);
    return true;
  } catch (error) {
    return false;
  }
}
