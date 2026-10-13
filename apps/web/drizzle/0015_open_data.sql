-- Open data (DECISIONS round 10; BUILD 3.3): what the public API may read, and nothing else. The
-- views below hold only published, real pins, with the point moved to the centre of its ~100 m cell,
-- and their timelines with public bodies' words only. No author, apelido, tracking key, moderation
-- handle, photo, or resident's free text. The API connects as fala_dados, which can read these views
-- and no table; the schema isn't exposed by Supabase's Data API.
CREATE SCHEMA IF NOT EXISTS "dados";--> statement-breakpoint
REVOKE ALL ON SCHEMA "dados" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON SCHEMA "dados" FROM anon, authenticated;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fala_dados') THEN
    CREATE ROLE fala_dados NOLOGIN;
  END IF;
END
$$;--> statement-breakpoint
-- A grid of 0.001° (about 111 m north-south and 96 m east-west at Canoas' latitude): every point in a
-- cell becomes its centre, the same on every download, so averaging can't recover it.
CREATE VIEW "dados"."registros" AS
SELECT
  i.id AS codigo,
  i.kind::text AS tipo,
  i.category AS categoria,
  i.neighborhood AS bairro,
  CASE WHEN i.lng IS NULL THEN NULL ELSE round((floor(i.lng / 0.001) * 0.001 + 0.0005)::numeric, 4)::float8 END AS lng,
  CASE WHEN i.lat IS NULL THEN NULL ELSE round((floor(i.lat / 0.001) * 0.001 + 0.0005)::numeric, 4)::float8 END AS lat,
  i.created_at AS registrado_em,
  i.sent_at AS enviado_em,
  i.protocol_number AS protocolo,
  i.protocol_at AS protocolado_em,
  i.community::text AS estado_comunidade,
  i.official_status::text AS estado_orgao,
  i.official_agency AS orgao_que_respondeu,
  i.official_at AS orgao_atualizou_em,
  i.closed_at AS fechado_em,
  i.confirmations AS confirmacoes,
  i.updated_at AS atualizado_em
FROM "fala"."items" i
WHERE i.moderation = 'published' AND NOT i.demo;--> statement-breakpoint
-- Who and what only where a public body or the project speaks: the send to the Prefeitura, the
-- protocol, official answers and status changes. Residents' events keep their kind and time.
CREATE VIEW "dados"."historico" AS
SELECT
  e.item_id AS codigo,
  e.at AS em,
  e.seq AS ordem,
  e.kind::text AS evento,
  CASE WHEN e.kind IN ('sent_to_authority', 'official_response', 'official_status_changed') THEN e.actor END AS quem,
  CASE WHEN e.kind IN ('sent_to_authority', 'official_response', 'official_status_changed') THEN e.text END AS texto
FROM "fala"."item_events" e
JOIN "fala"."items" i ON i.id = e.item_id
WHERE i.moderation = 'published' AND NOT i.demo;--> statement-breakpoint
GRANT USAGE ON SCHEMA "dados" TO fala_dados;--> statement-breakpoint
GRANT SELECT ON "dados"."registros", "dados"."historico" TO fala_dados;
