# Prisma tRPC Shield Generator

> 🛡️ Automatically generate tRPC Shield permissions from your Prisma schema

[![npm version](https://badge.fury.io/js/prisma-trpc-shield-generator.svg)](https://badge.fury.io/js/prisma-trpc-shield-generator)
[![npm downloads](https://img.shields.io/npm/dt/prisma-trpc-shield-generator.svg)](https://www.npmjs.com/package/prisma-trpc-shield-generator)
[![CI](https://github.com/omar-dulaimi/prisma-trpc-shield-generator/workflows/CI/badge.svg)](https://github.com/omar-dulaimi/prisma-trpc-shield-generator/actions)
[![License](https://img.shields.io/npm/l/prisma-trpc-shield-generator.svg)](LICENSE)

A powerful Prisma generator that creates [tRPC Shield](https://github.com/omar-dulaimi/trpc-shield) configurations from your Prisma schema. Automatically generates type-safe permission rules for all your database operations, saving you time and reducing boilerplate code.

## 💖 Support This Project

If this tool helps you build better applications, please consider supporting its development:

<p align="center">
  <a href="https://github.com/sponsors/omar-dulaimi">
    <img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github" alt="GitHub Sponsors" height="40">
  </a>
</p>

Your sponsorship helps maintain and improve this project. Thank you! 🙏

## 🚀 Latest Release

**Now with full Prisma 7 & tRPC 11 support!**

```bash
npm install prisma-trpc-shield-generator
```

This release builds on **Prisma 7 and tRPC v11**. The generator depends on `@prisma/generator-helper` and `@prisma/internals` at `^7.0.0`, and the shield it emits is typed against `trpc-shield` v2, which itself requires `@trpc/server` v11. [Report any issues](https://github.com/omar-dulaimi/prisma-trpc-shield-generator/issues) to help us continue improving!

### Requirements

| Package | Version |
|---------|---------|
| Prisma | 7.x |
| `trpc-shield` | 2.x |
| `@trpc/server` | 11.x |
| Node.js | 22 and 24 are the versions CI runs against |

## 📖 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
  - [Installation](#installation)
  - [Setup](#setup)
- [Generated Output](#-generated-output)
- [Configuration Options](#️-configuration-options)
- [Advanced Usage](#-advanced-usage)
  - [Custom Permission Rules](#custom-permission-rules)
  - [Integration with tRPC Router](#integration-with-trpc-router)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Related Projects](#-related-projects)

## ✨ Features

- 🚀 **Zero Configuration** - Works out of the box with sensible defaults
- 🔄 **Auto-Generated** - Updates every time you run `prisma generate`
- 🛡️ **Type Safe** - Full TypeScript support with proper typing
- 🎯 **Comprehensive** - Covers all Prisma operations (queries, mutations, aggregations)
- ⚙️ **Configurable** - Customize output directory and context path
- 📦 **Lightweight** - Minimal dependencies and fast generation

## 🚀 Quick Start

### Installation

```bash
npm install prisma-trpc-shield-generator trpc-shield
```

### Setup

1. Add the generator to your `schema.prisma`:

```prisma
// The generator reads your models through a Prisma Client generator, so your schema needs one.
// On Prisma 7 that is `prisma-client`; on Prisma 5 and 6 it was `prisma-client-js`.
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

generator trpc_shield {
  provider    = "prisma-trpc-shield-generator"
  contextPath = "../src/context"
}

datasource db {
  provider = "sqlite"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

2. Generate your shield:

```bash
npx prisma generate
```

3. Use the generated permissions:

```ts
import { permissions } from './generated/shield';
import { t } from './trpc';

export const permissionsMiddleware = t.middleware(permissions);
export const protectedProcedure = t.procedure.use(permissionsMiddleware);
```

## 📋 Generated Output

The generator creates a comprehensive shield configuration with all CRUD operations:

```ts
import { shield, allow } from 'trpc-shield';
import { Context } from '../../../context';

export const permissions = shield<Context>({
  query: {
    // Find operations
    findUniqueUser: allow,
    findFirstUser: allow,
    findManyUser: allow,
    findUniquePost: allow,
    findFirstPost: allow,
    findManyPost: allow,
    
    // Aggregation operations
    aggregateUser: allow,
    aggregatePost: allow,
    groupByUser: allow,
    groupByPost: allow,
  },
  mutation: {
    // Create operations
    createOneUser: allow,
    createOnePost: allow,
    
    // Update operations
    updateOneUser: allow,
    updateOnePost: allow,
    updateManyUser: allow,
    updateManyPost: allow,
    
    // Delete operations
    deleteOneUser: allow,
    deleteOnePost: allow,
    deleteManyUser: allow,
    deleteManyPost: allow,
    
    // Upsert operations
    upsertOneUser: allow,
    upsertOnePost: allow,
  },
});
```

## ⚙️ Configuration Options

| Option        | Description                                                            | Type     | Default                   |
|---------------|------------------------------------------------------------------------|----------|---------------------------|
| `output`      | Output directory for the generated shield                              | `string` | `./generated`             |
| `contextPath` | Path to your tRPC context file, **relative to the directory holding your `schema.prisma`** | `string` | `../../../../src/context` |

`contextPath` is resolved against the schema's directory, not against `output`. The generator then
rewrites it as a path relative to `output` in the emitted import, so moving `output` does not
require changing `contextPath`.

### Example Configuration

```prisma
generator trpc_shield {
  provider    = "prisma-trpc-shield-generator"
  output      = "./src/shields"
  contextPath = "../context"
}
```

## 🔧 Advanced Usage

### Custom Permission Rules

Replace the default `allow` rules with your custom logic:

```ts
import { permissions } from './generated/shield';
import { rule, and, or } from 'trpc-shield';

const isAuthenticated = rule()(async (parent, args, ctx) => {
  return ctx.user !== null;
});

const isOwner = rule()(async (parent, args, ctx) => {
  const post = await ctx.prisma.post.findUnique({
    where: { id: args.where.id },
    select: { authorId: true }
  });
  return post?.authorId === ctx.user?.id;
});

// Override specific permissions
export const customPermissions = {
  ...permissions,
  mutation: {
    ...permissions.mutation,
    createOnePost: and(isAuthenticated),
    updateOnePost: and(isAuthenticated, isOwner),
    deleteOnePost: and(isAuthenticated, isOwner),
  }
};
```

### Integration with tRPC Router

```ts
import { initTRPC } from '@trpc/server';
import { customPermissions } from './shields/permissions';

const t = initTRPC.context<Context>().create();

export const permissionsMiddleware = t.middleware(customPermissions);
export const protectedProcedure = t.procedure.use(permissionsMiddleware);

export const appRouter = t.router({
  user: t.router({
    create: protectedProcedure
      .input(z.object({ name: z.string(), email: z.string() }))
      .mutation(({ input, ctx }) => {
        return ctx.prisma.user.create({ data: input });
      }),
  }),
});
```

## 📚 Examples

### Basic CRUD with Authentication

```ts
import { rule, and } from 'trpc-shield';

const isAuthenticated = rule()(async (parent, args, ctx) => {
  return !!ctx.user;
});

const canManagePosts = rule()(async (parent, args, ctx) => {
  if (!ctx.user) return false;
  
  // Admin can manage all posts
  if (ctx.user.role === 'ADMIN') return true;
  
  // Users can only manage their own posts
  if (args.where?.authorId) {
    return args.where.authorId === ctx.user.id;
  }
  
  return false;
});

export const permissions = shield<Context>({
  query: {
    findManyPost: allow, // Public read access
    findUniquePost: allow,
    findManyUser: isAuthenticated, // Authenticated read access
  },
  mutation: {
    createOnePost: isAuthenticated,
    updateOnePost: and(isAuthenticated, canManagePosts),
    deleteOnePost: and(isAuthenticated, canManagePosts),
  },
});
```

## 🔍 Troubleshooting

### Common Issues

**Error: Cannot find module '../context'**
- Ensure your `contextPath` is correct relative to the output directory
- Check that your context file exports a `Context` type

**TypeScript errors in generated shield**
- Make sure `trpc-shield` is installed and up to date
- Verify your tRPC context is properly typed

**Shield not updating after schema changes**
- Run `npx prisma generate` after modifying your schema
- Check that the generator is properly configured in `schema.prisma`


## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🔗 Related Projects

- [tRPC Shield](https://github.com/omar-dulaimi/trpc-shield) - The permission system this generator creates
- [Prisma](https://github.com/prisma/prisma) - The database toolkit this integrates with
- [tRPC](https://trpc.io) - The TypeScript RPC framework this works with

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/omar-dulaimi">Omar Dulaimi</a>
</p>