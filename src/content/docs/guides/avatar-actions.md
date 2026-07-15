---
title: "Trigger avatar actions from code"
description: "Fire a specific avatar gesture/action deterministically from your LiveKit agent code — no LLM, no keywords, no randomness."
section: guides
group: "Build"
order: 2
---

# Triggering avatar actions from code

**Short answer (self-hosted runtime):** avatar actions are **named video clips**
baked into your avatar model. To play a specific one on demand, push a
`VideoControl` to the runtime:

```python
from bithuman.api import VideoControl

await avatar.runtime.push(VideoControl(action="wave"))
```

That call is fully deterministic — it plays exactly the clip you name, exactly
when you call it. No language model, no keyword matching, no random selection is
involved.

> **Works in both modes — only the call differs, by where the avatar renders.**
> Self-hosted (`AvatarSession(model_path=...)` / `runtime=...`): you hold the runtime
> and call `runtime.push(...)` directly. **Managed cloud** (`avatar_id=...`): the avatar
> renders as a remote participant, so you fire the same gesture by sending it a
> `trigger_dynamics` RPC — see [Cloud mode](#cloud-managed-mode). Both are deterministic:
> you name the clip, it plays.

---

## Which mode are you in?

The trigger API depends on **where the avatar renders**:

| Mode | How you create it | Where it renders | Trigger actions from code? |
|---|---|---|---|
| **Self-hosted / local** | `AvatarSession(model_path=...)` or `AvatarSession(runtime=my_runtime)` | in-process (`avatar.runtime`) | ✅ `runtime.push(VideoControl(action="…"))` |
| **Managed cloud** | `AvatarSession(avatar_id=..., api_secret=...)` | a remote avatar participant | ✅ `trigger_dynamics` RPC → `avatar.avatar_identity` — see [Cloud mode](#cloud-managed-mode) |

Both paths are deterministic — you name the clip, it plays. The self-hosted examples
below use `runtime.push(...)`; the [Cloud mode](#cloud-managed-mode) section shows the
equivalent RPC for managed cloud.

---

## How avatar actions work

A bitHuman avatar plays from a **video graph** of named clips. Clips come in two
roles:

- **Idle / talking clips** — the base loop and lip-sync frames.
- **Action clips** — discrete gestures/expressions (`wave`, `nod`, `point`,
  `thumbs_up`, …). These are your "dynamic actions."

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

> **Model note.** Use an **`essence`** model — it ships with pre-configured, named
> gestures and gives predictable, repeatable behavior. The `expression` model
> instead generates real-time emotional expressions from context and is not driven
> by named action clips.

---

## Trigger an action from code (self-hosted LiveKit agent)

Create the `AvatarSession` in **local mode** (`model_path=`), which builds an
in-process `AsyncBithuman` you can reach as `avatar.runtime`:

```python
from livekit.agents import Agent, AgentSession, JobContext, function_tool, RunContext
from livekit.plugins import bithuman
from bithuman.api import VideoControl
import asyncio, os

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await ctx.wait_for_participant()

    avatar = bithuman.AvatarSession(
        model_path=os.environ["BITHUMAN_MODEL_PATH"],   # local mode -> in-process runtime
        api_secret=os.environ["BITHUMAN_API_SECRET"],
        model="essence",
    )
    session = AgentSession(...)                         # your STT / LLM / TTS
    await avatar.start(session, room=ctx.room)
    await session.start(agent=Agent(instructions="..."), room=ctx.room)

    # --- Fire an action on YOUR event, deterministically ---
    await avatar.runtime.push(VideoControl(action="wave"))
```

> Prefer to build the runtime yourself? Create an `AsyncBithuman` and pass it in
> as `AvatarSession(runtime=my_runtime)` — same result, you keep a direct handle.

`avatar.runtime` is a normal object you hold — call `push()` from any event you
define: a timer, an incoming data message, a room/participant event, a webhook,
a state machine, or a tightly-scoped LLM tool (below). Nothing fires unless your
code calls it.

### List the actions your model actually has

Action names are defined by your avatar model. Enumerate them at runtime so you
never guess:

```python
names = avatar.runtime.video_graph.action_video_names   # -> ["wave", "nod", ...]
```

### Common wiring patterns

**1. On a predefined app event (the deterministic case you asked for):**

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
ALLOWED = {"wave", "nod", "point_at_screen"}

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
        asyncio.create_task(avatar.runtime.push(VideoControl(action="wave")))
```

### Interrupt an action

To cut a playing action short (e.g. the user barged in):

```python
avatar.runtime.interrupt()
```

Or set `stop_on_user_speech=True` on the `VideoControl` so the runtime does it
for you when speech is detected.

---

## Stopping random actions

Two *optional* layers can make an avatar act on its own. Turn both off for a
"only fires when my code says so" experience:

1. **Idle actions** — baked into the avatar model: a list of gestures the runtime
   plays at random intervals while idle (`np.random.choice(idle_actions)` every
   N seconds). If your avatar "does things during the stream" without you asking,
   this is almost always the cause. **Fix:** use/build an avatar model with an
   **empty idle-action list** — all gestures stay available as named action clips
   you trigger by hand, but none auto-play. (Ask bitHuman to rebuild the model
   without idle actions, or omit them when you author the model.)

2. **Keyword triggers** — an *opt-in* rule set (`KeywordTrigger` /
   `VideoActionTrigger`) that auto-plays an action when a keyword appears in the
   user's or agent's speech. If you don't configure any, none fire. Leave them
   unset and every action is code-driven.

With idle actions removed and no keyword triggers configured, the avatar plays
**only** what you push via `VideoControl(action=...)`.

---

## Cloud (managed) mode

With `AvatarSession(avatar_id=...)`, the avatar renders on bitHuman's cloud as a
**separate LiveKit participant** in your room. There's no in-process runtime, so you
fire a gesture by sending the avatar participant a **`trigger_dynamics` RPC** — the
cloud renderer plays the named clip, exactly like `runtime.push(...)` does
self-hosted. It's the same primitive the platform's own agents use for state-based
gestures (greeting, listening, thinking).

```python
import json, os
from livekit.plugins import bithuman

avatar = bithuman.AvatarSession(
    avatar_id="A1234567890",
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
await avatar.start(session, room=ctx.room)

# --- Fire a gesture on YOUR event, deterministically ---
resp = await ctx.room.local_participant.perform_rpc(
    destination_identity=avatar.avatar_identity,   # the cloud avatar participant
    method="trigger_dynamics",
    payload=json.dumps({"action": "mini_wave_hello"}),
)
# resp -> {"status":"success","action":"mini_wave_hello","animation_triggered":true,"service":"bithuman-serve"}
```

The response tells you whether it played: `animation_triggered: true` on success, or
`status: "error"` when the action name is unknown or the avatar has no gesture clips.
Wire that `perform_rpc(...)` call to any event you define — a data message, a
room/participant event, a timer, or an allow-listed LLM tool — exactly like the
self-hosted `runtime.push(...)` patterns [above](#common-wiring-patterns).

**Requirements.** The avatar must have gesture clips generated and dynamics enabled —
done once with the [Dynamics API](/api/dynamics) (`POST /v1/dynamics/generate`) or from
the dashboard. Avatars created without dynamics render lip-sync only and won't respond
to `trigger_dynamics`. List the gestures an avatar has with `GET /v1/dynamics/{agent_id}`.

> **Keyword mapping still applies.** On the managed platform gestures can *also* fire
> automatically when a mapped keyword is spoken. That's independent of the RPC above —
> leave keyword mappings unset if you want gestures to fire **only** from your code.

---

## Summary — what the API gives you today

| Need | API | Deterministic? | Mode |
|---|---|---|---|
| Play a named action (self-hosted) | `runtime.push(VideoControl(action="<name>"))` | ✅ fully | self-hosted |
| Play a named action (managed cloud) | `perform_rpc("trigger_dynamics", {"action":"<name>"})` → `avatar.avatar_identity` | ✅ fully | cloud |
| Switch base clip | `runtime.push(VideoControl(target_video="<name>"))` | ✅ | self-hosted |
| List available actions | `runtime.video_graph.action_video_names` (self-hosted) · `GET /v1/dynamics/{id}` (cloud) | — | both |
| Stop a playing action | `runtime.interrupt()` / `stop_on_user_speech=True` | ✅ | self-hosted |
| Auto-play on keyword | `KeywordTrigger` / dashboard keyword→gesture | opt-in (off by default) | both |
| Auto-play while idle | model `idle_actions` | remove to disable | both |

The event→action binding is yours to define in **both** modes: wire any predefined event
to `runtime.push(VideoControl(action=...))` (self-hosted) or a `trigger_dynamics` RPC to
`avatar.avatar_identity` (managed cloud). There's no hidden scheduler firing actions
behind your back once idle actions and keyword mappings are off.
