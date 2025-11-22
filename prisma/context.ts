import type { IncomingMessage, ServerResponse } from 'http';
import { inferAsyncReturnType } from '@trpc/server';
import { PrismaClient } from '../prisma-client/client';

type CreateContextOptions = {
  req: IncomingMessage;
  res: ServerResponse;
};

export const createContext = async ({ req, res }: CreateContextOptions) => {
  // Passing an empty config satisfies the generated Prisma types that expect an options object.
  const prisma = new PrismaClient({});

  return {
    prisma,
    req,
    res,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
