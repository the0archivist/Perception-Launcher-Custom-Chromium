const { app, BrowserWindow, session, globalShortcut, Menu, screen, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const https = require('https');
const { exec } = require('child_process');

/** 
 * PERCEPTION LAUNCHER - CUSTOM ENGINE
 * I built this because browsers throttle the hardware too much.
 */

// --- Hardware Profiling ---
// Checking the specs to see how much I can push the engine.
const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
const cpuCores = os.cpus().length;
const isLegacyHardware = totalMemoryGB < 6 || cpuCores < 4;
const isMidRange = totalMemoryGB >= 6 && totalMemoryGB <= 12;

// Set Main process priority immediately
if (process.platform === 'win32') {
    exec('powershell -Command "Get-Process -Id ' + process.pid + ' | Each-Object { $_.PriorityClass = \'High\' }"');
}

console.log(`Perception: Checking hardware...`);
console.log(`- RAM: ${totalMemoryGB.toFixed(2)} GB`);
console.log(`- CPU Cores: ${cpuCores}`);
console.log(`- Mode: ${isLegacyHardware ? 'LOW-END' : (isMidRange ? 'OPTIMIZED' : 'ULTRA')}`);

// --- Core Unlocking ---
// Uses every core available for rendering blocks. 
const rasterThreads = isLegacyHardware ? 2 : (isMidRange ? 6 : cpuCores); 
app.commandLine.appendSwitch('num-raster-threads', rasterThreads.toString());

const maxOldSpace = Math.floor(totalMemoryGB * 0.85 * 1024); // Give the engine 85% of total RAM.
const maxSemiSpace = isLegacyHardware ? 256 : 512; 
const jsFlags = [
    `--max-old-space-size=${maxOldSpace}`,
    `--max-semi-space-size=${maxSemiSpace}`,
    '--expose-gc',
    '--gc-interval=250', // Fixed the 50ms stutter by relaxing the GC.
    '--concurrent-recompilation'
].join(' ');
app.commandLine.appendSwitch('js-flags', jsFlags);

// --- Networking & Input ---
// Killing the input lag and handshake delays.
app.commandLine.appendSwitch('enable-high-resolution-timer');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('enable-tcp-fastopen');
app.commandLine.appendSwitch('enable-quic');
app.commandLine.appendSwitch('enable-async-dns');
app.commandLine.appendSwitch('enable-features', 'RawInput,Vulkan,VulkanFromANGLE,DefaultANGLEVulkan,WebAssemblySimd,WebAssemblyThreads,CanvasOopRasterization,SharedArrayBuffer,NetworkServiceInProcess,ResourceLoadingHints,Prerender2,ParallelDownloading,ThreadPoolCap8,VsyncAlignedPresent,VsyncAlignedEventForwarding,DrDc,WriteAccessedResources,WebAssemblyLazyCompilation,GpuRasterization,GpuMemoryBufferCompositorResources,SimpleLayering,DirectComposition,Canvas2dDXGIReuseFreeResources,DoubleBuffer,UiGpuRasterization,SkiaGraphite,CanvasOopRasterization,ZeroCopy,GpuCompositing,UseDDSForOverlays,InputPredictorType=kalman,ResamplingInputEvents,SkipUnlockMainThreadForInput,NetworkQualityEstimator');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,TouchpadAndWheelScrollLatching,AsyncWheelEvents,IsolateOrigins,SitePerProcess,SendMouseLeaveEvents,NetworkServiceSandbox,DnsOverHttpsUpgrade'); 

// --- Loading Speed ---
// Pre-caching bytecode so scripts execute faster.
app.commandLine.appendSwitch('enable-data-reduction-proxy-dev');
app.commandLine.appendSwitch('enable-resource-loading-hints');
app.commandLine.appendSwitch('enable-preconnect-to-search');
app.commandLine.appendSwitch('dns-prefetch-disable', 'false');
app.commandLine.appendSwitch('predictive-prefetch-limit', '20');
app.commandLine.appendSwitch('proxy-server', 'direct://'); // Bypass proxy discovery delay
app.commandLine.appendSwitch('disable-http2-grease-settings'); // Shave off header overhead
app.commandLine.appendSwitch('v8-cache-options', 'code'); 
app.commandLine.appendSwitch('enable-lazy-image-loading');

// --- Rendering & Sync ---
// Fixed the VHS screen tearing by aligning frames to the monitor.
app.commandLine.appendSwitch('enable-gpu-vsync'); 
app.commandLine.appendSwitch('enable-begin-frame-scheduling'); 
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl2-compute-context');
app.commandLine.appendSwitch('enable-webgl-draft-extensions');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('force-gpu-rasterization');
const vramLimit = isLegacyHardware ? 1024 : (totalMemoryGB >= 32 ? 8192 : 4096);
app.commandLine.appendSwitch('force-gpu-mem-available-mb', vramLimit.toString()); // Spoofing VRAM to cache more shaders.
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('enable-parallel-shader-compilation');
app.commandLine.appendSwitch('force-high-performance-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-software-compositing-fallback');
app.commandLine.appendSwitch('force-color-profile', 'srgb'); 
app.commandLine.appendSwitch('disable-gpu-process-crash-limit'); 
app.commandLine.appendSwitch('disable-gpu-sandbox'); // Direct GPU access for speed.
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('enable-gpu-async-worker-context');
app.commandLine.appendSwitch('enable-drdc');
app.commandLine.appendSwitch('enable-skia-graphite');
app.commandLine.appendSwitch('enable-features', 'WriteAccessedResources,UiGpuRasterization');

if (isLegacyHardware) {
    app.commandLine.appendSwitch('use-angle', 'd3d9'); 
    app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
    app.commandLine.appendSwitch('disk-cache-size', '1073741824'); 
    app.commandLine.appendSwitch('renderer-process-limit', '1'); 
    app.commandLine.appendSwitch('disable-gpu-sandbox'); 
} else {
    app.commandLine.appendSwitch('use-angle', 'd3d11');
    app.commandLine.appendSwitch('enable-d3d11-feature-level-11-1');
    app.commandLine.appendSwitch('disk-cache-size', '1073741824'); // 1GB disk cache.
    app.commandLine.appendSwitch('renderer-process-limit', '4'); 
}
app.commandLine.appendSwitch('max-active-webgl-contexts', '100');

let mainWindow;
let overlayWindow;
let splashWindow;
let refreshRate = 60;
let menuOpen = false;
const activeKeys = new Set();

// Ultra-Aggressive BlockList (100x Effectiveness)
const blockList = [
    '*://*.adinplay.com/*', '*://*.adinplay.host/*', '*://*.vdo.ai/*', '*://*.nextmillmedia.com/*',
    '*://*.kueez.com/*', '*://*.omnitagjs.com/*', '*://*.programmaticx.ai/*', '*://*.adkernel.com/*',
    '*://*.krushmedia.com/*', '*://*.doubleclick.net/*', '*://*.google-analytics.com/*',
    '*://*.googletagmanager.com/*', '*://*.adnxs.com/*', '*://*.amazon-adsystem.com/*',
    '*://*.casalemedia.com/*', '*://*.pubmatic.com/*', '*://*.rubiconproject.com/*',
    '*://*.ad-delivery.net/*', '*://*.plusoneads.com/*', '*://*.sync.plusoneads.com/*',
    '*://*.quantserve.com/*', '*://*.scorecardresearch.com/*', '*://*.zedo.com/*',
    '*://*.adroll.com/*', '*://*.outbrain.com/*', '*://*.taboola.com/*',
    '*://*.criteo.com/*', '*://*.serving-sys.com/*', '*://*.openx.net/*',
    '*://*.bidswitch.net/*', '*://*.smartadserver.com/*', '*://*.lijit.com/*', '*://*.sparteo.com/*',
    '*://*.the-ozone-project.com/*', '*://*.bids.ws/*', '*://*.aaxads.com/*',
    '*://*.pubads.g.doubleclick.net/*', '*://*.g.doubleclick.net/*',
    '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*',
    '*://*.adservice.google.com/*', '*://*.adservice.google.ad/*',
    '*://*.fastclick.net/*', '*://*.mediaplex.com/*', '*://*.imrworldwide.com/*',
    '*://*.revcontent.com/*', '*://*.popads.net/*', '*://*.popcash.net/*',
    '*://*.propellerads.com/*', '*://*.ad-maven.com/*', '*://*.exoclick.com/*',
    '*://*.juicyads.com/*', '*://*.ero-advertising.com/*', '*://*.trafficjunky.com/*'
];

// Kill headers for ad requests to make them 100x more likely to fail
function setupAdBlocker() {
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: blockList }, (details, callback) => {
        callback({ cancel: true });
    });

    session.defaultSession.webRequest.onBeforeRequest({ urls: blockList }, (details, callback) => {
        callback({ cancel: true });
    });
}

function startRamMonitorLoop() {
    setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        
        process.getProcessMemoryInfo().then(info => {
            const memoryUsageMB = Math.round(info.private / 1024);
            const totalMemoryAllocatedMB = Math.floor(totalMemoryGB * 0.85 * 1024);
            const usagePercent = Math.min(100, Math.round((memoryUsageMB / totalMemoryAllocatedMB) * 100));

            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.webContents.send('ram-update', { 
                    used: memoryUsageMB, 
                    percent: usagePercent 
                });
            }

            // Smart RAM Purge: Trigger GC if usage > 90%
            if (usagePercent > 90) {
                mainWindow.webContents.executeJavaScript('window.gc && window.gc();');
                console.log(`Perception Engine: Auto-Purge triggered (${usagePercent}% usage).`);
            }
        });
    }, 2000);
}

// --- Kernel & CPU Affinity Optimizations ---
// This is the "Insane" part. We are telling Windows exactly how to treat our app.
function applyKernelOptimizations(win, type) {
    if (process.platform !== 'win32') return;

    const pid = win.webContents.getOSProcessId();
    
    // 1. Set High Process Priority
    // REALTIME_PRIORITY_CLASS = 0x100 (Too dangerous)
    // HIGH_PRIORITY_CLASS = 0x80
    exec(`powershell -Command "Get-Process -Id ${pid} | Each-Object { $_.PriorityClass = 'High' }"`, (err) => {
        if (!err) console.log(`Perception Engine: Set ${type} process to High Priority (PID: ${pid})`);
    });

    // 2. CPU Affinity (Pinning)
    // Core Mask (for 8 cores):
    // Game (Cores 0-5): 00111111 = 63
    // HUD (Core 6): 01000000 = 64
    // Launcher (Core 7): 10000000 = 128
    let affinityMask = 255; // Default all
    if (type === 'GAME') affinityMask = 63;
    if (type === 'HUD') affinityMask = 64;

    exec(`powershell -Command "$process = Get-Process -Id ${pid}; $process.ProcessorAffinity = ${affinityMask}"`, (err) => {
        if (!err) console.log(`Perception Engine: Pinned ${type} to Core Mask ${affinityMask}`);
    });

    // 3. I/O Priority (Protects the 8GB RAM from background disk noise)
    exec(`powershell -Command "Set-ProcessMitigation -Name electron.exe -Enable HighIO"`, () => {});
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 600,
        height: 400,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        center: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile('splash.html');

    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            if (mainWindow && !mainWindow.isVisible()) {
                mainWindow.show();
                mainWindow.focus();
                mainWindow.maximize();
            }
        }
    }, 7000);
}

function createOverlayWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size; // Use full size

    overlayWindow = new BrowserWindow({
        width: width,
        height: height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: true,
        parent: mainWindow, // Set as child to keep the app "selected"
        backgroundColor: '#00000000', // Ensure transparency
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            enableWebSQL: false,
            spellcheck: false
        }
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver'); // Force it above maximized windows
    overlayWindow.setIgnoreMouseEvents(true);
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
    
    overlayWindow.webContents.on('did-finish-load', () => {
        applyKernelOptimizations(overlayWindow, 'HUD');
    });

    overlayWindow.show(); // Explicit show

    const syncOverlay = () => {
        if (!mainWindow || !overlayWindow) return;
        const bounds = mainWindow.getBounds();
        overlayWindow.setBounds(bounds);
    };

    mainWindow.on('move', syncOverlay);
    mainWindow.on('resize', syncOverlay);
    syncOverlay(); // Initial sync
}

function startPingLoop() {
    setInterval(() => {
        const start = Date.now();
        const req = https.get('https://bloxd.io', { timeout: 3000 }, (res) => {
            const ping = Date.now() - start;
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.webContents.send('ping-update', ping);
            }
            res.resume();
        });
        req.on('error', () => {
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.webContents.send('ping-update', 'ERR');
            }
        });
        req.end();
    }, 5000); // Check every 5s instead of 2s to save CPU
}

function startFpsLoop() {
    setInterval(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('fps-update', refreshRate);
        }
    }, 1000);
}

function createMainWindow() {
    // Detect Refresh Rate
    const primaryDisplay = screen.getPrimaryDisplay();
    refreshRate = primaryDisplay.displayFrequency || 60;
    console.log(`Perception Engine: Detected Refresh Rate - ${refreshRate}Hz`);

    mainWindow = new BrowserWindow({
        width: 1280, height: 720, show: false, backgroundColor: '#0f0f0f',
        title: "Perception Launcher", frame: true,
        webPreferences: {
            nodeIntegration: false, contextIsolation: true, backgroundThrottling: false,
            preferredSizeMode: 'fixed', spellcheck: false, enableWebSQL: false,
            autoplayPolicy: 'no-user-gesture-required', offscreen: false,
            partition: 'persist:perception' // Persistent storage for faster caching
        }
    });

    // Aggressive Network Pre-fetching
    mainWindow.webContents.on('did-start-loading', () => {
        mainWindow.webContents.executeJavaScript(`
            (function() {
                const prefetch = () => {
                    if (!document.head) {
                        setTimeout(prefetch, 100);
                        return;
                    }
                    const link = document.createElement('link');
                    link.rel = 'dns-prefetch';
                    link.href = 'https://bloxd.io';
                    document.head.appendChild(link);
                    
                    const preconnect = document.createElement('link');
                    preconnect.rel = 'preconnect';
                    preconnect.href = 'https://bloxd.io';
                    preconnect.crossOrigin = 'anonymous';
                    document.head.appendChild(preconnect);
                };
                prefetch();
            })();
        `).catch(err => console.error("Perception Engine: Pre-fetch script deferred."));
    });

    // Input Sync (NO INJECTION)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Track key states to prevent "sticky keys" when menu opens
        if (input.type === 'keyDown') activeKeys.add(input.key);
        if (input.type === 'keyUp') activeKeys.delete(input.key);

        // Handle Mod Menu Toggle (Right Shift)
        if (input.code === 'ShiftRight') {
            if (input.type === 'keyDown') {
                console.log("Perception Engine: Right Shift Detected - Toggling Menu");
                menuOpen = !menuOpen;
                if (overlayWindow && !overlayWindow.isDestroyed()) {
                    overlayWindow.webContents.send('toggle-menu');
                    overlayWindow.setIgnoreMouseEvents(!menuOpen);
                    
                    if (menuOpen) {
                        // Clear all active keys in the game to stop movement
                        activeKeys.forEach(key => {
                            mainWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
                        });
                        activeKeys.clear();

                        overlayWindow.show();
                        overlayWindow.focus();
                    } else {
                        mainWindow.focus();
                    }
                }
            }
            event.preventDefault(); // Stop the game from seeing the Right Shift key
            return;
        }

        // Forward keys to HUD
        if (input.type === 'keyDown' || input.type === 'keyUp') {
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.webContents.send('key-event', {
                    key: input.key,
                    code: input.code,
                    type: input.type === 'keyDown' ? 'down' : 'up'
                });
            }
        }
    });

    // CPS Sync (NO INJECTION)
    mainWindow.webContents.on('input-event', (event, input) => {
        if (input.type === 'mouseDown') {
            let button = 0;
            if (input.button === 'left') button = 0;
            if (input.button === 'right') button = 2;
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.webContents.send('click-event', { button });
            }
        }
    });

    const template = [
        {
            label: 'Perception',
            submenu: [
                { label: 'Reload Game', accelerator: 'F5', click: () => { mainWindow.reload(); } },
                { 
                    label: 'Clean Engine RAM', 
                    accelerator: 'CmdOrCtrl+R', 
                    click: () => { 
                        mainWindow.webContents.executeJavaScript('window.gc && window.gc();');
                        session.defaultSession.clearCache();
                        console.log("Perception Engine: RAM & Cache Purged.");
                    } 
                },
                { type: 'separator' },
                { label: 'Quit Perception', accelerator: 'CmdOrCtrl+Q', click: () => { app.exit(0); } }
            ]
        },
        {
            label: 'View',
            submenu: [
                { label: 'Toggle Full Screen', accelerator: 'F11', click: () => { mainWindow.setFullScreen(!mainWindow.isFullScreen()); } },
                { label: 'Exit Full Screen', accelerator: 'Esc', click: () => { mainWindow.setFullScreen(false); } }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    mainWindow.setAutoHideMenuBar(true);
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadURL('https://bloxd.io');

    mainWindow.webContents.on('did-finish-load', () => {
        applyKernelOptimizations(mainWindow, 'GAME');
        mainWindow.webContents.executeJavaScript(`
            // --- Ultra-Aggressive DOM Nuker (100x Effectiveness) ---
            const nukeAds = () => {
                const adSelectors = [
                    '[id*="adinplay"]', '[class*="adinplay"]', 
                    'iframe[src*="adinplay"]', '.ad-unit', 
                    '#ad-container', '.preroll-ad',
                    '#banner-container', '.banner-ad',
                    '[id*="google_ads"]', 'ins.adsbygoogle',
                    '.video-ad-container', '#video-ad'
                ];
                adSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.display = 'none';
                        el.innerHTML = '';
                        el.remove();
                    });
                });
                
                // Nuke any element with "adinplay" text in it
                const allElements = document.getElementsByTagName("*");
                for (let i = 0; i < allElements.length; i++) {
                    if (allElements[i].innerText && allElements[i].innerText.toLowerCase().includes("adinplay")) {
                        allElements[i].remove();
                    }
                }
            };
            setInterval(nukeAds, 500); // Faster sweep (0.5s)

            // --- Focus Protection ---
            window.addEventListener('blur', (e) => {
                e.stopImmediatePropagation();
            }, true);
            
            Object.defineProperty(document, 'hidden', { value: false, writable: false });
            Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
        `).catch(err => console.error("Perception Engine: Failed to inject anti-ad/focus scripts."));
    });

    mainWindow.once('ready-to-show', () => {
        // Wait for the minimal splash animation to complete (approx 3s)
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.destroy(); // Hard destroy to free up RAM immediately
                splashWindow = null;
            }
            if (mainWindow && !mainWindow.isVisible()) {
                mainWindow.show();
                mainWindow.maximize();
                
                // Initialize HUD
                createOverlayWindow();
                startPingLoop();
                startFpsLoop();
                startRamMonitorLoop();

                // Final focus push to ensure the app is selected by default
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.focus();
                        console.log("Perception Engine: Main Window Focused.");
                    }
                }, 500);
            }
        }, 3000); 
    });

    // Set High Process Priority
    try {
        process.setPriority(os.constants.priority.PRIORITY_HIGH);
        console.log("Perception Engine: Process Priority set to HIGH.");
    } catch (e) {
        console.error("Perception Engine: Failed to set High Priority.");
    }

    mainWindow.on('closed', () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.close();
        }
        mainWindow = null;
        app.exit(0); 
    });

    // Handle menu closure from the overlay itself
    ipcMain.on('close-menu', () => {
        if (menuOpen) {
            menuOpen = false;
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.webContents.send('toggle-menu');
                overlayWindow.setIgnoreMouseEvents(true);
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                // Clear any keys that might have been held when closing
                activeKeys.forEach(key => {
                    mainWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
                });
                activeKeys.clear();
                
                mainWindow.focus();
            }
        }
    });
}

// Ensure app closes when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('ready', () => {
    setupAdBlocker();
    createSplashWindow();
    createMainWindow();

    // Force-quit shortcuts
    globalShortcut.register('CommandOrControl+Q', () => { app.exit(0); });
    globalShortcut.register('Escape', () => {
        if (mainWindow && mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        }
    });
    globalShortcut.register('Alt+F4', () => { app.exit(0); });
});


app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

