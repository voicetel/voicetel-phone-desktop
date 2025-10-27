const { app, BrowserWindow } = require("electron");
const path = require("path");
const packageJson = require("./package.json");

// App version and configuration from package.json
const APP_VERSION = packageJson.version;
const SIP_DOMAIN = packageJson.config?.sipDomain || "tls.voicetel.com";
const SIP_SERVER = packageJson.config?.sipServer || "wss://tls.voicetel.com:443";

let mainWindow;

// Apply flags BEFORE app is ready - must be at the top
// These are critical for WebRTC and media access
app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");
app.commandLine.appendSwitch("auto-select-desktop-capture-source", "VoiceTel");

// Disable sandbox only if absolutely necessary for media access
// Remove these if you have proper permissions configured
if (process.env.ELECTRON_DISABLE_SANDBOX === "1") {
	console.log("⚠️  Running without sandbox (ELECTRON_DISABLE_SANDBOX=1)");
	app.commandLine.appendSwitch("no-sandbox");
	app.commandLine.appendSwitch("disable-setuid-sandbox");
}

// Platform-specific settings
if (process.platform === "linux") {
	// GPU can cause issues on some Linux systems
	app.commandLine.appendSwitch("disable-gpu");
	app.commandLine.appendSwitch("disable-dev-shm-usage");
}

// Register before app is ready
app.whenReady().then(() => {
	console.log("Electron app ready, creating window...");
	console.log("App version:", APP_VERSION);
	console.log("SIP Domain:", SIP_DOMAIN);
	console.log("SIP Server:", SIP_SERVER);
	console.log("Electron version:", process.versions.electron);
	console.log("Chrome version:", process.versions.chrome);

	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

function createWindow() {
	const iconPath = getIconPath();

	mainWindow = new BrowserWindow({
		width: 600,
		height: 1000,
		icon: iconPath,
		show: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			// Enable web security but allow media access
			webSecurity: true,
			allowRunningInsecureContent: false,
			// Persistent partition for stable storage
			partition: "persist:voicetel",
			// Media flags
			enableRemoteModule: false,
			backgroundThrottling: false,
			// Additional security
			sandbox: process.env.ELECTRON_DISABLE_SANDBOX !== "1",
		},
		autoHideMenuBar: true,
		menuBarVisible: false,
	});

	mainWindow.setMenu(null);

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		console.log("✓ Window shown");
	});

	// Load file directly for stable origin
	const indexPath = path.join(__dirname, "index.html");
	
	// Inject configuration into the page before loading
	mainWindow.webContents.once('dom-ready', () => {
		mainWindow.webContents.executeJavaScript(`
			window.VOICETEL_VERSION = "${APP_VERSION}";
			window.VOICETEL_SIP_DOMAIN = "${SIP_DOMAIN}";
			window.VOICETEL_SIP_SERVER = "${SIP_SERVER}";
		`);
	});
	
	mainWindow.loadFile(indexPath);

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	const session = mainWindow.webContents.session;

	// Set user agent
	const currentUA = session.getUserAgent();
	session.setUserAgent(currentUA + ` VoiceTel/${APP_VERSION}`);

	// Auto-grant media permissions - critical for WebRTC
	session.setPermissionRequestHandler((webContents, permission, callback) => {
		console.log(`Permission requested: ${permission}`);
		const allowedPermissions = [
			"media",
			"mediaKeySystem",
			"geolocation",
			"notifications",
			"midiSysex",
			"pointerLock",
			"fullscreen",
			"openExternal",
			"microphone",
			"camera",
		];

		if (allowedPermissions.includes(permission)) {
			console.log(`✓ Granted: ${permission}`);
			callback(true);
		} else {
			console.log(`✗ Denied: ${permission}`);
			callback(false);
		}
	});

	// Override permission check to always allow media
	session.setPermissionCheckHandler(
		(webContents, permission, requestingOrigin, details) => {
			if (permission === "media" || permission === "microphone") {
				return true;
			}
			return true; // Allow all for local file
		},
	);

	// Log storage path for debugging
	const storagePath = session.getStoragePath();
	console.log("📁 Session storage path:", storagePath);
	console.log("📄 Loading file:", indexPath);
	console.log("🖼️  Icon path:", iconPath);

	// Enhanced console logging
	mainWindow.webContents.on(
		"console-message",
		(event, level, message, line, sourceId) => {
			const levelMap = { 0: "INFO", 1: "WARN", 2: "ERROR" };
			const prefix = levelMap[level] || "LOG";
			console.log(`[${prefix}] ${message}`);
		},
	);

	// Log any errors
	mainWindow.webContents.on(
		"did-fail-load",
		(event, errorCode, errorDescription) => {
			console.error("❌ Failed to load:", errorCode, errorDescription);
		},
	);

	// Check media devices on load
	mainWindow.webContents.on("did-finish-load", async () => {
		console.log("✓ Page loaded successfully");

		// Inject media device check
		try {
			const devices = await mainWindow.webContents.executeJavaScript(`
				navigator.mediaDevices.enumerateDevices()
					.then(devices => devices.filter(d => d.kind === 'audioinput'))
					.then(mics => ({ count: mics.length, devices: mics.map(m => m.label || 'Unnamed') }))
					.catch(err => ({ error: err.message }))
			`);

			if (devices.error) {
				console.error("❌ Media device error:", devices.error);
			} else {
				console.log(
					`🎤 Found ${devices.count} microphone(s):`,
					devices.devices,
				);
			}
		} catch (error) {
			console.error("❌ Could not check media devices:", error);
		}
	});

	// Handle navigation
	mainWindow.webContents.on("will-navigate", (event, url) => {
		// Only allow navigation to external links, not navigation away from app
		if (!url.startsWith("file://")) {
			event.preventDefault();
			console.log("Blocked navigation to:", url);
		}
	});
}

function getIconPath() {
	if (app.isPackaged) {
		if (process.platform === "win32") {
			return path.join(process.resourcesPath, "icon.ico");
		} else if (process.platform === "darwin") {
			return path.join(process.resourcesPath, "icon.icns");
		} else {
			return path.join(process.resourcesPath, "icon.png");
		}
	} else {
		if (process.platform === "win32") {
			return path.join(__dirname, "build", "icon.ico");
		} else if (process.platform === "darwin") {
			return path.join(__dirname, "build", "icon.icns");
		} else {
			return path.join(__dirname, "build", "icon.png");
		}
	}
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("quit", () => {
	console.log("👋 App quitting...");
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled rejection at:", promise, "reason:", reason);
});
