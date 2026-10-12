# Fala, Canoas

An independent, open-source accountability map for Canoas, RS. Residents pin urban problems with a photo. Every day the new pins go to the Prefeitura, and a public clock counts the days until neighbours confirm the fix.

This repository holds the **landing page**: a waitlist by bairro. Each bairro opens when its queue fills, at about 1 confirmed sign-up per 300 residents, with a minimum of 25.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

There is no build step. The page is `index.html` (inline CSS) plus `assets/app.js`.

## Before publishing

The form runs in **preview mode** until three values are filled in at the bottom of `index.html` (`window.FALACANOAS_CONFIG`):

| Key                              | What                                                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabaseUrl`, `supabaseAnonKey` | Supabase project in the São Paulo region. Create the tables with `supabase/schema.sql` (insert-only RLS for the page, plus a public view with aggregates only). |
| `whatsappNumber`                 | The project's number, digits only with country code (`5551…`), for tap-to-confirm.                                                                              |

Still to build outside the page:

- the WhatsApp webhook and the e-mail link that set `confirmado_em`;
- the `contato@falacanoas.com.br` mailbox;
- registration of `falacanoas.com.br`.

## Structure

- `index.html`: the page.
- `assets/app.js`: bairro selection, queue counts, form, share.
- `assets/fonts/`: Geist and Geist Mono (OFL), Latin subset.
- `assets/photos/`: one Wikimedia Commons photo (CC BY-SA 3.0), cropped. Credits are on the page.
- `assets/og.png`: the WhatsApp/social share card.
- `supabase/schema.sql`: waitlist storage.
- `research/`: sourced research (Canoas, legal, identity, prior art, maps, brand) and `DECISIONS.md`, the founder interview log.
- `PRODUCT.md`: product brief.

## Licences

- **Code:** AGPL-3.0 (see `LICENSE`).
- **Bairro geometry:** IBGE, Censo 2022.
- **Photo:** Nilce Bravo (Bravotata), CC BY-SA 3.0.
- **Fonts:** SIL OFL.
