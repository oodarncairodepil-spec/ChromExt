declare namespace chrome {
  namespace action {
    interface onClickedEvent {
      addListener(callback: (tab: chrome.tabs.Tab) => void): void;
    }
    const onClicked: onClickedEvent;
  }

  namespace sidePanel {
    interface SetOptionsDetails {
      tabId?: number;
      path: string;
      enabled: boolean;
    }

    interface OpenDetails {
      tabId?: number;
    }

    function setOptions(details: SetOptionsDetails): Promise<void>;
    function open(details: OpenDetails): Promise<void>;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
    }

    interface TabChangeInfo {
      status?: string;
      url?: string;
    }

    interface onUpdatedEvent {
      addListener(callback: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void): void;
    }

    const onUpdated: onUpdatedEvent;
  }
}