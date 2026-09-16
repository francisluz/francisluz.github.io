# C64 graphics direction

The recovered ChatGPT task is **BMX Sprite Sheet Plan**, ID
`6aaad43c-ebe0-83ed-824c-14662865a7ec`. It contains both California Games
briefs and four attached images: the surf montage, BMX montage, and two BMX
screenshots. A separate surf task was not found in the available task listings.
The montages include versions from several computers. Use their composition
and animation as references, not every image's color count as a C64 rule.

## What was wrong

The game used a 160×200 buffer for backgrounds, riders, and text alike. It
stretched that to a 320×200 image, so it could not show single-width text or
sprite details. Its bitmap color limiter overwrote source pixels every frame.
The BMX course was a line above a striped wall, missing the broad road in the
reference. The ocean had a small upright hook with evenly dithered shading.

## Chosen approach

Keep the 160-unit world coordinates and collision models. Compose the final
frame at 320×200, with doubled multicolor background pixels and a separate
single-width detail layer. Correct pixel aspect at presentation to a 4:3 image.
Prefer integer enlargement when the host fits it; small hosts still fit the
whole image. No smoothing or CRT filter.

Backgrounds retain the C64 palette and multicolor bitmap restriction of one
background plus three cell colors. Explicit cell palettes and raster background
changes make art direction possible without relying only on a frequency-based
fallback. Constraint processing must leave the authored bitmap intact.

BMX has a back edge ten rows above wheel-contact height, a road surface, and
a front edge 26 rows below contact height. This depth is decorative. Terrain
height remains the sole collision source. Surf artwork follows the existing
wave model and uses four water colors with authored repeating foam patterns.

This is a C64-style renderer, not a cycle-accurate VIC-II emulator. In particular,
composite game sprites and the detail layer do not enforce eight hardware
sprites per scanline, DMA timing, or sprite register scheduling. The hardware
sprite decoder models the real 24×21 bit layout and multicolor pair meanings;
it does not make all game artwork hardware-exportable.

The Commodore reference describes independent sprite modes and multicolor
bitmap rules:

- [Graphics overview](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_100.html)
- [Independent sprite modes](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_131.html)
- [Multicolor sprites](https://www.devili.iki.fi/Computers/Commodore/C64/Programmers_Reference/Chapter_3/page_135.html)

## Work split

The parent agent defined the rendering contract, recovered and inspected the
references, rebuilt the BMX landscape, and reviewed the integrated visuals.
Three GPT-5.6 Luna workers handled the renderer, surf artwork, and BMX sprite
rasterization in separate files.

## Verification

Run `npm test` for pixel, clipping, sprite decoding, and game-rendering checks.
Run `npm run render:arcade` to reproduce six native-resolution PNG captures in
`artifacts/c64`. The fixture states live in `tests/fixtures/arcadeScenes.js`.
Run `npm run dev` and open `/artifacts/c64/` for the saved comparisons, or
`/#ask` to play both games. Captures do not replace checking live movement,
keyboard input, canvas resizing, and returning to the terminal with Escape.

The surf camera now keeps the rider between 55% and 70% of the screen width,
leaving more of the breaking wave visible on the left. Collision and movement
rules are unchanged.

Validation completed with 16 passing Node tests, a production Vite build, six
rendered fixture scenes, and live Chrome checks of both games. The browser
checks exercised movement, desktop integer scaling, a 390-pixel-wide viewport,
and Escape cleanup. No page errors occurred. Browser captures are saved beside
the comparison images.
