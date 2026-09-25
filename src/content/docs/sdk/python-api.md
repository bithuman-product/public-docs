---
title: "Python API reference"
description: "Every public class and function in the bithuman package: signatures, what each does, and the errors it raises."
section: sdk
group: "Reference"
order: 81
type: reference
label: "Python API"
---

How to use these in an app is on [Python](/sdk/python).

<!-- PYAPI:BEGIN -->
Generated from `bithuman` 2.11.11 as published on PyPI (Python `<3.15,>=3.10`; extras: `bithuman[expression-2]`). Names the package exports that are not listed here are internal and can change.

## bithuman

### open

```python
open(source: Any) -> Avatar
```

Open an avatar file and return an `Avatar`. The avatar renders in your process; usage is reported to your account. Raises `InvalidAvatar` if the file cannot be found or used, `NotSupported` if it cannot run on this machine, `NotAuthorised` if the API secret is missing, rejected or out of credit, and `Failed` for anything else.

### Avatar

An open avatar.  Get one from `bithuman.open`.

Usable as a context manager: `with` closes it for you.

**`render(audio: Audio) -> Iterator[np.ndarray]`**

Yield the frames for `audio`.

`audio` is 16 kHz mono — a buffer (bytes, or an int16/float array),
the path of an audio file, or an **iterable of those** for a live
stream.  Passing a stream instead of a whole clip is the same call.

Each frame is a `(height, width, 3)` uint8 array in RGB order.
Frames arrive in order, at the avatar's own frame rate — which is a
property of the avatar, not something to choose.

To stop early — a person interrupting the avatar — stop consuming and
close the iterator; the avatar is ready for the next `render`.

### AsyncBithuman

The streaming runtime: push audio as it arrives, read video frames with their audio, interrupt. Create it with `await AsyncBithuman.create(model_path="avatar.imx", api_secret=None)`; the secret defaults to `BITHUMAN_API_SECRET`. See [Integrate into your app](/sdk/python#integrate-into-your-app).

**`push_audio(data: bytes, sample_rate: int, last_chunk: bool = True) -> None`**

**`flush() -> None`**

**`interrupt() -> None`**

**`run() -> AsyncIterator[VideoFrame]`**

**`stop() -> None`**

**`shutdown() -> None`**

**`get_first_frame() -> Optional[np.ndarray]`**

### VideoFrame

One item from `AsyncBithuman.run()`: `has_image`, `bgr_image` (a BGR `numpy` array), `audio_chunk` and `frame_index`.

### AudioChunk

Audio that plays with a frame: `array` (16-bit samples) and `sample_rate`.

### VideoControl

One unit of input to the avatar runtime.

The runtime consumes a stream of these. Each control is either
"speaking" (has an `AudioChunk`), an action / target-video cue,
an emotion override, or "idle" (everything None) — in which case
the runtime emits idle-loop frames.

### Emotion

Emotion labels you can attach to a `VideoControl`.

### EP

Execution-provider hint: CPU by default, or a hardware accelerator when the machine has one.

## bithuman.offline

### render_offline

```python
render_offline(imx_path: str, audio, out_mp4: Optional[str] = None, **kw) -> dict
```

One-call offline render. When `out_mp4` is given the frames are
encoded (h264 + the source audio muxed when `audio` is a path).

### OfflineRenderer

```python
OfflineRenderer(imx_path: str, *, api_secret: Optional[str] = None, api_url: Optional[str] = None, threads: Optional[int] = None, model_key: Optional[str] = None, tags: str = 'offline-render')
```

Renders an Essence 2 avatar file to frames or an MP4 in one pass; `render_offline` is the one-call form. `render(audio)` takes a path or 16 kHz mono float32 samples and returns a stats dict.

Usable as a context manager: `with` closes it for you.

**`close()`**

**`render(audio, max_frames: Optional[int] = None, on_frame: "Optional[Callable[['object', int], None]]" = None) -> dict`**

## Errors

| Exception | Inherits | Meaning |
| --- | --- | --- |
| `bithuman.AvatarError` | `Exception` | Base class for every refusal this package raises. |
| `bithuman.InvalidAvatar` | `AvatarError` | We cannot find it, or it is not a usable avatar. |
| `bithuman.NotSupported` | `AvatarError` | This avatar cannot run here. |
| `bithuman.NotAuthorised` | `AvatarError` | The key is missing, invalid, or out of credit. |
| `bithuman.Failed` | `AvatarError` | We could not do it — transient, or our fault. |
| `bithuman.BithumanError` | `Exception` | Base class of the errors `AsyncBithuman` raises. |
| `bithuman.TokenError` | `BithumanError` | Base exception for token-related errors. |
| `bithuman.TokenExpiredError` | `TokenError` | Raised when the JWT token has expired. |
| `bithuman.TokenValidationError` | `TokenError` | Raised when token validation fails (invalid signature, claims, etc.). |
| `bithuman.TokenRequestError` | `TokenError` | Raised when a token request to the auth server fails. |
| `bithuman.AccountStatusError` | `TokenError` | Raised when the account has a billing/access issue (402, 403). |
| `bithuman.ModelError` | `BithumanError` | Base exception for model-related errors. |
| `bithuman.ModelNotFoundError` | `ModelError` | Raised when the model file cannot be found. |
| `bithuman.ModelLoadError` | `ModelError` | Raised when model loading fails. |
| `bithuman.ModelSecurityError` | `ModelError` | Raised when a security restriction blocks model operations. |
| `bithuman.RuntimeNotReadyError` | `BithumanError` | Raised when an operation is attempted before the runtime is ready. |
| `bithuman.offline.OfflineRenderError` | `RuntimeError` | Raised when an offline render fails. |
| `bithuman.offline.MeteringNotArmedError` | `OfflineRenderError` | Raised when no API secret is set, or the service refused the session. |
<!-- PYAPI:END -->

## Ending a streaming session

| Call | Frees the model | Releases the credential | Stops producing frames |
|---|---|---|---|
| `await avatar.shutdown()` | yes | yes | yes |
| `await avatar.stop()` | no | no | yes; the runtime can be driven again |
| `avatar.cleanup()` (synchronous) | yes | yes | no |

Put `shutdown()` in a `finally`. `AsyncBithuman` is not an async context manager; the object `bithuman.open()` returns is a context manager.

## Older names

`bithuman.tessera_offline` still imports as an alias of `bithuman.offline`.
Its classes `OfflineTesseraRenderer` and `TesseraOfflineError` are `OfflineRenderer` and `OfflineRenderError` under older names.
Use the new names; the full list is on [Naming & migration](/concepts/models#naming--migration).
