---
title: "EU AI Act transparency"
description: "How Article 50 of the EU AI Act applies to bitHuman avatars — who counts as provider and who counts as deployer, what lands on each of us, the model-by-model deepfake reading, and the dates."
section: resources
group: "Resources"
order: 4
label: "EU AI Act"
---

> **Note — this is our reading of the law, not legal advice.** bitHuman is not
> a law firm and nothing here creates a legal opinion or a warranty. It is
> written to give you the facts and the product detail you need to reach your
> own conclusion with your own counsel. Where the answer depends on what you
> build, we say so instead of guessing on your behalf.

## What this page covers

[Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
— the EU AI Act — sets transparency rules in
[Article 50](https://artificialintelligenceact.eu/article/50/) for AI systems
that talk to people and for AI systems that generate synthetic image, audio,
or video. A bitHuman avatar is both. Article 50 applies from **2026-08-02**.

The rules split across two parties, and the split is the part most teams get
wrong. This page states which obligations are ours, which are yours, and what
bitHuman ships against them.

## Dates

| Date | What starts applying | Lands on |
| --- | --- | --- |
| 2026-08-02 | Article 50(1) — people must be informed they are interacting with an AI | bitHuman (provider) |
| 2026-08-02 | Article 50(4) — visible disclosure of deepfake content | You (deployer) |
| 2026-12-02 | Article 50(2) — machine-readable marking of synthetic output | bitHuman (provider) |

Article 50(2) has a limited transitional arrangement: AI systems placed on the
market **before** 2026-08-02 have until **2026-12-02** to meet the marking and
detection obligation. `essence-2` and `expression-2` launched on 2026-07-10, so
they fall inside that window and the December date is the one that governs
them. There is **no** grace period for Article 50(1) or Article 50(4).

Content generated before 2026-08-02 does not have to be labelled
retroactively, per the Commission's
[FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act).

## Who is who

The Act assigns duties by role, not by who owns the pixels.

- **bitHuman is the provider.** We develop the avatar models and place them on
  the EU market under our own name, through the cloud API, the SDKs, and the
  CLI.
- **You are the deployer** when you use bitHuman under your own authority in a
  professional capacity — your product, your website, your kiosk, your support
  line. Purely personal, non-professional use is outside the Act.

The Commission's FAQ addresses this exact shape of business: a company selling
an AI avatar API or SDK is the provider, and the customers building with it are
deployers. Both sets of duties apply at the same time to the same conversation.

| Obligation | Article | Whose duty | From |
| --- | --- | --- | --- |
| Design the system so people know they are talking to an AI | 50(1) | bitHuman | 2026-08-02 |
| Mark generated output machine-readably | 50(2) | bitHuman | 2026-12-02 |
| Disclose visibly that deepfake content is generated | 50(4) | You | 2026-08-02 |
| Give the information at first interaction or exposure, clearly | 50(5) | Both, for their own disclosure | 2026-08-02 |

> **Note — one case to take advice on.** If you white-label bitHuman output and
> place it on the market under your own name or trademark, or modify it
> substantially, ask your counsel whether you also pick up provider-side duties.
> We are not in a position to answer that for your setup.

## What bitHuman does — Article 50(1)

Article 50(1) is a **design** obligation on us: systems intended to interact
directly with people must be built so those people are informed they are
interacting with an AI. Article 50(5) sets the bar for how — at the latest at
the time of the first interaction, in a clear and distinguishable manner, and
conforming to applicable accessibility requirements.

The "unless it is obvious" exception is narrow. The Commission's guidance says
it is to be read **restrictively**, judged from the point of view of a
reasonably well-informed, observant, and circumspect person. A photorealistic
human face that speaks and responds in real time is the paradigm case of a
system where it is **not** obvious. Do not plan around the exception.

### Where bitHuman controls the interface

The hosted viewer and the [embed iframe](/guides/deploy-embed) are surfaces we
render, so the disclosure there is ours to build.

> **Note — rollout status.** An AI-disclosure notice for the hosted viewer and
> the embed iframe is **being built and is landing on those surfaces** — it is
> **not live yet** as this page is published. Until it ships, treat the hosted
> viewer and the embed as carrying **no** AI disclosure, and add your own on the
> page around the frame. This page is updated when it lands.

### Where you control the interface

If you build with the [Python](/sdk/python), [JavaScript](/sdk/javascript),
[Swift](/sdk/swift), or [Android](/sdk/android) SDKs, the
[CLI](/sdk/cli/overview), or a [self-hosted](/guides/deploy-self-hosted)
deployment, bitHuman renders video frames and nothing else — we cannot draw
into your application. The disclosure surface is yours by construction. Design
it in before 2026-08-02.

This is not a way for either of us to shed the duty. Ours is to make the system
designable for disclosure and to disclose on the surfaces we own; yours is to
actually show it in the product you ship.

## What you must do — Article 50(4)

If what you put in front of a person is **deepfake-class** content, Article
50(4) requires **you**, the deployer, to disclose that it has been artificially
generated or manipulated.

Three things worth being precise about:

- **It is a visible disclosure to a human, at first exposure.** Article 50(5)
  fixes the timing at the latest at the first interaction or exposure, in a
  clear and distinguishable manner, conforming to applicable accessibility
  requirements.
- **Machine-readable marking does not discharge it.** Article 50(2) marking is
  a different obligation, on a different party, aimed at detection tools rather
  than at people. Pointing at ours does not satisfy yours.
- **The artistic and fictional carve-out narrows the disclosure, it does not
  remove it.** Where the content is part of an evidently artistic, creative,
  satirical, or fictional work, the disclosure is limited to revealing the
  existence of generated content in an appropriate manner that does not hamper
  the display or enjoyment of the work.

### What a first-exposure disclosure usually includes

These are the ingredients teams commonly use. Whether your implementation is
sufficient is a judgement for you and your counsel — we will not tell you that
a given design makes you compliant.

- A persistent, legible label on or beside the avatar, present from the first
  frame rather than behind a hover or an info icon.
- Wording that names the fact, not the vendor — "AI-generated avatar" reads
  better than a logo.
- For voice-only or phone deployments, a spoken disclosure in the first turn,
  because there is no visual surface to carry it.
- Contrast, size, and screen-reader text that meet your accessibility baseline;
  Article 50(5) points at accessibility requirements explicitly.
- The same treatment on every entry point — deep links, shared clips, and
  embeds included.

## Model-by-model reading

"Deepfake" is defined in Article 3(60) as AI-generated or manipulated image,
audio, or video content that resembles existing persons, objects, places,
entities, or events and would falsely appear to a person to be authentic or
truthful. The Commission's guidelines read that as **three cumulative
conditions**, and all three have to be met.

Critically, "existing" is read broadly: the subject counts if it exists, **can
plausibly exist, or could plausibly have existed**. A photorealistic portrait of
a person who was never born still lands inside the definition. Content that is
obviously unrealistic — contradicting the laws of nature or well-established
biology — falls outside it.

| Article 3(60) condition | `essence-2` (photorealistic people) | `expression-2` (stylized characters) |
| --- | --- | --- |
| High resemblance to the simulated subject | Yes — the output is a photoreal human face | Depends on the character; a cartoon or creature does not resemble a real subject |
| Resembles something that exists, can plausibly exist, or could plausibly have existed | Yes — a synthetic photoreal human can plausibly exist, even when invented | Generally no for cartoons, animals, creatures, and robots |
| Would falsely appear authentic or truthful | Yes — that is the point of the model | Generally no; a stylized character reads as artificial |
| **Our reading** | **Treat output as deepfake-class.** Plan for Article 50(4) disclosure | **Generally not deepfake-class**, and evidently fictional work also reaches the carve-out |

### The test follows the content, not the model slug

This is the trap. `expression-2` renders people as well as stylized characters.
If you drive a **photorealistic human likeness** through `expression-2`, the
three conditions are assessed against that output and it can be deepfake-class
just as `essence-2` output is. The model name is a good default heuristic and
nothing more — classify what your audience actually sees.

Two related points, flagged rather than advised on:

- An avatar built to resemble a **real, identifiable person** is deepfake-class
  on any model, and brings in law beyond the AI Act — image and personality
  rights, and the GDPR. Get consent and take advice.
- Article 50 is a transparency regime. It does not make otherwise unlawful
  content lawful, and clearing it says nothing about your other obligations.

## Machine-readable marking — Article 50(2)

Article 50(2) requires providers of systems generating synthetic audio, image,
video, or text to mark the output in a machine-readable format, detectable as
artificially generated or manipulated. The solution has to be effective,
interoperable, robust, and reliable **as far as this is technically feasible**,
and the statute expressly weighs the cost of implementation and the generally
acknowledged state of the art.

**Where bitHuman stands:**

- **We do not ship machine-readable marking, watermarking, or content
  credentials at present.** No output from `essence-2` or `expression-2`
  currently carries provenance metadata, a watermark, or a C2PA manifest. We
  would rather state that plainly than let you assume coverage you do not have.
- **Our deadline is 2026-12-02**, because both models were placed on the market
  before 2026-08-02.
- **Our intention** — stated as an intention, not as a shipped feature and not
  as a commitment to any particular standard — is to attach provenance
  information to generated output and to publish how to detect it, ahead of that
  date. We are evaluating the interoperable provenance work in this area,
  including C2PA Content Credentials. This page is updated when there is
  something real to point at.
- **Self-hosted and on-device deployments:** the obligation sits with us as
  provider, but the marking has to be produced by the engine binary running on
  your hardware. Plan to update your SDK and runtime before 2026-12-02; an old
  pinned version will keep producing unmarked output.
- **No retroactive labelling** is required for content generated before
  2026-08-02.

Your Article 50(4) duty is separate and starts on 2026-08-02, four months
earlier. Do not wait for our marking to build your visible disclosure.

## Code of Practice on Transparency of AI-Generated Content

The Commission has published a
[Code of Practice](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)
for Article 50. Adhering to it is **voluntary** — the underlying Article 50
obligations apply to every provider and deployer either way. Signatories get a
recognised route to demonstrating compliance; non-signatories have to
demonstrate compliance by alternative means, assessed individually by market
surveillance authorities, and can expect higher information requests.

bitHuman's position on signing is not settled, and we will state it here rather
than imply one. If your procurement process needs an answer before then, ask us
directly through [support](/community).

## Penalties

Non-compliance with Article 50 sits under
[Article 99(4)(g)](https://artificialintelligenceact.eu/article/99/):
administrative fines of up to **EUR 15,000,000** or, for an undertaking, up to
**3% of total worldwide annual turnover** for the preceding financial year —
**whichever is higher**. For SMEs and startups the cap is the lower of the two
figures. Enforcement is by national market surveillance authorities in each
Member State.

## Primary sources

Read these rather than a summary — including this one.

- [Regulation (EU) 2024/1689, official text on EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Article 50 — transparency obligations](https://artificialintelligenceact.eu/article/50/)
- [Article 3 — definitions, including 3(60) "deep fake"](https://artificialintelligenceact.eu/article/3/)
- [Article 99 — penalties](https://artificialintelligenceact.eu/article/99/)
- [European Commission FAQ on Article 50 transparency obligations](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [European Commission guidelines on transparency for providers and deployers](https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content)
- [Code of Practice on Transparency of AI-Generated Content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)

## Next steps

- Classify your output against the [three Article 3(60) conditions](#model-by-model-reading) — by what your users see, not by the model slug.
- Build a first-exposure disclosure into your interface if you ship on the SDKs, the CLI, or self-hosted.
- If you ship on the [embed iframe](/guides/deploy-embed), add a disclosure on the host page until ours lands.
- Re-check this page before 2026-12-02 for the Article 50(2) marking status.

> **Not legal advice.** This page reflects bitHuman's own reading of the EU AI
> Act as of 2026-08-01 and may be wrong or out of date. It does not establish a
> lawyer-client relationship, and it is not a statement that you, or any
> deployment you build, are compliant. Take your own advice.
