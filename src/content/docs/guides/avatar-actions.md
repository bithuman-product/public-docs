---
title: "Trigger avatar actions from code"
description: "Fire a specific avatar gesture/action deterministically — self-hosted or on the managed cloud — no LLM, no keywords, no randomness. With a ready-to-run example avatar."
section: guides
group: "Build"
order: 2
---

# Triggering avatar actions from code

Avatar actions are **named video clips** ("dynamics") baked into an avatar model.
You play a specific one on demand, deterministically — no language model, no
keyword matching, no random selection. The call differs only by **where the
avatar renders**:

- **Self-hosted** (you hold the runtime): push a `VideoControl` to it.
  ```python
  from bithuman.api import VideoControl
  await avatar.runtime.push(VideoControl(action="mini_wave_hello"))
  ```
- **Managed cloud** (the avatar renders as a remote participant): send it a
  `trigger_dynamics` RPC.
  ```python
  await ctx.room.local_participant.perform_rpc(
      destination_identity=avatar.avatar_identity,
      method="trigger_dynamics",
      payload=json.dumps({"action": "mini_wave_hello"}),
  )
  ```

Both play exactly the clip you name, exactly when you call it.

---

## Try it now — a ready-made avatar

You don't need to create an avatar to try this. **`A06DKG5760`** ("Rascal
Ravioli") is a public example avatar that already has dynamics generated, so you
can trigger its gestures immediately — the **same avatar works both self-hosted
and on the cloud**, with the same action names.

**Gestures available on `A06DKG5760`:**

```
mini_wave_hello   clap_cheer        heart_hands       laugh_react
blow_kiss_heart   thumbs_up_pulse   celebration_jump  talk_head_nod_subtle
```

> These are the `action` names you pass to `VideoControl(action=...)`
> (self-hosted) or in the `trigger_dynamics` payload (cloud). List any avatar's
> real gesture names with `GET /v1/dynamics/{agent_id}` or `bithuman info <model>.imx`.

### Grab the self-hosted `.imx`

`A06DKG5760` is a public avatar, so its dynamics `.imx` (with the gesture clips
baked in) is a direct download — no auth:

```bash
curl -L -o rascal_ravioli.imx \
  https://assets.bithuman.ai/bithuman/A06DKG5760/rascal_ravioli_20250926_120718_604620.imx
```

For **your own** avatars, download the `.imx` from the
[dashboard](https://www.bithuman.ai/#explore) (⋮ → Download) after generating
dynamics, or generate them via the [Dynamics API](/api/dynamics).

---

## How avatar actions work

A bitHuman avatar plays from a graph of **named clips**, in two roles:

- **Idle / talking clips** — the base loop and lip-sync frames.
- **Action clips** — discrete gestures (`mini_wave_hello`, `clap_cheer`,
  `thumbs_up_pulse`, …). These are your "dynamic actions."

You drive the runtime with a single primitive, **`VideoControl`**
(`bithuman.api.VideoControl`). Audio, text, and actions all flow through it:

| Field | Type | Purpose |
|---|---|---|
| `action` | `str \| list[str]` | Name(s) of the action clip(s) to play. **This is the trigger.** |
| `target_video` | `str` | Switch playback to a specific base clip (e.g. a themed idle loop). |
| `force_action` | `bool` | Play the action even if one is already in progress. |
| `stop_on_user_speech` | `bool` | If the user starts talking, cut the action short. |
| `stop_on_agent_speech` | `bool` | Cut the action short when the agent starts talking. |
| `audio` / `text` | — | Used for speech; leave unset for a pure action trigger. |

> **Model note.** Named-gesture triggering needs an avatar that **has dynamics
> generated** (`POST /v1/dynamics/generate` or the dashboard). The example avatar
> `A06DKG5760` is an **essence** model, which is what you want for self-hosted
> `.imx` gesture playback. (The `expression` model generates real-time
> expressions from context rather than playing named clips locally; on the
> managed cloud, `trigger_dynamics` works for any dynamics-enabled avatar.)

---

## Self-hosted — trigger from a local LiveKit agent

> **Version note.** Named-gesture playback self-hosted needs the gesture-capable
> runtime. The current published wheel (`bithuman` 2.3.x) renders **lip-sync
> only** — `runtime.push(VideoControl(action=...))` is a no-op there. For
> self-hosted gestures **today**, pin `pip install "bithuman==1.19.1"`. A `2.4.0`
> release that restores gesture playback on the faster 2.x core is rolling out;
> once it's published, `pip install bithuman` will work with the example below.
> (Gesture triggering on the **managed cloud** — the section above — works on any
> version, since the cloud renderer plays the clips.)

Create the `AvatarSession` in **local mode** (`model_path=`), which builds an
in-process `AsyncBithuman` you reach as `avatar.runtime`:

```python
from livekit.agents import Agent, AgentSession, JobContext, function_tool, RunContext
from livekit.plugins import bithuman
from bithuman.api import VideoControl
import asyncio, os

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await ctx.wait_for_participant()

    avatar = bithuman.AvatarSession(
        model_path="rascal_ravioli.imx",               # the A06DKG5760 .imx you downloaded above
        api_secret=os.environ["BITHUMAN_API_SECRET"],
        model="essence",
    )
    session = AgentSession(...)                         # your STT / LLM / TTS
    await avatar.start(session, room=ctx.room)
    await session.start(agent=Agent(instructions="..."), room=ctx.room)

    # --- Fire an action on YOUR event, deterministically ---
    await avatar.runtime.push(VideoControl(action="mini_wave_hello"))
```

> Prefer to build the runtime yourself? Create an `AsyncBithuman` and pass it in
> as `AvatarSession(runtime=my_runtime)` — same result, you keep a direct handle.

`avatar.runtime` is an object you hold — call `push()` from any event you
define: a timer, an incoming data message, a room/participant event, a webhook,
a state machine, or a tightly-scoped LLM tool (below). Nothing fires unless your
code calls it.

### List the actions a model actually has

Don't guess action names — read them from the model. Two reliable ways:

```bash
# From the .imx itself (CLI):
bithuman info rascal_ravioli.imx        # lists the baked clip names

# Or from the cloud, for any dynamics-enabled avatar:
curl -s https://api.bithuman.ai/v1/dynamics/A06DKG5760 \
  -H "api-secret: $BITHUMAN_API_SECRET"
# -> {"success":true,"data":{"status":"ready","gestures":{"mini_wave_hello":"…", …}}}
```

The `gestures` map keys are the exact `action` names you pass to `VideoControl`.

### Common wiring patterns

**1. On a predefined app event (the deterministic case):**

```python
@ctx.room.on("data_received")
def _on_data(packet):
    if packet.topic == "app.play_action":
        name = packet.data.decode()
        asyncio.create_task(avatar.runtime.push(VideoControl(action=name)))
```

**2. As an explicit, allow-listed LLM tool** (the model can *request* an action,
but only from the fixed set you define — no free-form or random behavior):

```python
ALLOWED = {"mini_wave_hello", "clap_cheer", "thumbs_up_pulse"}

@function_tool()
async def play_gesture(context: RunContext, gesture: str) -> str:
    if gesture not in ALLOWED:
        return f"Unknown gesture. Options: {sorted(ALLOWED)}"
    await avatar.runtime.push(VideoControl(action=gesture, force_action=True))
    return f"Played {gesture}"
```

**3. On a session lifecycle hook** — e.g. wave on the first user turn:

```python
greeted = False

@session.on("user_state_changed")
def _greet_once(ev):
    global greeted
    if ev.new_state == "speaking" and not greeted:
        greeted = True
        asyncio.create_task(avatar.runtime.push(VideoControl(action="mini_wave_hello")))
```

### Interrupt an action

To cut a playing action short (e.g. the user barged in):

```python
avatar.runtime.interrupt()
```

Or set `stop_on_user_speech=True` on the `VideoControl` so the runtime does it
for you when speech is detected.

---

## Cloud (managed) mode

With `AvatarSession(avatar_id=...)`, the avatar renders on bitHuman's cloud as a
**separate LiveKit participant** in your room. There's no in-process runtime, so
you fire a gesture by sending the avatar participant a **`trigger_dynamics` RPC** —
the cloud renderer plays the named clip, exactly like `runtime.push(...)` does
self-hosted. It's the same primitive the platform's own agents use for
state-based gestures (greeting, listening, thinking).

The **same avatar** `A06DKG5760` works here — just reference it by `avatar_id`:

```python
import json, os
from livekit.plugins import bithuman

avatar = bithuman.AvatarSession(
    avatar_id="A06DKG5760",                            # same demo avatar, rendered on the cloud
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
await avatar.start(session, room=ctx.room)

# --- Fire a gesture on YOUR event, deterministically ---
resp = await ctx.room.local_participant.perform_rpc(
    destination_identity=avatar.avatar_identity,       # the cloud avatar participant
    method="trigger_dynamics",
    payload=json.dumps({"action": "mini_wave_hello"}),
)
# resp -> {"action":"mini_wave_hello","animation_triggered":true,"service":"bithuman-serve","status":"success"}
```

The response tells you whether it played: `animation_triggered: true` on success.
If the action name isn't one of the avatar's clips (or the avatar has no
dynamics), `animation_triggered` is `false`. Wire that `perform_rpc(...)` call to
any event you define — a data message, a room/participant event, a timer, or an
allow-listed LLM tool — exactly like the self-hosted `runtime.push(...)` patterns
[above](#common-wiring-patterns).

**Requirements.** The avatar must have gesture clips generated and dynamics
enabled — done once with the [Dynamics API](/api/dynamics)
(`POST /v1/dynamics/generate`) or from the dashboard. Avatars created without
dynamics render lip-sync only and won't respond to `trigger_dynamics`. List the
gestures an avatar has with `GET /v1/dynamics/{agent_id}`.

> **Keyword mapping still applies.** On the managed platform gestures can *also*
> fire automatically when a mapped keyword is spoken. That's independent of the
> RPC above — leave keyword mappings unset if you want gestures to fire **only**
> from your code.

---

## Stopping random actions

Two *optional* layers can make an avatar act on its own. Turn both off for a
"only fires when my code says so" experience:

1. **Idle actions** — baked into the avatar model: a list of gestures the runtime
   plays at random intervals while idle. If your avatar "does things during the
   stream" without you asking, this is almost always the cause. **Fix:** use/build
   an avatar model with an **empty idle-action list** — all gestures stay
   available as named action clips you trigger by hand, but none auto-play. (Ask
   bitHuman to rebuild the model without idle actions, or omit them when you
   author the model.)

2. **Keyword triggers** — an *opt-in* rule set that auto-plays an action when a
   keyword appears in the user's or agent's speech. If you don't configure any,
   none fire. Leave them unset and every action is code-driven.

With idle actions removed and no keyword triggers configured, the avatar plays
**only** what you push via `VideoControl(action=...)` (self-hosted) or
`trigger_dynamics` (cloud).

---

## Summary — what the API gives you today

| Need | API | Deterministic? | Mode |
|---|---|---|---|
| Play a named action (self-hosted) | `runtime.push(VideoControl(action="<name>"))` | ✅ fully | self-hosted |
| Play a named action (managed cloud) | `perform_rpc("trigger_dynamics", {"action":"<name>"})` → `avatar.avatar_identity` | ✅ fully | cloud |
| Switch base clip | `runtime.push(VideoControl(target_video="<name>"))` | ✅ | self-hosted |
| List available actions | `bithuman info <model>.imx` (self-hosted) · `GET /v1/dynamics/{id}` (cloud) | — | both |
| Stop a playing action | `runtime.interrupt()` / `stop_on_user_speech=True` | ✅ | self-hosted |
| Auto-play on keyword | keyword→gesture mapping (dashboard) | opt-in (off by default) | both |
| Auto-play while idle | model `idle_actions` | remove to disable | both |

The event→action binding is yours to define in **both** modes: wire any
predefined event to `runtime.push(VideoControl(action=...))` (self-hosted) or a
`trigger_dynamics` RPC to `avatar.avatar_identity` (managed cloud). There's no
hidden scheduler firing actions behind your back once idle actions and keyword
mappings are off.

> **Try the demo avatar `A06DKG5760`:** self-hosted → grab its `.imx` (above) and
> `runtime.push(VideoControl(action="mini_wave_hello"))`; cloud →
> `AvatarSession(avatar_id="A06DKG5760")` and `trigger_dynamics`. Both respond to
> `mini_wave_hello`, `clap_cheer`, `heart_hands`, `laugh_react`,
> `blow_kiss_heart`, `thumbs_up_pulse`, `celebration_jump`, `talk_head_nod_subtle`.
