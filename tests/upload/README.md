# Registration document regression checks

Run `npm run test:upload` with Playwright WebKit and Google Chrome installed. The browser suite bundles the real SignupForm and its experience form, supplies synthetic department options, and mocks only Next navigation and network responses. It compiles the real global CSS/Tailwind configuration. No database credentials, real accounts, or documents are used. Every non-GET request is intercepted; the fixture server also rejects writes.

The Safari profile runs desktop Playwright WebKit with touch/mobile emulation and a 393×852 CSS-pixel viewport (iPhone 16-like). This is **not a physical iPhone or the iOS system document picker**. The mobile Chrome profile uses Google Chrome with mobile/touch emulation. File-chooser events are tested after real Playwright tap/click actions; setInputFiles alone is not used as evidence of picker activation.

Coverage includes direct input and associated-label activation; PDF/JPEG/PNG and missing MIME metadata; cancellation and reselection; empty/oversized/unsupported files; no requests on selection; consent and required proof; offline/413/server errors; retained file bytes; and mandatory experience plus return to registration.

The reported physical-iPhone no-picker failure did not reproduce on the original live signup page in simulated WebKit or Chrome. No hidden input, blocking overlay, disabled state, cancelled event, or asynchronous picker call was found. Removing native-button pseudo-element styling and adding a clearly associated Hebrew label is a compatibility mitigation, not a proven diagnosis of the device-specific incident. Physical-device validation remains necessary to confirm that report is resolved.
