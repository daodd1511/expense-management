# Architecture Rules

## Layered Architecture

Maintain strict separation between three layers. Never skip or cross layers.

- **UI/View Layer**: Components, directives, pipes, forms — handles user interaction only. No business logic, no direct API calls.
- **Domain/Business Layer**: Services, domain models (TypeScript types), utility functions — no UI knowledge, no DB/API knowledge.
- **Repository/DTO Layer**: API clients, DTOs (Zod schemas), mappers — encapsulates all data access.

## DTOs

- Define DTOs with Zod schemas.
- Infer TypeScript types with `z.infer<typeof schema>`.
- Never use raw API response shapes in the UI layer.

## Domain Models

- Use TypeScript `type` with `readonly` properties.
- Business logic lives in pure utility functions, not components.

## Mappers

- Transform DTOs ↔ Domain Models using a mapper pattern.
- Use `secureParse` (safe Zod parse — logs on failure, returns `null`) to validate DTOs before mapping.
- Keep all mapping logic centralized in mapper files.
- See `references/secure-parse.md` and `references/mapper.md` for full definitions.

## Mocking

- Mock data in the repository/business layer only (e.g., services with `of()` + `delay()`).
- Never mock data inside UI components.

## References

- Examples and full implementations: `references/architecture.md`
- `secureParse` definition and usage: `references/secure-parse.md`
- `IMapper` interface and pattern: `references/mapper.md`

---

# Architecture — Examples & Full Implementations

Full end-to-end example of the three-layer architecture using `secureParse` and `IMapper`.

## Layer Overview

```
UI / View Layer          → components, templates, forms
Domain / Business Layer  → services, domain models, utilities
Repository / DTO Layer   → API clients, Zod DTOs, mappers
```

## secureParse

Safe Zod parsing wrapper. Returns `null` on failure instead of throwing. Validation errors are logged; callers handle the null case.

### Implementation

```ts
import type { ZodSchema } from 'zod'

export function secureParse<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[secureParse] Validation failed:', result.error.issues)
    return null
  }
  return result.data
}
```

### Usage

```ts
const dto = secureParse(userDtoSchema, rawApiResponse)
if (!dto) return  // validation error already logged

processUser(dto)  // ✅ dto is typed as UserDto
```

### Why

- Prevents uncaught exceptions from invalid API shapes.
- Keeps processing running despite partial data failures.
- Centralizes validation error logging.


## Complete Example — User Feature

### 1. DTO schema (Repository layer)

```ts
import { z } from 'zod'

export const userDtoSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export type UserDto = z.infer<typeof userDtoSchema>
```

### 2. Domain model (Domain layer)

```ts
export type User = {
  readonly id: number
  readonly fullName: string
  readonly email: string
  readonly role: 'admin' | 'editor' | 'viewer'
}
```

### 3. Mapper (Repository layer)

Uses `secureParse` to validate the raw DTO before mapping to domain model.

```ts
import { secureParse } from './secure-parse'
import { userDtoSchema } from './user.dto'
import type { IMapper } from './mapper.interface'
import type { UserDto } from './user.dto'
import type { User } from './user.model'

export class UserMapper implements IMapper<UserDto, User> {
  fromDto(dto: unknown): User | null {
    const parsed = secureParse(userDtoSchema, dto)
    if (!parsed) return null
    return {
      id: parsed.id,
      fullName: `${parsed.first_name} ${parsed.last_name}`.trim(),
      email: parsed.email,
      role: parsed.role,
    }
  }

  toDto(domain: User): UserDto {
    const [first_name, ...rest] = domain.fullName.split(' ')
    return {
      id: domain.id,
      first_name,
      last_name: rest.join(' '),
      email: domain.email,
      role: domain.role,
    }
  }
}
```

### 4. Repository / API client (Repository layer)

```ts
import { UserMapper } from './user.mapper'
import type { User } from './user.model'

const mapper = new UserMapper()

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users')
  const raw: unknown[] = await response.json()
  return raw
    .map(dto => mapper.fromDto(dto))
    .filter((u): u is User => u !== null)  // drop invalid entries
}

export async function fetchUser(id: number): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`)
  const raw: unknown = await response.json()
  return mapper.fromDto(raw)
}
```

### 5. Service (Domain layer)

```ts
import { fetchUsers, fetchUser } from '../repository/user.repository'
import type { User } from './user.model'

export async function getAdminUsers(): Promise<User[]> {
  const users = await fetchUsers()
  return users.filter(u => u.role === 'admin')
}

export async function getUserById(id: number): Promise<User | null> {
  return fetchUser(id)
}
```

### 6. Component (UI/View layer)

Calls service only — no direct API calls, no mapper usage.

```ts
// Angular example
import { Component, OnInit } from '@angular/core'
import { getUserById } from '../domain/user.service'
import type { User } from '../domain/user.model'

@Component({ selector: 'app-user-detail', templateUrl: './user-detail.component.html' })
export class UserDetailComponent implements OnInit {
  user: User | null = null

  async ngOnInit() {
    this.user = await getUserById(1)
  }
}
```

## Rules Summary

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| UI / View | Call domain services, bind domain models | API calls, mappers, raw DTOs |
| Domain / Business | Pure logic, call repository | UI knowledge, direct API calls |
| Repository / DTO | API clients, `secureParse`, mappers | Business logic, UI knowledge |

## Key Constraints

- `secureParse` only inside `fromDto` — never `schema.parse()`.
- Mapper files own all DTO ↔ domain transformation; no mapping in services or components.
- Invalid DTOs return `null` from `fromDto`; callers filter nulls with a type guard.
- Domain models use `readonly` properties — treat as immutable.