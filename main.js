const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
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
	console.log("Running without sandbox (ELECTRON_DISABLE_SANDBOX=1)");
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

	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

function createWindow() {
	const iconPath = getIconPath();

	// Get preload script path - __dirname works in both dev and packaged modes
	const preloadPath = path.join(__dirname, 'preload.js');
	
	// Verify preload file exists
	if (!fs.existsSync(preloadPath)) {
		console.error(`Preload script not found at: ${preloadPath}`);
	}
	
	mainWindow = new BrowserWindow({
		width: 600,
		height: 1000,
		icon: iconPath,
		show: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: preloadPath,
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
		
		// Open DevTools in development, or allow toggling with F12
		if (!app.isPackaged) {
			mainWindow.webContents.openDevTools();
		}
	});
	
	// Toggle DevTools with F12 (works in both dev and production)
	mainWindow.webContents.on('before-input-event', (event, input) => {
		if (input.key === 'F12' || (input.key === 'I' && input.control && input.shift)) {
			mainWindow.webContents.toggleDevTools();
		}
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
			callback(true);
		} else {
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


	// Forward console messages from renderer (errors and warnings only)
	mainWindow.webContents.on(
		"console-message",
		(event, level, message, line, sourceId) => {
			// Only log warnings and errors, not info messages
			if (level >= 1) {
				const levelMap = { 1: "WARN", 2: "ERROR" };
				const prefix = levelMap[level] || "LOG";
				console.log(`[${prefix}] ${message}`);
			}
		},
	);

	// Log any errors
	mainWindow.webContents.on(
		"did-fail-load",
		(event, errorCode, errorDescription) => {
			console.error("Failed to load:", errorCode, errorDescription);
		},
	);

	// Check media devices on load
	mainWindow.webContents.on("did-finish-load", async () => {
		// Inject media device check
		try {
			const devices = await mainWindow.webContents.executeJavaScript(`
				navigator.mediaDevices.enumerateDevices()
					.then(devices => devices.filter(d => d.kind === 'audioinput'))
					.then(mics => ({ count: mics.length, devices: mics.map(m => m.label || 'Unnamed') }))
					.catch(err => ({ error: err.message }))
			`);

			if (devices.error) {
				console.error("Media device error:", devices.error);
			}
		} catch (error) {
			console.error("Could not check media devices:", error);
		}

	});

	// Handle navigation
	mainWindow.webContents.on("will-navigate", (event, url) => {
		// Only allow navigation to external links, not navigation away from app
		if (!url.startsWith("file://")) {
			event.preventDefault();
		}
	});
	
	// Intercept download attempts to prevent audio blob downloads
	mainWindow.webContents.session.on("will-download", (event, item, webContents) => {
		const url = item.getURL();
		const filename = item.getFilename();
		
		// If it's a blob URL for audio, cancel it
		if (url.startsWith("blob:") && (filename.endsWith('.webm') || filename.endsWith('.wav') || filename.endsWith('.mp3') || filename.endsWith('.ogg'))) {
			item.cancel();
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

// Recording handlers
async function handleSaveRecording(data) {
	try {
		const { filename, data: base64Data, mimeType } = data;
		
		// Convert base64 to buffer
		const buffer = Buffer.from(base64Data, 'base64');
		
		// Get app's user data directory (similar to mobile's external files directory)
		const userDataPath = app.getPath('userData');
		const recordingsDir = path.join(userDataPath, 'CallRecordings');
		
		// Create CallRecordings directory if it doesn't exist
		if (!fs.existsSync(recordingsDir)) {
			fs.mkdirSync(recordingsDir, { recursive: true });
		}
		
		const filePath = path.join(recordingsDir, filename);
		
		// Save file
		fs.writeFileSync(filePath, buffer);
		
		
		return { success: true, filePath: filePath };
	} catch (error) {
		console.error("Save recording error:", error);
		throw error;
	}
}

async function handlePlayRecording(filename) {
	try {
		// Handle both string and object formats
		const actualFilename = typeof filename === 'string' ? filename : filename.filename;
		
		// Get app's user data directory (CallRecordings folder)
		const userDataPath = app.getPath('userData');
		const recordingsDir = path.join(userDataPath, 'CallRecordings');
		const filePath = path.join(recordingsDir, actualFilename);
		
		// Check if file exists
		if (!fs.existsSync(filePath)) {
			throw new Error(`Recording file not found: ${actualFilename}`);
		}
		
		// Open file with default application
		await shell.openPath(filePath);
		
		
		return { success: true, filePath: filePath };
	} catch (error) {
		console.error("Play recording error:", error);
		throw error;
	}
}

async function handleDeleteRecordingFile(filename) {
	try {
		// Get app's user data directory (CallRecordings folder)
		const userDataPath = app.getPath('userData');
		const recordingsDir = path.join(userDataPath, 'CallRecordings');
		const filePath = path.join(recordingsDir, filename);
		
		// Check if file exists
		if (!fs.existsSync(filePath)) {
			return { success: true, filePath: filePath, message: 'File not found (already deleted)' };
		}
		
		// Delete file
		fs.unlinkSync(filePath);
		
		
		return { success: true, filePath: filePath };
	} catch (error) {
		console.error("Delete recording error:", error);
		throw error;
	}
}

// Register IPC handlers using ipcMain.handle for contextBridge
ipcMain.handle('save-recording', async (event, data) => {
	try {
		const result = await handleSaveRecording(data);
		return result;
	} catch (error) {
		throw error;
	}
});

ipcMain.handle('play-recording', async (event, filename) => {
	try {
		const result = await handlePlayRecording(filename);
		return result;
	} catch (error) {
		throw error;
	}
});

ipcMain.handle('get-recording-file-url', async (event, filename) => {
	try {
		// Get app's user data directory (CallRecordings folder)
		const userDataPath = app.getPath('userData');
		const recordingsDir = path.join(userDataPath, 'CallRecordings');
		const filePath = path.join(recordingsDir, filename);
		
		// Check if file exists
		if (!fs.existsSync(filePath)) {
			throw new Error(`Recording file not found: ${filename}`);
		}
		
		// Read file and convert to base64 for blob URL
		const fileBuffer = fs.readFileSync(filePath);
		const base64 = fileBuffer.toString('base64');
		
		// Determine MIME type from extension
		const ext = path.extname(filename).toLowerCase();
		let mimeType = 'audio/webm'; // default
		if (ext === '.webm') mimeType = 'audio/webm';
		else if (ext === '.ogg') mimeType = 'audio/ogg';
		else if (ext === '.m4a') mimeType = 'audio/mp4';
		else if (ext === '.wav') mimeType = 'audio/wav';
		
		// Return data URL that can be used as blob
		const dataUrl = `data:${mimeType};base64,${base64}`;
		
		return { success: true, url: dataUrl, filePath: filePath };
	} catch (error) {
		console.error("Get recording file URL error:", error);
		throw error;
	}
});

ipcMain.handle('get-downloads-path', async (event) => {
	try {
		// Return app's CallRecordings directory path (not Downloads)
		const userDataPath = app.getPath('userData');
		const recordingsDir = path.join(userDataPath, 'CallRecordings');
		return recordingsDir;
	} catch (error) {
		console.error("Get recordings path error:", error);
		throw error;
	}
});

ipcMain.handle('delete-recording-file', async (event, filename) => {
	try {
		const result = await handleDeleteRecordingFile(filename);
		return result;
	} catch (error) {
		throw error;
	}
});
