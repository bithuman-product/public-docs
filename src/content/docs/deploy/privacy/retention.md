---
title: "Security and retention"
description: "See how data is protected, how long it is kept, and how it is deleted."
section: deploy
group: "Privacy & compliance"
order: 11
type: concept
llms: deploy
parent: /deploy/privacy
next: ["/deploy/privacy", "/api/organizations", "/legal/eu-ai-act"]
---

What bitHuman does with data that reaches it; what reaches it in each mode is on [Data flows & privacy](/deploy/privacy).

## Security and access

- **In transit:** encrypted with HTTPS/TLS; WebRTC media uses DTLS-SRTP. Provider keys you connect are encrypted at rest.
- **Access:** organization roles (owner, admin, member), an audit-log API, API-secret rotation with immediate revocation, and scoped runtime and embed tokens so browsers never hold your secret ([Organizations](/api/organizations), [API secrets](/api/api-keys)).
- **Region:** avatars in the bitHuman cloud render in the US.

The overview to share with your team is on bithuman.ai: [security and privacy](https://www.bithuman.ai/security).

## Retention and deletion

Deleting an agent deletes its records, including transcripts, and its model files ([Agents](/api/agents)).

## Your content

bitHuman's [privacy policy](https://www.bithuman.ai/legal/privacy) says: "We do not use your content to train our AI models unless you explicitly opt in." and "We do not sell your personal information." For the EU AI Act, see [our reading of Article 50](/legal/eu-ai-act).
