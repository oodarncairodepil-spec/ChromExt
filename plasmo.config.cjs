/** @type {import('plasmo').PlasmoConfig} */
module.exports = {
  manifest: {
    manifest_version: 3,
    name: "Chrome Side Panel Extension",
    version: "0.0.1",
    description: "A Chrome MV3 extension with side panel React app",
    permissions: [
      "sidePanel",
      "activeTab"
    ],
    host_permissions: [
      "https://*/*"
    ],
    action: {
      default_title: "Open Side Panel"
    },
    side_panel: {
      default_path: "src/sidepanel/index.html"
    }
  }
}