# Hero wallpapers

Optimized from `J:\壁纸` plus the previous cover for the first-screen random background. Only the randomly selected image is requested by the browser.

| File | Source | Output | Size | Processing |
|---|---|---|---|---|
| `wallpaper-01.webp` | `4ef68f4be308ec3ba55723567ae1746f188656718.jpg` 9941x5591 | 7680x4319 | 3.20 MB | 7680px q95 |
| `wallpaper-02.webp` | `9fb75a4a73f54ed4fb6e4aad3c1049c7188656718.jpg` 10670x6002 | 7680x4320 | 3.68 MB | 7680px q95 |
| `wallpaper-03.webp` | `a1518dd09dfe9efc4c7ed2193ba411d5274543743.png` 1920x1080 | 1920x1080 | 1.10 MB | native lossless |
| `wallpaper-04.webp` | `b536b03d42016c05e472f1c51b8ea2d0274543743.png@1192w.webp` 1192x671 | 1192x671 | 0.83 MB | native lossless |
| `wallpaper-05.webp` | `d6351e51d9dce620b552b1278148c209188656718.jpg` 12000x6750 | 7680x4320 | 4.00 MB | 7680px q95 |
| `wallpaper-06.webp` | `d719e15e73eb6f5a8469dfcf563374fb274543743.png` 2560x1080 | 2560x1080 | 1.53 MB | native lossless |
| `wallpaper-07.webp` | `background.jpg (old cover)` 15360x8640 | 7680x4320 | 4.05 MB | 7680px q95 |

Processing notes:
- High-resolution sources are resized to 7680px wide and encoded as WebP quality 95 for a sharp 4K/5K hero.
- Sources that are already 1080p/1440p-class are kept at native size with lossless WebP; they cannot truthfully reach 3 MB without upscaling.
- RGBA images are flattened onto #0d1117; EXIF orientation is normalized.
- The previous cover `public/images/logo/background.jpg` is included as `wallpaper-07.webp` at 7680x4320, while the original file remains as the error fallback.
- Random selection is weighted: 01/02/05/07 = 4, 03/06 = 2, 04 = 1. All seven can appear, but the 7680px covers dominate.
