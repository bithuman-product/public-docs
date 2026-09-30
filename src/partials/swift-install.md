<!-- Shared by /platforms/ios and /platforms/macos (```partial swift-install). The pin is written by scripts/sync-versions.mjs. -->
In Xcode choose *File → Add Package Dependencies…* and paste `https://github.com/bithuman-product/homebrew-bithuman.git`. In a `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.19.2")
// then attach the product your target uses:
//   .product(name: "Expression2", package: "homebrew-bithuman")
//   .product(name: "Essence2Kit", package: "homebrew-bithuman")
//   .product(name: "Essence2", package: "homebrew-bithuman")
```

The products:

| Product | Import | What it is | Deployment target |
|---|---|---|---|
| `Expression2` | `import Expression2` | the Expression 2 engine with a Swift API | iOS 16 · macOS 13 |
| `Essence2Kit` | `import Essence2Kit` | the Essence 2 engine with a Swift API; it includes `Essence2` | iOS 26 · macOS 26 |
| `Essence2` | `import Essence2` | the Essence 2 engine as a C library, for C, C++ and plugins | iOS 26 · macOS 26 |

Every product ships `ios-arm64`, `ios-arm64-simulator` (arm64 only) and `macos-arm64`. `bitHumanKit` 2.4.0 is legacy and frozen; new apps use `Expression2` or `Essence2Kit`.
