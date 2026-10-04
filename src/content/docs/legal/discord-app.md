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
question, or type a line for a character to say. The character answers, or says
your line, in a short video clip, posted in the channel or only to you. This page says what the app does with your data. The
[bitHuman Privacy Policy](https://www.bithuman.ai/legal/privacy) and
[Terms of Service](https://www.bithuman.ai/legal/terms) also apply.

Last updated: 4 October 2026.

## What the app does

| Command or button | What happens |
|---|---|
| `/ask` | You pick a character and type a question, or pick a suggested one. A suggested question replays a clip we made in advance. A new question gets a new answer, about 10 to 25 seconds later. |
| `/speak` | You type a line (3 to 200 characters) and pick a character. The character says your line word for word, in a short clip labelled as words typed by a user. |
| `/characters` | Shows the characters, only to you. |
| `/bithuman about` | Says what the app is, with links to this page and the terms. |
| `/bithuman forget-me` | Deletes what the app stored about you (see [Delete your data](#delete-your-data)). |
| **Ask again** | Opens a box to ask the same character another question. |
| **Make (name) say…** | Opens a box to type a line for that character to say, as with `/speak`. |
| **Talk live (2 min)** | Opens the character's page on bithuman.ai in your browser. That page is covered by the bitHuman Privacy Policy. |
| **Add bitHuman** | Opens Discord's page to add the app. |
| **Report** | Sends the clip to the bitHuman Team for review. |

The app has no permission to read messages, join voice channels or act in your
server. It sees only what Discord sends it when you use one of its commands or
buttons: your Discord user id, the server and channel ids, and what you typed.

## AI characters and AI voices

- The 18 characters are AI characters, none of them a person. Their answers are
  written by an AI model and spoken in an AI voice, then animated by bitHuman.
- Every clip carries a label on the video itself: "AI character · AI voice ·
  bitHuman" on an answer, and "AI character · AI voice · words typed by a user"
  on a `/speak` clip. The line "AI character with an AI voice" is under every clip.
- With `/speak`, a character says the words someone typed, exactly as typed: no
  AI model writes or changes them. The caption says the line was typed by a user.
  The app does not add your name or id to the clip or its caption (Discord itself
  shows who used a command).
- Every other clip is the character's own answer or a line we wrote and reviewed.
- A `/speak` line is checked before it is said, and the app refuses the lines it
  finds with links, @mentions, real people's names, scams, sexual content, hate,
  threats, politics or claims about bitHuman.

## What is sent to OpenAI

A new question goes to OpenAI three times:

1. OpenAI's moderation model checks the question.
2. An OpenAI model writes the character's answer, which the moderation model
   checks again.
3. An OpenAI voice model speaks the answer.

A line typed with `/speak` also goes to OpenAI three times:

1. OpenAI's moderation model checks the line.
2. An OpenAI model checks the line against the app's rules. It only says whether
   the line may be said; it never writes or changes it.
3. An OpenAI voice model speaks the line, word for word.

OpenAI receives the question and the answer text, or the typed line. It does not
receive your Discord user id or your name. A suggested question, a question
someone already asked the same character, or a line someone already had the same
character say, sends nothing to OpenAI. A question or line the app refuses before
these steps goes to OpenAI only when it may be about self-harm: the moderation
model checks it, so the asker gets a help line instead of a clip.

## Where clips are made

bitHuman animates every clip on its own computers. The spoken audio is deleted
as soon as the clip is made.

## What we store, and for how long

| What | Why | How long |
|---|---|---|
| Your Discord user id, only as a keyed hash: never the id itself or your name | Daily limits and repeat-abuse rules | With the records below |
| For each clip you ask for: the hashed id, the server and channel ids, the character, the question or the typed line, the answer and the moderation result | Moderation and daily counts | 30 days |
| Each new answer's clip and text, keyed by a hash of the question, linked to no user | Replaying the same answer when someone asks the same character the same question | 30 days |
| Each new `/speak` clip and the typed line it says, keyed by a hash of the line, linked to no user | Replaying the same clip when someone has the same character say the same line | 30 days, or until you run `/bithuman forget-me` |
| A reported `/speak` line: a hash of the line only, no words | Keeping a reported line from being said again | Until the bitHuman Team lifts the block, past 30 days too |
| Refused questions and lines: the hashed id and the reason | Pausing someone after repeated refusals | 30 days; a pause lasts 24 hours |
| Reports: the reporter's hashed id, the reported clip's question and answer, and where it was posted | Review by the bitHuman Team in a private staff channel | 30 days after the report reaches the team |
| Cost records, with no user data | Running costs | About 13 months |

Server logs carry request ids, a short part of the hashed id and server ids. They
never carry questions, typed lines, answers or tokens. We do not sell this data.

## Delete your data

Run `/bithuman forget-me`. It deletes the questions, typed lines, answers and ids
the app stored for you, and the clips of the lines you typed with `/speak`.
Removing the app from your Discord account does the same.

- Today's counts (the hashed id and the kind of request, no content) stay until
  00:00 UTC, so daily limits still apply.
- A report you sent stays, without your id.
- A cached answer to a question is linked to no user, so it stays until it expires
  after 30 days.
- A `/speak` clip someone reported stays until the bitHuman Team has reviewed it.
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
