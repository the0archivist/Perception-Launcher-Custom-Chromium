# Perception - A Bloxd.io Client

I made this because playing Bloxd in a browser is actually terrible. The lag is insane and you can't even use shaders without your FPS dropping to like 10 (based on my potato pc). Perception is basically a custom Electron build that forces your PC to actually use its hardware instead of throttling it.

## What it actually does

I spent a lot of time digging through Chromium flags to find stuff that actually works.

### CPU Core Unlocking
Most browsers try to "save power" by not using all your cores. I turned that off.
- **No Thread Caps**: If your CPU has 8 cores, the client uses all 8 to render blocks. This is why chunks load way faster here.
- **Hardware Profiling**: It checks your RAM and CPU when you start it and adjusts the engine settings so it doesn't crash but still runs as fast as possible.

### Rendering & Sync Fixes
I fixed a screen tearing glitch that happens when you flick your mouse fast. 
- **DirectComposition Fix**: I enabled some low-level Windows flags (`DirectComposition` and `Double Buffering`) that force the frames to stay in sync. No more screen tearing.
- **Occlusion Culling**: I re-enabled this so the GPU doesn't waste time drawing stuff underground or behind walls. This is the only way to get playable FPS with Resource Heavy Shaders and maximum render distance.

### Networking
PvP lag is the worst part of Bloxd.
- **Fast Handshake**: Enabled `TCP Fast Open` and `Async DNS`. It basically shaves a few milliseconds off the connection to the server.
- **Actually Good Ad-Blocking**: I blocked AdinPlay and a bunch of other ad scripts that normally run in the background and eat your CPU.

### The HUD (Ghost Overlay)
The HUD is a completely separate window that sits on top of the game.
- **Zero-Injection**: It doesn't touch the game code at all, so it's safe from bans. It just listens to your mouse/keys and shows them on the overlay.
- **Minimalist Design**: Just shows Ping, FPS, Mod Menu and CPS without cluttering the screen.

---

## How to use it
1. Run `npm install`
2. Run `npm start`
3. Press **F11** for Fullscreen.
4. **Ctrl + Q** to quit.

## Developer Stuff
If you want to see exactly how I optimized this, check out the [DEV_SUMMARY.md] I included all the documentation links and the "receipts" so you can verify the performance yourself. You can also check the comments in `main.js`.
