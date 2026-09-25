# Santorini Travel Envelope

<p align="center">
  <strong>A digital paper artifact about place, postage, and anticipation.</strong><br />
  Press the seal. Open the letter. Find Santorini.
</p>

<p align="center">
  <a href="https://envelope.sanskarshukla.com/">Open the live experience</a>
</p>

## The experience

Santorini Travel Envelope turns a familiar object into a quiet, tactile interaction. An aged cream envelope rests on warm bookcloth, addressed to Santorini, Greece and held closed by brown twine, engraved postal marks, and a glossy oxblood wax seal.

The first gesture is physical by design: press the seal. It gives under pressure, fractures from the flap tip, releases a small wax chip, lets the twine recoil, and opens the flap to reveal an interior pocket and the edge of a travel ticket. The scene is designed as one continuous object rather than a sequence of disconnected screens.

**[Visit the live site](https://envelope.sanskarshukla.com/)**

## Design direction

The visual language draws from vintage travel correspondence and handmade print:

- Peach-cream cotton paper with foxing, worn edges, grain, and visible thickness.
- Faded postal ink, perforated stamps, cancellation marks, and engraved Santorini imagery.
- A soft upper-left key light with contact shadows falling down and to the right.
- Oxblood wax with a raised rim, recessed emblem, gloss, and a broken edge.
- Plied brown twine that slackens and retracts when the seal releases.
- Libre Caslon Text, Courier Prime, Cormorant Garamond, and Inter used as material cues rather than decoration.

The envelope is authored in a shared `2200 × 1000` coordinate space. Every printed detail, shadow, layer, and moving part scales from that same geometry, preserving registration across viewport sizes.

## Motion

The interaction is driven by a small dependency-free timeline with one `requestAnimationFrame` clock. React owns the phase; the timeline writes motion directly to registered HTML and SVG nodes so related parts never drift apart.

The seal sequence moves through these beats:

1. The wax compresses and its contact shadow tightens.
2. A fracture propagates along both sides of the flap junction.
3. A wax flake lifts, arcs, and lands on the paper.
4. The seal pieces separate while the body leaves a faint residue.
5. The twine bows, loses tension, and retracts toward the envelope edges.
6. The flap rotates on its top hinge, changes illumination through the turn, and reveals the ticket inside.
7. The ticket rises slightly into view and the scene waits for the next gesture.

The motion favors friction, release, and critically damped settling over linear movement or exaggerated bounce. Reduced-motion users receive the shorter CSS feedback path for the press interaction.

## Built with

- React 19 and TypeScript
- Vite
- CSS layers, masks, blend modes, and responsive layout
- Inline SVG for postal art, wax relief, twine, perforations, and ticket illustration
- WebP material textures for paper, desk linen, ink wear, grain, and ticket stock
- A custom `requestAnimationFrame` timeline with cubic-bezier easing
- Fontsource packages for self-hosted typography

No animation framework, canvas, WebGL, or external runtime service is required.

## Accessibility

The wax seal is a real labeled button with pointer and keyboard activation. Interaction is disabled while a sequence is in flight, decorative artwork is hidden from assistive technology, and the scene exposes descriptive text for the Santorini envelope and ticket reveal. The layout uses viewport-relative sizing and containment so the artifact remains usable on narrow screens.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

To validate and preview a production build:

```bash
npm run lint
npm run build
npm run preview
```

The production output is written to `dist/` and can be deployed as a static site.

## Project map

```text
public/
├── favicon.svg       Browser and home-screen icon
├── og-image.png      Social preview image
├── og-image.svg      Social preview source artwork
├── robots.txt        Crawler directives
├── sitemap.xml       Canonical site URL
└── llms.txt          Concise machine-readable project summary

src/
├── App.tsx
├── index.css
└── components/TravelEnvelope/
    ├── TravelEnvelope.tsx   Scene structure and interaction state
    ├── TravelEnvelope.css    Materials, lighting, layout, and responsive behavior
    ├── constants.ts          Shared geometry, poses, and timing tokens
    ├── sequences.ts          Seal and flap choreography
    ├── timeline.ts            Dependency-free animation runtime
    ├── art/                   Postal, ticket, twine, wax, and geometry code
    └── textures/              Generated paper and print materials

scripts/
└── generate-textures.py      Seeded material texture generator
```

## Metadata and public surface

The live page is configured as a crawlable, canonical experience at [envelope.sanskarshukla.com](https://envelope.sanskarshukla.com/). Its document head includes a descriptive title, meta description, canonical URL, Open Graph and Twitter/X cards, theme color, author metadata, and JSON-LD describing the interactive creative work. The public directory also contains the favicon, social preview, crawler policy, sitemap, and concise `llms.txt` project description.

The metadata describes the experience that exists: an interactive Santorini envelope whose wax seal opens the letter and reveals the ticket. It does not claim interactions that are not available on the live page.

## Credits

Concept, art direction, interaction design, and implementation by Sanskar Shukla.

The project is currently distributed without an open-source license. The source, artwork, textures, and visual design remain reserved unless licensing terms are added by the author.
