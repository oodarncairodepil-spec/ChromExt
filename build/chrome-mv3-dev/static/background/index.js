(function(define){var __define; typeof define === "function" && (__define=define,define=null);
// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        this
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"b9XeE":[function(require,module,exports) {
var u = globalThis.process?.argv || [];
var h = ()=>globalThis.process?.env || {};
var B = new Set(u), _ = (e)=>B.has(e), G = u.filter((e)=>e.startsWith("--") && e.includes("=")).map((e)=>e.split("=")).reduce((e, [t, o])=>(e[t] = o, e), {});
var U = _("--dry-run"), g = ()=>_("--verbose") || h().VERBOSE === "true", N = g();
var m = (e = "", ...t)=>console.log(e.padEnd(9), "|", ...t);
var y = (...e)=>console.error("\uD83D\uDD34 ERROR".padEnd(9), "|", ...e), v = (...e)=>m("\uD83D\uDD35 INFO", ...e), f = (...e)=>m("\uD83D\uDFE0 WARN", ...e), M = 0, i = (...e)=>g() && m(`\u{1F7E1} ${M++}`, ...e);
var b = ()=>{
    let e = globalThis.browser?.runtime || globalThis.chrome?.runtime, t = ()=>setInterval(e.getPlatformInfo, 24e3);
    e.onStartup.addListener(t), t();
};
var n = {
    "isContentScript": false,
    "isBackground": true,
    "isReact": false,
    "runtimes": [
        "background-service-runtime"
    ],
    "host": "localhost",
    "port": 1815,
    "entryFilePath": "/Users/plugoemployee/ChromExt/.plasmo/static/background/index.ts",
    "bundleId": "c338908e704c91f1",
    "envHash": "d99a5ffa57acd638",
    "verbose": "false",
    "secure": false,
    "serverPort": 51818
};
module.bundle.HMR_BUNDLE_ID = n.bundleId;
globalThis.process = {
    argv: [],
    env: {
        VERBOSE: n.verbose
    }
};
var D = module.bundle.Module;
function H(e) {
    D.call(this, e), this.hot = {
        data: module.bundle.hotData[e],
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept: function(t) {
            this._acceptCallbacks.push(t || function() {});
        },
        dispose: function(t) {
            this._disposeCallbacks.push(t);
        }
    }, module.bundle.hotData[e] = void 0;
}
module.bundle.Module = H;
module.bundle.hotData = {};
var c = globalThis.browser || globalThis.chrome || null;
function R() {
    return !n.host || n.host === "0.0.0.0" ? location.protocol.indexOf("http") === 0 ? location.hostname : "localhost" : n.host;
}
function x() {
    return !n.host || n.host === "0.0.0.0" ? "localhost" : n.host;
}
function d() {
    return n.port || location.port;
}
var P = "__plasmo_runtime_page_", S = "__plasmo_runtime_script_";
var O = `${n.secure ? "https" : "http"}://${R()}:${d()}/`;
async function k(e = 1470) {
    for(;;)try {
        await fetch(O);
        break;
    } catch  {
        await new Promise((o)=>setTimeout(o, e));
    }
}
if (c.runtime.getManifest().manifest_version === 3) {
    let e = c.runtime.getURL("/__plasmo_hmr_proxy__?url=");
    globalThis.addEventListener("fetch", function(t) {
        let o = t.request.url;
        if (o.startsWith(e)) {
            let s = new URL(decodeURIComponent(o.slice(e.length)));
            s.hostname === n.host && s.port === `${n.port}` ? (s.searchParams.set("t", Date.now().toString()), t.respondWith(fetch(s).then((r)=>new Response(r.body, {
                    headers: {
                        "Content-Type": r.headers.get("Content-Type") ?? "text/javascript"
                    }
                })))) : t.respondWith(new Response("Plasmo HMR", {
                status: 200,
                statusText: "Testing"
            }));
        }
    });
}
function E(e, t) {
    let { modules: o } = e;
    return o ? !!o[t] : !1;
}
function C(e = d()) {
    let t = x();
    return `${n.secure || location.protocol === "https:" && !/localhost|127.0.0.1|0.0.0.0/.test(t) ? "wss" : "ws"}://${t}:${e}/`;
}
function L(e) {
    typeof e.message == "string" && y("[plasmo/parcel-runtime]: " + e.message);
}
function T(e) {
    if (typeof globalThis.WebSocket > "u") return;
    let t = new WebSocket(C(Number(d()) + 1));
    return t.addEventListener("message", async function(o) {
        let s = JSON.parse(o.data);
        await e(s);
    }), t.addEventListener("error", L), t;
}
function A(e) {
    if (typeof globalThis.WebSocket > "u") return;
    let t = new WebSocket(C());
    return t.addEventListener("message", async function(o) {
        let s = JSON.parse(o.data);
        if (s.type === "update" && await e(s.assets), s.type === "error") for (let r of s.diagnostics.ansi){
            let l = r.codeframe || r.stack;
            f("[plasmo/parcel-runtime]: " + r.message + `
` + l + `

` + r.hints.join(`
`));
        }
    }), t.addEventListener("error", L), t.addEventListener("open", ()=>{
        v(`[plasmo/parcel-runtime]: Connected to HMR server for ${n.entryFilePath}`);
    }), t.addEventListener("close", ()=>{
        f(`[plasmo/parcel-runtime]: Connection to the HMR server is closed for ${n.entryFilePath}`);
    }), t;
}
var w = module.bundle.parent, a = {
    buildReady: !1,
    bgChanged: !1,
    csChanged: !1,
    pageChanged: !1,
    scriptPorts: new Set,
    pagePorts: new Set
};
async function p(e = !1) {
    if (e || a.buildReady && a.pageChanged) {
        i("BGSW Runtime - reloading Page");
        for (let t of a.pagePorts)t.postMessage(null);
    }
    if (e || a.buildReady && (a.bgChanged || a.csChanged)) {
        i("BGSW Runtime - reloading CS");
        let t = await c?.tabs.query({
            active: !0
        });
        for (let o of a.scriptPorts){
            let s = t.some((r)=>r.id === o.sender.tab?.id);
            o.postMessage({
                __plasmo_cs_active_tab__: s
            });
        }
        c.runtime.reload();
    }
}
if (!w || !w.isParcelRequire) {
    b();
    let e = A(async (t)=>{
        i("BGSW Runtime - On HMR Update"), a.bgChanged ||= t.filter((s)=>s.envHash === n.envHash).some((s)=>E(module.bundle, s.id));
        let o = t.find((s)=>s.type === "json");
        if (o) {
            let s = new Set(t.map((l)=>l.id)), r = Object.values(o.depsByBundle).map((l)=>Object.values(l)).flat();
            a.bgChanged ||= r.every((l)=>s.has(l));
        }
        p();
    });
    e.addEventListener("open", ()=>{
        let t = setInterval(()=>e.send("ping"), 24e3);
        e.addEventListener("close", ()=>clearInterval(t));
    }), e.addEventListener("close", async ()=>{
        await k(), p(!0);
    });
}
T(async (e)=>{
    switch(i("BGSW Runtime - On Build Repackaged"), e.type){
        case "build_ready":
            a.buildReady ||= !0, p();
            break;
        case "cs_changed":
            a.csChanged ||= !0, p();
            break;
    }
});
c.runtime.onConnect.addListener(function(e) {
    let t = e.name.startsWith(P), o = e.name.startsWith(S);
    if (t || o) {
        let s = t ? a.pagePorts : a.scriptPorts;
        s.add(e), e.onDisconnect.addListener(()=>{
            s.delete(e);
        }), e.onMessage.addListener(function(r) {
            i("BGSW Runtime - On source changed", r), r.__plasmo_cs_changed__ && (a.csChanged ||= !0), r.__plasmo_page_changed__ && (a.pageChanged ||= !0), p();
        });
    }
});
c.runtime.onMessage.addListener(function(t) {
    return t.__plasmo_full_reload__ && (i("BGSW Runtime - On top-level code changed"), p()), !0;
});

},{}],"8oeFb":[function(require,module,exports) {
var _background = require("../../../src/background");

},{"../../../src/background":"kimL1"}],"kimL1":[function(require,module,exports) {
chrome.action.onClicked.addListener(async (tab)=>{
    try {
        // Set the side panel options
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: "src/sidepanel/index.html",
            enabled: true
        });
        // Open the side panel
        await chrome.sidePanel.open({
            tabId: tab.id
        });
    } catch (error) {
        console.error("Failed to open side panel:", error);
    }
});
// Enable side panel for all tabs by default
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab)=>{
    if (changeInfo.status === "complete" && tab.url) try {
        await chrome.sidePanel.setOptions({
            tabId: tabId,
            path: "src/sidepanel/index.html",
            enabled: true
        });
    } catch (error) {
        console.error("Failed to set side panel options:", error);
    }
});
// Handle WhatsApp injection messages from side panel
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse)=>{
    if (msg?.type !== "INSERT_WHATSAPP") return;
    (async ()=>{
        // Wait for chrome APIs to be ready
        let retries = 0;
        const maxRetries = 10;
        while((!chrome.scripting || !chrome.scripting.executeScript) && retries < maxRetries){
            await new Promise((resolve)=>setTimeout(resolve, 100));
            retries++;
        }
        if (!chrome.scripting || !chrome.scripting.executeScript) throw new Error("Chrome scripting API not available after waiting");
        // find a WhatsApp Web tab, even if the panel is focused
        const tabs = await chrome.tabs.query({
            url: "*://web.whatsapp.com/*"
        });
        const targetTab = tabs.find((t)=>t.id) || (await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true
        }))[0];
        if (!targetTab?.id) throw new Error("No WhatsApp tab found");
        await chrome.scripting.executeScript({
            target: {
                tabId: targetTab.id
            },
            world: "MAIN",
            func: (textArg, autoSend)=>{
                // Comprehensive WhatsApp chat input selectors - prioritize message input over search
                const MESSAGE_INPUT_SELECTORS = [
                    // Prioritize message input with specific attributes
                    'div[aria-placeholder="Type a message"][data-lexical-editor="true"]',
                    'div[contenteditable="true"][data-tab="10"][data-lexical-editor="true"]',
                    'div[contenteditable="true"][data-tab="10"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])',
                    '#main footer div[contenteditable="true"][data-lexical-editor="true"]',
                    '#main > footer > div.copyable-area > div > span > div > div._ak1r > div > div.lexical-rich-text-input > div[contenteditable="true"]',
                    'div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf[contenteditable="true"]:not([aria-placeholder*="Search"])',
                    // Fallback selectors (excluding search)
                    'div[role="textbox"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])',
                    '[aria-placeholder*="Type a message"]:not(button):not([title="Attach"])',
                    '.selectable-text[contenteditable="true"]:not([aria-placeholder*="Search"]):not(button):not([title="Attach"])'
                ];
                // Find chat input using comprehensive selectors with additional validation
                let chatInput = null;
                for (const selector of MESSAGE_INPUT_SELECTORS){
                    const element = document.querySelector(selector);
                    if (element && element.isContentEditable) {
                        // Additional check to ensure we're not selecting the search input
                        const ariaPlaceholder = element.getAttribute("aria-placeholder");
                        const isSearchInput = ariaPlaceholder && ariaPlaceholder.toLowerCase().includes("search");
                        const isInFooter = element.closest("footer") !== null;
                        const isInMain = element.closest("#main") !== null;
                        // Prefer inputs in footer/main that are not search inputs
                        if (!isSearchInput && (isInFooter || isInMain)) {
                            chatInput = element;
                            break;
                        } else if (!isSearchInput && !chatInput) // Fallback if no footer/main input found
                        chatInput = element;
                    }
                }
                if (!chatInput) throw new Error("WhatsApp chat input not found");
                // Focus the input first
                chatInput.focus();
                // Clear existing content using Lexical editor approach
                chatInput.innerHTML = '<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><br></p>';
                // Create the proper structure for WhatsApp Lexical editor
                const paragraph = chatInput.querySelector("p");
                if (paragraph) paragraph.innerHTML = `<span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${textArg}</span>`;
                else // Fallback: create the structure from scratch
                chatInput.innerHTML = `<p class="selectable-text copyable-text x15bjb6t x1n2onr6" dir="ltr" style="text-indent: 0px; margin-top: 0px; margin-bottom: 0px;"><span class="selectable-text copyable-text xkrh14z" data-lexical-text="true">${textArg}</span></p>`;
                // Trigger events specifically for Lexical editor
                const inputEvent = new InputEvent("input", {
                    bubbles: true,
                    cancelable: true,
                    inputType: "insertText",
                    data: textArg
                });
                const compositionEndEvent = new CompositionEvent("compositionend", {
                    bubbles: true,
                    cancelable: true,
                    data: textArg
                });
                // Dispatch events in the correct order for Lexical
                chatInput.dispatchEvent(inputEvent);
                chatInput.dispatchEvent(compositionEndEvent);
                chatInput.dispatchEvent(new Event("keyup", {
                    bubbles: true
                }));
                chatInput.dispatchEvent(new Event("change", {
                    bubbles: true
                }));
                // Keep focus
                chatInput.focus();
                // Comprehensive send button selectors (excluding attach and emoji buttons)
                const SEND_BUTTON_SELECTORS = [
                    '[data-testid="send"]',
                    '[aria-label*="Send"]:not([title="Attach"]):not([aria-haspopup="menu"]):not([data-icon="emoji"]):not([aria-label*="emoji"]):not([aria-label*="Emoji"])',
                    'button[data-icon="send"]',
                    'footer button:not([data-icon="plus-rounded"]):not([title="Attach"]):not([aria-haspopup="menu"]):not([data-icon="emoji"]):not([aria-label*="emoji"]):not([aria-label*="Emoji"])',
                    '#main footer button[aria-label="Send"]',
                    'footer button[data-testid="send"]'
                ];
                if (autoSend) {
                    let sendButton = null;
                    for (const selector of SEND_BUTTON_SELECTORS){
                        sendButton = document.querySelector(selector);
                        if (sendButton) {
                            // Additional check to ensure we're not clicking the attach or emoji button
                            const isAttachButton = sendButton.getAttribute("title") === "Attach" || sendButton.getAttribute("aria-haspopup") === "menu" || sendButton.querySelector('[data-icon="plus-rounded"]');
                            const isEmojiButton = sendButton.getAttribute("data-icon") === "emoji" || sendButton.getAttribute("aria-label")?.toLowerCase().includes("emoji") || sendButton.querySelector('[data-icon="emoji"]');
                            if (!isAttachButton && !isEmojiButton) {
                                sendButton.click();
                                break;
                            }
                        }
                    }
                }
            },
            args: [
                msg.text,
                !!msg.autoSend
            ]
        });
        sendResponse({
            ok: true
        });
    })().catch((err)=>{
        console.error(err);
        sendResponse({
            ok: false,
            error: String(err?.message || err)
        });
    });
    // keep the message channel open for async sendResponse
    return true;
});

},{}]},["b9XeE","8oeFb"], "8oeFb", "parcelRequire3944")

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUksSUFBRSxXQUFXLFNBQVMsUUFBTSxFQUFFO0FBQUMsSUFBSSxJQUFFLElBQUksV0FBVyxTQUFTLE9BQUssQ0FBQztBQUFFLElBQUksSUFBRSxJQUFJLElBQUksSUFBRyxJQUFFLENBQUEsSUFBRyxFQUFFLElBQUksSUFBRyxJQUFFLEVBQUUsT0FBTyxDQUFBLElBQUcsRUFBRSxXQUFXLFNBQU8sRUFBRSxTQUFTLE1BQU0sSUFBSSxDQUFBLElBQUcsRUFBRSxNQUFNLE1BQU0sT0FBTyxDQUFDLEdBQUUsQ0FBQyxHQUFFLEVBQUUsR0FBSSxDQUFBLENBQUMsQ0FBQyxFQUFFLEdBQUMsR0FBRSxDQUFBLEdBQUcsQ0FBQztBQUFHLElBQUksSUFBRSxFQUFFLGNBQWEsSUFBRSxJQUFJLEVBQUUsZ0JBQWMsSUFBSSxZQUFVLFFBQU8sSUFBRTtBQUFJLElBQUksSUFBRSxDQUFDLElBQUUsRUFBRSxFQUFDLEdBQUcsSUFBSSxRQUFRLElBQUksRUFBRSxPQUFPLElBQUcsUUFBTztBQUFHLElBQUksSUFBRSxDQUFDLEdBQUcsSUFBSSxRQUFRLE1BQU0scUJBQWtCLE9BQU8sSUFBRyxRQUFPLElBQUcsSUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLHdCQUFvQixJQUFHLElBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSx3QkFBb0IsSUFBRyxJQUFFLEdBQUUsSUFBRSxDQUFDLEdBQUcsSUFBSSxPQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUk7QUFBRyxJQUFJLElBQUU7SUFBSyxJQUFJLElBQUUsV0FBVyxTQUFTLFdBQVMsV0FBVyxRQUFRLFNBQVEsSUFBRSxJQUFJLFlBQVksRUFBRSxpQkFBZ0I7SUFBTSxFQUFFLFVBQVUsWUFBWSxJQUFHO0FBQUc7QUFBRSxJQUFJLElBQUU7SUFBQyxtQkFBa0I7SUFBTSxnQkFBZTtJQUFLLFdBQVU7SUFBTSxZQUFXO1FBQUM7S0FBNkI7SUFBQyxRQUFPO0lBQVksUUFBTztJQUFLLGlCQUFnQjtJQUFtRSxZQUFXO0lBQW1CLFdBQVU7SUFBbUIsV0FBVTtJQUFRLFVBQVM7SUFBTSxjQUFhO0FBQUs7QUFBRSxPQUFPLE9BQU8sZ0JBQWMsRUFBRTtBQUFTLFdBQVcsVUFBUTtJQUFDLE1BQUssRUFBRTtJQUFDLEtBQUk7UUFBQyxTQUFRLEVBQUU7SUFBTztBQUFDO0FBQUUsSUFBSSxJQUFFLE9BQU8sT0FBTztBQUFPLFNBQVMsRUFBRSxDQUFDO0lBQUUsRUFBRSxLQUFLLElBQUksRUFBQyxJQUFHLElBQUksQ0FBQyxNQUFJO1FBQUMsTUFBSyxPQUFPLE9BQU8sT0FBTyxDQUFDLEVBQUU7UUFBQyxrQkFBaUIsRUFBRTtRQUFDLG1CQUFrQixFQUFFO1FBQUMsUUFBTyxTQUFTLENBQUM7WUFBRSxJQUFJLENBQUMsaUJBQWlCLEtBQUssS0FBRyxZQUFXO1FBQUU7UUFBRSxTQUFRLFNBQVMsQ0FBQztZQUFFLElBQUksQ0FBQyxrQkFBa0IsS0FBSztRQUFFO0lBQUMsR0FBRSxPQUFPLE9BQU8sT0FBTyxDQUFDLEVBQUUsR0FBQyxLQUFLO0FBQUM7QUFBQyxPQUFPLE9BQU8sU0FBTztBQUFFLE9BQU8sT0FBTyxVQUFRLENBQUM7QUFBRSxJQUFJLElBQUUsV0FBVyxXQUFTLFdBQVcsVUFBUTtBQUFLLFNBQVM7SUFBSSxPQUFNLENBQUMsRUFBRSxRQUFNLEVBQUUsU0FBTyxZQUFVLFNBQVMsU0FBUyxRQUFRLFlBQVUsSUFBRSxTQUFTLFdBQVMsY0FBWSxFQUFFO0FBQUk7QUFBQyxTQUFTO0lBQUksT0FBTSxDQUFDLEVBQUUsUUFBTSxFQUFFLFNBQU8sWUFBVSxjQUFZLEVBQUU7QUFBSTtBQUFDLFNBQVM7SUFBSSxPQUFPLEVBQUUsUUFBTSxTQUFTO0FBQUk7QUFBQyxJQUFJLElBQUUsMEJBQXlCLElBQUU7QUFBMkIsSUFBSSxJQUFFLENBQUMsRUFBRSxFQUFFLFNBQU8sVUFBUSxPQUFPLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUFDLGVBQWUsRUFBRSxJQUFFLElBQUk7SUFBRSxPQUFPLElBQUc7UUFBQyxNQUFNLE1BQU07UUFBRztJQUFLLEVBQUMsT0FBSztRQUFDLE1BQU0sSUFBSSxRQUFRLENBQUEsSUFBRyxXQUFXLEdBQUU7SUFBRztBQUFDO0FBQUMsSUFBRyxFQUFFLFFBQVEsY0FBYyxxQkFBbUIsR0FBRTtJQUFDLElBQUksSUFBRSxFQUFFLFFBQVEsT0FBTztJQUE4QixXQUFXLGlCQUFpQixTQUFRLFNBQVMsQ0FBQztRQUFFLElBQUksSUFBRSxFQUFFLFFBQVE7UUFBSSxJQUFHLEVBQUUsV0FBVyxJQUFHO1lBQUMsSUFBSSxJQUFFLElBQUksSUFBSSxtQkFBbUIsRUFBRSxNQUFNLEVBQUU7WUFBVSxFQUFFLGFBQVcsRUFBRSxRQUFNLEVBQUUsU0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsR0FBRSxDQUFBLEVBQUUsYUFBYSxJQUFJLEtBQUksS0FBSyxNQUFNLGFBQVksRUFBRSxZQUFZLE1BQU0sR0FBRyxLQUFLLENBQUEsSUFBRyxJQUFJLFNBQVMsRUFBRSxNQUFLO29CQUFDLFNBQVE7d0JBQUMsZ0JBQWUsRUFBRSxRQUFRLElBQUksbUJBQWlCO29CQUFpQjtnQkFBQyxJQUFHLElBQUcsRUFBRSxZQUFZLElBQUksU0FBUyxjQUFhO2dCQUFDLFFBQU87Z0JBQUksWUFBVztZQUFTO1FBQUc7SUFBQztBQUFFO0FBQUMsU0FBUyxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQUUsSUFBRyxFQUFDLFNBQVEsQ0FBQyxFQUFDLEdBQUM7SUFBRSxPQUFPLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQztBQUFDO0FBQUMsU0FBUyxFQUFFLElBQUUsR0FBRztJQUFFLElBQUksSUFBRTtJQUFJLE9BQU0sQ0FBQyxFQUFFLEVBQUUsVUFBUSxTQUFTLGFBQVcsWUFBVSxDQUFDLDhCQUE4QixLQUFLLEtBQUcsUUFBTSxLQUFLLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUFBO0FBQUMsU0FBUyxFQUFFLENBQUM7SUFBRSxPQUFPLEVBQUUsV0FBUyxZQUFVLEVBQUUsOEJBQTRCLEVBQUU7QUFBUTtBQUFDLFNBQVMsRUFBRSxDQUFDO0lBQUUsSUFBRyxPQUFPLFdBQVcsWUFBVSxLQUFJO0lBQU8sSUFBSSxJQUFFLElBQUksVUFBVSxFQUFFLE9BQU8sT0FBSztJQUFJLE9BQU8sRUFBRSxpQkFBaUIsV0FBVSxlQUFlLENBQUM7UUFBRSxJQUFJLElBQUUsS0FBSyxNQUFNLEVBQUU7UUFBTSxNQUFNLEVBQUU7SUFBRSxJQUFHLEVBQUUsaUJBQWlCLFNBQVEsSUFBRztBQUFDO0FBQUMsU0FBUyxFQUFFLENBQUM7SUFBRSxJQUFHLE9BQU8sV0FBVyxZQUFVLEtBQUk7SUFBTyxJQUFJLElBQUUsSUFBSSxVQUFVO0lBQUssT0FBTyxFQUFFLGlCQUFpQixXQUFVLGVBQWUsQ0FBQztRQUFFLElBQUksSUFBRSxLQUFLLE1BQU0sRUFBRTtRQUFNLElBQUcsRUFBRSxTQUFPLFlBQVUsTUFBTSxFQUFFLEVBQUUsU0FBUSxFQUFFLFNBQU8sU0FBUSxLQUFJLElBQUksS0FBSyxFQUFFLFlBQVksS0FBSztZQUFDLElBQUksSUFBRSxFQUFFLGFBQVcsRUFBRTtZQUFNLEVBQUUsOEJBQTRCLEVBQUUsVUFBUSxDQUFDO0FBQ3ZzRyxDQUFDLEdBQUMsSUFBRSxDQUFDOztBQUVMLENBQUMsR0FBQyxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBQ2hCLENBQUM7UUFBRTtJQUFDLElBQUcsRUFBRSxpQkFBaUIsU0FBUSxJQUFHLEVBQUUsaUJBQWlCLFFBQU87UUFBSyxFQUFFLENBQUMscURBQXFELEVBQUUsRUFBRSxjQUFjLENBQUM7SUFBQyxJQUFHLEVBQUUsaUJBQWlCLFNBQVE7UUFBSyxFQUFFLENBQUMsb0VBQW9FLEVBQUUsRUFBRSxjQUFjLENBQUM7SUFBQyxJQUFHO0FBQUM7QUFBQyxJQUFJLElBQUUsT0FBTyxPQUFPLFFBQU8sSUFBRTtJQUFDLFlBQVcsQ0FBQztJQUFFLFdBQVUsQ0FBQztJQUFFLFdBQVUsQ0FBQztJQUFFLGFBQVksQ0FBQztJQUFFLGFBQVksSUFBSTtJQUFJLFdBQVUsSUFBSTtBQUFHO0FBQUUsZUFBZSxFQUFFLElBQUUsQ0FBQyxDQUFDO0lBQUUsSUFBRyxLQUFHLEVBQUUsY0FBWSxFQUFFLGFBQVk7UUFBQyxFQUFFO1FBQWlDLEtBQUksSUFBSSxLQUFLLEVBQUUsVUFBVSxFQUFFLFlBQVk7SUFBSztJQUFDLElBQUcsS0FBRyxFQUFFLGNBQWEsQ0FBQSxFQUFFLGFBQVcsRUFBRSxTQUFRLEdBQUc7UUFBQyxFQUFFO1FBQStCLElBQUksSUFBRSxNQUFNLEdBQUcsS0FBSyxNQUFNO1lBQUMsUUFBTyxDQUFDO1FBQUM7UUFBRyxLQUFJLElBQUksS0FBSyxFQUFFLFlBQVk7WUFBQyxJQUFJLElBQUUsRUFBRSxLQUFLLENBQUEsSUFBRyxFQUFFLE9BQUssRUFBRSxPQUFPLEtBQUs7WUFBSSxFQUFFLFlBQVk7Z0JBQUMsMEJBQXlCO1lBQUM7UUFBRTtRQUFDLEVBQUUsUUFBUTtJQUFRO0FBQUM7QUFBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUUsaUJBQWdCO0lBQUM7SUFBSSxJQUFJLElBQUUsRUFBRSxPQUFNO1FBQUksRUFBRSxpQ0FBZ0MsRUFBRSxjQUFZLEVBQUUsT0FBTyxDQUFBLElBQUcsRUFBRSxZQUFVLEVBQUUsU0FBUyxLQUFLLENBQUEsSUFBRyxFQUFFLE9BQU8sUUFBTyxFQUFFO1FBQUssSUFBSSxJQUFFLEVBQUUsS0FBSyxDQUFBLElBQUcsRUFBRSxTQUFPO1FBQVEsSUFBRyxHQUFFO1lBQUMsSUFBSSxJQUFFLElBQUksSUFBSSxFQUFFLElBQUksQ0FBQSxJQUFHLEVBQUUsTUFBSyxJQUFFLE9BQU8sT0FBTyxFQUFFLGNBQWMsSUFBSSxDQUFBLElBQUcsT0FBTyxPQUFPLElBQUk7WUFBTyxFQUFFLGNBQVksRUFBRSxNQUFNLENBQUEsSUFBRyxFQUFFLElBQUk7UUFBRztRQUFDO0lBQUc7SUFBRyxFQUFFLGlCQUFpQixRQUFPO1FBQUssSUFBSSxJQUFFLFlBQVksSUFBSSxFQUFFLEtBQUssU0FBUTtRQUFNLEVBQUUsaUJBQWlCLFNBQVEsSUFBSSxjQUFjO0lBQUcsSUFBRyxFQUFFLGlCQUFpQixTQUFRO1FBQVUsTUFBTSxLQUFJLEVBQUUsQ0FBQztJQUFFO0FBQUU7QUFBQyxFQUFFLE9BQU07SUFBSSxPQUFPLEVBQUUsdUNBQXNDLEVBQUU7UUFBTSxLQUFJO1lBQWUsRUFBRSxlQUFhLENBQUMsR0FBRTtZQUFJO1FBQU0sS0FBSTtZQUFjLEVBQUUsY0FBWSxDQUFDLEdBQUU7WUFBSTtJQUFNO0FBQUM7QUFBRyxFQUFFLFFBQVEsVUFBVSxZQUFZLFNBQVMsQ0FBQztJQUFFLElBQUksSUFBRSxFQUFFLEtBQUssV0FBVyxJQUFHLElBQUUsRUFBRSxLQUFLLFdBQVc7SUFBRyxJQUFHLEtBQUcsR0FBRTtRQUFDLElBQUksSUFBRSxJQUFFLEVBQUUsWUFBVSxFQUFFO1FBQVksRUFBRSxJQUFJLElBQUcsRUFBRSxhQUFhLFlBQVk7WUFBSyxFQUFFLE9BQU87UUFBRSxJQUFHLEVBQUUsVUFBVSxZQUFZLFNBQVMsQ0FBQztZQUFFLEVBQUUsb0NBQW1DLElBQUcsRUFBRSx5QkFBd0IsQ0FBQSxFQUFFLGNBQVksQ0FBQyxDQUFBLEdBQUcsRUFBRSwyQkFBMEIsQ0FBQSxFQUFFLGdCQUFjLENBQUMsQ0FBQSxHQUFHO1FBQUc7SUFBRTtBQUFDO0FBQUcsRUFBRSxRQUFRLFVBQVUsWUFBWSxTQUFTLENBQUM7SUFBRSxPQUFPLEVBQUUsMEJBQXlCLENBQUEsRUFBRSw2Q0FBNEMsR0FBRSxHQUFHLENBQUM7QUFBQzs7O0FDSmw3RDs7O0FDQUEsT0FBTyxPQUFPLFVBQVUsWUFBWSxPQUFPO0lBQ3pDLElBQUk7UUFDRiw2QkFBNkI7UUFDN0IsTUFBTSxPQUFPLFVBQVUsV0FBVztZQUNoQyxPQUFPLElBQUk7WUFDWCxNQUFNO1lBQ04sU0FBUztRQUNYO1FBRUEsc0JBQXNCO1FBQ3RCLE1BQU0sT0FBTyxVQUFVLEtBQUs7WUFDMUIsT0FBTyxJQUFJO1FBQ2I7SUFDRixFQUFFLE9BQU8sT0FBTztRQUNkLFFBQVEsTUFBTSw4QkFBOEI7SUFDOUM7QUFDRjtBQUVBLDRDQUE0QztBQUM1QyxPQUFPLEtBQUssVUFBVSxZQUFZLE9BQU8sT0FBZSxZQUF1QztJQUM3RixJQUFJLFdBQVcsV0FBVyxjQUFjLElBQUksS0FDMUMsSUFBSTtRQUNGLE1BQU0sT0FBTyxVQUFVLFdBQVc7WUFDaEMsT0FBTztZQUNQLE1BQU07WUFDTixTQUFTO1FBQ1g7SUFDRixFQUFFLE9BQU8sT0FBTztRQUNkLFFBQVEsTUFBTSxxQ0FBcUM7SUFDckQ7QUFFSjtBQUVBLHFEQUFxRDtBQUNyRCxPQUFPLFFBQVEsVUFBVSxZQUFZLENBQUMsS0FBSyxTQUFTO0lBQ2xELElBQUksS0FBSyxTQUFTLG1CQUFtQjtJQUVwQyxDQUFBO1FBQ0MsbUNBQW1DO1FBQ25DLElBQUksVUFBVTtRQUNkLE1BQU0sYUFBYTtRQUVuQixNQUFPLEFBQUMsQ0FBQSxDQUFDLE9BQU8sYUFBYSxDQUFDLE9BQU8sVUFBVSxhQUFZLEtBQU0sVUFBVSxXQUFZO1lBQ3JGLE1BQU0sSUFBSSxRQUFRLENBQUEsVUFBVyxXQUFXLFNBQVM7WUFDakQ7UUFDRjtRQUVBLElBQUksQ0FBQyxPQUFPLGFBQWEsQ0FBQyxPQUFPLFVBQVUsZUFDekMsTUFBTSxJQUFJLE1BQU07UUFHbEIsd0RBQXdEO1FBQ3hELE1BQU0sT0FBTyxNQUFNLE9BQU8sS0FBSyxNQUFNO1lBQUUsS0FBSztRQUF5QjtRQUNyRSxNQUFNLFlBQVksS0FBSyxLQUFLLENBQUEsSUFBSyxFQUFFLE9BQ2pDLEFBQUMsQ0FBQSxNQUFNLE9BQU8sS0FBSyxNQUFNO1lBQUUsUUFBUTtZQUFNLG1CQUFtQjtRQUFLLEVBQUMsQ0FBRSxDQUFDLEVBQUU7UUFFekUsSUFBSSxDQUFDLFdBQVcsSUFBSSxNQUFNLElBQUksTUFBTTtRQUVwQyxNQUFNLE9BQU8sVUFBVSxjQUFjO1lBQ25DLFFBQVE7Z0JBQUUsT0FBTyxVQUFVO1lBQUc7WUFDOUIsT0FBTztZQUNQLE1BQU0sQ0FBQyxTQUFpQjtnQkFDdEIscUZBQXFGO2dCQUNyRixNQUFNLDBCQUEwQjtvQkFDOUIsb0RBQW9EO29CQUNwRDtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQSx3Q0FBd0M7b0JBQ3hDO29CQUNBO29CQUNBO2lCQUNEO2dCQUVELDJFQUEyRTtnQkFDM0UsSUFBSSxZQUFZO2dCQUNoQixLQUFLLE1BQU0sWUFBWSx3QkFBeUI7b0JBQzlDLE1BQU0sVUFBVSxTQUFTLGNBQWM7b0JBQ3ZDLElBQUksV0FBVyxRQUFRLG1CQUFtQjt3QkFDeEMsa0VBQWtFO3dCQUNsRSxNQUFNLGtCQUFrQixRQUFRLGFBQWE7d0JBQzdDLE1BQU0sZ0JBQWdCLG1CQUFtQixnQkFBZ0IsY0FBYyxTQUFTO3dCQUNoRixNQUFNLGFBQWEsUUFBUSxRQUFRLGNBQWM7d0JBQ2pELE1BQU0sV0FBVyxRQUFRLFFBQVEsYUFBYTt3QkFFOUMsMERBQTBEO3dCQUMxRCxJQUFJLENBQUMsaUJBQWtCLENBQUEsY0FBYyxRQUFPLEdBQUk7NEJBQzlDLFlBQVk7NEJBQ1o7d0JBQ0YsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FDNUIseUNBQXlDO3dCQUN6QyxZQUFZO29CQUVoQjtnQkFDRjtnQkFFQSxJQUFJLENBQUMsV0FBVyxNQUFNLElBQUksTUFBTTtnQkFFaEMsd0JBQXdCO2dCQUN4QixVQUFVO2dCQUVWLHVEQUF1RDtnQkFDdkQsVUFBVSxZQUFZO2dCQUV0QiwwREFBMEQ7Z0JBQzFELE1BQU0sWUFBWSxVQUFVLGNBQWM7Z0JBQzFDLElBQUksV0FDRixVQUFVLFlBQVksQ0FBQyw2RUFBNkUsRUFBRSxRQUFRLE9BQU8sQ0FBQztxQkFFdEgsOENBQThDO2dCQUM5QyxVQUFVLFlBQVksQ0FBQyxpTkFBaU4sRUFBRSxRQUFRLFdBQVcsQ0FBQztnQkFHaFEsaURBQWlEO2dCQUNqRCxNQUFNLGFBQWEsSUFBSSxXQUFXLFNBQVM7b0JBQ3pDLFNBQVM7b0JBQ1QsWUFBWTtvQkFDWixXQUFXO29CQUNYLE1BQU07Z0JBQ1I7Z0JBRUEsTUFBTSxzQkFBc0IsSUFBSSxpQkFBaUIsa0JBQWtCO29CQUNqRSxTQUFTO29CQUNULFlBQVk7b0JBQ1osTUFBTTtnQkFDUjtnQkFFQSxtREFBbUQ7Z0JBQ25ELFVBQVUsY0FBYztnQkFDeEIsVUFBVSxjQUFjO2dCQUN4QixVQUFVLGNBQWMsSUFBSSxNQUFNLFNBQVM7b0JBQUUsU0FBUztnQkFBSztnQkFDM0QsVUFBVSxjQUFjLElBQUksTUFBTSxVQUFVO29CQUFFLFNBQVM7Z0JBQUs7Z0JBRTVELGFBQWE7Z0JBQ2IsVUFBVTtnQkFFViwyRUFBMkU7Z0JBQzNFLE1BQU0sd0JBQXdCO29CQUM1QjtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtpQkFDRDtnQkFFRCxJQUFJLFVBQVU7b0JBQ1osSUFBSSxhQUFhO29CQUNqQixLQUFLLE1BQU0sWUFBWSxzQkFBdUI7d0JBQzVDLGFBQWEsU0FBUyxjQUFjO3dCQUNwQyxJQUFJLFlBQVk7NEJBQ2QsMkVBQTJFOzRCQUMzRSxNQUFNLGlCQUFpQixXQUFXLGFBQWEsYUFBYSxZQUN0QyxXQUFXLGFBQWEscUJBQXFCLFVBQzdDLFdBQVcsY0FBYzs0QkFFL0MsTUFBTSxnQkFBZ0IsV0FBVyxhQUFhLGlCQUFpQixXQUMxQyxXQUFXLGFBQWEsZUFBZSxjQUFjLFNBQVMsWUFDOUQsV0FBVyxjQUFjOzRCQUU5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZTtnQ0FDckMsV0FBVztnQ0FDWDs0QkFDRjt3QkFDRjtvQkFDRjtnQkFDRjtZQUNGO1lBQ0EsTUFBTTtnQkFBQyxJQUFJO2dCQUFNLENBQUMsQ0FBQyxJQUFJO2FBQVM7UUFDbEM7UUFFQSxhQUFhO1lBQUUsSUFBSTtRQUFLO0lBQzFCLENBQUEsSUFBSyxNQUFNLENBQUE7UUFDVCxRQUFRLE1BQU07UUFDZCxhQUFhO1lBQUUsSUFBSTtZQUFPLE9BQU8sT0FBTyxLQUFLLFdBQVc7UUFBSztJQUMvRDtJQUVBLHVEQUF1RDtJQUN2RCxPQUFPO0FBQ1QiLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AcGxhc21vaHEvcGFyY2VsLXJ1bnRpbWUvZGlzdC9ydW50aW1lLWEyYTY5NTA3MDk5NTY1N2YuanMiLCIucGxhc21vL3N0YXRpYy9iYWNrZ3JvdW5kL2luZGV4LnRzIiwic3JjL2JhY2tncm91bmQudHMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIHU9Z2xvYmFsVGhpcy5wcm9jZXNzPy5hcmd2fHxbXTt2YXIgaD0oKT0+Z2xvYmFsVGhpcy5wcm9jZXNzPy5lbnZ8fHt9O3ZhciBCPW5ldyBTZXQodSksXz1lPT5CLmhhcyhlKSxHPXUuZmlsdGVyKGU9PmUuc3RhcnRzV2l0aChcIi0tXCIpJiZlLmluY2x1ZGVzKFwiPVwiKSkubWFwKGU9PmUuc3BsaXQoXCI9XCIpKS5yZWR1Y2UoKGUsW3Qsb10pPT4oZVt0XT1vLGUpLHt9KTt2YXIgVT1fKFwiLS1kcnktcnVuXCIpLGc9KCk9Pl8oXCItLXZlcmJvc2VcIil8fGgoKS5WRVJCT1NFPT09XCJ0cnVlXCIsTj1nKCk7dmFyIG09KGU9XCJcIiwuLi50KT0+Y29uc29sZS5sb2coZS5wYWRFbmQoOSksXCJ8XCIsLi4udCk7dmFyIHk9KC4uLmUpPT5jb25zb2xlLmVycm9yKFwiXFx1ezFGNTM0fSBFUlJPUlwiLnBhZEVuZCg5KSxcInxcIiwuLi5lKSx2PSguLi5lKT0+bShcIlxcdXsxRjUzNX0gSU5GT1wiLC4uLmUpLGY9KC4uLmUpPT5tKFwiXFx1ezFGN0UwfSBXQVJOXCIsLi4uZSksTT0wLGk9KC4uLmUpPT5nKCkmJm0oYFxcdXsxRjdFMX0gJHtNKyt9YCwuLi5lKTt2YXIgYj0oKT0+e2xldCBlPWdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZXx8Z2xvYmFsVGhpcy5jaHJvbWU/LnJ1bnRpbWUsdD0oKT0+c2V0SW50ZXJ2YWwoZS5nZXRQbGF0Zm9ybUluZm8sMjRlMyk7ZS5vblN0YXJ0dXAuYWRkTGlzdGVuZXIodCksdCgpfTt2YXIgbj17XCJpc0NvbnRlbnRTY3JpcHRcIjpmYWxzZSxcImlzQmFja2dyb3VuZFwiOnRydWUsXCJpc1JlYWN0XCI6ZmFsc2UsXCJydW50aW1lc1wiOltcImJhY2tncm91bmQtc2VydmljZS1ydW50aW1lXCJdLFwiaG9zdFwiOlwibG9jYWxob3N0XCIsXCJwb3J0XCI6MTgxNSxcImVudHJ5RmlsZVBhdGhcIjpcIi9Vc2Vycy9wbHVnb2VtcGxveWVlL0Nocm9tRXh0Ly5wbGFzbW8vc3RhdGljL2JhY2tncm91bmQvaW5kZXgudHNcIixcImJ1bmRsZUlkXCI6XCJjMzM4OTA4ZTcwNGM5MWYxXCIsXCJlbnZIYXNoXCI6XCJkOTlhNWZmYTU3YWNkNjM4XCIsXCJ2ZXJib3NlXCI6XCJmYWxzZVwiLFwic2VjdXJlXCI6ZmFsc2UsXCJzZXJ2ZXJQb3J0XCI6NTE4MTh9O21vZHVsZS5idW5kbGUuSE1SX0JVTkRMRV9JRD1uLmJ1bmRsZUlkO2dsb2JhbFRoaXMucHJvY2Vzcz17YXJndjpbXSxlbnY6e1ZFUkJPU0U6bi52ZXJib3NlfX07dmFyIEQ9bW9kdWxlLmJ1bmRsZS5Nb2R1bGU7ZnVuY3Rpb24gSChlKXtELmNhbGwodGhpcyxlKSx0aGlzLmhvdD17ZGF0YTptb2R1bGUuYnVuZGxlLmhvdERhdGFbZV0sX2FjY2VwdENhbGxiYWNrczpbXSxfZGlzcG9zZUNhbGxiYWNrczpbXSxhY2NlcHQ6ZnVuY3Rpb24odCl7dGhpcy5fYWNjZXB0Q2FsbGJhY2tzLnB1c2godHx8ZnVuY3Rpb24oKXt9KX0sZGlzcG9zZTpmdW5jdGlvbih0KXt0aGlzLl9kaXNwb3NlQ2FsbGJhY2tzLnB1c2godCl9fSxtb2R1bGUuYnVuZGxlLmhvdERhdGFbZV09dm9pZCAwfW1vZHVsZS5idW5kbGUuTW9kdWxlPUg7bW9kdWxlLmJ1bmRsZS5ob3REYXRhPXt9O3ZhciBjPWdsb2JhbFRoaXMuYnJvd3Nlcnx8Z2xvYmFsVGhpcy5jaHJvbWV8fG51bGw7ZnVuY3Rpb24gUigpe3JldHVybiFuLmhvc3R8fG4uaG9zdD09PVwiMC4wLjAuMFwiP2xvY2F0aW9uLnByb3RvY29sLmluZGV4T2YoXCJodHRwXCIpPT09MD9sb2NhdGlvbi5ob3N0bmFtZTpcImxvY2FsaG9zdFwiOm4uaG9zdH1mdW5jdGlvbiB4KCl7cmV0dXJuIW4uaG9zdHx8bi5ob3N0PT09XCIwLjAuMC4wXCI/XCJsb2NhbGhvc3RcIjpuLmhvc3R9ZnVuY3Rpb24gZCgpe3JldHVybiBuLnBvcnR8fGxvY2F0aW9uLnBvcnR9dmFyIFA9XCJfX3BsYXNtb19ydW50aW1lX3BhZ2VfXCIsUz1cIl9fcGxhc21vX3J1bnRpbWVfc2NyaXB0X1wiO3ZhciBPPWAke24uc2VjdXJlP1wiaHR0cHNcIjpcImh0dHBcIn06Ly8ke1IoKX06JHtkKCl9L2A7YXN5bmMgZnVuY3Rpb24gayhlPTE0NzApe2Zvcig7Oyl0cnl7YXdhaXQgZmV0Y2goTyk7YnJlYWt9Y2F0Y2h7YXdhaXQgbmV3IFByb21pc2Uobz0+c2V0VGltZW91dChvLGUpKX19aWYoYy5ydW50aW1lLmdldE1hbmlmZXN0KCkubWFuaWZlc3RfdmVyc2lvbj09PTMpe2xldCBlPWMucnVudGltZS5nZXRVUkwoXCIvX19wbGFzbW9faG1yX3Byb3h5X18/dXJsPVwiKTtnbG9iYWxUaGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJmZXRjaFwiLGZ1bmN0aW9uKHQpe2xldCBvPXQucmVxdWVzdC51cmw7aWYoby5zdGFydHNXaXRoKGUpKXtsZXQgcz1uZXcgVVJMKGRlY29kZVVSSUNvbXBvbmVudChvLnNsaWNlKGUubGVuZ3RoKSkpO3MuaG9zdG5hbWU9PT1uLmhvc3QmJnMucG9ydD09PWAke24ucG9ydH1gPyhzLnNlYXJjaFBhcmFtcy5zZXQoXCJ0XCIsRGF0ZS5ub3coKS50b1N0cmluZygpKSx0LnJlc3BvbmRXaXRoKGZldGNoKHMpLnRoZW4ocj0+bmV3IFJlc3BvbnNlKHIuYm9keSx7aGVhZGVyczp7XCJDb250ZW50LVR5cGVcIjpyLmhlYWRlcnMuZ2V0KFwiQ29udGVudC1UeXBlXCIpPz9cInRleHQvamF2YXNjcmlwdFwifX0pKSkpOnQucmVzcG9uZFdpdGgobmV3IFJlc3BvbnNlKFwiUGxhc21vIEhNUlwiLHtzdGF0dXM6MjAwLHN0YXR1c1RleHQ6XCJUZXN0aW5nXCJ9KSl9fSl9ZnVuY3Rpb24gRShlLHQpe2xldHttb2R1bGVzOm99PWU7cmV0dXJuIG8/ISFvW3RdOiExfWZ1bmN0aW9uIEMoZT1kKCkpe2xldCB0PXgoKTtyZXR1cm5gJHtuLnNlY3VyZXx8bG9jYXRpb24ucHJvdG9jb2w9PT1cImh0dHBzOlwiJiYhL2xvY2FsaG9zdHwxMjcuMC4wLjF8MC4wLjAuMC8udGVzdCh0KT9cIndzc1wiOlwid3NcIn06Ly8ke3R9OiR7ZX0vYH1mdW5jdGlvbiBMKGUpe3R5cGVvZiBlLm1lc3NhZ2U9PVwic3RyaW5nXCImJnkoXCJbcGxhc21vL3BhcmNlbC1ydW50aW1lXTogXCIrZS5tZXNzYWdlKX1mdW5jdGlvbiBUKGUpe2lmKHR5cGVvZiBnbG9iYWxUaGlzLldlYlNvY2tldD5cInVcIilyZXR1cm47bGV0IHQ9bmV3IFdlYlNvY2tldChDKE51bWJlcihkKCkpKzEpKTtyZXR1cm4gdC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLGFzeW5jIGZ1bmN0aW9uKG8pe2xldCBzPUpTT04ucGFyc2Uoby5kYXRhKTthd2FpdCBlKHMpfSksdC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIixMKSx0fWZ1bmN0aW9uIEEoZSl7aWYodHlwZW9mIGdsb2JhbFRoaXMuV2ViU29ja2V0PlwidVwiKXJldHVybjtsZXQgdD1uZXcgV2ViU29ja2V0KEMoKSk7cmV0dXJuIHQuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIixhc3luYyBmdW5jdGlvbihvKXtsZXQgcz1KU09OLnBhcnNlKG8uZGF0YSk7aWYocy50eXBlPT09XCJ1cGRhdGVcIiYmYXdhaXQgZShzLmFzc2V0cykscy50eXBlPT09XCJlcnJvclwiKWZvcihsZXQgciBvZiBzLmRpYWdub3N0aWNzLmFuc2kpe2xldCBsPXIuY29kZWZyYW1lfHxyLnN0YWNrO2YoXCJbcGxhc21vL3BhcmNlbC1ydW50aW1lXTogXCIrci5tZXNzYWdlK2BcbmArbCtgXG5cbmArci5oaW50cy5qb2luKGBcbmApKX19KSx0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLEwpLHQuYWRkRXZlbnRMaXN0ZW5lcihcIm9wZW5cIiwoKT0+e3YoYFtwbGFzbW8vcGFyY2VsLXJ1bnRpbWVdOiBDb25uZWN0ZWQgdG8gSE1SIHNlcnZlciBmb3IgJHtuLmVudHJ5RmlsZVBhdGh9YCl9KSx0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCgpPT57ZihgW3BsYXNtby9wYXJjZWwtcnVudGltZV06IENvbm5lY3Rpb24gdG8gdGhlIEhNUiBzZXJ2ZXIgaXMgY2xvc2VkIGZvciAke24uZW50cnlGaWxlUGF0aH1gKX0pLHR9dmFyIHc9bW9kdWxlLmJ1bmRsZS5wYXJlbnQsYT17YnVpbGRSZWFkeTohMSxiZ0NoYW5nZWQ6ITEsY3NDaGFuZ2VkOiExLHBhZ2VDaGFuZ2VkOiExLHNjcmlwdFBvcnRzOm5ldyBTZXQscGFnZVBvcnRzOm5ldyBTZXR9O2FzeW5jIGZ1bmN0aW9uIHAoZT0hMSl7aWYoZXx8YS5idWlsZFJlYWR5JiZhLnBhZ2VDaGFuZ2VkKXtpKFwiQkdTVyBSdW50aW1lIC0gcmVsb2FkaW5nIFBhZ2VcIik7Zm9yKGxldCB0IG9mIGEucGFnZVBvcnRzKXQucG9zdE1lc3NhZ2UobnVsbCl9aWYoZXx8YS5idWlsZFJlYWR5JiYoYS5iZ0NoYW5nZWR8fGEuY3NDaGFuZ2VkKSl7aShcIkJHU1cgUnVudGltZSAtIHJlbG9hZGluZyBDU1wiKTtsZXQgdD1hd2FpdCBjPy50YWJzLnF1ZXJ5KHthY3RpdmU6ITB9KTtmb3IobGV0IG8gb2YgYS5zY3JpcHRQb3J0cyl7bGV0IHM9dC5zb21lKHI9PnIuaWQ9PT1vLnNlbmRlci50YWI/LmlkKTtvLnBvc3RNZXNzYWdlKHtfX3BsYXNtb19jc19hY3RpdmVfdGFiX186c30pfWMucnVudGltZS5yZWxvYWQoKX19aWYoIXd8fCF3LmlzUGFyY2VsUmVxdWlyZSl7YigpO2xldCBlPUEoYXN5bmMgdD0+e2koXCJCR1NXIFJ1bnRpbWUgLSBPbiBITVIgVXBkYXRlXCIpLGEuYmdDaGFuZ2VkfHw9dC5maWx0ZXIocz0+cy5lbnZIYXNoPT09bi5lbnZIYXNoKS5zb21lKHM9PkUobW9kdWxlLmJ1bmRsZSxzLmlkKSk7bGV0IG89dC5maW5kKHM9PnMudHlwZT09PVwianNvblwiKTtpZihvKXtsZXQgcz1uZXcgU2V0KHQubWFwKGw9PmwuaWQpKSxyPU9iamVjdC52YWx1ZXMoby5kZXBzQnlCdW5kbGUpLm1hcChsPT5PYmplY3QudmFsdWVzKGwpKS5mbGF0KCk7YS5iZ0NoYW5nZWR8fD1yLmV2ZXJ5KGw9PnMuaGFzKGwpKX1wKCl9KTtlLmFkZEV2ZW50TGlzdGVuZXIoXCJvcGVuXCIsKCk9PntsZXQgdD1zZXRJbnRlcnZhbCgoKT0+ZS5zZW5kKFwicGluZ1wiKSwyNGUzKTtlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCgpPT5jbGVhckludGVydmFsKHQpKX0pLGUuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsYXN5bmMoKT0+e2F3YWl0IGsoKSxwKCEwKX0pfVQoYXN5bmMgZT0+e3N3aXRjaChpKFwiQkdTVyBSdW50aW1lIC0gT24gQnVpbGQgUmVwYWNrYWdlZFwiKSxlLnR5cGUpe2Nhc2VcImJ1aWxkX3JlYWR5XCI6e2EuYnVpbGRSZWFkeXx8PSEwLHAoKTticmVha31jYXNlXCJjc19jaGFuZ2VkXCI6e2EuY3NDaGFuZ2VkfHw9ITAscCgpO2JyZWFrfX19KTtjLnJ1bnRpbWUub25Db25uZWN0LmFkZExpc3RlbmVyKGZ1bmN0aW9uKGUpe2xldCB0PWUubmFtZS5zdGFydHNXaXRoKFApLG89ZS5uYW1lLnN0YXJ0c1dpdGgoUyk7aWYodHx8byl7bGV0IHM9dD9hLnBhZ2VQb3J0czphLnNjcmlwdFBvcnRzO3MuYWRkKGUpLGUub25EaXNjb25uZWN0LmFkZExpc3RlbmVyKCgpPT57cy5kZWxldGUoZSl9KSxlLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihmdW5jdGlvbihyKXtpKFwiQkdTVyBSdW50aW1lIC0gT24gc291cmNlIGNoYW5nZWRcIixyKSxyLl9fcGxhc21vX2NzX2NoYW5nZWRfXyYmKGEuY3NDaGFuZ2VkfHw9ITApLHIuX19wbGFzbW9fcGFnZV9jaGFuZ2VkX18mJihhLnBhZ2VDaGFuZ2VkfHw9ITApLHAoKX0pfX0pO2MucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoZnVuY3Rpb24odCl7cmV0dXJuIHQuX19wbGFzbW9fZnVsbF9yZWxvYWRfXyYmKGkoXCJCR1NXIFJ1bnRpbWUgLSBPbiB0b3AtbGV2ZWwgY29kZSBjaGFuZ2VkXCIpLHAoKSksITB9KTtcbiIsImltcG9ydCBcIi4uLy4uLy4uL3NyYy9iYWNrZ3JvdW5kXCIiLCJjaHJvbWUuYWN0aW9uLm9uQ2xpY2tlZC5hZGRMaXN0ZW5lcihhc3luYyAodGFiOiBjaHJvbWUudGFicy5UYWIpID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBTZXQgdGhlIHNpZGUgcGFuZWwgb3B0aW9uc1xuICAgIGF3YWl0IGNocm9tZS5zaWRlUGFuZWwuc2V0T3B0aW9ucyh7XG4gICAgICB0YWJJZDogdGFiLmlkLFxuICAgICAgcGF0aDogJ3NyYy9zaWRlcGFuZWwvaW5kZXguaHRtbCcsXG4gICAgICBlbmFibGVkOiB0cnVlXG4gICAgfSlcbiAgICBcbiAgICAvLyBPcGVuIHRoZSBzaWRlIHBhbmVsXG4gICAgYXdhaXQgY2hyb21lLnNpZGVQYW5lbC5vcGVuKHtcbiAgICAgIHRhYklkOiB0YWIuaWRcbiAgICB9KVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBvcGVuIHNpZGUgcGFuZWw6JywgZXJyb3IpXG4gIH1cbn0pXG5cbi8vIEVuYWJsZSBzaWRlIHBhbmVsIGZvciBhbGwgdGFicyBieSBkZWZhdWx0XG5jaHJvbWUudGFicy5vblVwZGF0ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYklkOiBudW1iZXIsIGNoYW5nZUluZm86IGNocm9tZS50YWJzLlRhYkNoYW5nZUluZm8sIHRhYjogY2hyb21lLnRhYnMuVGFiKSA9PiB7XG4gIGlmIChjaGFuZ2VJbmZvLnN0YXR1cyA9PT0gJ2NvbXBsZXRlJyAmJiB0YWIudXJsKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNocm9tZS5zaWRlUGFuZWwuc2V0T3B0aW9ucyh7XG4gICAgICAgIHRhYklkOiB0YWJJZCxcbiAgICAgICAgcGF0aDogJ3NyYy9zaWRlcGFuZWwvaW5kZXguaHRtbCcsXG4gICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgIH0pXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzZXQgc2lkZSBwYW5lbCBvcHRpb25zOicsIGVycm9yKVxuICAgIH1cbiAgfVxufSlcblxuLy8gSGFuZGxlIFdoYXRzQXBwIGluamVjdGlvbiBtZXNzYWdlcyBmcm9tIHNpZGUgcGFuZWxcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobXNnLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgaWYgKG1zZz8udHlwZSAhPT0gXCJJTlNFUlRfV0hBVFNBUFBcIikgcmV0dXJuO1xuXG4gIChhc3luYyAoKSA9PiB7XG4gICAgLy8gV2FpdCBmb3IgY2hyb21lIEFQSXMgdG8gYmUgcmVhZHlcbiAgICBsZXQgcmV0cmllcyA9IDA7XG4gICAgY29uc3QgbWF4UmV0cmllcyA9IDEwO1xuICAgIFxuICAgIHdoaWxlICgoIWNocm9tZS5zY3JpcHRpbmcgfHwgIWNocm9tZS5zY3JpcHRpbmcuZXhlY3V0ZVNjcmlwdCkgJiYgcmV0cmllcyA8IG1heFJldHJpZXMpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgIHJldHJpZXMrKztcbiAgICB9XG4gICAgXG4gICAgaWYgKCFjaHJvbWUuc2NyaXB0aW5nIHx8ICFjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNocm9tZSBzY3JpcHRpbmcgQVBJIG5vdCBhdmFpbGFibGUgYWZ0ZXIgd2FpdGluZ1wiKTtcbiAgICB9XG5cbiAgICAvLyBmaW5kIGEgV2hhdHNBcHAgV2ViIHRhYiwgZXZlbiBpZiB0aGUgcGFuZWwgaXMgZm9jdXNlZFxuICAgIGNvbnN0IHRhYnMgPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IHVybDogXCIqOi8vd2ViLndoYXRzYXBwLmNvbS8qXCIgfSk7XG4gICAgY29uc3QgdGFyZ2V0VGFiID0gdGFicy5maW5kKHQgPT4gdC5pZCkgfHxcbiAgICAgIChhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgbGFzdEZvY3VzZWRXaW5kb3c6IHRydWUgfSkpWzBdO1xuXG4gICAgaWYgKCF0YXJnZXRUYWI/LmlkKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBXaGF0c0FwcCB0YWIgZm91bmRcIik7XG5cbiAgICBhd2FpdCBjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xuICAgICAgdGFyZ2V0OiB7IHRhYklkOiB0YXJnZXRUYWIuaWQgfSxcbiAgICAgIHdvcmxkOiBcIk1BSU5cIiwgLy8gaW50ZXJhY3Qgd2l0aCBXQSdzIERPTVxuICAgICAgZnVuYzogKHRleHRBcmc6IHN0cmluZywgYXV0b1NlbmQ6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgLy8gQ29tcHJlaGVuc2l2ZSBXaGF0c0FwcCBjaGF0IGlucHV0IHNlbGVjdG9ycyAtIHByaW9yaXRpemUgbWVzc2FnZSBpbnB1dCBvdmVyIHNlYXJjaFxuICAgICAgICBjb25zdCBNRVNTQUdFX0lOUFVUX1NFTEVDVE9SUyA9IFtcbiAgICAgICAgICAvLyBQcmlvcml0aXplIG1lc3NhZ2UgaW5wdXQgd2l0aCBzcGVjaWZpYyBhdHRyaWJ1dGVzXG4gICAgICAgICAgJ2RpdlthcmlhLXBsYWNlaG9sZGVyPVwiVHlwZSBhIG1lc3NhZ2VcIl1bZGF0YS1sZXhpY2FsLWVkaXRvcj1cInRydWVcIl0nLFxuICAgICAgICAgICdkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXVtkYXRhLXRhYj1cIjEwXCJdW2RhdGEtbGV4aWNhbC1lZGl0b3I9XCJ0cnVlXCJdJyxcbiAgICAgICAgICAnZGl2W2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl1bZGF0YS10YWI9XCIxMFwiXTpub3QoW2FyaWEtcGxhY2Vob2xkZXIqPVwiU2VhcmNoXCJdKTpub3QoYnV0dG9uKTpub3QoW3RpdGxlPVwiQXR0YWNoXCJdKScsXG4gICAgICAgICAgJyNtYWluIGZvb3RlciBkaXZbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXVtkYXRhLWxleGljYWwtZWRpdG9yPVwidHJ1ZVwiXScsXG4gICAgICAgICAgJyNtYWluID4gZm9vdGVyID4gZGl2LmNvcHlhYmxlLWFyZWEgPiBkaXYgPiBzcGFuID4gZGl2ID4gZGl2Ll9hazFyID4gZGl2ID4gZGl2LmxleGljYWwtcmljaC10ZXh0LWlucHV0ID4gZGl2W2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl0nLFxuICAgICAgICAgICdkaXYueDFoeDBlZ3AueDZpa204ci54MW9kancwZi54MWs2cmNxNy54NnByeHhmW2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl06bm90KFthcmlhLXBsYWNlaG9sZGVyKj1cIlNlYXJjaFwiXSknLFxuICAgICAgICAgIC8vIEZhbGxiYWNrIHNlbGVjdG9ycyAoZXhjbHVkaW5nIHNlYXJjaClcbiAgICAgICAgICAnZGl2W3JvbGU9XCJ0ZXh0Ym94XCJdOm5vdChbYXJpYS1wbGFjZWhvbGRlcio9XCJTZWFyY2hcIl0pOm5vdChidXR0b24pOm5vdChbdGl0bGU9XCJBdHRhY2hcIl0pJyxcbiAgICAgICAgICAnW2FyaWEtcGxhY2Vob2xkZXIqPVwiVHlwZSBhIG1lc3NhZ2VcIl06bm90KGJ1dHRvbik6bm90KFt0aXRsZT1cIkF0dGFjaFwiXSknLFxuICAgICAgICAgICcuc2VsZWN0YWJsZS10ZXh0W2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl06bm90KFthcmlhLXBsYWNlaG9sZGVyKj1cIlNlYXJjaFwiXSk6bm90KGJ1dHRvbik6bm90KFt0aXRsZT1cIkF0dGFjaFwiXSknXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gRmluZCBjaGF0IGlucHV0IHVzaW5nIGNvbXByZWhlbnNpdmUgc2VsZWN0b3JzIHdpdGggYWRkaXRpb25hbCB2YWxpZGF0aW9uXG4gICAgICAgIGxldCBjaGF0SW5wdXQgPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIE1FU1NBR0VfSU5QVVRfU0VMRUNUT1JTKSB7XG4gICAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgIGlmIChlbGVtZW50ICYmIGVsZW1lbnQuaXNDb250ZW50RWRpdGFibGUpIHtcbiAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgY2hlY2sgdG8gZW5zdXJlIHdlJ3JlIG5vdCBzZWxlY3RpbmcgdGhlIHNlYXJjaCBpbnB1dFxuICAgICAgICAgICAgY29uc3QgYXJpYVBsYWNlaG9sZGVyID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FyaWEtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGlzU2VhcmNoSW5wdXQgPSBhcmlhUGxhY2Vob2xkZXIgJiYgYXJpYVBsYWNlaG9sZGVyLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgY29uc3QgaXNJbkZvb3RlciA9IGVsZW1lbnQuY2xvc2VzdCgnZm9vdGVyJykgIT09IG51bGw7XG4gICAgICAgICAgICBjb25zdCBpc0luTWFpbiA9IGVsZW1lbnQuY2xvc2VzdCgnI21haW4nKSAhPT0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJlZmVyIGlucHV0cyBpbiBmb290ZXIvbWFpbiB0aGF0IGFyZSBub3Qgc2VhcmNoIGlucHV0c1xuICAgICAgICAgICAgaWYgKCFpc1NlYXJjaElucHV0ICYmIChpc0luRm9vdGVyIHx8IGlzSW5NYWluKSkge1xuICAgICAgICAgICAgICBjaGF0SW5wdXQgPSBlbGVtZW50O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWlzU2VhcmNoSW5wdXQgJiYgIWNoYXRJbnB1dCkge1xuICAgICAgICAgICAgICAvLyBGYWxsYmFjayBpZiBubyBmb290ZXIvbWFpbiBpbnB1dCBmb3VuZFxuICAgICAgICAgICAgICBjaGF0SW5wdXQgPSBlbGVtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2hhdElucHV0KSB0aHJvdyBuZXcgRXJyb3IoXCJXaGF0c0FwcCBjaGF0IGlucHV0IG5vdCBmb3VuZFwiKTtcblxuICAgICAgICAvLyBGb2N1cyB0aGUgaW5wdXQgZmlyc3RcbiAgICAgICAgY2hhdElucHV0LmZvY3VzKCk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudCB1c2luZyBMZXhpY2FsIGVkaXRvciBhcHByb2FjaFxuICAgICAgICBjaGF0SW5wdXQuaW5uZXJIVE1MID0gJzxwIGNsYXNzPVwic2VsZWN0YWJsZS10ZXh0IGNvcHlhYmxlLXRleHQgeDE1YmpiNnQgeDFuMm9ucjZcIiBkaXI9XCJsdHJcIiBzdHlsZT1cInRleHQtaW5kZW50OiAwcHg7IG1hcmdpbi10b3A6IDBweDsgbWFyZ2luLWJvdHRvbTogMHB4O1wiPjxicj48L3A+JztcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcHJvcGVyIHN0cnVjdHVyZSBmb3IgV2hhdHNBcHAgTGV4aWNhbCBlZGl0b3JcbiAgICAgICAgY29uc3QgcGFyYWdyYXBoID0gY2hhdElucHV0LnF1ZXJ5U2VsZWN0b3IoJ3AnKTtcbiAgICAgICAgaWYgKHBhcmFncmFwaCkge1xuICAgICAgICAgIHBhcmFncmFwaC5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJzZWxlY3RhYmxlLXRleHQgY29weWFibGUtdGV4dCB4a3JoMTR6XCIgZGF0YS1sZXhpY2FsLXRleHQ9XCJ0cnVlXCI+JHt0ZXh0QXJnfTwvc3Bhbj5gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEZhbGxiYWNrOiBjcmVhdGUgdGhlIHN0cnVjdHVyZSBmcm9tIHNjcmF0Y2hcbiAgICAgICAgICBjaGF0SW5wdXQuaW5uZXJIVE1MID0gYDxwIGNsYXNzPVwic2VsZWN0YWJsZS10ZXh0IGNvcHlhYmxlLXRleHQgeDE1YmpiNnQgeDFuMm9ucjZcIiBkaXI9XCJsdHJcIiBzdHlsZT1cInRleHQtaW5kZW50OiAwcHg7IG1hcmdpbi10b3A6IDBweDsgbWFyZ2luLWJvdHRvbTogMHB4O1wiPjxzcGFuIGNsYXNzPVwic2VsZWN0YWJsZS10ZXh0IGNvcHlhYmxlLXRleHQgeGtyaDE0elwiIGRhdGEtbGV4aWNhbC10ZXh0PVwidHJ1ZVwiPiR7dGV4dEFyZ308L3NwYW4+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgZXZlbnRzIHNwZWNpZmljYWxseSBmb3IgTGV4aWNhbCBlZGl0b3JcbiAgICAgICAgY29uc3QgaW5wdXRFdmVudCA9IG5ldyBJbnB1dEV2ZW50KCdpbnB1dCcsIHtcbiAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgICAgaW5wdXRUeXBlOiAnaW5zZXJ0VGV4dCcsXG4gICAgICAgICAgZGF0YTogdGV4dEFyZ1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbXBvc2l0aW9uRW5kRXZlbnQgPSBuZXcgQ29tcG9zaXRpb25FdmVudCgnY29tcG9zaXRpb25lbmQnLCB7XG4gICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgIGRhdGE6IHRleHRBcmdcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNwYXRjaCBldmVudHMgaW4gdGhlIGNvcnJlY3Qgb3JkZXIgZm9yIExleGljYWxcbiAgICAgICAgY2hhdElucHV0LmRpc3BhdGNoRXZlbnQoaW5wdXRFdmVudCk7XG4gICAgICAgIGNoYXRJbnB1dC5kaXNwYXRjaEV2ZW50KGNvbXBvc2l0aW9uRW5kRXZlbnQpO1xuICAgICAgICBjaGF0SW5wdXQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2tleXVwJywgeyBidWJibGVzOiB0cnVlIH0pKTtcbiAgICAgICAgY2hhdElucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gS2VlcCBmb2N1c1xuICAgICAgICBjaGF0SW5wdXQuZm9jdXMoKTtcblxuICAgICAgICAvLyBDb21wcmVoZW5zaXZlIHNlbmQgYnV0dG9uIHNlbGVjdG9ycyAoZXhjbHVkaW5nIGF0dGFjaCBhbmQgZW1vamkgYnV0dG9ucylcbiAgICAgICAgY29uc3QgU0VORF9CVVRUT05fU0VMRUNUT1JTID0gW1xuICAgICAgICAgICdbZGF0YS10ZXN0aWQ9XCJzZW5kXCJdJyxcbiAgICAgICAgICAnW2FyaWEtbGFiZWwqPVwiU2VuZFwiXTpub3QoW3RpdGxlPVwiQXR0YWNoXCJdKTpub3QoW2FyaWEtaGFzcG9wdXA9XCJtZW51XCJdKTpub3QoW2RhdGEtaWNvbj1cImVtb2ppXCJdKTpub3QoW2FyaWEtbGFiZWwqPVwiZW1vamlcIl0pOm5vdChbYXJpYS1sYWJlbCo9XCJFbW9qaVwiXSknLFxuICAgICAgICAgICdidXR0b25bZGF0YS1pY29uPVwic2VuZFwiXScsXG4gICAgICAgICAgJ2Zvb3RlciBidXR0b246bm90KFtkYXRhLWljb249XCJwbHVzLXJvdW5kZWRcIl0pOm5vdChbdGl0bGU9XCJBdHRhY2hcIl0pOm5vdChbYXJpYS1oYXNwb3B1cD1cIm1lbnVcIl0pOm5vdChbZGF0YS1pY29uPVwiZW1vamlcIl0pOm5vdChbYXJpYS1sYWJlbCo9XCJlbW9qaVwiXSk6bm90KFthcmlhLWxhYmVsKj1cIkVtb2ppXCJdKScsXG4gICAgICAgICAgJyNtYWluIGZvb3RlciBidXR0b25bYXJpYS1sYWJlbD1cIlNlbmRcIl0nLFxuICAgICAgICAgICdmb290ZXIgYnV0dG9uW2RhdGEtdGVzdGlkPVwic2VuZFwiXSdcbiAgICAgICAgXTtcblxuICAgICAgICBpZiAoYXV0b1NlbmQpIHtcbiAgICAgICAgICBsZXQgc2VuZEJ1dHRvbiA9IG51bGw7XG4gICAgICAgICAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBTRU5EX0JVVFRPTl9TRUxFQ1RPUlMpIHtcbiAgICAgICAgICAgIHNlbmRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIGlmIChzZW5kQnV0dG9uKSB7XG4gICAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgY2hlY2sgdG8gZW5zdXJlIHdlJ3JlIG5vdCBjbGlja2luZyB0aGUgYXR0YWNoIG9yIGVtb2ppIGJ1dHRvblxuICAgICAgICAgICAgICBjb25zdCBpc0F0dGFjaEJ1dHRvbiA9IHNlbmRCdXR0b24uZ2V0QXR0cmlidXRlKCd0aXRsZScpID09PSAnQXR0YWNoJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRCdXR0b24uZ2V0QXR0cmlidXRlKCdhcmlhLWhhc3BvcHVwJykgPT09ICdtZW51JyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZEJ1dHRvbi5xdWVyeVNlbGVjdG9yKCdbZGF0YS1pY29uPVwicGx1cy1yb3VuZGVkXCJdJyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBjb25zdCBpc0Vtb2ppQnV0dG9uID0gc2VuZEJ1dHRvbi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWNvbicpID09PSAnZW1vamknIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRCdXR0b24uZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyk/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2Vtb2ppJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZEJ1dHRvbi5xdWVyeVNlbGVjdG9yKCdbZGF0YS1pY29uPVwiZW1vamlcIl0nKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGlmICghaXNBdHRhY2hCdXR0b24gJiYgIWlzRW1vamlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBzZW5kQnV0dG9uLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhcmdzOiBbbXNnLnRleHQsICEhbXNnLmF1dG9TZW5kXVxuICAgIH0pO1xuXG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IHRydWUgfSk7XG4gIH0pKCkuY2F0Y2goZXJyID0+IHtcbiAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycj8ubWVzc2FnZSB8fCBlcnIpIH0pO1xuICB9KTtcblxuICAvLyBrZWVwIHRoZSBtZXNzYWdlIGNoYW5uZWwgb3BlbiBmb3IgYXN5bmMgc2VuZFJlc3BvbnNlXG4gIHJldHVybiB0cnVlXG59KTsiXSwibmFtZXMiOltdLCJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMubWFwIn0=
 globalThis.define=__define;  })(globalThis.define);