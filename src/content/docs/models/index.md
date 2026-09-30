---
title: "Compare models"
description: "Essence 2 renders a photoreal person; Expression 2 renders any character."
section: models
group: "Models"
order: 0
type: concept
llms: models
models: ["essence-2", "expression-2", "essence-1", "expression-1"]
claims: ["S1", "S3", "S12", "S13", "S21", "S28"]
next: ["/models/essence-2", "/models/expression-2", "/deploy"]
moved:
  how-creation-works: /build/create-avatar#how-creation-works
  naming--migration: /models/first-generation#naming--migration
---

Every model reads the same [`.imx` avatar file](/models/avatar-file) and has the same shape: [push audio in, take lip-synced frames out](/models/how-it-works#audio-in-frames-out). The same agent works on every platform that runs its model.

## The models

```model-cards
```

Essence 2 Max is available on the Enterprise plan only. [Contact sales](https://www.bithuman.ai/enterprise?topic=models#contact) to enable it.

Essence 1 and Expression 1 are the [first generation](/models/first-generation). They stay supported, and nothing changes for agents that use them.

## Which should I choose?

- **A photorealistic person:** Essence 2.
- **A stylized or non-human character, or a whole generated scene:** Expression 2.
- **Not sure:** create with `model: "auto"`. A photorealistic person routes to Essence 2, anything else to Expression 2.
- **On a phone, a Mac or in a browser:** Essence 2 or Expression 2.
- **Maintaining a first-generation agent:** keep it. Essence 1 runs on your own CPU; Expression 1 runs in the bitHuman cloud.

## Where each model runs

Each place links to the page that sets it up.

```model-matrix
```

Rendering on your own hardware, every place but the bitHuman cloud, bills at the self-hosted rate ([pricing](/pricing)). How fast each model renders on each device: [Performance](/performance).
