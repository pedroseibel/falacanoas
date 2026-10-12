export { SEND_CODE_ACTION } from "@fala/core";

export type SendFailure = "rate" | "robot" | "send";

/** Why a code wasn't sent, from the auth API's status: too many requests, the robot check, or anything else. */
export const sendFailure = (status: number | undefined): SendFailure =>
  status === 429 ? "rate" : status === 400 || status === 403 ? "robot" : "send";

export const SEND_FAILURE_MESSAGE: Record<SendFailure, string> = {
  rate: "Muitos pedidos de código para este número ou nesta rede. Espere uns minutos e tente de novo.",
  robot: "Não conseguimos confirmar que é uma pessoa pedindo o código. Recarregue a página e tente de novo.",
  send: "Não deu para mandar o código agora. Tente de novo em instantes.",
};
