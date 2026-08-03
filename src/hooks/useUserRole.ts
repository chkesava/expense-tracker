import { useUserDoc } from "./useUserDoc";

/** Role is derived from the shared `users/{uid}` listener in UserDocProvider. */
export function useUserRole() {
  const { role, isAdmin, loading } = useUserDoc();
  return { role, isAdmin, loading };
}
