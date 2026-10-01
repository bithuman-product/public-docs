---
title: "Turn a drawing, mascot or pet photo into a talking character"
description: "Create an Expression 2 avatar from one portrait of any character, then talk to it in a browser, on a website or in your app."
section: build
group: "How-to"
order: 20
type: recipe
llms: build
searchTitle: "Turn a drawing, mascot, cartoon or pet photo into a talking AI character"
availability: "creator"
renders: ["cloud", "browser", "device"]
needs: ["API secret"]
platforms: ["rest", "web", "ios", "android"]
models: ["expression-2"]
next: ["/build/persona", "/build/voices", "/build/website-widget"]
---

## What you'll build

Create an avatar with the `expression-2` model from one portrait of a drawing, a mascot, a cartoon, a pet or a robot, then talk to it on its agent page, on your website or in your app. Creating your own avatar is a one-time 500 credits for Essence 2 or 2,000 credits for Expression 2, and takes about 2 to 2.5 hours; a failed creation is refunded automatically.

Use your own portrait, or one you have the rights to. You need:

- an [API secret](/start/api-secret) on the Creator plan or higher, and credits for the creation ([pricing](/pricing#creation--one-time-credits));
- a portrait image at a public URL (or a prompt to create one from);
- optionally, a voice sample for cloning: 30 seconds or more of clean speech from one speaker.

## Steps

### Pick a portrait that works

Expression 2 animates the whole frame with no face detector or cropping step, so it works for any character ([Expression 2](/models/expression-2)). Every other model needs a clear, real human face and refuses a character before anything is charged.

| Input | Use for | Limits |
|---|---|---|
| Image | the face | under 10 MB; one clear figure, neutral expression, facing the camera, face unobstructed |
| Voice | voice cloning | 30 seconds or more of clean speech, one speaker, no music (MP3, WAV or M4A); the whole file is used |
| Prompt | the personality | required when there is no image |

For an animal or character, use a well-lit, front-facing picture with the face filling the frame. Without a voice sample, a voice is generated to match the persona; without a prompt, a persona is generated from the image ([Create your own avatar](/build/create-avatar#what-makes-a-good-photo)).

```expected
An image URL that opens in a browser without signing in, under 10 MB, plus a voice sample and a prompt if you have them.
```

### Create the character

Send the portrait with `"model": "expression-2"`. You can also create one in the dashboard at [bithuman.ai](https://www.bithuman.ai/explore), which starts on Expression 2.

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "expression-2", "prompt": "You are a friendly fitness coach.", "image": "https://your-site.example/portrait.jpg"}'
# → {"success": true, "agent_id": "A80HVD8577", "status": "processing"}
```

Credits are reserved when you submit and refunded automatically if the creation fails. A completed creation is not refunded, so a second `generate` is a second charge ([Agents API](/api/agents#generate-an-agent)).

```expected
An `agent_id`, with `status` `processing`.
```

### Wait until it is ready

Poll until `status` is `ready` or `failed`:

```bash
curl -s https://api.bithuman.ai/v1/agent/status/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
# → {"success": true, "data": {"status": "ready", "progress": 1.0, …}}
```

```expected
`status` is `ready`: after about 2 to 2.5 hours, or up to 4 for an Expression 2 identity that needs more training.
```

### Talk to it

Pick the place it appears:

- **Its agent page:** open `https://www.bithuman.ai/embed/<agent_id>` in a browser, allow the microphone and talk to it.
- **Your website:** one script tag adds it as a floating widget ([Website widget](/build/website-widget)). Keep **Anonymous Share** on in its sharing settings; its sessions bill your account.
- **Your app:** download the avatar file and render it on the device with the Swift package or the Android SDK ([Put an animated character in an iPhone app](/build/how-to/iphone-character), [Android](/platforms/android)).

```html
<script src="https://www.bithuman.ai/widgets/bithuman-gadget.js"></script>
<script>
  BitHumanGadget.init({
    agentUrl: "https://bithuman.ai/A23WJF0199?deployment=gadget",
    position: "bottom-right",
    buttonText: "Talk to us",
  });
</script>
```

Replace `A23WJF0199` (the `wise-pup` sample) with your agent code.

```expected
The character idles, listens and answers out loud with its lips in sync.
```

## How it works

The input is one portrait image, treated as a reference and regenerated to a standard framing ([How creation works](/build/create-avatar#how-creation-works)). Expression 2 trains a small model of your specific identity straight from the photo, which is why creation takes a couple of hours.

Creation happens in the bitHuman cloud; the finished avatar then runs wherever its model runs: in the bitHuman cloud, on iPhone, iPad, Android, Mac or Linux, or in a browser tab with WebGPU, where a browser without a usable GPU is switched to cloud rendering ([Expression 2: Where it runs](/models/expression-2#where-it-runs)).

## Make it your own

- **Its personality:** write the prompt with [the persona guide](/build/persona).
- **Its voice:** clone one from a sample, or choose one: [Voices](/build/voices).
- **A photoreal person instead:** create with `essence-2`, or `auto` to route by the photo ([Choosing a model](/models#choosing-a-model)).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `422 MODEL_SUBJECT_MISMATCH` | a model other than `expression-2` for a subject that is not a real person | use `expression-2` or `auto` |
| `402 INSUFFICIENT_BALANCE` | not enough credits | [top up](https://www.bithuman.ai/billing#credits) (the error's `topup_url`) |
| `403 PLAN_REQUIRED` | a Free account, which cannot create agents, or a model outside your plan | [choose a plan](https://www.bithuman.ai/pricing?from=docs) (the error's `upgrade_url`) |
| `failed` with an image error | the image URL is not publicly fetchable | host the image publicly and create again (the failed creation is refunded) |
| The voice sounds noisy | background noise or music in the sample | re-record in a quiet room |
