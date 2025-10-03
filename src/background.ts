chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  try {
    // Set the side panel options
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'src/sidepanel/index.html',
      enabled: true
    })
    
    // Open the side panel
    await chrome.sidePanel.open({
      tabId: tab.id
    })
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

// Enable side panel for all tabs by default
chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'src/sidepanel/index.html',
        enabled: true
      })
    } catch (error) {
      console.error('Failed to set side panel options:', error)
    }
  }
})