# Native XCTest limitation (Stage 3E V1)

The Oli iOS app target (`ios/Oli.xcodeproj`) has **no XCTest target**. Creating a
governed XCTest target for a local Expo module would require editing the committed
Xcode project and CocoaPods test wiring beyond this bounded viewer pass.

## Covered instead

- Pure Swift validators live in `OliSecurePdfPathValidator.swift` (no logging of paths).
- TypeScript wrapper + preview controller tests lock safe reason mapping, no
  WebBrowser/Linking/expo-sharing fallback, cleanup after dismiss/failure, and
  DEV harness PDFKit path.
- Autolink + Swift compile are proven via `npx expo run:ios` / pod install + build.

## Future

Add an XCTest target (or `use_expo_modules_tests!`) to cover:

- valid cache-contained file URL
- non-file URL / traversal / symlink escape / outside-root
- missing / empty / invalid / locked PDF
- concurrent presentation → `preview_already_presented`

Never use a real personal DXA report in native tests.
