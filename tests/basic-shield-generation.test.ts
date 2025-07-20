import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { ShieldTestUtils } from './test-utils';

describe('Basic Shield Generation', () => {
  const testOutputDir = join(process.cwd(), 'tests', 'generated', 'basic');
  const basicSchemaPath = join(process.cwd(), 'tests', 'schemas', 'basic.prisma');

  afterAll(() => {
    ShieldTestUtils.cleanup(testOutputDir);
  });

  it('should generate shield file from basic schema', async () => {
    await ShieldTestUtils.generateShield(basicSchemaPath);
    
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    expect(shieldContent).toBeTruthy();
    
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    expect(structure.hasImports).toBe(true);
    expect(structure.hasPermissions).toBe(true);
    expect(structure.hasQueries).toBe(true);
    expect(structure.hasMutations).toBe(true);
  });

  it('should contain correct operations for User and Post models', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    const expected = ShieldTestUtils.getExpectedOperations(['User', 'Post']);
    
    // Check if all expected queries are present
    for (const query of expected.queries) {
      expect(structure.queries).toContain(query);
    }
    
    // Check if all expected mutations are present
    for (const mutation of expected.mutations) {
      expect(structure.mutations).toContain(mutation);
    }
  });

  it('should generate valid TypeScript code', async () => {
    const shieldPath = join(testOutputDir, 'generated', 'shield.ts');
    const isValid = await ShieldTestUtils.validateTypeScript(shieldPath);
    expect(isValid).toBe(true);
  });

  it('should have correct shield syntax', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const validation = ShieldTestUtils.validateShieldSyntax(shieldContent);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should import context from correct path', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    expect(shieldContent).toContain("import { Context } from '../../../test-context'");
  });

  it('should set all operations to allow by default', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // All operations should be set to 'allow'
    const allowCount = (shieldContent.match(/:\s*allow/g) || []).length;
    const totalOperations = structure.queries.length + structure.mutations.length;
    
    expect(allowCount).toBe(totalOperations);
  });

  it('should generate within reasonable time', async () => {
    ShieldTestUtils.cleanup(testOutputDir);
    
    const generationTime = await ShieldTestUtils.measureGenerationTime(basicSchemaPath);
    
    // Should generate within 12 seconds
    expect(generationTime).toBeLessThan(12000);
  });
});