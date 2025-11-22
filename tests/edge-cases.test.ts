import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { ShieldTestUtils } from './test-utils';

describe('Edge Cases and Complex Scenarios', () => {
  const testOutputDir = join(process.cwd(), 'tests', 'generated', 'edge-cases');
  const edgeCasesSchemaPath = join(process.cwd(), 'tests', 'schemas', 'edge-cases.prisma');

  afterAll(() => {
    ShieldTestUtils.cleanup(testOutputDir);
  });

  it('should generate shield for edge case schema', async () => {
    await ShieldTestUtils.generateShield(edgeCasesSchemaPath);
    
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    expect(shieldContent).toBeTruthy();
    
    const validation = ShieldTestUtils.validateShieldSyntax(shieldContent);
    expect(validation.isValid).toBe(true);
  });

  it('should handle model with all possible field types', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // AllTypes model should generate all standard operations
    expect(structure.queries).toContain('findUniqueAllTypes');
    expect(structure.queries).toContain('findFirstAllTypes');
    expect(structure.queries).toContain('findManyAllTypes');
    expect(structure.queries).toContain('aggregateAllTypes');
    expect(structure.queries).toContain('groupByAllTypes');
    
    expect(structure.mutations).toContain('createOneAllTypes');
    expect(structure.mutations).toContain('updateOneAllTypes');
    expect(structure.mutations).toContain('deleteOneAllTypes');
    expect(structure.mutations).toContain('upsertOneAllTypes');
    expect(structure.mutations).toContain('updateManyAllTypes');
    expect(structure.mutations).toContain('deleteManyAllTypes');
  });

  it('should handle models with very long names', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // VeryLongModelNameThatTestsGeneratorLimits should work
    expect(structure.queries).toContain('findUniqueVeryLongModelNameThatTestsGeneratorLimits');
    expect(structure.mutations).toContain('createOneVeryLongModelNameThatTestsGeneratorLimits');
  });

  it('should handle models with reserved keywords as names', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // Select model (reserved SQL keyword)
    expect(structure.queries).toContain('findUniqueSelect');
    expect(structure.mutations).toContain('createOneSelect');
  });

  it('should handle self-referencing models', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // TreeNode model with self-reference
    expect(structure.queries).toContain('findUniqueTreeNode');
    expect(structure.queries).toContain('findManyTreeNode');
    expect(structure.mutations).toContain('createOneTreeNode');
    expect(structure.mutations).toContain('updateOneTreeNode');
  });

  it('should handle many-to-many relationships', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // Student and Course models with many-to-many relationship
    expect(structure.queries).toContain('findUniqueStudent');
    expect(structure.queries).toContain('findUniqueCourse');
    expect(structure.mutations).toContain('createOneStudent');
    expect(structure.mutations).toContain('createOneCourse');
  });

  it('should handle models with complex constraints', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // ComplexConstraints model with multiple unique constraints and indexes
    expect(structure.queries).toContain('findUniqueComplexConstraints');
    expect(structure.mutations).toContain('createOneComplexConstraints');
  });

  it('should handle isolated models with no relations', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // IsolatedModel with no relationships
    expect(structure.queries).toContain('findUniqueIsolatedModel');
    expect(structure.mutations).toContain('createOneIsolatedModel');
  });

  it('should handle models with mostly optional fields', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // MostlyOptional model
    expect(structure.queries).toContain('findUniqueMostlyOptional');
    expect(structure.mutations).toContain('createOneMostlyOptional');
  });

  it('should handle polymorphic-like structures', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // Attachment model with polymorphic-like fields
    expect(structure.queries).toContain('findUniqueAttachment');
    expect(structure.mutations).toContain('createOneAttachment');
  });

  it('should generate valid TypeScript for edge cases', async () => {
    const shieldPath = join(testOutputDir, 'generated', 'shield.ts');
    const isValid = await ShieldTestUtils.validateTypeScript(shieldPath);
    expect(isValid).toBe(true);
  });

  it('should handle enum fields correctly', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // AllTypes model has enum fields
    expect(structure.queries).toContain('findUniqueAllTypes');
    expect(structure.mutations).toContain('createOneAllTypes');
    
    // Should not cause any syntax errors
    const validation = ShieldTestUtils.validateShieldSyntax(shieldContent);
    expect(validation.isValid).toBe(true);
  });

  it('should handle array fields of different types', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // AllTypes model has String[] and Int[] fields
    expect(shieldContent).toContain('findUniqueAllTypes');
    expect(shieldContent).toContain('createOneAllTypes');
    
    const validation = ShieldTestUtils.validateShieldSyntax(shieldContent);
    expect(validation.isValid).toBe(true);
  });

  it('should maintain consistent operation naming', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // All query operations should follow the pattern
    for (const query of structure.queries) {
      expect(query).toMatch(/^(findUnique|findFirst|findMany|aggregate|groupBy)/);
    }
    
    // All mutation operations should follow the pattern
    for (const mutation of structure.mutations) {
      expect(mutation).toMatch(/^(createOne|updateOne|deleteOne|upsertOne|updateMany|deleteMany)/);
    }
  });

  it('should handle performance with complex edge cases', async () => {
    ShieldTestUtils.cleanup(testOutputDir);
    
    const generationTime = await ShieldTestUtils.measureGenerationTime(edgeCasesSchemaPath);
    
    // Should generate within reasonable time even with edge cases
    expect(generationTime).toBeLessThan(15000);
  });
});