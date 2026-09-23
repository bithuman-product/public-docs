---
title: "Write an agent persona"
description: "Write the system prompt that gives an avatar its personality, with the CO-STAR framework and a worked example."
section: guides
group: "Build"
order: 21
type: guide
label: "Write a persona"
---

The persona is the avatar's system prompt: who it is, what it is for, and how it answers. Set it as `prompt` when you [create the agent](/guides/building-avatars), or change it later with [`POST /v1/agent/{code}`](/api/agents#update-an-agent).

## Before you start

- An agent, or one you are about to create.

## 1. Fill in the six fields

| Field | Defines | Weak → strong |
|---|---|---|
| **C**ontext | setting and situation | "customer service" → "second-level support for a cloud product, handling escalated cases" |
| **O**bjective | the goal | "be helpful" → "resolve the issue in the first conversation" |
| **S**tyle | how it communicates | "professional" → "like a patient in-store technician who uses analogies" |
| **T**one | emotional attitude | patient, empathetic, calm under frustration |
| **A**udience | who it talks to | "everyone" → "everyday users, beginner to intermediate" |
| **R**esponse | the shape of answers | "acknowledge → clarify → step by step → confirm → offer more" |

## 2. Write it as a prompt

```text
CONTEXT:   Online tutor helping high-school students with exam-season math.
OBJECTIVE: Explain concepts clearly, solve specific problems, build confidence.
STYLE:     Like an award-winning teacher: real-world examples, step by step.
TONE:      Encouraging and patient; mistakes are part of learning.
AUDIENCE:  Ages 14–18, mixed ability, some test anxiety.
RESPONSE:  Acknowledge, break into steps, encourage, use an analogy, close with confidence.
```

Keep spoken answers short: an avatar speaks every word, so two or three sentences per turn feel natural.

## Check it worked

Talk to the agent (`https://www.bithuman.ai/embed/<code>`) and ask three questions your users would ask. Adjust the field that produced the weakest answer.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Answers are long and read like text | add "Answer in two or three spoken sentences" to RESPONSE |
| The tone swings between formal and casual | pick one tone; remove the conflicting words |
| Answers are generic | make CONTEXT and AUDIENCE specific |

## Next

- [Create your own avatar](/guides/building-avatars) · [Knowledge](/api/knowledge) · [Voices](/guides/voice-providers)
