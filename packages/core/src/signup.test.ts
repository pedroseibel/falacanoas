import { describe, expect, test } from "bun:test";
import {
  QueueSignupSchema,
  confirmationCode,
  contactError,
  maskPhoneBR,
  missingSignups,
  normalizeContact,
} from "./signup";

describe("maskPhoneBR", () => {
  test("formats as it is typed", () => {
    expect(maskPhoneBR("")).toBe("");
    expect(maskPhoneBR("5")).toBe("(5");
    expect(maskPhoneBR("5199")).toBe("(51) 99");
    expect(maskPhoneBR("5134567890")).toBe("(51) 3456-7890");
    expect(maskPhoneBR("51999998888")).toBe("(51) 99999-8888");
  });
  test("ignores non-digits and extra digits", () => expect(maskPhoneBR("(51) 99999-88889999")).toBe("(51) 99999-8888"));
});

describe("contactError", () => {
  test("empty WhatsApp asks for the number", () =>
    expect(contactError("whatsapp", "")).toBe("Digite seu WhatsApp com DDD."));
  test("short number is incomplete", () => expect(contactError("whatsapp", "(51) 9999")).toContain("incompleto"));
  test("mobile needs the leading 9", () => expect(contactError("whatsapp", "(51) 89999-8888")).toContain("9 dígitos"));
  test("valid mobile and landline pass", () => {
    expect(contactError("whatsapp", "(51) 99999-8888")).toBeNull();
    expect(contactError("whatsapp", "(51) 3456-7890")).toBeNull();
  });
  test("e-mail checks the domain", () => {
    expect(contactError("email", "")).toBe("Digite seu e-mail.");
    expect(contactError("email", "ana@canoas")).toContain("depois do @");
    expect(contactError("email", " ana@canoas.rs ")).toBeNull();
  });
});

describe("QueueSignupSchema", () => {
  const ok = {
    neighborhood: "niteroi",
    channel: "whatsapp" as const,
    contact: "(51) 99999-8888",
    help: [],
    consent: true,
  };
  test("accepts a complete sign-up", () => expect(QueueSignupSchema.safeParse(ok).success).toBe(true));
  test("reports each missing piece on its own field", () => {
    const r = QueueSignupSchema.safeParse({ ...ok, neighborhood: "", contact: "", consent: false });
    expect(r.success).toBe(false);
    const paths = r.error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(paths).toEqual(expect.arrayContaining(["neighborhood", "contact", "consent"]));
  });
});

test("normalizeContact", () => {
  expect(normalizeContact("whatsapp", "(51) 99999-8888")).toBe("5551999998888");
  expect(normalizeContact("email", " Ana@Canoas.RS ")).toBe("ana@canoas.rs");
});

test("confirmationCode uses four unambiguous characters", () => {
  const code = confirmationCode([0, 21, 22, 5]);
  expect(code).toHaveLength(4);
  expect(code).toMatch(/^[ACDEFHJKMNPRTUVWXY3479]{4}$/);
});

test("missingSignups", () => {
  expect(missingSignups(52, 10)).toBe(42);
  expect(missingSignups(52, 60)).toBe(0);
  expect(missingSignups(null, 3)).toBe(0);
});
