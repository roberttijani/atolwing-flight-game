# atolwing-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/roberttijani/atolwing-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/roberttijani/atolwing-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**AtolWing: Archipelago Sortie** (v3) is an original offline 3D atmospheric flight simulator built for desktop browsers with no build step and zero network requests. Fly three distinct PBR aircraft (`ATW-28 Islander STOL`, `VX-9 Peregrine Recon`, and `PL-40 Mariner Heavy` amphibian) across a smooth-shaded volcanic archipelago featuring custom GLSL Rayleigh+Mie atmospheric scattering, real-time `PCFSoftShadowMap` shadows, volumetric cumulus cloud banks, a custom GLSL ocean shader with coastal surf foam, three marked aerodromes (`WARA RWY 09/27`, `WAKB RWY 14/32`, and the `WAPO` offshore steel STOL platform) with dynamic PAPI glide-slope lights and animated windsocks, Chase & 3D virtual cockpit cameras with live EFIS/Moving-Map Terrain MFD/EICAS displays, Tactical Terrain Mini-Radar HUD, Web Audio propulsion synthesis, and six distinct sortie missions.

## Run it

```sh
# Play locally in desktop Chrome at http://localhost:8080
node serve.ts

# Build deterministic competition output and dossier.json
MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
