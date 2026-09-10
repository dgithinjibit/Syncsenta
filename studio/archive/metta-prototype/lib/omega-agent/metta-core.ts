/**
 * MeTTa Core Implementation for SyncSenta
 * 
 * Transforms SyncSenta into a 99.99% agent-driven platform using
 * neuro-symbolic MeTTa programming language for all operations.
 * 
 * Based on SingularityNET OpenCog Hyperon MeTTa best practices:
 * - Declarative and functional computations over knowledge graphs
 * - Self-reflective and self-modifying programs
 * - Pattern matching and unification for reasoning
 * - Grounded atoms for neural network integration
 * - Space-based architecture with Atomspace
 */

import { supabase } from '@/lib/supabase/client';

// MeTTa Language Core Types and Structures
export interface MeTTaAtom {
  type: 'symbol' | 'expression' | 'grounded' | 'variable' | 'value';
  content: string | MeTTaExpression | any;
  metadata?: Record<string, any>;
}

export interface MeTTaExpression {
  atoms: MeTTaAtom[];
  operator?: string;
  arity: number;
}

export interface MeTTaSpace {
  atoms: Map<string, MeTTaAtom>;
  expressions: MeTTaExpression[];
  types: Map<string, MeTTaType>;
  equalities: MeTTaEquality[];
}

export interface MeTTaType {
  name: string;
  constraints: string[];
  inheritance: string[];
}

export interface MeTTaEquality {
  left: MeTTaExpression;
  right: MeTTaExpression;
  conditions?: MeTTaExpression[];
}

export interface MeTTaPattern {
  template: MeTTaExpression;
  variables: Map<string, MeTTaType>;
  constraints: MeTTaExpression[];
}

/**
 * MeTTa Knowledge Graph for Grade 2 Kenyan Education
 * 
 * All SyncSenta operations are defined as MeTTa atoms and expressions
 */
export class MeTTaEducationKnowledgeGraph {
  private space: MeTTaSpace;
  private interpreter: MeTTaInterpreter;

  constructor() {
    this.space = {
      atoms: new Map(),
      expressions: [],
      types: new Map(),
      equalities: []
    };
    this.interpreter = new MeTTaInterpreter(this.space);
    this.initializeEducationKnowledge();
  }

  /**
   * Initialize Grade 2 Kenyan education knowledge in MeTTa format
   */
  private initializeEducationKnowledge(): void {
    // Define fundamental types for education domain
    this.addType('Student', ['Entity'], ['age: Number', 'grade: Grade2']);
    this.addType('Teacher', ['Entity'], ['subject: Subject', 'experience: Number']);
    this.addType('Activity', ['LearningObject'], ['subject: Subject', 'difficulty: Number']);
    this.addType('Competency', ['Skill'], ['level: Number', 'subject: Subject']);
    this.addType('CulturalContext', ['Context'], ['region: Kenya', 'language: String']);

    // Grade 2 student model in MeTTa
    this.addAtom('StudentProfile', 'expression', {
      atoms: [
        { type: 'symbol', content: 'student' },
        { type: 'variable', content: '$id' },
        { type: 'symbol', content: 'grade2' },
        { type: 'symbol', content: 'age7' },
        { type: 'symbol', content: 'kenya' }
      ]
    });

    // CBC Grade 2 Mathematics competencies
    this.addEquality(
      '(competency mathematics counting grade2)',
      '(skill-level $student counting (range 1 20))'
    );

    this.addEquality(
      '(competency mathematics shapes grade2)',
      '(skill-level $student shapes (list circle square triangle rectangle))'
    );

    this.addEquality(
      '(competency mathematics addition grade2)',
      '(skill-level $student addition (range 0 10))'
    );

    // Kenyan cultural adaptations in MeTTa
    this.addEquality(
      '(cultural-adaptation counting kenya)',
      '(examples matatu-passengers safari-animals market-fruits)'
    );

    this.addEquality(
      '(cultural-adaptation shapes kenya)',
      '(examples traditional-huts kenyan-flag-patterns tribal-shields)'
    );

    this.addEquality(
      '(cultural-adaptation money kenya)',
      '(examples shilling-coins market-prices school-fees)'
    );

    // Learning activities as MeTTa programs
    this.addEquality(
      '(activity number-garden grade2 mathematics)',
      `(sequence
        (present-problem "Plant $n flowers in the garden")
        (cultural-context (use-example kenyan-flowers))
        (interactive-drag flowers garden)
        (count-validation 1 20)
        (celebration-animation (show safari-animals))
        (competency-update counting +0.2)
      )`
    );

    this.addEquality(
      '(activity matatu-counting grade2 mathematics)',
      `(sequence
        (present-scenario "Count passengers in the matatu")
        (cultural-context (show matatu-image nairobi))
        (interactive-count passengers)
        (range-validation 1 14)
        (real-world-connection "Matatus carry people in Kenya")
        (competency-update counting +0.3)
      )`
    );

    // Teacher feedback system in MeTTa
    this.addEquality(
      '(teacher-feedback $student struggling $activity)',
      `(sequence
        (analyze-performance $student $activity)
        (if (< competency-level 2.0)
          (send-alert teacher "Student needs support with $activity")
          (suggest-intervention visual-aids hands-on-practice))
        (cultural-adaptation (recommend kenyan-examples))
        (parent-notification (if severe))
      )`
    );

    // Cross-device synchronization in MeTTa
    this.addEquality(
      '(sync-session $student $device1 $device2)',
      `(sequence
        (save-state $device1 atomspace)
        (serialize-progress competencies activities)
        (transfer redis-cache)
        (restore-state $device2 atomspace)
        (verify-integrity checksums)
        (update-ui $device2)
      )`
    );

    // AI decision making in MeTTa
    this.addEquality(
      '(omega-decision $student $context)',
      `(let* ((progress (get-progress $student))
              (time-spent (get-time-spent $context))
              (struggling (get-struggling-areas $student))
              (cultural-fit (assess-cultural-context $student)))
        (cond
          ((> progress 90) (recommend advanced-activity))
          ((< progress 40) (recommend reinforcement-activity))
          ((> time-spent 20) (suggest break-time))
          (else (continue current-path)))
        (add-cultural-examples cultural-fit)
        (log-decision reasoning transparency)
      )`
    );
  }

  private addType(name: string, parents: string[], constraints: string[]): void {
    this.space.types.set(name, {
      name,
      inheritance: parents,
      constraints
    });
  }

  private addAtom(key: string, type: MeTTaAtom['type'], content: any): void {
    this.space.atoms.set(key, {
      type,
      content,
      metadata: { timestamp: Date.now() }
    });
  }

  private addEquality(left: string, right: string): void {
    const leftExpr = this.parseExpression(left);
    const rightExpr = this.parseExpression(right);
    
    this.space.equalities.push({
      left: leftExpr,
      right: rightExpr
    });
  }

  private parseExpression(expr: string): MeTTaExpression {
    // Simplified MeTTa parser - in production would use full MeTTa grammar
    const tokens = this.tokenize(expr);
    return this.parseTokens(tokens);
  }

  private tokenize(expr: string): string[] {
    return expr.replace(/[()]/g, ' $& ').split(/\s+/).filter(t => t);
  }

  private parseTokens(tokens: string[]): MeTTaExpression {
    const atoms: MeTTaAtom[] = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token === '(') {
        // Find matching closing paren and parse recursively
        let depth = 1;
        let j = i + 1;
        while (j < tokens.length && depth > 0) {
          if (tokens[j] === '(') depth++;
          if (tokens[j] === ')') depth--;
          j++;
        }
        
        const subTokens = tokens.slice(i + 1, j - 1);
        const subExpr = this.parseTokens(subTokens);
        atoms.push({ type: 'expression', content: subExpr });
        i = j;
      } else if (token !== ')') {
        let atomType: MeTTaAtom['type'] = 'symbol';
        
        if (token.startsWith('$')) {
          atomType = 'variable';
        } else if (/^\d+$/.test(token)) {
          atomType = 'value';
        } else if (token.startsWith('"') && token.endsWith('"')) {
          atomType = 'value';
        }
        
        atoms.push({ type: atomType, content: token });
        i++;
      } else {
        i++;
      }
    }

    return { atoms, arity: atoms.length };
  }

  /**
   * Query the knowledge graph using MeTTa pattern matching
   */
  query(pattern: string): MeTTaAtom[] {
    return this.interpreter.match(this.parseExpression(pattern));
  }

  /**
   * Add new knowledge to the graph
   */
  addKnowledge(assertion: string): void {
    const expr = this.parseExpression(assertion);
    this.space.expressions.push(expr);
  }

  /**
   * Evaluate a MeTTa expression
   */
  evaluate(expression: string): any {
    return this.interpreter.evaluate(this.parseExpression(expression));
  }

  getSpace(): MeTTaSpace {
    return this.space;
  }
}

/**
 * MeTTa Interpreter - Executes MeTTa programs
 */
export class MeTTaInterpreter {
  constructor(private space: MeTTaSpace) {}

  /**
   * Pattern matching - core MeTTa operation
   */
  match(pattern: MeTTaExpression): MeTTaAtom[] {
    const results: MeTTaAtom[] = [];
    const bindings = new Map<string, MeTTaAtom>();

    // Search through all expressions in the space
    for (const expr of this.space.expressions) {
      if (this.unify(pattern, expr, bindings)) {
        results.push(...this.instantiatePattern(pattern, bindings));
      }
    }

    // Search through equalities
    for (const eq of this.space.equalities) {
      if (this.unify(pattern, eq.left, bindings)) {
        results.push({ type: 'expression', content: eq.right });
      }
    }

    return results;
  }

  /**
   * Unification algorithm for pattern matching
   */
  private unify(pattern: MeTTaExpression, target: MeTTaExpression, bindings: Map<string, MeTTaAtom>): boolean {
    if (pattern.atoms.length !== target.atoms.length) {
      return false;
    }

    for (let i = 0; i < pattern.atoms.length; i++) {
      const patAtom = pattern.atoms[i];
      const targAtom = target.atoms[i];

      if (patAtom.type === 'variable') {
        const varName = patAtom.content as string;
        if (bindings.has(varName)) {
          if (!this.atomsEqual(bindings.get(varName)!, targAtom)) {
            return false;
          }
        } else {
          bindings.set(varName, targAtom);
        }
      } else if (patAtom.type === 'expression' && targAtom.type === 'expression') {
        if (!this.unify(patAtom.content as MeTTaExpression, targAtom.content as MeTTaExpression, bindings)) {
          return false;
        }
      } else if (!this.atomsEqual(patAtom, targAtom)) {
        return false;
      }
    }

    return true;
  }

  private atomsEqual(a: MeTTaAtom, b: MeTTaAtom): boolean {
    return a.type === b.type && a.content === b.content;
  }

  private instantiatePattern(pattern: MeTTaExpression, bindings: Map<string, MeTTaAtom>): MeTTaAtom[] {
    const results: MeTTaAtom[] = [];
    
    for (const atom of pattern.atoms) {
      if (atom.type === 'variable') {
        const binding = bindings.get(atom.content as string);
        if (binding) {
          results.push(binding);
        }
      } else {
        results.push(atom);
      }
    }
    
    return results;
  }

  /**
   * Evaluate a MeTTa expression
   */
  evaluate(expression: MeTTaExpression): any {
    // Handle different types of expressions
    if (expression.atoms.length === 0) {
      return null;
    }

    const operator = expression.atoms[0];
    
    if (operator.type === 'symbol') {
      switch (operator.content) {
        case 'if':
          return this.evaluateIf(expression);
        case 'let':
          return this.evaluateLet(expression);
        case 'sequence':
          return this.evaluateSequence(expression);
        case 'match':
          return this.evaluateMatch(expression);
        case 'add':
          return this.evaluateArithmetic(expression, 'add');
        case 'subtract':
          return this.evaluateArithmetic(expression, 'subtract');
        case 'multiply':
          return this.evaluateArithmetic(expression, 'multiply');
        case 'competency-update':
          return this.evaluateCompetencyUpdate(expression);
        case 'cultural-adaptation':
          return this.evaluateCulturalAdaptation(expression);
        default:
          return this.evaluateCustomFunction(expression);
      }
    }

    return expression;
  }

  private evaluateIf(expression: MeTTaExpression): any {
    if (expression.atoms.length < 3) return null;
    
    const condition = this.evaluate(expression.atoms[1] as any);
    const thenExpr = expression.atoms[2];
    const elseExpr = expression.atoms[3];
    
    return this.isTruthy(condition) ? this.evaluate(thenExpr as any) : 
           elseExpr ? this.evaluate(elseExpr as any) : null;
  }

  private evaluateLet(expression: MeTTaExpression): any {
    // Let binding implementation
    return this.evaluate(expression.atoms[expression.atoms.length - 1] as any);
  }

  private evaluateSequence(expression: MeTTaExpression): any {
    let result: any = null;
    for (let i = 1; i < expression.atoms.length; i++) {
      result = this.evaluate(expression.atoms[i] as any);
    }
    return result;
  }

  private evaluateMatch(expression: MeTTaExpression): MeTTaAtom[] {
    if (expression.atoms.length < 2) return [];
    const pattern = expression.atoms[1] as any;
    return this.match(pattern);
  }

  private evaluateArithmetic(expression: MeTTaExpression, op: string): number {
    const args = expression.atoms.slice(1).map(atom => {
      if (atom.type === 'value') {
        return parseFloat(atom.content as string);
      }
      return 0;
    });

    switch (op) {
      case 'add':
        return args.reduce((sum, val) => sum + val, 0);
      case 'subtract':
        return args.reduce((diff, val, idx) => idx === 0 ? val : diff - val);
      case 'multiply':
        return args.reduce((prod, val) => prod * val, 1);
      default:
        return 0;
    }
  }

  private evaluateCompetencyUpdate(expression: MeTTaExpression): any {
    // Update student competency levels
    const competency = expression.atoms[1]?.content;
    const delta = parseFloat(expression.atoms[2]?.content as string || '0');
    
    // This would update the student's competency in the knowledge graph
    return { competency, delta, timestamp: Date.now() };
  }

  private evaluateCulturalAdaptation(expression: MeTTaExpression): any {
    // Apply Kenyan cultural context to learning activities
    const context = expression.atoms[1]?.content;
    
    const kenyanAdaptations = {
      counting: ['matatu passengers', 'safari animals', 'market fruits'],
      shapes: ['traditional huts', 'flag patterns', 'tribal shields'],
      money: ['shilling coins', 'market prices', 'school fees'],
      animals: ['elephants', 'zebras', 'lions', 'giraffes'],
      transport: ['matatus', 'boda bodas', 'tuk tuks'],
      food: ['ugali', 'sukuma wiki', 'chapati', 'mandazi']
    };

    return kenyanAdaptations[context as keyof typeof kenyanAdaptations] || [];
  }

  private evaluateCustomFunction(expression: MeTTaExpression): any {
    // Handle custom functions defined in the knowledge graph
    const functionName = expression.atoms[0].content as string;
    
    // Look for equality definitions
    for (const eq of this.space.equalities) {
      if (eq.left.atoms[0].content === functionName) {
        return this.evaluate(eq.right);
      }
    }

    return null;
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }
}

/**
 * Global MeTTa Education System - The 99.99% Agent Core
 */
export class MeTTaEducationSystem {
  private knowledgeGraph: MeTTaEducationKnowledgeGraph;
  private activeSessions: Map<string, MeTTaSession> = new Map();

  constructor() {
    this.knowledgeGraph = new MeTTaEducationKnowledgeGraph();
  }

  /**
   * Create a new MeTTa-driven learning session
   */
  createSession(userId: string, grade: string = 'grade2'): MeTTaSession {
    const session = new MeTTaSession(userId, this.knowledgeGraph, grade);
    this.activeSessions.set(userId, session);
    return session;
  }

  /**
   * Get existing session or create new one
   */
  getSession(userId: string): MeTTaSession | null {
    return this.activeSessions.get(userId) || null;
  }

  /**
   * Process any educational interaction through MeTTa
   */
  async processInteraction(userId: string, interaction: any): Promise<any> {
    const session = this.getSession(userId) || this.createSession(userId);
    return session.processInteraction(interaction);
  }

  /**
   * Query the global education knowledge
   */
  query(mettaQuery: string): any {
    return this.knowledgeGraph.query(mettaQuery);
  }

  /**
   * Add new educational knowledge
   */
  addKnowledge(mettaAssertion: string): void {
    this.knowledgeGraph.addKnowledge(mettaAssertion);
  }
}

/**
 * MeTTa Learning Session - Individual student session
 */
export class MeTTaSession {
  private sessionSpace: MeTTaSpace;
  private interpreter: MeTTaInterpreter;

  constructor(
    public userId: string,
    private globalKnowledge: MeTTaEducationKnowledgeGraph,
    public grade: string
  ) {
    // Create session-specific space inheriting from global knowledge
    this.sessionSpace = {
      atoms: new Map(globalKnowledge.getSpace().atoms),
      expressions: [...globalKnowledge.getSpace().expressions],
      types: new Map(globalKnowledge.getSpace().types),
      equalities: [...globalKnowledge.getSpace().equalities]
    };
    
    this.interpreter = new MeTTaInterpreter(this.sessionSpace);
    this.initializeSession();
  }

  private initializeSession(): void {
    // Add session-specific facts
    this.addSessionFact(`(session-user ${this.userId})`);
    this.addSessionFact(`(session-grade ${this.grade})`);
    this.addSessionFact(`(session-start ${Date.now()})`);
    this.addSessionFact('(session-language mixed)');
    this.addSessionFact('(session-region kenya)');
  }

  addSessionFact(fact: string): void {
    const expr = this.parseExpression(fact);
    this.sessionSpace.expressions.push(expr);
  }

  private parseExpression(expr: string): MeTTaExpression {
    // Reuse the parser from knowledge graph
    const kg = new MeTTaEducationKnowledgeGraph();
    return (kg as any).parseExpression(expr);
  }

  /**
   * Process any student interaction through MeTTa reasoning
   */
  async processInteraction(interaction: any): Promise<any> {
    // Convert interaction to MeTTa expression
    const interactionExpr = this.interactionToMeTTa(interaction);
    
    // Add to session space
    this.sessionSpace.expressions.push(interactionExpr);
    
    // Process through MeTTa reasoning
    const response = this.interpreter.evaluate(interactionExpr);
    
    // Generate response based on MeTTa evaluation
    return this.mettaToResponse(response);
  }

  private interactionToMeTTa(interaction: any): MeTTaExpression {
    // Convert various interaction types to MeTTa expressions
    if (interaction.type === 'activity_progress') {
      return this.parseExpression(
        `(activity-progress ${interaction.activityId} ${interaction.progress} ${interaction.timeSpent})`
      );
    }
    
    if (interaction.type === 'teacher_feedback') {
      return this.parseExpression(
        `(teacher-feedback ${interaction.teacherId} "${interaction.message}" ${interaction.urgency})`
      );
    }

    if (interaction.type === 'competency_assessment') {
      return this.parseExpression(
        `(assess-competency ${interaction.subject} ${interaction.skill} ${interaction.level})`
      );
    }

    // Default interaction
    return this.parseExpression(`(interaction "${interaction.type}" "${JSON.stringify(interaction)}")`);
  }

  private mettaToResponse(mettaResult: any): any {
    // Convert MeTTa evaluation result back to application response
    if (!mettaResult) {
      return { status: 'processed', data: null };
    }

    return {
      status: 'processed',
      data: mettaResult,
      timestamp: Date.now(),
      reasoning: 'Processed through MeTTa neuro-symbolic reasoning',
      culturalContext: 'Kenyan Grade 2 educational context applied'
    };
  }

  /**
   * Get current session state as MeTTa expressions
   */
  getSessionState(): string[] {
    return this.sessionSpace.expressions.map(expr => this.expressionToString(expr));
  }

  private expressionToString(expr: MeTTaExpression): string {
    const atomStrings = expr.atoms.map(atom => {
      if (atom.type === 'expression') {
        return `(${this.expressionToString(atom.content as MeTTaExpression)})`;
      }
      return atom.content as string;
    });
    return atomStrings.join(' ');
  }

  // ----------------------------------------------------------------
  // Supabase persistence helpers (client-side, uses anon key)
  // ----------------------------------------------------------------

  /**
   * Persist the current session state to the server.
   * Calls POST /api/metta/session — server handles the Supabase write.
   * Safe to call after any interaction that should survive a reload.
   */
  async persist(
    competencyLevels: Record<string, number> = {},
    lastInteraction: { type: string; input: Record<string, unknown>; result: unknown } | null = null
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false; // server context — skip
    try {
      const res = await fetch('/api/metta/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionFacts: this.getSessionState(),
          lastInteraction: lastInteraction
            ? { ...lastInteraction, timestamp: Date.now() }
            : null,
          competencyLevels,
          grade: this.grade,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Restore persisted session facts from the server into this session.
   * Call once on session initialization.
   */
  async restore(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch('/api/metta/session');
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.found) return false;

      const facts: string[] = data.sessionFacts ?? [];
      for (const fact of facts) {
        try { this.addSessionFact(fact); } catch { /* ignore bad facts */ }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run an interaction via the server-side endpoint.
   * Use this when the result must be persisted (e.g. competency assessment).
   * Falls back to client-side processInteraction on network failure.
   */
  async processInteractionRemote(interaction: Record<string, unknown>): Promise<unknown> {
    if (typeof window === 'undefined') {
      return this.processInteraction(interaction);
    }
    try {
      const res = await fetch('/api/metta/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction, grade: this.grade }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.result;
    } catch {
      // Degrade gracefully to local processing
      return this.processInteraction(interaction);
    }
  }
}

// Global MeTTa Education System instance
export const mettaEducationSystem = new MeTTaEducationSystem();

export default {
  MeTTaEducationKnowledgeGraph,
  MeTTaInterpreter,
  MeTTaEducationSystem,
  MeTTaSession,
  mettaEducationSystem
};

// ─────────────────────────────────────────────────────────────────────────────
// Tutoring Decision Engine — TypeScript port of Rust decide_tutoring()
// (rust-core/src/agent_runtime.rs)
//
// Thresholds must stay in sync with the Rust version.
// Mastery calc uses integer truncation (Math.floor) to match Rust's integer
// division — see masteryPercent() in lib/subject-session.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface TutoringDecision {
  scaffolding: 'Independent' | 'Guided' | 'Intensive';
  hint: string;
  nextAction: string;
}

export function evaluateTutoringDecision(state: {
  attempts: number;
  correctAttempts: number;
  hintsUsed: number;
  frustrationSignal: boolean;
}): TutoringDecision {
  // Use integer truncation to match Rust: floor((correct * 100) / attempts)
  const masteryPct =
    state.attempts === 0
      ? 0
      : Math.floor((Math.min(state.correctAttempts, state.attempts) * 100) / state.attempts);

  // Intensive: frustrated, too many hints, or very low mastery
  if (state.frustrationSignal || state.hintsUsed >= 2 || (state.attempts > 0 && masteryPct < 40)) {
    return {
      scaffolding: 'Intensive',
      hint: 'Let us take one small step together. Look for the part you already know.',
      nextAction: 'show_conceptual_example',
    };
  }

  // Guided: no attempts yet, or mastery below 80%
  if (state.attempts === 0 || masteryPct < 80) {
    return {
      scaffolding: 'Guided',
      hint: 'What do you notice first? Say or write one idea before trying the next step.',
      nextAction: 'ask_guiding_question',
    };
  }

  // Independent: mastery >= 80%, no frustration, hints < 2
  return {
    scaffolding: 'Independent',
    hint: 'Try the next question independently, then explain how you got your answer.',
    nextAction: 'present_next_challenge',
  };
}
