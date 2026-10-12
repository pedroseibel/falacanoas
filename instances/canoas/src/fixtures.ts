import { ItemSchema, ThreadSchema, ViewerSchema } from "@fala/core";
import { z } from "zod";
import demo from "./fixtures/demo.json";

export const FixturesSchema = z.object({
  now: z.string(),
  viewer: ViewerSchema,
  items: z.array(ItemSchema),
  threads: z.record(z.string(), z.array(ThreadSchema)),
});

/** Dados fictícios para desenvolvimento e protótipo. Nunca em produção. */
export const fixtures = FixturesSchema.parse(demo);
