import type { EmergencyLine, Municipality } from "@fala/core";
import { cn } from "@/lib/utils";

const link = "font-medium text-foreground tabular-nums underline-offset-3 hover:underline";

/** A number to call, as a tel: link: short codes as dialled, longer ones with the country code. */
export function Phone({ line, className }: { line: EmergencyLine; className?: string }) {
  const href = line.tel.length <= 4 ? `tel:${line.tel}` : `tel:+55${line.tel}`;
  return (
    <a href={href} className={cn(link, className)}>
      {line.display}
    </a>
  );
}

/**
 * Where to turn in an emergency, from the instance (research/alagamentos): the civil defence's line
 * (and its WhatsApp, when it answers there) and the fire brigade. The Fala is never an emergency
 * channel (round 11), so this is plain information, never alarm styling.
 */
export function EmergencyLines({ muni }: { muni: Municipality }) {
  const { civilDefense, fire } = muni.emergency;
  return (
    <>
      Defesa Civil, <Phone line={civilDefense} />
      {civilDefense.whatsapp && (
        <>
          {" "}
          (também{" "}
          <a href={`https://wa.me/55${civilDefense.tel}`} className={link}>
            WhatsApp
          </a>
          )
        </>
      )}
      ; Bombeiros, <Phone line={fire} />
    </>
  );
}

/** The official alerts by SMS ("Alertas da Defesa Civil: envie o seu CEP para 40199."), if the instance has them. */
export function AlertsSms({ muni }: { muni: Municipality }) {
  const sms = muni.emergency.alertsSms;
  if (!sms) return null;
  return (
    <>
      Alertas da Defesa Civil por SMS: {sms.how} para{" "}
      <a href={`sms:${sms.number}`} className={link}>
        {sms.number}
      </a>
      .
    </>
  );
}
