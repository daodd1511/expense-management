# Architecture — Full Walkthrough

End-to-end example of the three-layer architecture in React + TypeScript:
zod DTO validation at the boundary, plain-function mappers, server state via
TanStack Query.

```
UI layer     → components, hooks (consume domain models only)
Domain layer → models, pure business functions
Data layer   → API client, zod DTO schemas, mappers
```

## secureParse

Safe zod parsing wrapper: returns `null` on failure instead of throwing;
errors are logged once at the boundary.

```ts
import type { ZodType } from 'zod';

export function secureParse<T>(schema: ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('[secureParse] Validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}
```

## 1. DTO schema (data layer)

```ts
import { z } from 'zod';

export const userDtoSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export type UserDto = z.infer<typeof userDtoSchema>;
```

## 2. Domain model (domain layer)

```ts
export type User = {
  readonly id: number;
  readonly fullName: string;
  readonly email: string;
  readonly role: 'admin' | 'editor' | 'viewer';
};
```

## 3. Mapper (data layer)

Plain functions own all DTO ↔ domain transformation. Validate with
`secureParse` inside `fromDto`; never `schema.parse()` (throws mid-flight).

```ts
import { secureParse } from './secureParse';
import { userDtoSchema, type UserDto } from './user.dto';
import type { User } from './user.model';

export const userMapper = {
  fromDto(dto: unknown): User | null {
    const parsed = secureParse(userDtoSchema, dto);
    if (parsed === null) {
      return null;
    }
    return {
      id: parsed.id,
      fullName: `${parsed.first_name} ${parsed.last_name}`.trim(),
      email: parsed.email,
      role: parsed.role,
    };
  },

  toDto(user: User): UserDto {
    const [first_name, ...rest] = user.fullName.split(' ');
    return {
      id: user.id,
      first_name,
      last_name: rest.join(' '),
      email: user.email,
      role: user.role,
    };
  },
};
```

## 4. API client (data layer)

Invalid entries are dropped with a type guard, not thrown.

```ts
import { userMapper } from './user.mapper';
import type { User } from './user.model';

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  const raw: unknown[] = await response.json();
  return raw
    .map(dto => userMapper.fromDto(dto))
    .filter((user): user is User => user !== null);
}
```

## 5. Query hook (server-state boundary)

Server state lives in the query library — components never fetch directly.

```ts
import { useQuery } from '@tanstack/react-query';

import { fetchUsers } from '../api/user.api';

export const userQueryKeys = {
  all: ['users'] as const,
};

export function useUsers() {
  return useQuery({ queryKey: userQueryKeys.all, queryFn: fetchUsers });
}
```

## 6. Component (UI layer)

Consumes the hook and domain model only — no fetch, no mapper, no DTO.

```tsx
import { useUsers } from '../hooks/useUsers';

export const UserList = () => {
  const { data: users, isPending, isError } = useUsers();

  if (isPending) return <Spinner />;
  if (isError) return <ErrorMessage />;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.fullName}</li>
      ))}
    </ul>
  );
};
```

## Rules summary

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| UI | query hooks, domain models | fetch/axios, mappers, raw DTOs |
| Domain | pure logic | UI knowledge, API calls |
| Data | API clients, `secureParse`, mappers | business logic, UI knowledge |

- `secureParse` only inside `fromDto`; invalid DTOs → `null`, filtered by
  callers with a type guard.
- Mapper functions own all transformation; no mapping in hooks or components.
- Domain models are `readonly` — treat as immutable.
