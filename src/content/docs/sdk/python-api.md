---
title: "Python API reference"
description: "Every public name in the installed bithuman package — signatures, docstrings and the exception hierarchy — read back out of the wheel PyPI serves, not out of a source tree."
section: sdk
group: "Reference"
order: 75
label: "Python API"
---

The [Python library](/sdk/python) has a small, fixed surface: open an avatar,
render audio through it. This page is the full list — every name the installed
package exports, the signature each one actually has, and what it raises.

**Nobody types this page.** A script installs the newest published wheel into an
empty virtualenv, with nothing else in it, and reads the surface back out of the
installed bytes: the type stub the package ships, each module's `__all__`,
`inspect.signature`, the docstrings, and the exception classes. It never reads
our source tree.

**Why that distinction is the whole point.** A name that exists in source but is
not exported by the installed package is not something you can call, so it is
not documented here. Where the source and the shipped package disagree — a
method on the runtime object that no type stub declares, a type the stub
declares that will not import — this page says so rather than quietly picking
one: [Present in the wheel, not callable from it](#present-in-the-wheel-not-callable-from-it).

**It is re-checked against the registry, not against itself.** A scheduled job
re-runs the extraction against whatever PyPI serves that morning and fails if
what is on this page no longer matches the shipped surface. The thing that
changes is the registry, not the page.

<!-- PYAPI:BEGIN -->
## The wheel this page describes

| Field | Value |
| --- | --- |
| Registry | pypi |
| Coordinate | bithuman |
| Version | 2.11.5 |
| Wheel | `bithuman-2.11.5-cp314-cp314-manylinux_2_28_x86_64.whl` |
| Digest | `sha256:39cbef68f7cc8900badfc6b4215e35fe1cb9211653d8cc75d83786b7e6e229bc` |
| Resolved on | 2026-09-20 |

Every name below was read back out of those bytes, in a virtualenv that had nothing else installed in it. Nothing here was read from a source tree.

| What the distribution declares | Value |
| --- | --- |
| Python versions | `<3.15,>=3.10` |
| Extras | `bithuman[expression-2]`, `bithuman[offline]`, `bithuman[tessera]`, `bithuman[test]` |
| Commands added to `PATH` | none |
| Ships type information | yes — a `py.typed` marker and a type stub |
| `python -m bithuman` | yes |

## bithuman

38 names, declared by the type stub the package ships.

### open

```python
open(source: Any) -> Avatar
```

Open an avatar and return it.

`source` is the avatar file on this machine.  This package runs the
avatar **here**, in your process; nothing is sent anywhere to make a
frame.

Raises `InvalidAvatar` if it cannot be found or is not usable,
`NotSupported` if it cannot run on this machine,
`NotAuthorised` if the key is missing, invalid or out of credit,
and `Failed` if something else went wrong.

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

### AvatarError

Base class for every refusal this package raises.

### InvalidAvatar

We cannot find it, or it is not a usable avatar.

Fix the path or the code, or fetch the avatar again.

### NotSupported

This avatar cannot run here.

Render it in the cloud with the Video API (POST /v1/video/generate),
or open it on Apple Silicon macOS or Linux.

### NotAuthorised

The key is missing, invalid, or out of credit.

Fix the credential.

### Failed

We could not do it — transient, or our fault.

Retry, then report it.

### Bithuman

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### AsyncBithuman

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### AsyncAvatar

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### ComposedFrame

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### EP

Execution provider hint. CPU is the canonical baseline; the others
are mapped opportunistically by the C ABI when available on the host.

### AudioChunk

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### VideoControl

One unit of input to the avatar runtime.

The runtime consumes a stream of these. Each control is either
"speaking" (has an `AudioChunk`), an action / target-video cue,
an emotion override, or "idle" (everything None) — in which case
the runtime emits idle-loop frames.

### VideoFrame

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### Emotion

Emotion label, matches legacy `bithuman.api.Emotion`.

These are the seven canonical labels the agent worker prompts the
LLM with. They flow through JSON as their string values.

### EmotionPrediction

Emotion classifier output for one audio segment.

Legacy uses pydantic BaseModel with fields `emotion` + `score`;
we use `dataclass` to avoid pulling in pydantic for the core
wrapper, while keeping the field names and serialization shape.

### BithumanError

Base class for all bitHuman errors.

Carries a stable string `code` (e.g. "model_not_found") + a
`docs_url` pointing at the canonical docs page for that error.
Catch on this base for any bitHuman error, or on a specific
subclass for targeted handling.

### TokenError

Base exception for token-related errors.

### TokenExpiredError

Raised when the JWT token has expired.

### TokenValidationError

Raised when token validation fails (invalid signature, claims, etc.).

### TokenRequestError

Raised when a token request to the auth server fails.

### AccountStatusError

Raised when the account has a billing/access issue (402, 403).

Legacy `bithuman` makes this a subclass of TokenError (it surfaces
out of the token-refresh path). We keep that inheritance for parity.

### ModelError

Base exception for model-related errors.

### ModelNotFoundError

Raised when the model file cannot be found.

### ModelLoadError

Raised when model loading fails.

### ModelSecurityError

Raised when a security restriction blocks model operations.

### RuntimeNotReadyError

Raised when an operation is attempted before the runtime is ready.

### Fixture

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### Runtime

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

### EP_CPU

### EP_AUTO

### EP_COREML

### EP_NNAPI

### EP_QNN

### __version__

### __core_version__

### __abi_version__

## bithuman.offline

10 names, declared by the module's own `__all__`.

5 of them are module constants naming an internal mechanism and are not listed here; they are not part of the two calls this package exists for.

### OfflineRenderer

```python
OfflineRenderer(imx_path: str, *, api_secret: Optional[str] = None, api_url: Optional[str] = None, threads: Optional[int] = None, model_key: Optional[str] = None, tags: str = 'offline-render')
```

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

Usable as a context manager: `with` closes it for you.

**`close()`**

**`render(audio, max_frames: Optional[int] = None, on_frame: "Optional[Callable[['object', int], None]]" = None) -> dict`**

Render `audio` (a path, or float32 16 kHz mono PCM) to full
RGB frames. `on_frame(frame_hw3_u8, frame_idx)` receives every
frame; returns the honest stats dict (CPU-class fps).

### OfflineRenderError

Unspecified run-time error.

### MeteringNotArmedError

The v2 metering gate refused frame production (no authenticated
heartbeat / grace elapsed / 402-403). Fail-closed by design.

### render_offline

```python
render_offline(imx_path: str, audio, out_mp4: Optional[str] = None, **kw) -> dict
```

One-call offline render. When `out_mp4` is given the frames are
encoded (h264 + the source audio muxed when `audio` is a path).

### unfold_imx

```python
unfold_imx(imx_path: str, dst_dir: str) -> str
```

_The docstring shipped with this symbol describes the container format, which is proprietary and not documented publicly. See [Avatars and the `.imx` format](/concepts/avatars-imx)._

## bithuman.tessera_offline

10 names, declared by the module's own `__all__`.

5 of them are module constants naming an internal mechanism and are not listed here; they are not part of the two calls this package exists for.

| Name | Kind | Same object as |
| --- | --- | --- |
| `OfflineTesseraRenderer` | class | `bithuman.offline.OfflineRenderer` |
| `render_offline` | function | `bithuman.offline.render_offline` |
| `unfold_imx` | function | `bithuman.offline.unfold_imx` |
| `TesseraOfflineError` | exception | `bithuman.offline.OfflineRenderError` |
| `MeteringNotArmedError` | exception | `bithuman.offline.MeteringNotArmedError` |

## The exception hierarchy

| Exception | Raised from | Inherits |
| --- | --- | --- |
| `AvatarError` | `bithuman` | `Exception` |
| `InvalidAvatar` | `bithuman` | `AvatarError` |
| `NotSupported` | `bithuman` | `AvatarError` |
| `NotAuthorised` | `bithuman` | `AvatarError` |
| `Failed` | `bithuman` | `AvatarError` |
| `BithumanError` | `bithuman` | `Exception` |
| `TokenError` | `bithuman` | `BithumanError` |
| `TokenExpiredError` | `bithuman` | `TokenError` |
| `TokenValidationError` | `bithuman` | `TokenError` |
| `TokenRequestError` | `bithuman` | `TokenError` |
| `AccountStatusError` | `bithuman` | `TokenError` |
| `ModelError` | `bithuman` | `BithumanError` |
| `ModelNotFoundError` | `bithuman` | `ModelError` |
| `ModelLoadError` | `bithuman` | `ModelError` |
| `ModelSecurityError` | `bithuman` | `ModelError` |
| `RuntimeNotReadyError` | `bithuman` | `BithumanError` |
| `OfflineRenderError` | `bithuman.offline` | `RuntimeError` |
| `MeteringNotArmedError` | `bithuman.offline` | `OfflineRenderError` |
| `TesseraOfflineError` | `bithuman.tessera_offline` | `RuntimeError` |

## Present in the wheel, not callable from it

A reference generated from a source tree would have listed each of these. They are in the installed package and a developer cannot use them, which is the opposite of being public.

| Name | Why it is not the surface | What it is |
| --- | --- | --- |
| `bithuman.Avatar.__init__` | on the runtime object, in no type stub | takes 3 arguments, none of them documented |
| `bithuman.Bithuman.__enter__` | on the runtime object, in no type stub | `(self) -> 'Avatar'` |
| `bithuman.Bithuman.__exit__` | on the runtime object, in no type stub | `(self, exc_type, exc_val, exc_tb) -> None` |
| `bithuman.Bithuman.__init__` | on the runtime object, in no type stub | `(self, fixture: _core.Fixture)` |
| `bithuman.Bithuman.close` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.Bithuman.compose` | on the runtime object, in no type stub | `(self, audio: AudioInput, preallocated_out: Optional[np.ndarray] = None, output_size: Optional[tuple] = (1280, 720)) -> Iterator[ComposedFrame]` |
| `bithuman.AsyncBithuman.__init__` | on the runtime object, in no type stub | `(self, *, input_buffer_size: int = 0, output_buffer_size: int = 6, output_size: Optional[Tuple[int, int]] = (1280, 720), tags: Optional[str] = 'bithuman', billing_type: str = 'self-hosted-essence-model', api_secret: Optional[str] = None, api_url: str = 'https://api.bithuman.ai/v1/runtime-tokens/request', agent_code: Optional[str] = None, num_threads: int = 0) -> None` |
| `bithuman.AsyncBithuman.cleanup` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncBithuman.flush` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncBithuman.get_first_frame` | on the runtime object, in no type stub | `(self) -> Optional[np.ndarray]` |
| `bithuman.AsyncBithuman.interrupt` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncBithuman.is_token_refresh_running` | on the runtime object, in no type stub | `(self) -> bool` |
| `bithuman.AsyncBithuman.push` | on the runtime object, in no type stub | `(self, control: VideoControl) -> None` |
| `bithuman.AsyncBithuman.push_audio` | on the runtime object, in no type stub | `(self, data: bytes, sample_rate: int, last_chunk: bool = True) -> None` |
| `bithuman.AsyncBithuman.run` | on the runtime object, in no type stub | `(self) -> AsyncIterator[VideoFrame]` |
| `bithuman.AsyncBithuman.set_agent_code` | on the runtime object, in no type stub | `(self, agent_code: str) -> None` |
| `bithuman.AsyncBithuman.set_billing_type` | on the runtime object, in no type stub | `(self, billing_type: str) -> None` |
| `bithuman.AsyncBithuman.set_identity` | on the runtime object, in no type stub | `(self, identity: str) -> None` |
| `bithuman.AsyncBithuman.set_model` | on the runtime object, in no type stub | `(self, model_path: str) -> None` |
| `bithuman.AsyncBithuman.shutdown` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncBithuman.start` | on the runtime object, in no type stub | `(self, **kwargs) -> None` |
| `bithuman.AsyncBithuman.start_token_refresh` | on the runtime object, in no type stub | `(self, **kwargs) -> bool` |
| `bithuman.AsyncBithuman.stop` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncBithuman.stop_token_refresh` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncAvatar.__init__` | on the runtime object, in no type stub | `(self, *, input_buffer_size: int = 0, output_buffer_size: int = 6, output_size: Optional[Tuple[int, int]] = (1280, 720), tags: Optional[str] = 'bithuman', billing_type: str = 'self-hosted-essence-model', api_secret: Optional[str] = None, api_url: str = 'https://api.bithuman.ai/v1/runtime-tokens/request', agent_code: Optional[str] = None, num_threads: int = 0) -> None` |
| `bithuman.AsyncAvatar.cleanup` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncAvatar.flush` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncAvatar.get_first_frame` | on the runtime object, in no type stub | `(self) -> Optional[np.ndarray]` |
| `bithuman.AsyncAvatar.interrupt` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncAvatar.is_token_refresh_running` | on the runtime object, in no type stub | `(self) -> bool` |
| `bithuman.AsyncAvatar.push` | on the runtime object, in no type stub | `(self, control: VideoControl) -> None` |
| `bithuman.AsyncAvatar.push_audio` | on the runtime object, in no type stub | `(self, data: bytes, sample_rate: int, last_chunk: bool = True) -> None` |
| `bithuman.AsyncAvatar.run` | on the runtime object, in no type stub | `(self) -> AsyncIterator[VideoFrame]` |
| `bithuman.AsyncAvatar.set_agent_code` | on the runtime object, in no type stub | `(self, agent_code: str) -> None` |
| `bithuman.AsyncAvatar.set_billing_type` | on the runtime object, in no type stub | `(self, billing_type: str) -> None` |
| `bithuman.AsyncAvatar.set_identity` | on the runtime object, in no type stub | `(self, identity: str) -> None` |
| `bithuman.AsyncAvatar.set_model` | on the runtime object, in no type stub | `(self, model_path: str) -> None` |
| `bithuman.AsyncAvatar.shutdown` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncAvatar.start` | on the runtime object, in no type stub | `(self, **kwargs) -> None` |
| `bithuman.AsyncAvatar.start_token_refresh` | on the runtime object, in no type stub | `(self, **kwargs) -> bool` |
| `bithuman.AsyncAvatar.stop` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.AsyncAvatar.stop_token_refresh` | on the runtime object, in no type stub | `(self) -> None` |
| `bithuman.ComposedFrame.__init__` | on the runtime object, in no type stub | `(self, bgr: np.ndarray, cluster_idx: int, frame_idx: int) -> None` |
| `bithuman.AudioChunk.__init__` | on the runtime object, in no type stub | `(self, data: np.ndarray, sample_rate: int, last_chunk: bool = True) -> None` |
| `bithuman.VideoControl.__init__` | on the runtime object, in no type stub | `(self, audio: Optional[AudioChunk] = None, text: Optional[str] = None, target_video: Optional[str] = None, action: Optional[Union[str, List[str]]] = None, emotion_preds: Optional[List[EmotionPrediction]] = None, message_id: str = <factory>, end_of_speech: bool = False, force_action: bool = False, stop_on_user_speech: Optional[bool] = None, stop_on_agent_speech: Optional[bool] = None) -> None` |
| `bithuman.VideoFrame.__init__` | on the runtime object, in no type stub | `(self, bgr_image: Optional[np.ndarray] = None, audio_chunk: Optional[AudioChunk] = None, frame_index: Optional[int] = None, source_message_id: Optional[Hashable] = None, end_of_speech: bool = False) -> None` |
| `bithuman.EmotionPrediction.__init__` | on the runtime object, in no type stub | `(self, emotion: Emotion, score: float) -> None` |
| `bithuman.EmotionPrediction.to_dict` | on the runtime object, in no type stub | `(self) -> dict` |
| `bithuman.BithumanError.__init__` | on the runtime object, in no type stub | `(self, message: str = '', *, code: str | None = None)` |
| `bithuman.Fixture.__init__` | on the runtime object, in no type stub | `` |
| `bithuman.Runtime.__init__` | on the runtime object, in no type stub | `` |
| `bithuman.Audio` | declared by the type stub, absent at runtime — importing it raises `ImportError` | the type an `audio` argument accepts: `Union[bytes, bytearray, memoryview, str, 'np.ndarray', Iterable[Any]]` |
| 3 files under `bithuman/lib/` | listed as modules by their suffix, none of them imports | native libraries the engine opens by path |
| 0 names from the 2.x releases | intercepted with a refusal that says what to write instead | raises `NotSupported` and `ImportError` |

## Other modules the package exposes

Public by spelling, and not an API this page documents. They are listed so that finding one by grep is not mistaken for finding something to call.

| Module | What it declares |
| --- | --- |
| `bithuman.bindings` | an `__all__` of 1 name; no part of opening an avatar goes through it |
| `bithuman.bindings.libengine` | no `__all__` — it declares nothing public |
| `bithuman.lib` | no `__all__` — it declares nothing public |
| `bithuman.unified_header` | an `__all__` of 14 names; no part of opening an avatar goes through it |
<!-- PYAPI:END -->

## See also

- [Python](/sdk/python) — install it, get a model, render your first frame
- [LiveKit](/sdk/livekit) — this library inside an agent worker
- [Pricing](/guides/pricing) — what a render costs, and what refuses without a key
- [Performance](/sdk/performance) — measured frame rates for every platform
