---
title: "bitHuman on Discord"
description: "What the bitHuman Discord app does, what it stores, and for how long."
section: overview
group: "Help"
order: 50
type: legal
llms: none
next: ["/support", "/legal/eu-ai-act"]
---

The bitHuman app for Discord lets you ask one of bitHuman's AI characters a
question. The character answers in a short video clip, posted in the channel or
only to you. This page says what the app does with your data. The
[bitHuman Privacy Policy](https://www.bithuman.ai/legal/privacy) and
[Terms of Service](https://www.bithuman.ai/legal/terms) also apply.

Last updated: 3 October 2026.

## What the app does

| Command or button | What happens |
|---|---|
| `/ask` | You pick a character and type a question, or pick a suggested one. A suggested question replays a clip we made in advance. A new question gets a new answer, about 10 to 25 seconds later. |
| `/characters` | Shows the characters, only to you. |
| `/bithuman about` | Says what the app is, with links to this page and the terms. |
| `/bithuman forget-me` | Deletes what the app stored about you (see [Delete your data](#delete-your-data)). |
| **Ask again** | Opens a box to ask the same character another question. |
| **Talk live (2 min)** | Opens the character's page on bithuman.ai in your browser. That page is covered by the bitHuman Privacy Policy. |
| **Add bitHuman** | Opens Discord's page to add the app. |
| **Report** | Sends the clip to the bitHuman Team for review. |

The app has no permission to read messages, join voice channels or act in your
server. It sees only what Discord sends it when you use one of its commands or
buttons: your Discord user id, the server and channel ids, and what you typed.

## AI characters and AI voices

- The 18 characters are AI characters, none of them a person. Their answers are
  written by an AI model and spoken in an AI voice, then animated by bitHuman.
- Every clip carries the label "AI character · AI voice · bitHuman" on the video
  itself, and the line "AI character with an AI voice" under it.
- A character speaks only its own answer or a line we wrote and reviewed. You
  cannot make a character say words you choose.

## What is sent to OpenAI

A new question goes to OpenAI three times:

1. OpenAI's moderation model checks the question.
2. An OpenAI model writes the character's answer, which the moderation model
   checks again.
3. An OpenAI voice model speaks the answer.

OpenAI receives the question and the answer text. It does not receive your
Discord user id or your name. A suggested question, or a question someone
already asked the same character, sends nothing to OpenAI. A question the app
refuses goes to OpenAI only when it may be about self-harm: the moderation model
checks it, so the asker gets a help line instead of a clip.

## Where clips are made

bitHuman animates every clip on its own computers. The spoken audio is deleted
as soon as the clip is made.

## What we store, and for how long

| What | Why | How long |
|---|---|---|
| Your Discord user id, only as a keyed hash: never the id itself or your name | Daily limits and repeat-abuse rules | With the records below |
| For each clip you ask for: the hashed id, the server and channel ids, the character, the question, the answer and the moderation result | Moderation and daily counts | 30 days |
| Each new answer's clip and text, keyed by a hash of the question, linked to no user | Replaying the same answer when someone asks the same character the same question | 30 days |
| Refused questions: the hashed id and the reason | Pausing someone after repeated refusals | 30 days; a pause lasts 24 hours |
| Reports: the reporter's hashed id, the reported clip's question and answer, and where it was posted | Review by the bitHuman Team in a private staff channel | 30 days after the report reaches the team |
| Cost records, with no user data | Running costs | About 13 months |

Server logs carry request ids, a short part of the hashed id and server ids. They
never carry questions, answers or tokens. We do not sell this data.

## Delete your data

Run `/bithuman forget-me`. It deletes the questions, answers and ids the app
stored for you. Removing the app from your Discord account does the same.

- Today's counts (the hashed id and the kind of request, no content) stay until
  00:00 UTC, so daily limits still apply.
- A report you sent stays, without your id.
- A cached answer is linked to no user, so it stays until it expires after 30 days.
- A clip posted in a channel is a Discord message. A server's moderators can
  delete it, and **Report** sends it to the bitHuman Team.

## Age

The app follows Discord's age rules: it is not for anyone under 13, or under the
minimum age for Discord in your country. If you think a child under 13 used it,
email us with their Discord user id and we delete what the app stored.

## Contact

Email [hello@bithuman.ai](mailto:hello@bithuman.ai) with a question about this
page or a request about your data. For everything else, see
[Support & community](/support).
