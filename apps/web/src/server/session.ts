import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

/** The Better Auth session of the current request, or null. Call only inside server function handlers. */
export const getSession = () => auth.api.getSession({ headers: getRequestHeaders() });
