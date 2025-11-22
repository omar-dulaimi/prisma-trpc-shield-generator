import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { ShieldTestUtils } from './test-utils';

describe('Comprehensive Schema Coverage', () => {
  const testOutputDir = join(process.cwd(), 'tests', 'generated', 'comprehensive');
  const comprehensiveSchemaPath = join(process.cwd(), 'tests', 'schemas', 'comprehensive.prisma');

  afterAll(() => {
    ShieldTestUtils.cleanup(testOutputDir);
  });

  it('should generate shield for complex schema with all Prisma features', async () => {
    await ShieldTestUtils.generateShield(comprehensiveSchemaPath);
    
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    expect(shieldContent).toBeTruthy();
    
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    expect(structure.hasImports).toBe(true);
    expect(structure.hasPermissions).toBe(true);
    expect(structure.hasQueries).toBe(true);
    expect(structure.hasMutations).toBe(true);
  });

  it('should handle all model types correctly', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    const modelNames = [
      'User', 'Profile', 'Post', 'Comment', 'Category', 
      'Product', 'Order', 'OrderItem', 'Tag', 'Setting', 'Log'
    ];
    
    const expected = ShieldTestUtils.getExpectedOperations(modelNames);
    
    // Verify all expected operations are present
    expect(structure.queries.length).toBeGreaterThanOrEqual(expected.queries.length);
    expect(structure.mutations.length).toBeGreaterThanOrEqual(expected.mutations.length);
    
    // Check specific operations for key models
    expect(structure.queries).toContain('findUniqueUser');
    expect(structure.queries).toContain('findManyPost');
    expect(structure.queries).toContain('aggregateOrder');
    expect(structure.mutations).toContain('createOneUser');
    expect(structure.mutations).toContain('updateManyPost');
    expect(structure.mutations).toContain('deleteOneComment');
  });

  it('should handle models with enums correctly', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // Should include operations for models that use enums (User model uses Role and Status enums)
    expect(shieldContent).toContain('findUniqueUser');
    expect(shieldContent).toContain('createOneUser');
  });

  it('should handle models with complex relationships', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    const structure = ShieldTestUtils.validateShieldStructure(shieldContent);
    
    // Models with self-references and many-to-many relationships
    expect(structure.queries).toContain('findUniqueCategory'); // self-referencing
    expect(structure.queries).toContain('findManyComment'); // tree structure
    expect(structure.mutations).toContain('createOneOrderItem'); // compound relations
  });

  it('should handle models with all field types', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // User model has various field types (String, Int, Boolean, DateTime, Enum, etc.)
    expect(shieldContent).toContain('findUniqueUser');
    expect(shieldContent).toContain('createOneUser');
    
    // Order model has Decimal, Json fields
    expect(shieldContent).toContain('findUniqueOrder');
    expect(shieldContent).toContain('createOneOrder');
  });

  it('should handle models with unique constraints and indexes', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // Models with unique constraints should still generate standard operations
    expect(shieldContent).toContain('findUniqueUser'); // has unique email
    expect(shieldContent).toContain('findUniquePost'); // has unique slug
    expect(shieldContent).toContain('findUniqueProduct'); // has unique sku
  });

  it('should generate valid TypeScript for complex schema', async () => {
    const shieldPath = join(testOutputDir, 'generated', 'shield.ts');
    const isValid = await ShieldTestUtils.validateTypeScript(shieldPath);
    expect(isValid).toBe(true);
  });

  it('should maintain performance with large schema', async () => {
    ShieldTestUtils.cleanup(testOutputDir);
    
    const generationTime = await ShieldTestUtils.measureGenerationTime(comprehensiveSchemaPath);
    
    // Should generate within 15 seconds even for complex schema
    expect(generationTime).toBeLessThan(15000);
  });

  it('should have consistent formatting', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // Should be properly formatted
    expect(shieldContent).toContain('export const permissions = shield<Context>({');
    expect(shieldContent).toContain('query: {');
    expect(shieldContent).toContain('mutation: {');
    expect(shieldContent).toContain('});');
    
    // Should have consistent indentation (2 spaces)
    const lines = shieldContent.split('\n');
    const querySection = lines.find(line => line.trim() === 'query: {');
    const mutationSection = lines.find(line => line.trim() === 'mutation: {');
    
    expect(querySection).toBeTruthy();
    expect(mutationSection).toBeTruthy();
  });

  it('should handle models with JSON fields correctly', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // Post model has Json metadata field, Order has Json address fields
    expect(shieldContent).toContain('findUniquePost');
    expect(shieldContent).toContain('findUniqueOrder');
    expect(shieldContent).toContain('createOnePost');
    expect(shieldContent).toContain('createOneOrder');
  });

  it('should handle array fields correctly', async () => {
    const shieldContent = ShieldTestUtils.readGeneratedShield(testOutputDir);
    
    // Post model has String[] tags, Product has String[] images
    expect(shieldContent).toContain('findUniquePost');
    expect(shieldContent).toContain('findUniqueProduct');
    expect(shieldContent).toContain('updateOnePost');
    expect(shieldContent).toContain('updateOneProduct');
  });
});