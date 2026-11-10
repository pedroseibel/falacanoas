import { queryOptions } from "@tanstack/react-query";
import { getAccount, getAuthConfig } from "@/server/account";

export type AccountData = Awaited<ReturnType<typeof getAccount>>;

/** The signed-in person, or null. Invalidate after signing in or out. */
export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: () => getAccount(),
  staleTime: 30_000,
});

/**
 * Where someone must go before writing anything (round 18, nível 1): sign in with a phone, then
 * choose an apelido. Null when they can write.
 */
export const memberGate = (account: AccountData) =>
  !account || account.guest || !account.phoneVerified ? "/entrar" : !account.nick ? "/bem-vindo" : null;

/** Public sign-in settings (the Turnstile site key), shared by /entrar and the guest report form. */
export const authConfigQuery = queryOptions({
  queryKey: ["auth-config"],
  queryFn: () => getAuthConfig(),
  staleTime: Infinity,
});
