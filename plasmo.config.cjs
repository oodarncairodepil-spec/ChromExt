/** @type {import('plasmo').PlasmoConfig} */
module.exports = {
  manifest: {
    manifest_version: 3,
    name: "QuickOrder Tab",
    version: "0.0.7",
    description: "A Chrome MV3 extension with side panel React app",
    permissions: ["sidePanel", "activeTab", "tabs", "scripting", "storage", "clipboardRead", "clipboardWrite"],
    host_permissions: ["https://*/*", "https://web.whatsapp.com/*", "http://localhost:*/*"],
    side_panel: {
      default_path: "src/sidepanel/index.html"
    }
  }
}
