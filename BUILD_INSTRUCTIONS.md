# Building and Loading the Chrome Extension

This guide explains how to generate a production build of the Chrome extension and load it into Chrome for testing.

## Prerequisites

- Node.js installed (v18 or higher recommended)
- npm or yarn package manager
- Google Chrome browser

## Step 1: Install Dependencies

If you haven't already, install all project dependencies:

```bash
npm install
```

## Step 2: Generate the Production Build

Run the build command to create a production-ready extension:

```bash
npm run build
```

This command will:
1. Build the extension using Plasmo framework
2. Create optimized production files
3. Fix manifest permissions automatically
4. Output the build to `build/chrome-mv3-prod-prod/` directory

**Note:** The build process may take a few minutes. You'll see progress in the terminal.

## Step 3: Load the Extension in Chrome

1. **Open Chrome Extensions Page:**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or go to: Menu (three dots) → Extensions → Manage Extensions

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top-right corner of the extensions page

3. **Load the Extension:**
   - Click the "Load unpacked" button
   - Navigate to your project directory: `/Users/plugoemployee/ChromExt`
   - Select the build folder: `build/chrome-mv3-prod-prod`
   - Click "Select Folder" (or "Open" on macOS)

4. **Verify Installation:**
   - The extension should appear in your extensions list
   - You should see the extension icon in Chrome's toolbar
   - Check for any error messages in red

## Step 4: Test the Extension

1. **Open WhatsApp Web:**
   - Navigate to `https://web.whatsapp.com` in Chrome
   - Log in to your WhatsApp account

2. **Open the Side Panel:**
   - Click the extension icon in Chrome's toolbar
   - The side panel should open with your app

3. **Check Console Logs:**
   - **Background Script Logs:** Click "Service Worker" link next to the extension in `chrome://extensions/`
   - **Content Script Logs:** Open DevTools on the WhatsApp Web page (F12 or Cmd+Option+I)
   - **Side Panel Logs:** Open DevTools on the side panel (right-click side panel → Inspect)

## Troubleshooting

### Build Errors

If you encounter build errors:

1. **Clear build directory:**
   ```bash
   rm -rf build
   npm run build
   ```

2. **Check for TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Extension Not Loading

- **Check manifest errors:** Look for red error messages in `chrome://extensions/`
- **Verify permissions:** The manifest should include required permissions
- **Check console:** Open the Service Worker console for background script errors

### Console Logs Not Appearing

- **Verify debug server:** Make sure the debug server is running at `http://127.0.0.1:7246`
- **Check network:** Ensure the extension can make requests to localhost
- **Check browser console:** Logs are also sent to the browser console

## Development vs Production

- **Development Build:** Use `npm run dev` for development (auto-reloads on changes)
- **Production Build:** Use `npm run build` for testing the final extension

## Updating the Extension

After making changes:

1. Run `npm run build` again
2. Go to `chrome://extensions/`
3. Click the refresh icon (🔄) on your extension card
4. Test the changes

## Packaging for Distribution

To create a `.zip` file for Chrome Web Store submission:

```bash
npm run package
```

This creates a packaged extension in the `build` directory.

---

**Note:** Console logs are automatically captured and sent to the debug endpoint at `http://127.0.0.1:7246/ingest/c4dca2cc-238f-43ad-af27-831a7b92127a` when the extension is running in Chrome.

