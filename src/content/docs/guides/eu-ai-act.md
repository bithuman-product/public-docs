---
title: "EU AI Act — Article 50 transparency"
description: "Who owes what under Article 50 of the EU AI Act when you build with bitHuman: bitHuman is the provider, you are the deployer, and the visible disclosure obligation is yours. The dates, the split, and what bitHuman does not ship."
section: guides
group: "Deploy"
order: 6
label: "EU AI Act"
---

> **This is our reading of the rules, not legal advice.** Nothing here tells you
> that your product is compliant. If you ship into the EU, take your own advice.

The EU AI Act's transparency rules — **Article 50** — begin applying on
**2 August 2026**. They cover systems that talk to people, and content that is
generated or manipulated by AI. Both describe what you build with bitHuman.

The single most important thing on this page: **the visible "this is AI"
disclosure is the deployer's obligation, not the provider's.** If you build on
bitHuman, that means it is yours, not ours. Most of the surprise people have with
Article 50 comes from assuming their vendor carries it.

## Who is who

The Act splits duties between the party that puts an AI system on the market and
the party that uses it. The European Commission's own FAQ addresses the case
directly: a company selling an AI avatar API is the **provider**, and the
customer using that API is the **deployer**.

| | Party | What that means here |
|---|---|---|
| **Provider** | bitHuman | We place `essence-2` and `expression-2` on the market under our own name. |
| **Deployer** | You | You use them under your authority, in your product, in front of your users. |

Your own employees acting under your instruction are not separate deployers —
your company remains the deployer. Contractors operating the system under your
responsibility and control do not create a second deployer either.

## The split, and the two dates

| Article | Obligation | Whose | From |
|---|---|---|---|
| **50(1)** | A system that interacts directly with people must be built so those people are informed they are interacting with an AI. | **Provider** (bitHuman) | **2 Aug 2026**, no grace |
| **50(4)** | Visible disclosure that content is artificially generated or manipulated, for deepfake-class output. | **Deployer** (you) | **2 Aug 2026**, no grace |
| **50(2)** | Machine-readable marking of generated output, detectable as artificial. | **Provider** (bitHuman) | **2 Dec 2026** — see below |

**Why 50(2) has a later date.** Systems placed on the market before 2 August 2026
fall inside a transitional arrangement and have until **2 December 2026** to meet
the marking obligation. Both `essence-2` and `expression-2` went GA on 10 July
2026, so that is the clock we are on. Content generated before 2 August 2026 does
not need to be labelled retroactively.

## What bitHuman does — and does not — ship today

We would rather write this down than let you assume coverage you do not have.

- **Machine-readable marking: we do not ship it.** No output from either model
  carries a watermark, provenance metadata, or a C2PA manifest today. December 2
  is the date we are working to. Treat it as a target, not a feature you can plan
  around.
- **In-session AI disclosure (50(1)): we do not show one, and that is a
  position rather than a gap.** Neither the bitHuman-hosted viewer nor the embed
  iframe displays a "you are speaking with an AI" notice. We built one, reviewed
  it on a real session, and removed it: on a product whose premise is a visibly
  synthetic avatar that the user chose to open, it read as noise. We rely on the
  Article 50(1) carve-out for cases where the interaction is already obvious —
  while noting on this same page that the Commission reads that exception
  narrowly. Do not plan around it changing. If you build on the SDKs, the CLI, or a
  self-hosted deployment, **we render frames and nothing else** — the surface
  that could carry a notice is yours by construction. Either way: if you need a
  disclosure on the page, put it there yourself and do not assume ours.
- **Running on your own hardware changes none of this.** On-device and
  self-hosted serving is the right answer for privacy. It is not an Article 50
  answer. If anything it makes marking harder: a pinned old runtime will keep
  producing unmarked output, so plan to update before December.

## Which output is "deepfake-class"?

This decides whether your 50(4) obligation bites. Article 3(60) sets three
conditions, all of which must hold. The middle one is broader than most people
expect:

1. **Resemblance** — it closely resembles the thing it depicts;
2. **Existence** — the subject *exists, can plausibly exist, or could plausibly
   have existed*;
3. **False authenticity** — it would falsely appear authentic to a person.

Our reading, applied to the two models:

- **`essence-2` output is deepfake-class — including for people who never
  existed.** A synthetic photorealistic human "can plausibly exist", which
  satisfies the second condition on its own. Do not assume an invented face is
  outside the rule.
- **`expression-2` output generally is not.** A cartoon, animal, creature, or
  object with a face fails the resemblance and false-authenticity conditions.
  Evidently artistic, creative, satirical or fictional work also reaches a
  narrower carve-out, where the disclosure need only be made in a way that does
  not spoil the work.

**The trap: the test follows the content, not the model name.** Drive a
photorealistic human likeness through `expression-2` and it is assessed exactly
as `essence-2` output would be.

## What a deployer actually has to do

- Disclose **at first exposure**, in a **clear and distinguishable** manner.
- You **cannot** discharge it by pointing at machine-readable marking — ours or
  anyone's. That is a different obligation, on a different party, aimed at
  detection tooling rather than at people.
- The disclosure has to meet accessibility requirements, so a purely visual cue
  is not enough on its own.
- The "unless it is obvious" exception in 50(1) is interpreted **restrictively**,
  judged against a reasonably well-informed, circumspect and observant person. A
  photorealistic avatar that speaks and responds is not obvious. Do not rely on
  it.

## Code of Practice

The Commission's **Code of Practice on Transparency of AI-Generated Content** is
a voluntary instrument for demonstrating compliance with Article 50(2), (4) and
(5). It is not mandatory — but non-signatories are expected to demonstrate
compliance by other means and can face higher information requests.

## Penalties

Non-compliance with the transparency obligations can attract fines of up to
**€15,000,000 or 3% of worldwide annual turnover**, whichever is higher.

## Primary sources

Read these rather than trusting a summary — including this one.

- [Transparency obligations under Article 50 — European Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [Article 50 — full text](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50)
- [Code of Practice on Transparency of AI-generated Content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)
- [Guidelines on transparency obligations](https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content)

*Last reviewed 1 August 2026. We are not lawyers, this is not legal advice, and
nothing here establishes that your deployment is compliant.*
