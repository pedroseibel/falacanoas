import { passkeyClient } from "@better-auth/passkey/client";
import { anonymousClient, phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser side of Better Auth (same origin, /api/auth). */
export const authClient = createAuthClient({ plugins: [phoneNumberClient(), anonymousClient(), passkeyClient()] });
