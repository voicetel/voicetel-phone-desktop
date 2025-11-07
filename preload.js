const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
	saveRecording: async (data) => {
		try {
			return await ipcRenderer.invoke("save-recording", data);
		} catch (error) {
			console.error("Save recording error:", error);
			throw error;
		}
	},
	playRecording: async (filename) => {
		try {
			return await ipcRenderer.invoke("play-recording", filename);
		} catch (error) {
			console.error("Play recording error:", error);
			throw error;
		}
	},
	getRecordingFileUrl: async (filename) => {
		try {
			return await ipcRenderer.invoke("get-recording-file-url", filename);
		} catch (error) {
			console.error("Get recording file URL error:", error);
			throw error;
		}
	},
	getDownloadsPath: async () => {
		try {
			return await ipcRenderer.invoke("get-downloads-path");
		} catch (error) {
			console.error("Get downloads path error:", error);
			throw error;
		}
	},
	deleteRecordingFile: async (filename) => {
		try {
			return await ipcRenderer.invoke("delete-recording-file", filename);
		} catch (error) {
			console.error("Delete recording file error:", error);
			throw error;
		}
	},
	openExternal: async (url) => {
		try {
			return await ipcRenderer.invoke("open-external", url);
		} catch (error) {
			console.error("Open external URL error:", error);
			throw error;
		}
	},
	openOAuthWindow: async (authUrl) => {
		try {
			return await ipcRenderer.invoke("open-oauth-window", authUrl);
		} catch (error) {
			console.error("OAuth window error:", error);
			throw error;
		}
	},
});
