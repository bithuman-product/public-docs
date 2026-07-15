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

> **Code-driven action triggering requires a self-hosted (in-process) runtime.**
> With `AvatarSession(model_path=...)` or `AvatarSession(runtime=...)` you hold the
> runtime and can `runtime.push(...)` directly. **Managed cloud** avatars
> (`avatar_id=...`) render remotely and do **not** currently expose a code-level
> action trigger — see [Cloud mode](#cloud-managed-mode).

---

## Which mode are you in?

The trigger API depends on **where the avatar renders**:

| Mode | How you create it | Where it renders | Trigger actions from code? |
|---|---|---|---|
| **Self-hosted / local** | `AvatarSession(model_path=...)` or `AvatarSession(runtime=my_runtime)` | in-process (`avatar.runtime`) | ✅ `runtime.push(VideoControl(action="…"))` |
| **Managed cloud** | `AvatarSession(avatar_id=..., api_secret=...)` | a remote avatar participant | ❌ not currently available — see [Cloud mode](#cloud-managed-mode) |

If you need code-driven actions today, run the runtime in-process (self-hosted).
Everything below assumes that.

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
**separate LiveKit participant**, so there's no in-process runtime — and the managed
cloud renderer does **not** currently expose a code-level action trigger. Firing a
specific gesture per event from your agent code is **not available on managed cloud
today**.

On the managed platform, gestures are authored with the
[Dynamics API](/api/dynamics) (`POST /v1/dynamics/generate`) and trigger by
**keyword mapping** during a conversation — i.e. automatically, when a mapped word
is spoken, not on demand from your code.

**If you need deterministic, per-event actions from code, self-host the runtime**
([above](#trigger-an-action-from-code-self-hosted-livekit-agent)) — that's the
supported path today. If you need per-event gesture triggering on managed cloud,
[contact us](https://www.bithuman.ai/#developer) — it's on the roadmap, not shipped.

---

## Summary — what the API gives you today

| Need | API | Deterministic? | Mode |
|---|---|---|---|
| Play a named action (self-hosted) | `runtime.push(VideoControl(action="<name>"))` | ✅ fully | self-hosted |
| Play a named action (managed cloud) | — not available yet | ❌ | cloud |
| Switch base clip | `runtime.push(VideoControl(target_video="<name>"))` | ✅ | self-hosted |
| List available actions | `runtime.video_graph.action_video_names` (self-hosted) · `GET /v1/dynamics/{id}` (cloud) | — | both |
| Stop a playing action | `runtime.interrupt()` / `stop_on_user_speech=True` | ✅ | self-hosted |
| Auto-play on keyword | `KeywordTrigger` / dashboard keyword→gesture | opt-in (off by default) | both |
| Auto-play while idle | model `idle_actions` | remove to disable | both |

On a **self-hosted** runtime the event→action binding is yours to define: wire any
predefined event to a `runtime.push(VideoControl(action=...))` call, and there's no
hidden scheduler firing actions behind your back once idle actions and keyword
mappings are off. Per-event triggering on **managed cloud** isn't available yet.
