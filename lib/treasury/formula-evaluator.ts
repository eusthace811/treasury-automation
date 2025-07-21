/**
 * Safe formula evaluation engine for payment amount calculations.
 * Supports basic mathematical operations and financial functions without code injection risks.
 */

export interface FormulaEvaluator {
  evaluate(formula: string, baseValue: number): number | null;
  validateFormula(formula: string): boolean;
  getSupportedOperations(): string[];
}

/**
 * Mathematical operation types supported by the formula evaluator
 */
type Operation = '+' | '-' | '*' | '/' | '%';
type FinancialFunction = 'MIN' | 'MAX' | 'ROUND' | 'CEIL' | 'FLOOR' | 'ABS';

interface ParsedFormula {
  operations: Array<{
    operator: Operation;
    operand: number;
  }>;
  functions: Array<{
    name: FinancialFunction;
    params: number[];
  }>;
}

export class SafeFormulaEvaluator implements FormulaEvaluator {
  private readonly supportedOperations: Operation[] = ['+', '-', '*', '/', '%'];
  private readonly supportedFunctions: FinancialFunction[] = [
    'MIN',
    'MAX',
    'ROUND',
    'CEIL',
    'FLOOR',
    'ABS',
  ];

  /**
   * Evaluate a formula safely against a base value
   */
  evaluate(formula: string, baseValue: number): number | null {
    try {
      if (!this.validateFormula(formula)) {
        return null;
      }

      const normalizedFormula = formula.trim();

      // Handle simple single operations first (most common case)
      const simpleResult = this.evaluateSimpleOperation(
        normalizedFormula,
        baseValue,
      );
      if (simpleResult !== null) {
        return simpleResult;
      }

      // Handle complex formulas with multiple operations
      return this.evaluateComplexFormula(normalizedFormula, baseValue);
    } catch (error) {
      console.error(`Formula evaluation error for "${formula}":`, error);
      return null;
    }
  }

  /**
   * Validate if a formula is safe and correctly formatted
   */
  validateFormula(formula: string): boolean {
    if (!formula || typeof formula !== 'string') {
      return false;
    }

    const normalizedFormula = formula.trim();

    // Check for potentially dangerous patterns
    if (this.containsUnsafePatterns(normalizedFormula)) {
      return false;
    }

    // Validate basic structure
    return this.validateFormulaStructure(normalizedFormula);
  }

  /**
   * Get list of supported operations for documentation
   */
  getSupportedOperations(): string[] {
    return [
      // Basic operations
      '* 0.1',
      '* 2.5',
      '/ 12',
      '+ 100',
      '- 50',
      '% 7',

      // Combined operations
      '* 0.1 + 100',
      '/ 12 - 50',
      '* 1.15 + 500',

      // Financial functions
      'MIN(, 5000)',
      'MAX(, 1000)',
      'ROUND(* 0.1)',
      'CEIL(/ 12)',
      'FLOOR(* 0.95)',
      'ABS(- 100)',

      // Complex examples
      'MIN(* 0.1, 5000)',
      'MAX(/ 12 + 100, 1000)',
    ];
  }

  private evaluateSimpleOperation(
    formula: string,
    baseValue: number,
  ): number | null {
    // Match simple operations like "* 0.1", "+ 100", "- 50", "/ 12", "% 7"
    const simpleOpRegex = /^([+\-*\/%])\s*([0-9]+(?:\.[0-9]+)?)$/;
    const match = formula.match(simpleOpRegex);

    if (!match) {
      return null;
    }

    const operator = match[1] as Operation;
    const operand = Number.parseFloat(match[2]);

    if (Number.isNaN(operand)) {
      return null;
    }

    return this.applyOperation(baseValue, operator, operand);
  }

  private evaluateComplexFormula(
    formula: string,
    baseValue: number,
  ): number | null {
    const result = baseValue;

    // Handle financial functions first
    const functionResult = this.evaluateFinancialFunctions(formula, result);
    if (functionResult !== null) {
      return functionResult;
    }

    // Parse and evaluate sequential operations
    const operations = this.parseOperations(formula);
    if (operations.length === 0) {
      return null;
    }

    for (const operation of operations) {
      const operationResult = this.applyOperation(
        result,
        operation.operator,
        operation.operand,
      );
      if (result === null || !Number.isFinite(result)) {
        return null;
      }
    }

    return result;
  }

  private evaluateFinancialFunctions(
    formula: string,
    baseValue: number,
  ): number | null {
    // Handle functions like MIN(* 0.1, 5000), MAX(/ 12 + 100, 1000), ROUND(* 0.95)
    const functionRegex = /(MIN|MAX|ROUND|CEIL|FLOOR|ABS)\s*\(([^)]+)\)/;
    const match = formula.match(functionRegex);

    if (!match) {
      return null;
    }

    const functionName = match[1] as FinancialFunction;
    const params = match[2].split(',').map((p) => p.trim());

    switch (functionName) {
      case 'MIN':
        return this.evaluateMinFunction(params, baseValue);
      case 'MAX':
        return this.evaluateMaxFunction(params, baseValue);
      case 'ROUND':
        return this.evaluateRoundFunction(params, baseValue);
      case 'CEIL':
        return this.evaluateCeilFunction(params, baseValue);
      case 'FLOOR':
        return this.evaluateFloorFunction(params, baseValue);
      case 'ABS':
        return this.evaluateAbsFunction(params, baseValue);
      default:
        return null;
    }
  }

  private evaluateMinFunction(
    params: string[],
    baseValue: number,
  ): number | null {
    if (params.length !== 2) return null;
    const val1 = this.evaluateParam(params[0], baseValue);
    const val2 = this.evaluateParam(params[1], baseValue);
    if (val1 === null || val2 === null) return null;
    return Math.min(val1, val2);
  }

  private evaluateMaxFunction(
    params: string[],
    baseValue: number,
  ): number | null {
    if (params.length !== 2) return null;
    const val1 = this.evaluateParam(params[0], baseValue);
    const val2 = this.evaluateParam(params[1], baseValue);
    if (val1 === null || val2 === null) return null;
    return Math.max(val1, val2);
  }

  private evaluateRoundFunction(
    params: string[],
    baseValue: number,
  ): number | null {
    if (params.length !== 1) return null;
    const val = this.evaluateParam(params[0], baseValue);
    if (val === null) return null;
    return Math.round(val);
  }

  private evaluateCeilFunction(
    params: string[],
    baseValue: number,
  ): number | null {
    if (params.length !== 1) return null;
    const val = this.evaluateParam(params[0], baseValue);
    if (val === null) return null;
    return Math.ceil(val);
  }

  private evaluateFloorFunction(
    params: string[],
    baseValue: number,
  ): number | null {
    if (params.length !== 1) return null;
    const val = this.evaluateParam(params[0], baseValue);
    if (val === null) return null;
    return Math.floor(val);
  }

  private evaluateAbsFunction(
    params: string[],
    baseValue: number,
  ): number | null {
    if (params.length !== 1) return null;
    const val = this.evaluateParam(params[0], baseValue);
    if (val === null) return null;
    return Math.abs(val);
  }

  private evaluateParam(param: string, baseValue: number): number | null {
    // If param is empty, use base value (for cases like MIN(, 5000))
    if (!param) {
      return baseValue;
    }

    // If param is a number, return it
    const numParam = Number.parseFloat(param);
    if (!Number.isNaN(numParam)) {
      return numParam;
    }

    // If param is an operation, evaluate it
    return (
      this.evaluateSimpleOperation(param, baseValue) ||
      this.evaluateComplexFormula(param, baseValue)
    );
  }

  private parseOperations(
    formula: string,
  ): Array<{ operator: Operation; operand: number }> {
    // Parse operations like "* 0.1 + 100 - 50"
    const operations: Array<{ operator: Operation; operand: number }> = [];

    // Remove function calls first to avoid interference
    const cleanFormula = formula.replace(
      /(MIN|MAX|ROUND|CEIL|FLOOR|ABS)\s*\([^)]+\)/g,
      '',
    );

    // Split by operations while preserving the operators
    const operationRegex = /([+\-*\/%])\s*([0-9]+(?:\.[0-9]+)?)/g;
    let match: RegExpExecArray | null;

    match = operationRegex.exec(cleanFormula);
    while (match !== null) {
      const operator = match[1] as Operation;
      const operand = Number.parseFloat(match[2]);

      if (!Number.isNaN(operand)) {
        operations.push({ operator, operand });
      }
    }

    return operations;
  }

  private applyOperation(
    baseValue: number,
    operator: Operation,
    operand: number,
  ): number | null {
    switch (operator) {
      case '+':
        return baseValue + operand;
      case '-':
        return baseValue - operand;
      case '*':
        return baseValue * operand;
      case '/':
        if (operand === 0) {
          console.warn('Division by zero in formula');
          return null;
        }
        return baseValue / operand;
      case '%':
        if (operand === 0) {
          console.warn('Modulo by zero in formula');
          return null;
        }
        return baseValue % operand;
      default:
        return null;
    }
  }

  private containsUnsafePatterns(formula: string): boolean {
    // Check for potentially dangerous patterns
    const unsafePatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /=>/,
      /\bthis\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\bprocess\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\bexport\b/,
      /[{}[\]]/, // No object/array literals
      /[;&|]/, // No command separators
    ];

    return unsafePatterns.some((pattern) => pattern.test(formula));
  }

  private validateFormulaStructure(formula: string): boolean {
    // Allow only numbers, operators, parentheses, function names, spaces, commas, and dots
    const allowedChars = /^[0-9+\-*\/%().,\s\w]*$/;

    if (!allowedChars.test(formula)) {
      return false;
    }

    // Check balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return false; // More closing than opening
    }

    return parenCount === 0; // Balanced parentheses
  }
}

// Export singleton instance for convenience
export const safeFormulaEvaluator = new SafeFormulaEvaluator();

// Helper function for easy formula evaluation
export function evaluateFormula(
  formula: string,
  baseValue: number,
): number | null {
  return safeFormulaEvaluator.evaluate(formula, baseValue);
}

// Helper function for formula validation
export function validateFormula(formula: string): boolean {
  return safeFormulaEvaluator.validateFormula(formula);
}
