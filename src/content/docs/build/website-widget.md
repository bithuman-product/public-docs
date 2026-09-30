---
title: "Website widget"
description: "Add a floating, talking avatar to any website with one script tag."
section: build
group: "Apps"
order: 10
type: recipe
llms: build
time: "5 min"
renders: ["cloud", "browser"]
platforms: ["web"]
models: ["essence-2", "expression-2"]
claims: ["S14", "S25", "S29"]
next: ["/platforms/web", "/build/persona", "/api/embedding"]
---

## What you'll build

A talking avatar in the corner of your website. Visitors open it, allow the microphone and talk to it; it answers out loud with its lips in sync. One script tag adds it to any page, in any framework. There is no npm package and no server to run.

You need:

- a website you can add a `<script>` tag to, served over HTTPS (or `http://localhost` while you build);
- an agent code: `A23WJF0199` (the `wise-pup` sample) or your own agent's.

## Steps

### Pick the agent

Use the `wise-pup` sample (agent code `A23WJF0199`) while you build. For your own agent, keep **Anonymous Share** on in its sharing settings: the widgets open the agent's public link, and its sessions bill your account.

```expected
`https://bithuman.ai/A23WJF0199` opens the avatar in a browser tab.
```

### Add the floating widget

Paste this before `</body>`:

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

```expected
A button in the bottom-right corner. Select it: the avatar opens in a floating frame you can drag and resize, asks for the microphone, and answers when you speak.
```

### Or add the chat widget

The chat widget opens a side panel where visitors type, talk, or switch to video:

```html
<script src="https://www.bithuman.ai/widgets/bithuman-chat-widget.js"></script>
<script>
  BitHumanChat.init({
    agentUrl: "https://bithuman.ai/A23WJF0199",
    defaultChatMode: "text",
    welcomeMessage: "Hi! How can I help?",
  });
</script>
```

```expected
A floating card in the corner. Opening it shows the panel with the welcome message; the mode switch moves between text, voice and video.
```

### Load it in React or Next.js

In Next.js, load the script with `next/script` and call `init` when it has loaded:

```tsx
"use client";
import Script from "next/script";

declare global {
  interface Window { BitHumanGadget?: { init: (options: Record<string, unknown>) => void } }
}

export function AvatarWidget({ code }: { code: string }) {
  return (
    <Script
      src="https://www.bithuman.ai/widgets/bithuman-gadget.js"
      strategy="afterInteractive"
      onLoad={() => window.BitHumanGadget?.init({ agentUrl: `https://bithuman.ai/${code}?deployment=gadget` })}
    />
  );
}
```

Render `<AvatarWidget code="A23WJF0199" />` once, in your root layout. In other React apps, add the two `<script>` tags to the page's HTML, or put the web embed in an `<iframe>` ([Web](/platforms/web/app#react-and-other-frameworks)).

```expected
The widget's button appears on every page of the app. A second `init` call is ignored, so a re-render does not add a second widget.
```

### Give it your persona and model

The widget runs the agent's managed conversation, so the persona and the model are settings on the agent, not code on your page. Set the persona as the agent's `system_prompt` ([Persona](/build/persona)). To answer with your own model, connect any OpenAI-compatible endpoint with [Providers](/api/providers#openai-compatible-endpoints-self-hosted-proxies-gateways) and point the agent's `llm` at it.

```expected
The next session answers in the new persona, with your model. Nothing on your page changed.
```

## How it works

```diagram
topology cloud
```

The script adds a button to your page. Opening it loads the web embed for your agent in a frame. The avatar renders in the bitHuman cloud, in the US, and streams to the visitor. With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab.

```price
cloud
```

## Make it your own

The embed dialog in the bitHuman app writes these options for you. `agentUrl` is required; the rest are optional.

**Floating widget** (`BitHumanGadget.init`):

| Option | Values |
|---|---|
| `agentUrl` | `https://bithuman.ai/<agent code>?deployment=gadget` |
| `theme` | `light` (default) or `dark` |
| `position` | `bottom-right` (default), `bottom-left`, `top-right`, `top-left`, `center` |
| `size` | the frame's starting size in pixels (default 200) |
| `transparent` | `true` removes a green-screen backdrop, so the avatar stands on your page |
| `keyColor`, `keySimilarity`, `keySmoothness`, `keySpill`, `keyErode` | fine-tune `transparent`: the key color, such as `00ff00` (default: sampled from the video), and the edge settings |
| `buttonStyle` | `pill` (default; image and text), `circle`, `square` |
| `buttonText` | the button label, for `pill` (default "Chat") |
| `imageUrl` | the button's image (default: the bitHuman logo) |
| `frameStyle` | `rounded` (default), `circular`, `portrait` (9:16) |
| `draggable`, `resizable` | `true` (default) or `false` |
| `minSize`, `maxSize` | size limits in pixels (defaults 50 and 400) |
| `margin` | distance from the screen edge in pixels (default 60) |
| `autoLoad` | `true` opens the avatar when the page loads (default `false`) |
| `greetingLanguage` | `auto` (default; from the page's `<html lang>`) or a code such as `es` |
| `greetingMessage` | the first thing the avatar says |

**Chat widget** (`BitHumanChat.init`):

| Option | Values |
|---|---|
| `agentUrl` | `https://bithuman.ai/<agent code>` |
| `theme` | `light` (default) or `dark` |
| `themeColor` | `blue` (default), `purple`, `green`, `red`, `orange`, `teal`, `pink`, `indigo` |
| `position` | `bottom-right` (default) or `bottom-left` |
| `fabStyle` | `preview` (default; a card with the avatar), `bar`, `circle` |
| `fabText`, `fabSubtext` | the button's label and the line under it |
| `fabSize` | the circle's diameter in pixels (default 60) |
| `imageUrl` | the image on the button (default: the bitHuman logo) |
| `attentionPulse` | `true` (default) pulses rings around the avatar |
| `topBanner`, `topBannerText`, `topBannerQuestions` | a banner across the top of the page, its headline and its question chips |
| `defaultChatMode` | `text` (default), `voice`, `video` |
| `allowModeSwitch` | `true` (default) lets visitors switch modes |
| `autoLoad` | `true` opens the panel when the page loads (default `false`) |
| `headerTitle` | the panel title (default: the agent's name) |
| `welcomeMessage` | the first message in the panel |
| `suggestedQuestions` | starter questions in the panel |
| `teaserEnabled`, `teaserMessage`, `teaserDelay`, `teaserAutoHide` | a bubble shown after a delay and hidden again, in milliseconds (default on, 2200, 12000) |
| `expandedWidth` | the panel's width on a desktop, in pixels (default 420) |
| `margin`, `zIndex` | distance from the edge in pixels (default 20), and stacking order (default 99999) |
| `greetingLanguage`, `greetingMessage` | as for the floating widget |

For a private agent, or your own layout, use the web embed in an `<iframe>` with an [embed token](/api/embedding) instead ([Web](/platforms/web)).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Nothing appears, and the browser console says `agentUrl is required` | Pass `agentUrl` to `init`. |
| The microphone never activates | Serve the page over HTTPS, or `http://localhost` while you build. |
| The frame shows `Embedding is disabled for this agent` | Turn Anonymous Share back on in the agent's sharing settings. |
| The frame shows `Agent not found` | The agent code is wrong: copy it from the agent's Deploy & Share dialog. |
| The frame shows a browser error page | Remove the `Cross-Origin-Embedder-Policy` header from your page. |
| The console says the widget is already initialized | Call `init` once per page. |
