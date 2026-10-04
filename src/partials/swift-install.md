<!-- Shared by /platforms/ios and /platforms/macos (```partial swift-install). The pin is written by scripts/sync-versions.mjs. -->
In Xcode choose *File → Add Package Dependencies…* and paste `https://gitlab.com/bithuman/sdk/bithuman-swift`. In a `Package.swift`:

```swift
.package(url: "https://gitlab.com/bithuman/sdk/bithuman-swift", from: "3.0.0")
// then attach the product your target uses:
//   .product(name: "Bithuman", package: "bithuman-swift")      // the client, avatars and conversations
//   .product(name: "BithumanUI", package: "bithuman-swift")    // SwiftUI, UIKit and AppKit views
//   .product(name: "Essence2", package: "bithuman-swift")      // the Essence 2 C library, for C and C++ hosts
```

The products:

| Product | Import | What it is |
|---|---|---|
| `Bithuman` | `import Bithuman` | the client, the avatar store, avatars, conversations and errors |
| `BithumanUI` | `import BithumanUI` | SwiftUI, UIKit and AppKit views; it includes `Bithuman` |
| `BithumanTesting` | `import BithumanTesting` | test doubles: a real client over a scripted backend |
| `Essence2` | `import Essence2` | the Essence 2 engine as a C library, for C and C++ hosts |

iOS 17 and macOS 14 or newer; Essence 2 renders on iOS 26 and macOS 26 or newer. The same URL resolves every 2.x version too.
