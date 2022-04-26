// context menu
{
  const once = chrome.storage.local.get({
    'overwrite-origin': true,
    'allow-credentials': true,
    'allow-headers': false,
    'remove-csp': false,
    'remove-referer': false,
    'fix-origin': false,
    'remove-x-frame': true,
    'unblock-initiator': true,
    'fake-supported-methods': true,
    'methods': self.DEFAULT_METHODS
  }, prefs => {
    chrome.contextMenus.create({
      title: 'Test CORS',
      id: 'test-cors',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Usage Instruction',
      id: 'tutorial',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Enable Access-Control-Allow-Origin',
      type: 'checkbox',
      id: 'overwrite-origin',
      contexts: ['browser_action'],
      checked: prefs['overwrite-origin']
    });
    chrome.contextMenus.create({
      title: 'Enable Access-Control-Allow-Credentials',
      type: 'checkbox',
      id: 'allow-credentials',
      contexts: ['browser_action'],
      checked: prefs['allow-credentials']
    });
    chrome.contextMenus.create({
      title: 'Enable Access-Control-[Allow/Expose]-Headers',
      type: 'checkbox',
      id: 'allow-headers',
      contexts: ['browser_action'],
      checked: prefs['allow-headers']
    });
    chrome.contextMenus.create({
      id: 'extra',
      title: 'Extra Options',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Remove X-Frame-Options',
      type: 'checkbox',
      id: 'remove-x-frame',
      contexts: ['browser_action'],
      checked: prefs['remove-x-frame'],
      parentId: 'extra'
    });
    chrome.contextMenus.create({
      title: 'Remove "Content-Security-Policy" Headers',
      type: 'checkbox',
      id: 'remove-csp',
      contexts: ['browser_action'],
      checked: prefs['remove-csp'],
      parentId: 'extra'
    });
    chrome.contextMenus.create({
      id: 'referer',
      title: 'Add/Remove "referer" and "origin" Headers',
      contexts: ['browser_action'],
      parentId: 'extra'
    });
    chrome.contextMenus.create({
      title: 'Add same-origin "referer" and "origin" Headers',
      type: 'checkbox',
      id: 'fix-origin',
      contexts: ['browser_action'],
      checked: prefs['fix-origin'],
      parentId: 'referer'
    });
    chrome.contextMenus.create({
      title: 'Remove "referer" and "origin" Headers',
      type: 'checkbox',
      id: 'remove-referer',
      contexts: ['browser_action'],
      checked: prefs['remove-referer'],
      parentId: 'referer'
    });
    chrome.contextMenus.create({
      title: `Only Unblock Request's Initiator`,
      type: 'checkbox',
      id: 'unblock-initiator',
      contexts: ['browser_action'],
      checked: prefs['unblock-initiator'],
      parentId: 'extra'
    });
    chrome.contextMenus.create({
      title: 'Pretend Enabled Methods are Supported by Server',
      type: 'checkbox',
      id: 'fake-supported-methods',
      contexts: ['browser_action'],
      checked: prefs['fake-supported-methods'],
      parentId: 'extra'
    });
    chrome.contextMenus.create({
      title: 'Access-Control-Allow-Methods Methods:',
      contexts: ['browser_action'],
      parentId: 'extra',
      id: 'menu'
    });
    for (const method of ['PUT', 'DELETE', 'OPTIONS', 'PATCH', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK']) {
      chrome.contextMenus.create({
        title: method,
        type: 'checkbox',
        id: method,
        contexts: ['browser_action'],
        checked: prefs.methods.indexOf(method) !== -1,
        parentId: 'menu'
      });
    }
  });
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}
chrome.contextMenus.onClicked.addListener(({menuItemId, checked}) => {
  if (menuItemId === 'test-cors') {
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
      'fix-origin', 'remove-referer',
      'overwrite-origin', 'remove-x-frame', 'allow-credentials', 'allow-headers',
      'unblock-initiator', 'fake-supported-methods'
    ].includes(menuItemId)
  ) {
    console.log(menuItemId, checked);
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
