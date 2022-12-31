# Prisma tRPC Shield Generator

[![npm version](https://badge.fury.io/js/prisma-trpc-shield-generator.svg)](https://badge.fury.io/js/prisma-trpc-shield-generator)
[![npm](https://img.shields.io/npm/dt/prisma-trpc-shield-generator.svg)](https://www.npmjs.com/package/prisma-trpc-shield-generator)
[![HitCount](https://hits.dwyl.com/omar-dulaimi/prisma-trpc-shield-generator.svg?style=flat)](http://hits.dwyl.com/omar-dulaimi/prisma-trpc-shield-generator)
[![npm](https://img.shields.io/npm/l/prisma-trpc-shield-generator.svg)](LICENSE)

Automatically generate a [tRPC Shield](https://github.com/omar-dulaimi/trpc-shield) from your [Prisma](https://github.com/prisma/prisma) Schema. Updates every time `npx prisma generate` runs.

<p align="center">
  <a href="https://www.buymeacoffee.com/omardulaimi">
    <img src="https://cdn.buymeacoffee.com/buttons/default-yellow.png" alt="Buy Me A Coffee" height="41" width="174">
  </a>
</p>

## Table of Contents

- [Prisma tRPC Shield Generator](#prisma-trpc-shield-generator)
  - [Table of Contents](#table-of-contents)
- [Supported Prisma Versions](#supported-prisma-versions)
    - [Prisma 4](#prisma-4)
    - [Prisma 2/3](#prisma-23)
  - [Installation](#installation)
- [Usage](#usage)
  - [Additional Options](#additional-options)

# Supported Prisma Versions

### Prisma 4

- 0.0.0-rc.4 and higher

### Prisma 2/3

- 0.0.0-rc.3 and lower

## Installation

Using npm:

```bash
 npm install prisma-trpc-shield-generator
```

Using yarn:

```bash
 yarn add prisma-trpc-shield-generator
```

# Usage

1- Star this repo 😉

2- Install tRPC Shield

```bash
 npm install trpc-shield
```

3- Add the generator to your Prisma schema

```prisma
generator trpc_shield {
  provider     = "prisma-trpc-shield-generator"
  contextPath  = "../src/context"
}
```

4- Make sure you have a valid `Context` file, as specified in `contextPath` option. The official [Context](https://trpc.io/docs/context) for reference.

5- Running `npx prisma generate` for the following schema.prisma

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  content   String?
  published Boolean  @default(false)
  viewCount Int      @default(0)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

will generate the following shield

```ts
import { shield, allow } from 'trpc-shield';
import { Context } from '../../../context';

export const permissions = shield<Context>({
  query: {
    aggregatePost: allow,
    aggregateUser: allow,
    findFirstPost: allow,
    findFirstUser: allow,
    findManyPost: allow,
    findManyUser: allow,
    findUniquePost: allow,
    findUniqueUser: allow,
    groupByPost: allow,
    groupByUser: allow,
  },
  mutation: {
    createOnePost: allow,
    createOneUser: allow,
    deleteManyPost: allow,
    deleteManyUser: allow,
    deleteOnePost: allow,
    deleteOneUser: allow,
    updateManyPost: allow,
    updateManyUser: allow,
    updateOnePost: allow,
    updateOneUser: allow,
    upsertOnePost: allow,
    upsertOneUser: allow,
  },
});
```

5- Attach generated shield as a middleware to your top-level procedure

```ts
export const permissionsMiddleware = t.middleware(permissions);

export const shieldedProcedure = t.procedure.use(permissionsMiddleware);
```

## Additional Options

| Option        |  Description                                        | Type     |  Default                  |
| ------------- | --------------------------------------------------- | -------- | ------------------------- |
| `output`      | Output directory for the generated tRPC Shield      | `string` | `./generated`             |
| `contextPath` | Sets the context path used in your shield and rules | `string` | `../../../../src/context` |

Use additional options in the `schema.prisma`

```prisma
generator trpc_shield {
  provider     = "prisma-trpc-shield-generator"
  output       = "./shield"
  contextPath  = "../context"
}
```
