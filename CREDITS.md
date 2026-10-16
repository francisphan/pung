# Credits

## Tile faces

The classic tile faces in `public/tiles.svg` are by **Cangjie6**, published on
[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_mahjong_tiles)
under the [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
licence. The dot tiles are Cangjie6's remake of Jerry Crimson Mann's originals.
The files were optimised and combined into one sprite by `scripts/build-tiles.mjs`;
the artwork itself is unchanged. The sprite stays under CC BY-SA 4.0.

| Tiles | Commons files |
| --- | --- |
| Characters 一萬 to 九萬 | `MJw1-.svg` to `MJw9-.svg` |
| Dots 一筒 to 九筒 | `MJt1-.svg` to `MJt9-.svg` |
| Bamboo 一索 to 九索 | `MJs1-.svg` to `MJs9-.svg` |
| Winds 東南西北 | `MJf1-.svg` to `MJf4-.svg` |
| Dragons 中發白 | `MJd1-.svg` to `MJd3-.svg` |
| Seasons 春夏秋冬 | `MJh1-.svg` to `MJh4-.svg` |
| Flowers 梅蘭菊竹 | `MJh5-.svg` to `MJh8-.svg` |
| Face down | `MJhide.svg` |

Each file's page is at `https://commons.wikimedia.org/wiki/File:<name>`.

The line-art faces (the "Line art" option) were drawn in code for
[Sparrow](https://github.com/francisphan/sparrow) and share this repository's terms.

## Sounds

The table sounds in `public/sounds/` are cut from recordings on
[Freesound](https://freesound.org/) and served from this site as small MP3 files.

| Cue files | Source | Author | Licence |
| --- | --- | --- | --- |
| `discard-1` to `discard-4`, `claim`, `kong`, `exhausted` | [Majiang Playing](https://freesound.org/people/soloan/sounds/82702/), a real game recorded at the table | soloan | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pick`, `flower` | [Domino 2](https://freesound.org/people/mmaruska/sounds/182126/) | mmaruska | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `draw` | [Domino_sfx_moveTile](https://freesound.org/people/poenia/sounds/745028/) | poenia | CC0 |
| `deal` | [shuffle_.mp3](https://freesound.org/people/UnycodeAdmin/sounds/705352/) | UnycodeAdmin | CC0 |
| `win` | [tiles fall on corkboard](https://freesound.org/people/Detective_Lemons/sounds/785585/) | Detective_Lemons | CC0 |

Processing: single tile strikes were located by their sharp attack and cut to
about a quarter of a second with short fades; the table recording was
high-passed at 110 Hz and lightly denoised; `claim` and `kong` are two and
three strikes mixed 80 to 85 ms apart; `exhausted` is one strike slowed to
68% and low-passed; `deal` and `win` are trimmed excerpts. Levels were set per
cue (strikes near full scale, the pick-up click 12 dB lower) because iPad
Safari ignores volume changes on audio elements. Encoded with ffmpeg
(libmp3lame, mono, 96 kb/s).

## Fonts

Young Serif, Atkinson Hyperlegible and Noto Serif TC are served from Google Fonts
under the SIL Open Font License.
