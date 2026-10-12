import { createStore } from "@tanstack/react-store";

export type SignInStep = "phone" | "code" | "profile";

interface SignInState {
  open: boolean;
  /** Why we're asking (the dialog's first line), e.g. "Para registrar um problema…". */
  reason: string | null;
  step: SignInStep;
  /** The phone the code went to, E.164. */
  to: string | null;
}

/** The sign-in dialog, opened from anywhere (shell, Registrar, Você). */
export const signInStore = createStore<SignInState>({ open: false, reason: null, step: "phone", to: null });

export const openSignIn = (reason: string | null = null, step: SignInStep = "phone") =>
  signInStore.setState(() => ({ open: true, reason, step, to: null }));
export const closeSignIn = () => signInStore.setState((s) => ({ ...s, open: false }));
export const setSignInStep = (step: SignInStep, to?: string) =>
  signInStore.setState((s) => ({ ...s, step, to: to ?? s.to }));
