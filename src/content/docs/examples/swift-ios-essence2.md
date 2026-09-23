---
title: "iOS example: Essence 2"
description: "A complete SwiftUI app that renders a photoreal Essence 2 avatar at full resolution on an iPhone or iPad, on the device: four files, one setup script."
section: examples
group: "Examples"
order: 31
type: example
label: "iOS: Essence 2"
---

A SwiftUI app that opens an Essence 2 avatar, shows its idle motion, and speaks a line with the lips in sync, all rendered on the phone at the avatar's own resolution (up to 1920×1080) at 25 fps. **Speak** plays the line again.

`Essence2` is a C library: the 17 `be_essence2_*` functions in `be_essence2.h` are the whole API, and the `Renderer` actor in `App.swift` is the Swift wrapper you would otherwise write yourself.

## Requirements

| You need | Notes |
|---|---|
| A Mac with Xcode 26 or newer, and an Apple Developer team | a device build is a signed build |
| A physical iPhone or iPad with Apple silicon, on iOS 26 | the Simulator cannot run the engine; no Apple entitlement is needed |
| Swift package **2.14.2** or newer, `Essence2` product | attached by `project.yml` below |
| An [API secret](/start/api-secret) | the engine bills talking time; idle is free |
| About 430 MB free on the phone and 380 MB on the Mac | the avatar and the engine resources ride in the app bundle |
| [XcodeGen](https://github.com/yonaskolb/XcodeGen) (optional) | `brew install xcodegen`, to generate the project from `project.yml` |

## Get the code

This example has no repository folder yet: its four files are below. Make a folder and save each file into it with the name shown.

```bash
mkdir -p IOSEssence2/Sources && cd IOSEssence2
```

<details><summary><code>setup.sh</code>: downloads the avatar and the engine resources, makes a speech clip</summary>

```bash
#!/bin/bash
# setup.sh — fetch everything the app needs. No account, no key.
#   ./setup.sh              # warm-clear-professional-presenter
#   ./setup.sh A52DHS2219   # any code from the table on the doc page
set -euo pipefail
cd "$(dirname "$0")"
CODE="${1:-A21SKT4314}"
REL=https://github.com/bithuman-product/homebrew-bithuman/releases/download/essence2-v1.11.0
ASSET=libessence2-resources.zip   # the release asset's frozen legacy name
mkdir -p Sources/Model Sources/EngineResources

# 1 · the identity. One URL, no credential: the door answers 302 to a one-hour
#     signed URL and curl -L follows it.
echo "==> downloading $CODE.imx"
curl -fL --progress-bar \
  "https://api.bithuman.ai/v1/agent/$CODE/model/download?model=essence-2" \
  -o Sources/Model/agent.imx

# 2 · prove it is the container this engine opens BEFORE you open Xcode.
#     An error page and a truncated download both look like a file.
python3 - <<'PY'
import struct, sys
p = "Sources/Model/agent.imx"
b = open(p, "rb")
head = b.read(8)
if head[:4] != b"IMX\0":
    sys.exit(f"{p} does not start with IMX\\0 — got {head[:4]!r}. Re-run ./setup.sh")
ver, n = struct.unpack("<HH", head[4:8])
if ver != 2:
    sys.exit(f"{p} is an IMX v{ver} container; this engine opens v2.")
names, blob = [], b.read(1 << 16)
off = 0
for _ in range(n):
    (ln,) = struct.unpack_from("<H", blob, off); off += 2
    names.append(blob[off:off + ln].decode("utf-8", "replace")); off += ln + 16
if "manifest.json" not in names:
    sys.exit(f"{p} has no manifest.json member — this is not an essence-2 bundle.")
print(f"OK: IMX v2, {n} members, manifest.json present")
PY

# 3 · the shared engine resources, checksum-verified against the sidecar
#     published beside them.
echo "==> downloading the engine resources"
curl -fL --progress-bar -o "$ASSET"        "$REL/$ASSET"
curl -fL                -o "$ASSET.sha256" "$REL/$ASSET.sha256"
shasum -a 256 -c "$ASSET.sha256"
unzip -o -q "$ASSET" -d Sources/EngineResources

# 4 · something for it to say. `say` and `afconvert` ship with macOS.
echo "==> making speech16k.wav"
say -o /tmp/e2-speech.aiff \
  "Hello. Every frame you are watching was rendered on this phone."
afconvert -f WAVE -d LEI16@16000 -c 1 /tmp/e2-speech.aiff Sources/Model/speech16k.wav

echo "==> ready:"
du -sh Sources/Model Sources/EngineResources
```

</details>

<details><summary><code>project.yml</code>: the Xcode project, for XcodeGen</summary>

```yaml
# project.yml
name: IOSEssence2
options:
  bundleIdPrefix: com.example
  deploymentTarget:
    iOS: "26.0"
packages:
  bithuman:
    url: https://github.com/bithuman-product/homebrew-bithuman.git
    # 2.14.2 or newer: older tags pin engines that stay idle-only on some iPhones.
    from: 2.14.2
targets:
  IOSEssence2:
    type: application
    platform: iOS
    sources:
      - path: Sources
        excludes: ["Info.plist", "Model", "EngineResources"]
      # The identity rides as ONE folder reference the app opens by name.
      - path: Sources/Model
        type: folder
        buildPhase: resources
      # The engine resources ride as individual files, so they land at the
      # bundle ROOT — which is the only place the engine looks for them.
      - path: Sources/EngineResources
        type: group
        buildPhase: resources
    dependencies:
      - package: bithuman
        product: Essence2
    preBuildScripts:
      - name: "Sources/Model and Sources/EngineResources must hold real files"
        basedOnDependencyAnalysis: false
        script: |
          # A resource folder copies whatever is there, so without this the app
          # builds, installs, launches and fails on the phone instead of here.
          fail() { echo "error: $1"; exit 1; }
          M="$SRCROOT/Sources/Model"; R="$SRCROOT/Sources/EngineResources"
          [ -f "$M/agent.imx" ] || fail "Sources/Model/agent.imx is missing — run ./setup.sh"
          SZ=$(stat -f%z "$M/agent.imx")
          [ "$SZ" -gt 50000000 ] || fail "Sources/Model/agent.imx is only ${SZ} B — that is an error page or a truncated download. Re-run ./setup.sh"
          [ -f "$M/speech16k.wav" ] || fail "Sources/Model/speech16k.wav is missing — run ./setup.sh"
          [ -f "$R/w2v_ess_fp16_v1.onnx" ] || fail "the shared audio front end is missing — the .imx does not carry it. Re-run ./setup.sh"
          echo "payload OK: agent.imx ${SZ} B, front end present"
    info:
      path: Sources/Info.plist
      properties:
        CFBundleDisplayName: Essence2
        UILaunchScreen: {}
        UISupportedInterfaceOrientations: [UIInterfaceOrientationPortrait]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.example.ios-essence2
        DEVELOPMENT_TEAM: ""
        CODE_SIGN_STYLE: Automatic
        SWIFT_VERSION: "6.0"
        TARGETED_DEVICE_FAMILY: "1,2"
```

</details>

<details><summary><code>Sources/Info.plist</code></summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Without CFBundleIdentifier the app builds fine and then
         `devicectl device install app` refuses the bundle with
         "Failed to get the identifier for the app to be installed". -->
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundleDisplayName</key>
    <string>Essence2</string>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>

    <key>UILaunchScreen</key>
    <dict/>

    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
</dict>
</plist>
```

</details>

<details><summary><code>Sources/App.swift</code>: the whole app</summary>

```swift
// IOSEssence2 — an Essence 2 avatar on a real iPhone, rendered on the device.
//
// Engine:  essence-2, via the `Essence2` product of the SwiftPM package
//          https://github.com/bithuman-product/homebrew-bithuman.git
// Inputs:  Sources/Model/agent.imx      the identity, from the download door
//          Sources/Model/speech16k.wav  16 kHz mono 16-bit PCM speech
//          the engine resources, at the app bundle's resource root
// Output:  the identity's own canvas at 25 fps, drawn in SwiftUI, beside the audio.
//
// `import Essence2` gives you the engine's C interface and nothing else: there
// is no Swift engine type on this rail, so `Renderer` below IS the wrapper.
// Every call here is public API of the shipped binary.
// See https://docs.bithuman.ai/examples/swift-ios-essence2

import SwiftUI
import AVFoundation
import Accelerate
import Essence2

let FPS = 25.0
let TICK = 1.0 / FPS          // 0.04 s — Essence 2's own rate

func log(_ line: String) { NSLog("[ios-essence2] %@", line) }

// MARK: - 1. Where the two inputs live in the app bundle

enum Payload {
    static var root: URL? { Bundle.main.url(forResource: "Model", withExtension: nil) }
    static var imx: URL? { root?.appendingPathComponent("agent.imx") }
    static var speechWAV: URL? { root?.appendingPathComponent("speech16k.wav") }
}

// MARK: - 2. A 16-bit PCM WAV reader that walks the RIFF chunks
//
// Do NOT assume the samples start at byte 44. macOS `afconvert` writes an FLLR
// padding chunk between the header and the data, so the classic shortcut reads
// padding as audio and the avatar mouths noise.

struct WAVError: LocalizedError {
    let what: String
    var errorDescription: String? { what }
}

func readPCM16MonoWAV(_ url: URL) throws -> [Int16] {
    let d = try Data(contentsOf: url)
    guard d.count > 12, d[0..<4].elementsEqual("RIFF".utf8), d[8..<12].elementsEqual("WAVE".utf8)
    else { throw WAVError(what: "\(url.lastPathComponent) is not a RIFF/WAVE file") }

    func u16(_ i: Int) -> Int { Int(d[i]) | Int(d[i + 1]) << 8 }
    func u32(_ i: Int) -> Int { u16(i) | u16(i + 2) << 16 }

    var i = 12, channels = 0, rate = 0, bits = 0, off = -1, len = 0
    while i + 8 <= d.count {
        let id = String(bytes: d[i..<i + 4], encoding: .ascii) ?? ""
        var sz = u32(i + 4)
        if sz < 0 || i + 8 + sz > d.count { sz = d.count - (i + 8) }
        if id == "fmt " { channels = u16(i + 10); rate = u32(i + 12); bits = u16(i + 22) }
        if id == "data" { off = i + 8; len = sz }
        i += 8 + sz + (sz & 1)
    }
    guard off > 0, len > 1 else { throw WAVError(what: "\(url.lastPathComponent) has no data chunk") }
    guard channels == 1, rate == 16_000, bits == 16 else {
        throw WAVError(what: "need 16 kHz mono 16-bit PCM; \(url.lastPathComponent) is "
                             + "\(rate) Hz, \(channels) ch, \(bits)-bit")
    }
    var out = [Int16](repeating: 0, count: len / 2)
    out.withUnsafeMutableBytes { dst in d.copyBytes(to: dst, from: off..<(off + (len / 2) * 2)) }
    return out
}

// MARK: - 3. The engine lives inside an actor
//
// The handle is a raw pointer and is not Sendable. Keeping it inside an actor is
// what lets this compile under Swift 6 strict concurrency AND keeps the first
// load off the main thread.

enum EngineError: LocalizedError {
    case create(Int32), notReady, noGeometry, refused(String)
    var errorDescription: String? {
        switch self {
        case .create(let rc):
            // The three the header documents. -3 is the metering refusal:
            // no API secret, or one the service rejected (stderr says which).
            let why: String
            switch rc {
            case -1: why = " — bad argument"
            case -2: why = " — the bundle could not be opened"
            case -3: why = " — no API secret, or the service rejected it."
                         + " Set BITHUMAN_API_SECRET in the Run scheme, or pass a key"
                         + " to be_essence2_set_api_secret"
            default: why = ""
            }
            return "be_essence2_create returned \(rc)" + why
        case .notReady: return "the engine never became ready"
        case .noGeometry:
            // Without this the app hangs POLITELY: a zero-byte pull buffer makes
            // be_essence2_pull_frame return 0 ("out too small") for ever, which
            // the draw loop reads as "nothing this tick" and holds a frame that
            // never arrives. A named throw beats a frozen face.
            return "be_essence2_get_info reported a 0-pixel canvas"
        case .refused(let why): return why
        }
    }
}

actor Renderer {
    private var handle: be_essence2_handle?
    private(set) var width = 0
    private(set) var height = 0
    private var buf = [UInt8]()

    /// Open the identity and wait for the engine to warm up.
    ///
    /// `apiSecret` is handed to the meter BEFORE the session exists, because the
    /// secret this process's later sessions are billed to is process state, not
    /// a per-session argument.
    func load(imx: URL, apiSecret: String?) async throws -> String {
        if let s = apiSecret, !s.isEmpty { _ = be_essence2_set_api_secret(s) }

        var h: be_essence2_handle?
        // `motion_dir` NULL and `chunk` 0: the engine owns both. Passing the
        // .imx path straight out of the read-only app bundle is correct: the
        // engine sniffs the container and unpacks it itself, under
        // NSTemporaryDirectory()/essence2-unpacked. Nothing is written beside
        // the .imx, so the bundle being read-only is not a problem — but the
        // unpacked copy does cost about as much disk again. See the note below
        // the code.
        let rc = imx.path.withCString { be_essence2_create($0, nil, 0, &h) }
        guard rc == 0, let h else { throw EngineError.create(rc) }
        handle = h

        // create() returns as soon as the bundle is open; the model compile runs
        // on a background thread and audio pushed before it finishes is dropped.
        var waited = 0.0
        while be_essence2_is_ready(h) == 0 {
            if waited > 120 { throw EngineError.notReady }
            try await Task.sleep(nanoseconds: 100_000_000); waited += 0.1
        }

        var w: Int32 = 0, hgt: Int32 = 0
        be_essence2_get_info(h, &w, &hgt)
        width = Int(w); height = Int(hgt)
        // get_info reports the dims of the most recently produced frame, so it
        // is the one call here that can legitimately answer 0. Refuse loudly:
        // a 0-byte buffer turns every later pull into a silent "out too small".
        guard width > 0, height > 0 else { throw EngineError.noGeometry }
        buf = [UInt8](repeating: 0, count: width * height * 3)   // tightly packed RGB
        return String(format: "%dx%d, ready in %.1f s", width, height, waited)
    }

    /// Push 16 kHz mono int16 audio, retrying while the engine's ring is full.
    /// Returns false only if it stayed full for a second, which means the draw
    /// loop has stopped pulling.
    func push(_ samples: ArraySlice<Int16>) async -> Bool {
        guard let h = handle else { return false }
        let n = Int32(samples.count)
        for _ in 0..<100 {
            let rc = samples.withUnsafeBufferPointer { be_essence2_push_audio(h, $0.baseAddress, n) }
            if rc == 0 { return true }
            if rc != -2 { return false }          // -2 is "ring full, try again"
            try? await Task.sleep(nanoseconds: 10_000_000)
        }
        return false
    }

    /// The next frame, or nil when the engine has nothing this tick.
    ///
    /// Once it is ready this is a CONTINUOUS stream — generated frames at their
    /// scheduled slots, the identity's own motion in between — so a draw loop
    /// needs nothing else. A nil means hold the frame you already have.
    /// Throws once metering has refused the session, which is the `-3` the C
    /// header documents: no frame will follow it.
    func pull() throws -> [UInt8]? {
        guard let h = handle else { return nil }
        let n = buf.withUnsafeMutableBufferPointer {
            be_essence2_pull_frame(h, $0.baseAddress, Int32($0.count))
        }
        if n == -3 { throw EngineError.refused(renderReason(h)) }
        return n > 0 ? buf : nil
    }

    func framesReady() -> Int { handle.map { Int(be_essence2_frames_available($0)) } ?? 0 }

    /// Ask the engine whether its own runtime failed. A dead runtime otherwise
    /// reaches you as an absence: idle frames forever, and a face that will
    /// never speak.
    func renderStatus() -> String? {
        guard let h = handle else { return nil }
        var failures: Int64 = 0
        var reason = [CChar](repeating: 0, count: 512)
        let rc = be_essence2_render_status(h, &reason, Int32(reason.count), &failures)
        return rc == 0 ? nil : reason.withUnsafeBufferPointer { String(cString: $0.baseAddress!) }
    }

    private func renderReason(_ h: be_essence2_handle) -> String {
        var failures: Int64 = 0
        var reason = [CChar](repeating: 0, count: 512)
        _ = be_essence2_render_status(h, &reason, Int32(reason.count), &failures)
        let detail = reason.withUnsafeBufferPointer { String(cString: $0.baseAddress!) }
        return "the engine stopped: metering refused this session"
             + (detail.isEmpty ? "" : " — \(detail)")
    }

    func close() {
        if let h = handle { be_essence2_destroy(h) }
        handle = nil
    }
}

// MARK: - 4. RGB888 -> CGImage. Two vImage passes and no intermediate copy.

func makeCGImage(_ rgb: [UInt8], _ w: Int, _ h: Int) -> CGImage? {
    let n = w * h
    guard w > 0, h > 0, rgb.count >= n * 3, let out = malloc(n * 4) else { return nil }
    rgb.withUnsafeBufferPointer { sBuf in
        guard let s = sBuf.baseAddress else { return }
        var src = vImage_Buffer(data: UnsafeMutableRawPointer(mutating: s),
                                height: vImagePixelCount(h), width: vImagePixelCount(w),
                                rowBytes: w * 3)
        var dst = vImage_Buffer(data: out, height: vImagePixelCount(h),
                                width: vImagePixelCount(w), rowBytes: w * 4)
        // RGB888 -> (255,R,G,B), then permute to (R,G,B,255) for noneSkipLast.
        vImageConvert_RGB888toARGB8888(&src, nil, 255, &dst, false, vImage_Flags(kvImageNoFlags))
        var map: [UInt8] = [1, 2, 3, 0]
        vImagePermuteChannels_ARGB8888(&dst, &dst, &map, vImage_Flags(kvImageNoFlags))
    }
    guard let provider = CGDataProvider(dataInfo: out, data: out, size: n * 4,
                                        releaseData: { info, _, _ in free(info) })
    else { free(out); return nil }
    return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32,
                   bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(),
                   bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                   provider: provider, decode: nil, shouldInterpolate: false,
                   intent: .defaultIntent)
}

// MARK: - 4b. The view we draw into
//
// Do NOT push 25 fps through an `@Published` property. Every assignment
// re-evaluates the SwiftUI body around it. Hand the frame to a CALayer instead;
// SwiftUI never sees it change.

@MainActor
final class FrameSink {
    fileprivate weak var layer: CALayer?
    func show(_ cg: CGImage) { layer?.contents = cg }
}

struct FrameView: UIViewRepresentable {
    let sink: FrameSink
    func makeUIView(context: Context) -> UIView {
        let v = UIView()
        v.backgroundColor = UIColor(white: 0.12, alpha: 1)
        v.layer.contentsGravity = .resizeAspect
        v.layer.masksToBounds = true
        v.layer.cornerRadius = 16
        sink.layer = v.layer
        return v
    }
    func updateUIView(_ v: UIView, context: Context) { sink.layer = v.layer }
}

// MARK: - 5. The session: load, idle, speak

@MainActor
final class AvatarSession: ObservableObject {
    @Published var status = "opening the identity…"
    @Published var detail = ""
    @Published var ready = false
    @Published var busy = false
    @Published var hasFrame = false
    let sink = FrameSink()

    private let renderer = Renderer()
    private var player: AVAudioPlayer?
    private var w = 0, h = 0
    private var loop: Task<Void, Never>?

    func boot() async {
        guard let imx = Payload.imx,
              FileManager.default.fileExists(atPath: imx.path) else {
            status = "No identity in the bundle."
            detail = "Run ./setup.sh, then build again."
            return
        }
        // The key is read from the process environment. In Xcode:
        // Product -> Scheme -> Edit Scheme… -> Run -> Arguments ->
        // Environment Variables -> BITHUMAN_API_SECRET.
        let secret = ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"]
        if secret?.isEmpty ?? true {
            log("no BITHUMAN_API_SECRET in the environment — this session cannot be "
                + "attributed to an account. See docs.bithuman.ai/guides/pricing")
        }
        do {
            let t0 = Date()
            let line = try await renderer.load(imx: imx, apiSecret: secret)
            w = await renderer.width
            h = await renderer.height
            status = "Ready."
            detail = line + String(format: " · %.1f s to first ready", Date().timeIntervalSince(t0))
            log("engine ready: \(line)")
            ready = true
            startLoop()
            speak()                      // say the bundled line once on launch
        } catch {
            status = "The engine did not start."
            detail = "\(error.localizedDescription)"
            log("FAILED: \(error)")
        }
    }

    /// 5a. The draw loop. One frame per 40 ms tick, on an ABSOLUTE grid, for the
    /// life of the app: generated frames while there is speech, the identity's
    /// own motion between utterances, and the frame already on screen when the
    /// engine has nothing this tick.
    private func startLoop() {
        loop?.cancel()
        loop = Task { [weak self] in
            let start = Date()
            var n = 0
            while !Task.isCancelled {
                guard let self else { return }
                do {
                    // ONE call. Once the engine is ready it emits a continuous
                    // stream through pull(): generated frames while there is
                    // speech, the identity's own motion between utterances. A
                    // nil means HOLD THE FRAME ALREADY ON SCREEN — never
                    // substitute one, and do not reach for be_essence2_idle_frame
                    // here: that call advances the same shared offset and would
                    // step the motion twice.
                    if let f = try await self.renderer.pull(),
                       let cg = makeCGImage(f, self.w, self.h) {
                        self.sink.show(cg)
                        self.hasFrame = true
                    }
                } catch {
                    self.status = "Stopped."
                    self.detail = error.localizedDescription
                    log("STOPPED: \(error)")
                    return
                }
                n += 1
                let wait = start.addingTimeInterval(Double(n) * TICK).timeIntervalSinceNow
                if wait > 0 { try? await Task.sleep(nanoseconds: UInt64(wait * 1e9)) }
            }
        }
    }

    /// 5b. Speak the bundled line. Feed, pre-roll, then start the speaker.
    func speak() {
        guard ready, !busy, let wav = Payload.speechWAV else { return }
        busy = true
        status = "Speaking…"
        Task {
            defer { busy = false }
            let pcm: [Int16]
            do { pcm = try readPCM16MonoWAV(wav) } catch {
                status = "The WAV is not usable."; detail = error.localizedDescription; return
            }
            let seconds = Double(pcm.count) / 16_000.0
            log(String(format: "audio: %d samples, %.2f s", pcm.count, seconds))

            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try? AVAudioSession.sharedInstance().setActive(true)
            player = try? AVAudioPlayer(contentsOf: wav)

            // Feed in 100 ms chunks. push() retries on the engine's "ring full".
            //
            // PRE-ROLL. The engine schedules generated frames a little ahead
            // of the audio, so starting the speaker on the first chunk leaves
            // the mouth behind for the whole utterance. Feed 1.6 s first.
            let preroll = 16 * 1600                  // 1.6 s of 16 kHz mono
            var started = false
            var i = 0
            while i < pcm.count {
                let j = min(i + 1600, pcm.count)
                guard await renderer.push(pcm[i..<j]) else {
                    status = "The engine stopped accepting audio."; return
                }
                i = j
                if !started, i >= preroll {
                    started = true
                    log("pre-roll fed; \(await renderer.framesReady()) frames queued")
                    player?.play()
                }
            }
            if !started { player?.play() }
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1e9))
            if let why = await renderer.renderStatus() { log("render status: \(why)") }
            status = "Ready."
        }
    }

    /// Not optional, and it must be SYNCHRONOUS. Exiting with a Metal
    /// completion handler still in flight crashes inside `__cxa_finalize`.
    /// `be_essence2_quiesce_all` stops every live engine and BLOCKS until their
    /// background GPU work has drained, which is exactly what is needed here —
    /// a `Task` queued at terminate time may never run.
    func shutdown() {
        loop?.cancel()
        _ = be_essence2_quiesce_all(3000)
    }
}

// MARK: - 6. UI

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    // @MainActor on the class is what makes this mutable static concurrency-safe
    // under Swift 6.
    static weak var session: AvatarSession?
    func applicationWillTerminate(_ application: UIApplication) {
        AppDelegate.session?.shutdown()
    }
}

@main
struct IOSEssence2App: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    var body: some Scene { WindowGroup { ContentView() } }
}

struct ContentView: View {
    @StateObject private var session = AvatarSession()

    var body: some View {
        VStack(spacing: 14) {
            Text("bitHuman · Essence 2 on device").font(.headline)
            ZStack {
                FrameView(sink: session.sink)
                if !session.hasFrame { ProgressView().tint(.white) }
            }
            .frame(maxHeight: 560)
            Button(session.busy ? "Speaking…" : "Speak") { session.speak() }
                .buttonStyle(.borderedProminent)
                .disabled(!session.ready || session.busy)
            Text(session.status).font(.subheadline)
            Text(session.detail).font(.caption2).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .task {
            AppDelegate.session = session
            await session.boot()
        }
    }
}
```

</details>

Then fetch the payload and generate the project:

```bash
chmod +x setup.sh && ./setup.sh
xcodegen generate
```

`setup.sh` puts the avatar and a speech clip in `Sources/Model/` and the engine resources in `Sources/EngineResources/`. It checks the download is a complete avatar before you open Xcode.

To build the project by hand instead: a new iOS App (SwiftUI), Minimum Deployments **iOS 26.0**, Swift 6; add the package `https://github.com/bithuman-product/homebrew-bithuman.git` from **2.14.2** with the `Essence2` product; add `Sources/Model` as a **folder reference** and `Sources/EngineResources` as a **group**, so the engine resources land at the app bundle's root.

## Set your API secret

In Xcode: **Product → Scheme → Edit Scheme → Run → Environment Variables**, add `BITHUMAN_API_SECRET`. The app reads it at launch and passes it to `be_essence2_set_api_secret`.

## Run it

Open `IOSEssence2.xcodeproj`, pick your team under **Signing & Capabilities**, select your iPhone, and press **Run**. From the command line:

```bash
xcodebuild -project IOSEssence2.xcodeproj -scheme IOSEssence2 \
  -configuration Debug -destination "id=<YOUR-DEVICE-UDID>" \
  -derivedDataPath build \
  DEVELOPMENT_TEAM=<YOUR-TEAM-ID> CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates build

xcrun devicectl device install app --device <YOUR-DEVICE-UDID> \
  build/Build/Products/Debug-iphoneos/IOSEssence2.app
xcrun devicectl device process launch --device <YOUR-DEVICE-UDID> --console \
  com.example.ios-essence2
```

## Expected output

The avatar appears in its idle motion, then says the bundled line once. The console prints:

```text
[ios-essence2] engine ready: 1080x1920, ready in <n> s
```

The first launch unpacks the avatar and prepares the engine, so it is slower than later launches.

## How it works

1. **Credential first:** `be_essence2_set_api_secret` is called before the engine is created.
2. **One actor owns the engine:** the handle is a raw pointer, so an actor keeps it off the main thread and makes the app compile under Swift 6.
3. **Wait for ready:** `be_essence2_create` returns quickly and the engine prepares in the background; poll `be_essence2_is_ready` before pushing audio.
4. **Stream, don't collect:** one 1080×1920 frame is 6.2 MB, so the app pulls one frame per display tick and draws it.
5. **Push with retry:** `be_essence2_push_audio` returns `-2` when its buffer is full; pull frames, then push the same samples again.
6. **Draw on a 40 ms grid:** 25 fps, scheduled against absolute times so small sleep errors do not add up.

The full C API is on [Apple](/sdk/apple#integrate-into-your-app) and [Apple API reference](/sdk/apple-api).

## Make it your own

- **Another sample avatar:** `./setup.sh <AGENT_CODE>` with any of these; the app reads the frame size back from the engine.

  | Avatar | Agent code | Frame |
  |---|---|---|
  | warm-clear-professional-presenter (default) | `A21SKT4314` | 1080×1920 |
  | sofia-ramirez | `A52DHS2219` | 1080×1920 |
  | kwame-warm-museum-guide | `A62SJB3901` | 1080×1920 |
  | afro-latina-astrophysics-mentor | `A23KSG5258` | 1920×1080 |
  | calm-product-specialist-advisor | `A24EKJ8433` | 1280×720 |

- **Your own avatar:** create one with the [Agents API](/api/agents) (`"model": "essence-2"`), then run `setup.sh` with its code and `BITHUMAN_API_SECRET` set.
- **Ship it:** fetch the secret from your backend or the Keychain at launch and pass it to `be_essence2_set_api_secret`; never put it in the app bundle.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `be_essence2_create` returns `-3` | no API secret, or the service rejected it (stderr says which): set `BITHUMAN_API_SECRET` in the Run scheme |
| `be_essence2_create` returns `-2`, *"the download is incomplete"* | re-run `./setup.sh`; it checks the download |
| *"the shared audio front end is missing"*, or the engine never becomes ready | add `Sources/EngineResources` as a **group**, not a folder reference |
| The avatar moves but never speaks | resolve Swift package **2.14.2** or newer (*File → Packages → Update to Latest Package Versions*) |
| The link fails naming a newer minimum OS | set Minimum Deployments to **iOS 26.0** |
| `no such module 'Essence2'` | attach the `Essence2` product to the app target |
| `ld` warns *"built for newer 'iOS' version (26.0)"* once per object | expected; the build is good |
| It builds for the Simulator and crashes there | run on a physical device |

More on [Apple: Troubleshooting](/sdk/apple#troubleshooting).

## Next

- [iOS example: Expression 2](/examples/swift-ios-expression2) · [Android example: Essence 2](/examples/android-essence2) · [Apple SDK](/sdk/apple) · [Essence 2](/concepts/essence-2)
