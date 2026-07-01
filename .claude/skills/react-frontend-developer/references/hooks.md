# React Hooks Rules

## Custom Hooks

- Extract reusable stateful logic into custom hooks (prefix with `use`).
- Keeps the UI layer clean; hooks are independently testable.

## Rules of Hooks

- Never call hooks inside conditionals, loops, or nested functions.
- Always call hooks at the top level of a React function component or custom hook.

## Cleanup

- Always return cleanup functions from `useEffect` when subscribing to events, timers, or observables.

## Dependencies

- Keep dependency arrays accurate — do not suppress exhaustive-deps lint warnings without justification.

## References

- Custom hook example with business logic separation: `references/hooks.md`

---

# React Hooks Examples

## Custom Hook with Business Logic

```tsx
// ✅ Business logic in custom hook — UI layer stays clean
function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}

// ✅ Component stays focused on rendering
const UserList: React.FC = () => {
  const { users, loading } = useUserManagement();
  if (loading) return <Spinner />;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};
```