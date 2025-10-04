const { app, BrowserWindow } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

let mainWindow;
let server;

// Disable GPU acceleration and sandbox on Linux to avoid permission issues
if (process.platform === "linux") {
	app.disableHardwareAcceleration();
	app.commandLine.appendSwitch("no-sandbox");
	app.commandLine.appendSwitch("disable-dev-shm-usage");
	app.commandLine.appendSwitch("disable-setuid-sandbox");
}

// Simple HTTP server to serve the HTML file
function createServer() {
	server = http.createServer((req, res) => {
		const filePath = path.join(__dirname, "index.html");

		fs.readFile(filePath, (err, data) => {
			if (err) {
				console.error("Error loading file:", err);
				res.writeHead(500);
				res.end("Error loading file");
				return;
			}

			res.writeHead(200, {
				"Content-Type": "text/html",
				"Cache-Control": "no-cache",
			});
			res.end(data);
		});
	});

	server.listen(0, "127.0.0.1", () => {
		const port = server.address().port;
		console.log(`Server running at http://127.0.0.1:${port}`);
		createWindow(port);
	});
}

function createWindow(port) {
	// Determine icon path based on platform and environment
	const iconPath = getIconPath();

	mainWindow = new BrowserWindow({
		width: 600,
		height: 1000,
		icon: iconPath,
		show: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true,
			allowRunningInsecureContent: false,
			partition: "persist:voicetel",
			offscreen: false,
		},
		autoHideMenuBar: true,
		menuBarVisible: false,
	});

	mainWindow.setMenu(null);

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		console.log("Window shown");
	});

	mainWindow.loadURL(`http://127.0.0.1:${port}`);

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	const session = mainWindow.webContents.session;
	session.setUserAgent(session.getUserAgent() + " VoiceTelPhone/1.0");

	session.setPermissionRequestHandler((webContents, permission, callback) => {
		const allowedPermissions = ["media", "notifications", "microphone"];
		if (allowedPermissions.includes(permission)) {
			callback(true);
		} else {
			callback(false);
		}
	});

	console.log("Loading URL:", `http://127.0.0.1:${port}`);
	console.log("Icon path:", iconPath);
}

// Get appropriate icon path based on environment and platform
function getIconPath() {
	// In production (packaged app)
	if (app.isPackaged) {
		// electron-builder handles icon paths automatically
		// but we can still specify them for the window
		if (process.platform === "win32") {
			return path.join(process.resourcesPath, "icon.ico");
		} else if (process.platform === "darwin") {
			return path.join(process.resourcesPath, "icon.icns");
		} else {
			return path.join(process.resourcesPath, "icon.png");
		}
	} else {
		// In development
		if (process.platform === "win32") {
			return path.join(__dirname, "build", "icon.ico");
		} else if (process.platform === "darwin") {
			return path.join(__dirname, "build", "icon.icns");
		} else {
			return path.join(__dirname, "build", "icon.png");
		}
	}
}

app.whenReady().then(() => {
	console.log("Electron app ready, starting server...");
	createServer();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createServer();
		}
	});
});

app.on("window-all-closed", () => {
	if (server) {
		server.close();
	}
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("quit", () => {
	if (server) {
		server.close();
	}
});
