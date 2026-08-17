---
title: "EU AI Act — transparency (Article 50)"
description: "How the EU AI Act's Article 50 transparency rules apply to bitHuman avatars: which obligations land on bitHuman as provider, which land on you as deployer, the model-by-model deepfake reading, and the dates that matter."
section: resources
group: "Legal"
order: 1
label: "EU AI Act"
---

> **Note — This is our reading, not legal advice.** bitHuman is not a law
> firm. This page explains how we interpret Article 50 of the EU AI Act for
> avatars built on bitHuman, so you can brief your own counsel. It does not
> make you compliant, and nothing here says your deployment *is* compliant.
> Your obligations depend on how and where you deploy.

## The short version

The EU AI Act's transparency rules
([Article 50](https://artificialintelligenceact.eu/article/50/)) exist so
that a person who is talking to an AI, or looking at AI-generated content,
knows it. An avatar is squarely in scope.

The obligations split in two, and the split is the single most important
thing on this page:

| Who | Role under the AI Act | Obligations |
| --- | --- | --- |
| **bitHuman** | **Provider** — we develop the system and place it on the market under our own name | Article 50(1) AI-interaction disclosure; Article 50(2) machine-readable marking of synthetic output |
| **You** (API, SDK, or self-hosted) | **Deployer** — you use the system under your own authority | Article 50(4) visible disclosure of deepfake content to the people who see it |

Both sets apply at once. bitHuman meeting its obligations does **not**
discharge yours, and the Commission is explicit that a deployer cannot lean
on our machine-readable marking to satisfy Article 50(4).

## Dates

| Date | What happens |
| --- | --- |
| 2026-08-02 | Article 50 starts to apply. Article 50(1) and Article 50(4) bite immediately — no transition |
| 2026-12-02 | Article 50(2) machine-readable marking deadline for AI systems placed on the market **before** 2026-08-02 |

Essence 2 and Expression 2 reached general availability on
[2026-07-10](/changelog), before the 2026-08-02 cut-off, so the machine-readable
marking obligation in Article 50(2) falls on the **2026-12-02** date for
them. Content generated before 2026-08-02 does not need retroactive marking.

Penalties for infringing Article 50 run to **EUR 15,000,000 or 3% of total
worldwide annual turnover, whichever is higher**
([Article 99(4)](https://artificialintelligenceact.eu/article/99/)).

## Who is the provider and who is the deployer

The Commission's own FAQ works through the case of a company that sells an
AI avatar API or SDK to other businesses, and reaches the answer directly:
the company building and offering the API is the **provider**; the
businesses that deploy it under their own authority are **deployers**.

That is bitHuman and you.

- **bitHuman is the provider.** We develop the models and place them on the
  market under our own name. Article 50(1) and Article 50(2) are ours.
- **You are the deployer.** You put an avatar in front of your users, in your
  product, under your brand. Article 50(4) is yours. This holds whether you
  call the cloud API, embed the hosted viewer, or run the SDK entirely on your
  own hardware — self-hosting does not move the obligation, it just means you
  control more of the surface it has to appear on.

If you resell or rebrand a bitHuman avatar as your own product, you may
become a provider in your own right for that system. That is a question for
your counsel, not for this page.

## What bitHuman does — Article 50(1)

Article 50(1) requires the provider to design systems that interact directly
with natural persons so those persons are informed they are interacting with
an AI, "in a clear and distinguishable manner" and, per Article 50(5), "at
the latest at the time of the first interaction or exposure".

There is an exception where the AI interaction is "obvious", but it is
interpreted **restrictively** — it is judged against an average person who is
reasonably well-informed, observant and circumspect, and the Commission notes
the exception deprives people of transparency. A photorealistic human avatar
that talks back in real time is the paradigm case of *not* obvious. Do not
plan around the exception.

> **Note — Rollout status.** The AI-interaction disclosure is **landing** in
> the bitHuman hosted viewer and embed. It is not live in those surfaces as
> this page is published — the only user-visible branding there is the
> "Explore other agents at bithuman.ai" link, which is not an AI disclosure.
> We are stating that plainly rather than letting you assume a control exists.
> Track [the changelog](/changelog) for the shipping entry.

What that means for you in the meantime, and after:

- **Hosted viewer / embed.** The disclosure will be part of the surface
  bitHuman renders. You will not have to build it, and you should not remove
  or obscure it.
- **SDK, custom UI, or self-hosted.** bitHuman does not render your UI, so no
  provider-side element can appear in it. You are placing the pixels, so you
  place the disclosure — at first interaction, clear and distinguishable. Do
  not wait for a bitHuman element to appear in a UI we do not draw.
- **Do not suppress it.** If you strip a disclosure bitHuman renders, you are
  taking on the consequences of that choice.

## What you must do — Article 50(4)

If your avatar output is deepfake-class (see the model-by-model reading
below), Article 50(4) requires you, the deployer, to **disclose that the
content has been artificially generated or manipulated**.

The practical rules:

- **It must be visible to a human.** Machine-readable marking under Article
  50(2) does not satisfy Article 50(4). The Commission states that deployers
  "cannot simply rely on the machine-readable marking embedded in the content
  by the provider" — the disclosure has to be understandable and perceivable
  by the natural persons concerned.
- **At first exposure.** Article 50(5) sets the timing: clear and
  distinguishable, at the latest at the time of first interaction or
  exposure. Not in a footer, not in a terms page, not after the conversation.
- **Artistic and fictional carve-out.** Where the content forms part of an
  "evidently artistic, creative, satirical, fictional or analogous work or
  programme", the obligation is **limited**, not removed: you still disclose
  the existence of generated content, but "in an appropriate manner that does
  not hamper the display or enjoyment of the work". A game character or an
  animated short can disclose in the credits or a title card. A synthetic
  presenter in a corporate video cannot.

Article 50(4) also covers AI-generated **text** published to inform the
public on matters of public interest. If your avatar's script is generated
and published that way, that limb applies too, unless the text went through
human editorial review with someone taking editorial responsibility.

## Model-by-model reading

"Deepfake" is a defined term
([Article 3(60)](https://artificialintelligenceact.eu/article/3/)), and the
Commission reads it as **three cumulative conditions** — all three must hold.
This is where the two bitHuman models genuinely part company.

| Article 3(60) condition | `essence-2` (Essence 2) | `expression-2` (Expression 2) |
| --- | --- | --- |
| High degree of resemblance to the simulated subject | Yes — a photorealistic human portrait | Typically no — stylized, non-human, or clearly drawn |
| Subject exists, can plausibly exist, or could plausibly have existed | Yes — a synthetic photoreal human plausibly exists | Generally no — cartoons, animals, creatures, robots cannot |
| Would falsely appear to a person to be authentic or truthful | Yes at normal viewing quality | No — evidently synthetic on its face |
| **Our reading** | **Treat output as deepfake-class** | **Generally outside the definition** |

### Why Essence 2 is deepfake-class even for invented people

The second condition is the one people get wrong. It is **not** limited to
real, identifiable individuals. The Commission reads "existing persons"
broadly: it is enough that the subject "can plausibly exist or could have
plausibly existed in reality". A photorealistic portrait of a person who has
never existed still satisfies it, because such a person plausibly could.

So an Essence 2 avatar of a completely invented spokesperson — no real
likeness, no rights-holder, nobody to sue — is still deepfake-class on this
reading, and Article 50(4) still lands on you. Plan for the visible
disclosure.

### Why Expression 2 generally is not

A cartoon, an animal, a creature, or a robot fails the second condition —
there is no plausibly-existing real-world subject it resembles — and usually
the third, because it is evidently synthetic to any viewer. Even where a
stylized character arguably got close, it would in practice fall inside the
evidently artistic or fictional carve-out in Article 50(4).

### The test follows the output, not the model slug

Expression 2 animates people as well as stylized characters. **The three
conditions are applied to what you actually put on screen**, not to which
model produced it. If you build a character on `expression-2` that reads as a
photorealistic human, apply the Essence 2 row. If in doubt, disclose —
disclosure costs you a line of UI; getting it wrong costs the figure in the
[Dates](#dates) section.

## Machine-readable marking — Article 50(2)

Article 50(2) requires providers to mark synthetic audio, image, video and
text output in a **machine-readable** format, detectable as artificially
generated or manipulated. The statute qualifies this: solutions must be
"effective, interoperable, robust and reliable as far as this is technically
feasible", weighing the specificities and limitations of each content type,
the costs of implementation, and the generally acknowledged state of the art.

Our position, stated honestly:

- **bitHuman does not ship content credentials, watermarking, or C2PA
  provenance in any model or SDK.** No such marking exists in bitHuman output
  as this page is published. If a vendor questionnaire asks, that is the
  answer.
- **The obligation is ours, and 2026-12-02 is the date we are working to** for
  Essence 2 and Expression 2, which shipped before the 2026-08-02 cut-off.
- **We are not naming a technology yet.** Provenance and watermarking
  approaches for real-time, on-device, streamed video are genuinely unsettled,
  and Article 50(2) is explicitly measured against the state of the art. We
  will publish the approach in [the changelog](/changelog) when it is decided
  and shipping — as an **intention**, our work is oriented toward an
  interoperable provenance standard rather than a proprietary mark.
- **This does not block you.** Article 50(4) — the obligation that is yours —
  is a visible disclosure you render, and it never depended on our marking
  anyway.

## Code of Practice on Transparency of AI-Generated Content

The Commission facilitated a
[Code of Practice on Transparency of AI-generated Content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content).
Adherence is **voluntary**; the underlying Article 50 obligations are not.
Signing is one recognised way to demonstrate compliance. Non-signatories
"will have to demonstrate compliance through alternative adequate means" and
"may be subject to more requests for information, since there is less
transparency on how they comply". bitHuman has not announced a signatory
position; when that changes it will appear in [the changelog](/changelog).

## A short checklist for deployers in the EU

1. Decide which side of the [model-by-model reading](#model-by-model-reading)
   your avatar output falls on. Photoreal human likeness → assume
   deepfake-class.
2. Put a visible AI disclosure at **first exposure**, in the surface your
   users actually see. Not a footer, not a terms page.
3. If you build your own UI on the SDK, carry the AI-interaction disclosure
   through — nothing bitHuman renders will appear there.
4. If you rely on the artistic or fictional carve-out, write down why, and
   still disclose in a way that does not hamper the work.
5. Do not describe your deployment as "compliant" on the strength of this
   page. Take it to counsel.

## Primary sources

Read these rather than a summary — including this one:

- [Article 50 — Transparency obligations for providers and deployers of certain AI systems](https://artificialintelligenceact.eu/article/50/)
- [Article 3 — Definitions (see 3(60), "deep fake")](https://artificialintelligenceact.eu/article/3/)
- [Article 99 — Penalties](https://artificialintelligenceact.eu/article/99/)
- [European Commission FAQ — Transparency obligations under Article 50 of the AI Act](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [European Commission — Guidelines on transparency obligations for providers and deployers of AI systems](https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content)
- [European Commission — Code of Practice on Transparency of AI-generated Content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)

## Next steps

- [Essence 2](/concepts/essence-2) — the photorealistic-people model, and the
  one whose output is deepfake-class.
- [Expression 2](/concepts/expression-2) — the stylized-character model.
- [Embedding](/api/embedding) — the hosted viewer and embed, where the
  provider-side disclosure lands.
- Compliance questions for an enterprise review: reach the team through
  [Community](/community).
