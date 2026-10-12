import {
  BoundaryCollectionSchema,
  NeighborhoodCollectionSchema,
  NeighborhoodSchema,
  defineMunicipality,
} from "@fala/core";
import { z } from "zod";
import neighborhoodsGeo from "./geo/bairros.json";
import boundaryGeo from "./geo/limite.json";
import meta from "./geo/bairros-meta.json";

const OBRAS = "Secretaria de Obras e Reconstrução";
const ZELADORIA = "Secretaria de Serviços e Zeladoria Urbana";

/** Canoas, RS. Configuração versionada da instância (Fala Core → Fala, Canoas). */
export const canoas = defineMunicipality({
  slug: "canoas",
  name: "Canoas",
  state: "RS",
  country: "BR",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  center: [-51.178, -29.918],
  bounds: [
    [-51.42, -30.04],
    [-50.95, -29.79],
  ],
  deadlineDays: 30,
  digestHour: 18,
  categories: [
    { key: "buraco", label: "Buraco na rua", group: "ruas", agency: OBRAS, kind: "occurrence" },
    { key: "alaga", label: "Rua que alaga toda chuva", group: "agua", agency: OBRAS, kind: "occurrence" },
    { key: "bocalobo", label: "Boca de lobo entupida", group: "agua", agency: OBRAS, kind: "occurrence" },
    { key: "lixo", label: "Lixo e descarte irregular", group: "lixo", agency: ZELADORIA, kind: "occurrence" },
    { key: "entulho", label: "Entulho", group: "lixo", agency: ZELADORIA, kind: "occurrence" },
    { key: "poste", label: "Poste apagado", group: "luz", agency: "Iluminação pública", kind: "occurrence" },
    { key: "arvore", label: "Árvore: poda ou risco", group: "arvores", agency: ZELADORIA, kind: "occurrence" },
    {
      key: "calcada",
      label: "Calçada quebrada ou bloqueada",
      group: "ruas",
      agency: "Fiscalização (a confirmar)",
      kind: "occurrence",
    },
    {
      key: "esgoto",
      label: "Esgoto a céu aberto",
      group: "agua",
      agency: "Saneamento (a confirmar)",
      kind: "occurrence",
    },
    {
      key: "sinal",
      label: "Sinalização e semáforo",
      group: "ruas",
      agency: "Secretaria de Mobilidade Urbana",
      kind: "occurrence",
    },
    { key: "questao", label: "Questão pública", group: "questoes", agency: null, kind: "public_issue" },
  ],
  filterGroups: [
    { key: "tudo", label: "Tudo" },
    { key: "agora", label: "Agora", icon: "i-clock" },
    { key: "agua", label: "Água", icon: "c-alaga" },
    { key: "ruas", label: "Ruas e calçadas", icon: "c-buraco" },
    { key: "lixo", label: "Lixo", icon: "c-lixo" },
    { key: "luz", label: "Luz", icon: "c-poste" },
    { key: "arvores", label: "Árvores", icon: "c-arvore" },
    { key: "questoes", label: "Questões públicas", icon: "c-questao" },
  ],
  neighborhoods: z.object({ bairros: z.array(NeighborhoodSchema) }).parse(meta).bairros,
  geo: {
    neighborhoods: NeighborhoodCollectionSchema.parse(neighborhoodsGeo),
    boundary: BoundaryCollectionSchema.parse(boundaryGeo),
  },
  branding: { name: "Fala, Canoas", domain: "falacanoas.com.br" },
  // 2026: propaganda allowed after 15 Aug (Lei 9.504, art. 36); 1st round 4 Oct and runoff 25 Oct
  // (CF, art. 77: first and last Sundays of October).
  electionPeriods: [{ from: "2026-08-16", to: "2026-10-25" }],
});

export default canoas;
