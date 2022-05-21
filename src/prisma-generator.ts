import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import { parseEnvValue } from '@prisma/sdk';
import { EnvValue, GeneratorOptions } from '@prisma/generator-helper';
import path from 'path';
import { promises as fs } from 'fs';
import removeDir from './utils/removeDir';
import { writeFileSafely } from './utils/writeFileSafely';
import { constructShield } from './helpers';

export async function generate(options: GeneratorOptions) {
  const outputDir = parseEnvValue(options.generator.output as EnvValue);
  await fs.mkdir(outputDir, { recursive: true });
  await removeDir(outputDir, true);

  const prismaClientProvider = options.otherGenerators.find(
    (it) => parseEnvValue(it.provider) === 'prisma-client-js',
  );
  const prismaClientPath = parseEnvValue(
    prismaClientProvider?.output as EnvValue,
  );
  const prismaClientDmmf = (await import(prismaClientPath))
    .dmmf as PrismaDMMF.Document;

  const queries: Array<string> = [];
  const mutations: Array<string> = [];
  const subscriptions: Array<string> = [];

  prismaClientDmmf.mappings.modelOperations.forEach((modelOperation) => {
    const { model, plural, ...operations } = modelOperation;
    for (const [opType, opNameWithModel] of Object.entries(operations)) {
      if (
        [
          'findUnique',
          'findFirst',
          'findMany',
          'aggregate',
          'groupBy',
        ].includes(opType)
      ) {
        queries.push(opNameWithModel);
      }

      if (
        [
          'create',
          'delete',
          'update',
          'deleteMany',
          'updateMany',
          'upsert',
        ].includes(opType)
      ) {
        mutations.push(opNameWithModel);
      }
    }
  });

  queries.sort();
  mutations.sort();
  subscriptions.sort();
  const shieldText = constructShield({ queries, mutations, subscriptions });
  await writeFileSafely(path.join(outputDir, 'shield.ts'), shieldText);
}
