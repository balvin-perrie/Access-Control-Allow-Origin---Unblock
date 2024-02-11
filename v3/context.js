/* global notify */
{
  const once = () => chrome.storage.local.get({
    'overwrite-origin': true,
    'allow-credentials': true,
    'allow-headers': false,
    'remove-csp': false,
    'allow-shared-array-buffer': false,
    'remove-referer': false,
    'fix-origin': false,
    'remove-x-frame': true,
    'unblock-initiator': true,
    'fake-supported-methods': true,
    'methods': self.DEFAULT_METHODS,
    'status-code-methods': self.DEFAULT_STATUS_METHODS
  }, prefs => {
    chrome.contextMenus.create({
      title: 'Test CORS',
      id: 'test-cors',
      contexts: ['browser_action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Usage Instruction',
      id: 'tutorial',
      contexts: ['browser_action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Enable Access-Control-Allow-Origin',
      type: 'checkbox',
      id: 'overwrite-origin',
      contexts: ['browser_action'],
      checked: prefs['overwrite-origin']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Enable Access-Control-Allow-Credentials',
      type: 'checkbox',
      id: 'allow-credentials',
      contexts: ['browser_action'],
      checked: prefs['allow-credentials']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Enable Access-Control-[Allow/Expose]-Headers',
      type: 'checkbox',
      id: 'allow-headers',
      contexts: ['browser_action'],
      checked: prefs['allow-headers']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'extra',
      title: 'Extra Options',
      contexts: ['browser_action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Remove X-Frame-Options',
      type: 'checkbox',
      id: 'remove-x-frame',
      contexts: ['browser_action'],
      checked: prefs['remove-x-frame'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Remove "Content-Security-Policy" Headers',
      type: 'checkbox',
      id: 'remove-csp',
      contexts: ['browser_action'],
      checked: prefs['remove-csp'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Append Headers to Allow Shared Array Buffer',
      type: 'checkbox',
      id: 'allow-shared-array-buffer',
      contexts: ['browser_action'],
      checked: prefs['allow-shared-array-buffer'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'referer',
      title: 'Add/Remove "referer" and "origin" Headers',
      contexts: ['browser_action'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Add same-origin "referer" and "origin" Headers',
      type: 'checkbox',
      id: 'fix-origin',
      contexts: ['browser_action'],
      checked: prefs['fix-origin'],
      parentId: 'referer'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Remove "referer" and "origin" Headers',
      type: 'checkbox',
      id: 'remove-referer',
      contexts: ['browser_action'],
      checked: prefs['remove-referer'],
      parentId: 'referer'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: `Only Unblock Request's Initiator`,
      type: 'checkbox',
      id: 'unblock-initiator',
      contexts: ['browser_action'],
      checked: prefs['unblock-initiator'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Pretend Enabled Methods are Supported by Server',
      type: 'checkbox',
      id: 'fake-supported-methods',
      contexts: ['browser_action'],
      checked: prefs['fake-supported-methods'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Access-Control-Allow-Methods Methods:',
      contexts: ['browser_action'],
      parentId: 'extra',
      id: 'menu'
    }, () => chrome.runtime.lastError);
    for (const method of self.DEFAULT_METHODS) {
      if (['GET', 'POST', 'HEAD'].includes(method)) {
        continue;
      }
      chrome.contextMenus.create({
        title: method,
        type: 'checkbox',
        id: method,
        contexts: ['browser_action'],
        checked: prefs.methods.includes(method),
        parentId: 'menu'
      }, () => chrome.runtime.lastError);
    }
    chrome.contextMenus.create({
      title: 'Overwrite 4xx Status Code For This Tab',
      contexts: ['browser_action'],
      parentId: 'extra',
      id: 'status-code',
      enabled: Boolean(chrome.debugger)
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Enable on This Tab',
      contexts: ['browser_action'],
      parentId: 'status-code',
      id: 'status-code-enable'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Disable on This Tab',
      contexts: ['browser_action'],
      parentId: 'status-code',
      id: 'status-code-disable'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      title: 'Overwrite 4xx Status Code Methods',
      contexts: ['browser_action'],
      parentId: 'extra',
      id: 'status-code-methods',
      enabled: Boolean(chrome.debugger)
    }, () => chrome.runtime.lastError);
    for (const method of self.DEFAULT_STATUS_METHODS) {
      chrome.contextMenus.create({
        title: method,
        type: 'checkbox',
        id: 'status-code-methods-' + method,
        contexts: ['browser_action'],
        checked: prefs['status-code-methods'].includes(method),
        parentId: 'status-code-methods'
      }, () => chrome.runtime.lastError);
    }
  });
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}

const debug = async (source, method, params) => {
  if (method === 'Fetch.requestPaused') {
    const opts = {
      requestId: params.requestId
    };
    const status = params.responseStatusCode;
    if (status && status >= 400 && status < 500) {
      const methods = await new Promise(resolve => chrome.storage.local.get({
        'status-code-methods': self.DEFAULT_STATUS_METHODS
      }, prefs => resolve(prefs['status-code-methods'])));

      const method = params.request?.method;
      if (method && methods.includes(method)) {
        opts.responseCode = 200;
        opts.responseHeaders = params.responseHeaders || [];
      }
    }

    if (chrome.debugger) {
      chrome.debugger.sendCommand({
        tabId: source.tabId
      }, 'Fetch.continueResponse', opts);
    }
  }
};

chrome.contextMenus.onClicked.addListener(({menuItemId, checked}, tab) => {
  if (menuItemId === 'status-code-enable' || menuItemId === 'status-code-disable') {
    chrome.debugger.onEvent.removeListener(debug);
    chrome.debugger.onEvent.addListener(debug);

    if (menuItemId === 'status-code-enable') {
      chrome.storage.local.get({
        enabled: false
      }, prefs => {
        if (prefs.enabled) {
          const target = {
            tabId: tab.id
          };

          chrome.debugger.attach(target, '1.2', () => {
            const {lastError} = chrome.runtime;
            if (lastError) {
              console.warn(lastError);
              notify(lastError.message);
            }
            else {
              chrome.debugger.sendCommand(target, 'Fetch.enable', {
                patterns: [{
                  requestStage: 'Response'
                }]
              });
            }
          });
        }
        else {
          notify('To overwrite status codes, enable the extension first');
        }
      });
    }
    else {
      chrome.debugger.detach({
        tabId: tab.id
      }, () => chrome.runtime.lastError);
    }
  }
  else if (menuItemId.startsWith('status-code-methods-')) {
    chrome.storage.local.get({
      'status-code-methods': self.DEFAULT_STATUS_METHODS
    }, prefs => {
      const methods = new Set(prefs['status-code-methods']);
      const method = menuItemId.replace('status-code-methods-', '');

      methods[checked ? 'add' : 'delete'](method);
      chrome.storage.local.set({
        'status-code-methods': [...methods]
      });
    });
  }
  else if (menuItemId === 'test-cors') {
    chrome.tabs.create({
      url: 'https://webbrowsertools.com/test-cors/'
    });
  }
  else if (menuItemId === 'tutorial') {
    chrome.tabs.create({
      url: 'https://www.youtube.com/watch?v=8berLeTjKDM'
    });
  }
  else if (
    [
      'remove-csp',
      'allow-shared-array-buffer',
      'fix-origin', 'remove-referer',
      'overwrite-origin', 'remove-x-frame', 'allow-credentials', 'allow-headers',
      'unblock-initiator', 'fake-supported-methods'
    ].includes(menuItemId)
  ) {
    chrome.storage.local.set({
      [menuItemId]: checked
    });
  }
  else {
    chrome.storage.local.get({
      methods: self.DEFAULT_METHODS
    }, prefs => {
      if (checked) {
        prefs.methods.push(menuItemId);
      }
      else {
        const index = prefs.methods.indexOf(menuItemId);
        if (index !== -1) {
          prefs.methods.splice(index, 1);
        }
      }
      chrome.storage.local.set(prefs);
    });
  }
});

if (chrome.debugger) {
  chrome.storage.onChanged.addListener(ps => {
    if (ps.enabled) {
      chrome.debugger.getTargets(os => {
        for (const o of os.filter(o => o.attached && o.type === 'page' && o.tabId)) {
          chrome.debugger.detach({
            tabId: o.tabId
          }, () => chrome.runtime.lastError);
        }
      });
    }
  });
}
