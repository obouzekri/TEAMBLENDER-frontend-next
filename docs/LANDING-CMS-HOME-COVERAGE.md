# Landing CMS Home Coverage

This document lists all `block_key` values currently used by the home page in `app/page.js`.

The current implementation follows a CMS-first progressive approach:
- Home reads CMS blocks first.
- Local defaults are still kept as safe fallback.
- Fallback removal should happen only when CMS coverage is complete.

## 1) Keys Already Used Before (historical)

- `hero_main`
- `hero_image_a`
- `hero_image_b`
- `challenge_1`
- `challenge_2`
- `challenge_3`

## 2) Keys Added For Progressive CMS Alignment

### Hero text and actions
- `hero_cta_primary`
- `hero_cta_secondary`
- `hero_trust_1`
- `hero_trust_2`
- `hero_trust_3`

### Impact band
- `impact_1`
- `impact_2`
- `impact_3`

### Process flow section
- `flow_header`
- `flow_step_1`
- `flow_step_2`
- `flow_step_3`

### Challenge section header CTA
- `challenge_header`

### Final CTA section
- `final_cta`
- `final_cta_secondary`

## 3) Recommended CMS Fields Per Key

### `hero_main`
- `title`
- `description`

### `hero_kicker`
- `title`

### CTA keys (`hero_cta_primary`, `hero_cta_secondary`, `flow_header`, `challenge_header`, `final_cta`, `final_cta_secondary`)
- `cta_label`
- `cta_href`

### Trust keys (`hero_trust_1..3`)
- `title`

### Impact keys (`impact_1..3`)
- `title` (metric value)
- `description`

### Flow step keys (`flow_step_1..3`)
- `badge_text`
- `title`
- `description`

### Challenge cards (`challenge_1..3`)
- `subtitle`
- `title`
- `description`
- `image_url`

### Hero images (`hero_image_a`, `hero_image_b`)
- `image_url`
- `description`

### Final CTA primary (`final_cta`)
- `subtitle`
- `title`
- `description`
- `cta_label`
- `cta_href`

## 4) Definition Of Complete CMS Coverage

Coverage can be considered complete only if all keys above are present in CMS with valid content for fields consumed by UI.

Suggested checks before fallback removal:
- Every required key exists.
- No empty text on visible headline/CTA fields.
- Valid URLs for every `cta_href` and image field used.
- Home snapshot QA on desktop and mobile.

## 5) Phase 2 (Fallback Cleanup) Gate

Only after section 4 is validated:
- Remove redundant defaults from `DEFAULT_BLOCKS` in `app/page.js`.
- Keep minimal hard fallback only for technical safety (optional, small generic placeholders).
- Re-run build and visual QA for all home sections.

## 6) Phase 2 Progress (implemented)

Defaults removed (CMS baseline complete):
- `hero_main`
- `hero_kicker` (new CMS-only dependency for hero eyebrow)
- `hero_cta_primary`
- `hero_cta_secondary`
- `hero_trust_1`
- `hero_trust_2`
- `hero_trust_3`
- `hero_image_a`
- `hero_image_b`
- `challenge_1`
- `challenge_2`
- `challenge_3`
- `final_cta`

Notes:
- Home now supports key-level fallback suppression for these blocks even when their parent section is not yet 100% complete.
- Other blocks keep progressive fallback until full coverage is confirmed.
