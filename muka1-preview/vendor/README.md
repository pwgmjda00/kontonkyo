# QR encoder

`qrcode.js` bundles `qrcode` 1.5.4 and its `dijkstrajs` dependency for offline browser use. It exports `createQRCode(text, options)`.

Source: https://github.com/soldair/node-qrcode (MIT). See `qrcode.LICENSE` and `dijkstrajs.LICENSE`. No network request is used for QR generation.

Rebuild with esbuild from an entry file containing:

```js
export { create as createQRCode } from 'qrcode/lib/browser.js';
```

```sh
esbuild entry.js --bundle --platform=browser --format=esm --minify --outfile=qrcode.js
```
