import { createFileRoute } from "@tanstack/react-router";
import { whatsappIntake } from "@/server/whatsapp-intake";

/** Registering by WhatsApp: the WhatsApp service's door into the app (see whatsappIntake). */
export const Route = createFileRoute("/api/whatsapp/registro")({
  server: {
    handlers: {
      POST: ({ request }) => whatsappIntake(request),
    },
  },
});
