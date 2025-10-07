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

    function query(queryInfo: { active?: boolean; currentWindow?: boolean; lastFocusedWindow?: boolean }): Promise<Tab[]>;
    const onUpdated: onUpdatedEvent;
  }

  namespace scripting {
    interface ExecuteScriptDetails {
      target: { tabId: number };
      func: (...args: any[]) => any;
      args?: any[];
    }

    interface ExecuteScriptResult {
      result?: any;
    }

    function executeScript(details: ExecuteScriptDetails, callback?: (results: ExecuteScriptResult[]) => void): Promise<ExecuteScriptResult[]>;
  }

  namespace runtime {
    interface LastError {
      message?: string;
    }

    const lastError: LastError | undefined;
  }
}