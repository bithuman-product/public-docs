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
  which-should-i-choose: /models#choosing-a-model
---

Essence 2, Expression 2 and Essence 1 read an [`.imx` avatar file](/models/avatar-file); Expression 1 renders from the agent's portrait in the cloud. Every model has the same shape: [push audio in, take lip-synced frames out](/models/how-it-works#audio-in-frames-out). The same agent works on every platform that runs its model.

## The models

```model-cards
```

Essence 2 Max is not currently offered.

Essence 1 and Expression 1 are the [first generation](/models/first-generation). They stay supported, and nothing changes for agents that use them.

## Choosing a model

Pick the model from the subject:

- **A real person:** Essence 2.
- **Anything else** (a cartoon or stylized character, an animal, a robot, a creature, a whole generated scene): Expression 2.
- **Not sure:** create with `model: "auto"`. A real person routes to Essence 2, anything else to Expression 2.
- **On a phone, a Mac or in a browser:** Essence 2 or Expression 2.
- **Maintaining a first-generation agent:** keep it. Essence 1 runs on your own CPU; Expression 1 runs in the bitHuman cloud.

Every model except Expression 2 needs a clear, real human face: Essence 2, Essence 1 and Expression 1. When the photo or prompt describes a cartoon, a stylized character, an animal, a robot or a creature, or no face can be found in the photo, creating or adding that model is refused with [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) before anything is charged. The message tells you to use Expression 2, which animates any subject.

## Where each model runs

Each place links to the page that sets it up.

```model-matrix
```

Rendering on your own hardware, every place but the bitHuman cloud, bills at the self-hosted rate ([pricing](/pricing)). How fast each model renders on each device: [Performance](/performance).
