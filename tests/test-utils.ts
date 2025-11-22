import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Test utilities for prisma-trpc-shield-generator
 */
export class ShieldTestUtils {
  /**
   * Generate shield file from a test schema
   */
  static async generateShield(schemaPath: string): Promise<string> {
    const command = `pnpm prisma generate --schema="${schemaPath}"`;
    try {
      execSync(command, { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000
      });
      return 'success';
    } catch (error) {
      throw new Error(`Failed to generate shield: ${error}`);
    }
  }

  /**
   * Read generated shield file
   */
  static readGeneratedShield(schemaDir: string): string {
    const shieldPath = join(schemaDir, 'generated', 'shield.ts');
    if (!existsSync(shieldPath)) {
      throw new Error(`Shield file not found at ${shieldPath}`);
    }
    return readFileSync(shieldPath, 'utf-8');
  }

  /**
   * Clean up generated files
   */
  static cleanup(schemaDir: string): void {
    const generatedPath = join(schemaDir, 'generated');
    if (existsSync(generatedPath)) {
      rmSync(generatedPath, { recursive: true, force: true });
    }
  }

  /**
   * Validate shield file structure
   */
  static validateShieldStructure(content: string): {
    hasImports: boolean;
    hasPermissions: boolean;
    hasQueries: boolean;
    hasMutations: boolean;
    queries: string[];
    mutations: string[];
  } {
    const hasImports = content.includes('import { shield, allow }');
    const hasPermissions = content.includes('export const permissions');
    const hasQueries = content.includes('query:');
    const hasMutations = content.includes('mutation:');

    // Extract operation names
    const queryMatches = content.match(/(\w+):\s*allow/g) || [];
    const queries: string[] = [];
    const mutations: string[] = [];

    // Simple parsing - could be improved with AST
    const lines = content.split('\n');
    let inQuery = false;
    let inMutation = false;

    for (const line of lines) {
      if (line.trim().startsWith('query:')) {
        inQuery = true;
        inMutation = false;
        continue;
      }
      if (line.trim().startsWith('mutation:')) {
        inQuery = false;
        inMutation = true;
        continue;
      }
      if (line.trim() === '},') {
        inQuery = false;
        inMutation = false;
        continue;
      }

      const match = line.match(/(\w+):\s*allow/);
      if (match) {
        const operation = match[1];
        if (inQuery) {
          queries.push(operation);
        } else if (inMutation) {
          mutations.push(operation);
        }
      }
    }

    return {
      hasImports,
      hasPermissions,
      hasQueries,
      hasMutations,
      queries,
      mutations
    };
  }

  /**
   * Expected operations for different model configurations
   */
  static getExpectedOperations(modelNames: string[]): {
    queries: string[];
    mutations: string[];
  } {
    const queries: string[] = [];
    const mutations: string[] = [];

    for (const modelName of modelNames) {
      // Query operations
      queries.push(`findUnique${modelName}`);
      queries.push(`findFirst${modelName}`);
      queries.push(`findMany${modelName}`);
      queries.push(`aggregate${modelName}`);
      queries.push(`groupBy${modelName}`);

      // Mutation operations
      mutations.push(`createOne${modelName}`);
      mutations.push(`updateOne${modelName}`);
      mutations.push(`deleteOne${modelName}`);
      mutations.push(`upsertOne${modelName}`);
      mutations.push(`updateMany${modelName}`);
      mutations.push(`deleteMany${modelName}`);
    }

    return { queries, mutations };
  }

  /**
   * Validate TypeScript compilation
   */
  static async validateTypeScript(filePath: string): Promise<boolean> {
    // For now, just check if the file exists and has valid TypeScript-like syntax
    // A more comprehensive check would require proper type resolution
    if (!existsSync(filePath)) {
      return false;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    
    // Basic syntax checks
    const hasValidImports = content.includes('import') && content.includes('from');
    const hasValidExport = content.includes('export');
    const hasMatchingBraces = (content.match(/{/g) || []).length === (content.match(/}/g) || []).length;
    const hasMatchingParens = (content.match(/\(/g) || []).length === (content.match(/\)/g) || []).length;
    
    return hasValidImports && hasValidExport && hasMatchingBraces && hasMatchingParens;
  }

  /**
   * Performance testing helper
   */
  static async measureGenerationTime(schemaPath: string): Promise<number> {
    const start = Date.now();
    await this.generateShield(schemaPath);
    const end = Date.now();
    return end - start;
  }

  /**
   * Validate shield import and basic syntax
   */
  static validateShieldSyntax(content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required imports
    if (!content.includes("import { shield, allow } from 'trpc-shield'")) {
      errors.push('Missing trpc-shield imports');
    }

    // Check export structure
    if (!content.includes('export const permissions = shield')) {
      errors.push('Missing permissions export');
    }

    // Check basic structure
    if (!content.includes('query:') && !content.includes('mutation:')) {
      errors.push('Missing query or mutation sections');
    }

    // Check for syntax issues (basic)
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}