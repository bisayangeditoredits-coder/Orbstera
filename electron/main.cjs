'use strict';

const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

/** @returns {string} */
function getLoadUrl() {
  const fromEnv = process.env.ORBSTERA_LOAD_URL?.trim();
  if (fromEnv) return fromEnv;
  const genPath = path.join(__dirname, 'generated', 'load-url.json');
  try {
    if (fs.existsSync(genPath)) {
      const j = JSON.parse(fs.readFileSync(genPath, 'utf8'));
      if (j.loadUrl && typeof j.loadUrl === 'string') return j.loadUrl.trim();
    }
  } catch {
    /* ignore malformed */
  }
  return 'http://127.0.0.1:3000';
}

/**
 * Hostnames that may open as additional BrowserWindows (e.g. in-app same-origin preview).
 * Popups to any other https host are sent to the system browser.
 */
function allowedAppHosts(baseUrl) {
  const hosts = new Set(['localhost', '127.0.0.1']);
  try {
    const u = new URL(baseUrl);
    if (u.hostname) hosts.add(u.hostname);
  } catch {
    /* ignore */
  }
  return hosts;
}

let mainWindow = null;
let splashWindow = null;
let reconnectTimer = null;

function destroySplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    show: true,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

const ORBSTERA_SECURITY = Symbol('orbsteraSecurityAttached');

function attachSecurityHandlers(win, appHosts) {
  if (win[ORBSTERA_SECURITY]) return;
  win[ORBSTERA_SECURITY] = true;

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { action: 'deny' };
      }
      if (appHosts.has(u.hostname)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
              preload: path.join(__dirname, 'preload.cjs'),
            },
          },
        };
      }
      void shell.openExternal(url);
      return { action: 'deny' };
    } catch {
      return { action: 'deny' };
    }
  });

  // Block dangerous top-level schemes; allow https navigations (OAuth flows need Google / IdP hosts).
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'file:' || u.protocol === 'javascript:' || u.protocol === 'data:') {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  win.webContents.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = new Set(['notifications', 'media', 'display-capture', 'clipboard-read', 'clipboard-sanitized-write']);
    callback(allowed.has(permission));
  });
}

function createMainWindow() {
  const loadUrl = getLoadUrl();
  const appHosts = allowedAppHosts(loadUrl);
  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0A0A0A',
    title: 'Orbstera',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath,
    },
  });

  attachSecurityHandlers(mainWindow, appHosts);

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    attachSecurityHandlers(childWindow, appHosts);
  });

  let splashHidden = false;
  const finishSplash = () => {
    if (splashHidden) return;
    splashHidden = true;
    destroySplash();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  };

  mainWindow.once('ready-to-show', finishSplash);

  const splashTimeout = setTimeout(finishSplash, 14_000);

  mainWindow.webContents.once('did-finish-load', () => {
    clearTimeout(splashTimeout);
    finishSplash();
  });

  mainWindow.webContents.once('did-fail-load', (_event, errorCode) => {
    if (errorCode === -3 /* ABORTED */) return;
    clearTimeout(splashTimeout);
    finishSplash();
  });

  mainWindow.loadURL(loadUrl).catch(() => {
    clearTimeout(splashTimeout);
    finishSplash();
  });
}

function scheduleReconnectReload() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const u = mainWindow.webContents.getURL();
      if (u && /^https?:/i.test(u)) {
        mainWindow.webContents.reload();
      }
    } catch {
      /* ignore */
    }
  }, 2500);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('online', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    scheduleReconnectReload();
  });

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createSplash();
    createMainWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplash();
      createMainWindow();
    }
  });
}
