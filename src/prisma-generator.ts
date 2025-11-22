import { EnvValue, GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import path from 'path';
import { configSchema } from './config';
import { constructShield } from './helpers';
import { RootType } from './types';
import removeDir from './utils/removeDir';
import { writeFileSafely } from './utils/writeFileSafely';

export async function generate(options: GeneratorOptions) {
  const outputDir = parseEnvValue(options.generator.output as EnvValue);
  const results = configSchema.safeParse(options.generator.config);
  if (!results.success) throw new Error('Invalid options passed');
  const config = results.data;

  await fs.mkdir(outputDir, { recursive: true });
  await removeDir(outputDir, true);

  const prismaClientProvider = options.otherGenerators.find((it) => {
    const provider = parseEnvValue(it.provider);
    return provider === 'prisma-client-js' || provider === 'prisma-client';
  });

  if (!prismaClientProvider) {
    throw new Error(
      'prisma-trpc-shield-generator requires a Prisma Client generator. ' +
        'Please add either "prisma-client-js" (Prisma 5/6) or "prisma-client" (Prisma 7) to your schema.',
    );
  }

  const prismaClientDmmf = await getDMMF({
    datamodel: options.datamodel,
    previewFeatures: prismaClientProvider?.previewFeatures,
  });

  const queries: RootType = [];
  const mutations: RootType = [];
  const subscriptions: RootType = [];

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
        queries.push(opNameWithModel as string);
      }

      if (
        [
          'createOne',
          'deleteOne',
          'updateOne',
          'deleteMany',
          'updateMany',
          'upsertOne',
        ].includes(opType)
      ) {
        mutations.push(opNameWithModel as string);
      }
    }
  });

  queries.sort();
  mutations.sort();
  subscriptions.sort();
  const shieldText = constructShield({ queries, mutations, subscriptions }, config, options);
  await writeFileSafely(path.join(outputDir, 'shield.ts'), shieldText);
}
