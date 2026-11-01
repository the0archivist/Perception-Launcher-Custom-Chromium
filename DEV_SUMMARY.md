# Perception Launcher - Developer Summary

Perception is a custom client for Bloxd.io built on Electron. It uses system-level Chromium optimizations to bypass the standard browser limits that cause lag in voxel games.

## Core Architecture
- **Hardware Profiling**: Automatically detects RAM and CPU cores to adjust engine settings.
- **Network Optimization**: Uses TCP Fast Open, Async DNS, and pre-fetching to lower connection latency.
- **Ghost Overlay**: A separate transparent window for stats (FPS, Ping, CPS) that doesn't inject code into the game.
- **Sync Fixes**: Uses DirectComposition and Double Buffering to stop screen tearing during fast movement.
- **Zero-Lag Input**: Uses Kalman input prediction and main-thread bypass to minimize the delay between mouse/key actions and the game.
- **Kernel-Level Priority**: Elevates the process to "High Priority" at the OS level to prevent background tasks from stealing CPU cycles.
- **CPU Affinity (Pinning)**: Manually pins the game engine to 6 cores and the HUD to its own core to prevent process interference.
- **Ultra-Low Latency Networking**: Uses HappyEyeballsV3 for faster IP resolution, direct proxy bypassing, and Zstd compression to get the ping as close to zero as possible.

## Bugs Encountered & Fixed
During the build, I ran into some weird issues that I had to solve to get the performance where it is now:

- **The "2 FPS" Shader Choke**: When I first turned on shaders that I custom made and made sure it was resource heavy and maxed the render distance, I was able to join but then immediately drop to 2 FPS or just freeze.
  - *The Fix*: I realized the engine was trying to render every single block in the world, even ones underground. I added **Occlusion Culling**, which tells the GPU to stop drawing what you can't see.
- **The Screen Tearing Glitch**: Flicking the mouse fast would cause a screen tear to appear in the middle of the screen.
  - *The Fix*: I enabled **DirectComposition** and **Double Buffering** to force the frames to sync perfectly with the monitor's refresh rate.
- **Startup Script Errors**: Sometimes the pre-fetcher would crash the app before the game even loaded.
  - *The Fix*: Added a safety loop to the injection script that waits for the `document.head` to exist before trying to connect.
- **Micro-Stuttering**: Every few seconds, the game would hitch for a split second.
  - *The Fix*: The Garbage Collector (GC) was firing too often. I relaxed the **GC Interval** to 250ms and implemented a **Smart RAM Purge** that only cleans when memory is actually getting full.
- **The "Sticky Movement" Bug**: Opening the mod menu while running would sometimes cause the character to keep moving forever even after closing the menu.
  - *The Fix*: Implemented a **Key State Tracker** that manually sends "keyUp" signals to the game whenever the menu is toggled, forcing the character to stop instantly.

## Core Unlocking
- Removed the default Chromium thread caps. The engine now uses all 8 cores for loading chunks.
- **CPU Pinning**: The game is locked to Cores 0-5, the HUD to Core 6, and the Launcher to Core 7. This eliminates "Task Contention."
- **Kernel Domination**: The client uses PowerShell to set the process class to `High`, forcing Windows to prioritize Perception over all other background apps.
- **VRAM Spoofing**: Increased the GPU memory limit to 4GB-8GB so shaders can be cached properly.
- **Stability Fixes**: Locked the engine to 60Hz to prevent micro-stutters and fixed script errors that happened on startup.
- **Input Delay Reduction**: Added Kalman prediction and bypassed main-thread locking for mouse/keyboard events.

## Safety
- **No Game Injection**: The client doesn't touch Bloxd.io's source code, making it safe from bans.
- **Ad-Blocker**: Filters out ad scripts (like AdinPlay) at the network level to save CPU power.

## Technical Verification ("The Receipts")
If you want to verify that these optimizations are real, you can check the engine yourself:

### **1. Documentation**
The flags used in `main.js` are all standard Chromium switches:
- **Occlusion Culling**: [Chromium Source](https://source.chromium.org/search?q=OcclusionCulling)
- **DirectComposition**: [Chromium Source](https://source.chromium.org/search?q=DirectComposition)
- **Raster Threads**: [Chromium Switches](https://peter.sh/experiments/chromium-command-line-switches/#num-raster-threads)

### **2. Diagnostic Tools**
- **GPU Status**: Open DevTools (`Ctrl+Shift+I`) and check `chrome://gpu`. You'll see that Hardware Acceleration is active for all systems.
- **RAM Usage**: In DevTools, run `performance.memory` to see the increased heap limits.
- **Thread Count**: Open Task Manager, go to Details, and check the thread count for `electron.exe`. You'll see all cores being utilized.

### **3. The Tearing Test**
The best proof is the screen tearing fix. If you comment out the `DirectComposition` and `DoubleBuffer` lines in `main.js`, the flickering screen tearing will come back immediately when you flick your mouse.
