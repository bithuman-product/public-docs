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
| Version | 3.1.10 |
| Wheel | `bithuman-3.1.10-cp314-cp314-manylinux_2_28_x86_64.whl` |
| Digest | `sha256:db802ed7f62b02c191eb8a9aca96182248c237e083057ade24b7a513ac0944cf` |
| Resolved on | 2026-09-15 |

Every name below was read back out of those bytes, in a virtualenv that had nothing else installed in it. Nothing here was read from a source tree.

| What the distribution declares | Value |
| --- | --- |
| Python versions | `<3.15,>=3.10` |
| Extras | `bithuman[expression-2]`, `bithuman[offline]`, `bithuman[tessera]`, `bithuman[test]` |
| Commands added to `PATH` | none |
| Ships type information | yes — a `py.typed` marker and a type stub |
| `python -m bithuman` | yes |

## bithuman

7 names, declared by the type stub the package ships.

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

Use the cloud package, or another device.

### NotAuthorised

The key is missing, invalid, or out of credit.

Fix the credential.

### Failed

We could not do it — transient, or our fault.

Retry, then report it.

## bithuman.offline

10 names, declared by the module's own `__all__`.

5 of them are module constants naming an internal mechanism and are not listed here; they are not part of the two calls this package exists for.

### OfflineRenderer

```python
OfflineRenderer(imx_path: str, *, api_secret: Optional[str] = None, api_url: Optional[str] = None, threads: int = 4, model_key: Optional[str] = None, tags: str = 'offline-render')
```

_The docstring shipped with this symbol describes internal machinery and is not reproduced here._

Usable as a context manager: `with` closes it for you.

**`close()`**

**`render(audio, max_frames: Optional[int] = None, on_frame: Optional[Callable[[np.ndarray, int], None]] = None) -> dict`**

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

Extract every member of a packed `IMX\0` v2 container into
`dst_dir` (flat, member names may carry subdirs). Returns dst_dir.
A directory input is returned as-is (already unfolded).

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
| `OfflineRenderError` | `bithuman.offline` | `RuntimeError` |
| `MeteringNotArmedError` | `bithuman.offline` | `OfflineRenderError` |
| `TesseraOfflineError` | `bithuman.tessera_offline` | `RuntimeError` |

## Present in the wheel, not callable from it

A reference generated from a source tree would have listed each of these. They are in the installed package and a developer cannot use them, which is the opposite of being public.

| Name | Why it is not the surface | What it is |
| --- | --- | --- |
| `bithuman.Avatar.__init__` | on the runtime object, in no type stub | takes 3 arguments, none of them documented |
| `bithuman.Audio` | declared by the type stub, absent at runtime — importing it raises `ImportError` | the type an `audio` argument accepts: `Union[bytes, bytearray, memoryview, str, 'np.ndarray', Iterable[Any]]` |
| 3 files under `bithuman/lib/` | listed as modules by their suffix, none of them imports | native libraries the engine opens by path |
| 28 names from the 2.x releases | intercepted with a refusal that says what to write instead | raises `NotSupported` and `ImportError` |
| `bithuman.__version__` | removed on purpose — `hasattr` answers False | read the version from `importlib.metadata` |

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
