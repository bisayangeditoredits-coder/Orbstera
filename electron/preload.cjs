'use strict';

const { contextBridge } = require('electron');

/**
 * Minimal, read-only surface for the hosted web app (optional feature detection).
 * Keep this API tiny — everything else stays on the cloud app.
 */
contextBridge.exposeInMainWorld('orbsteraDesktop', {
  isDesktopApp: true,
  platform: process.platform,
});
