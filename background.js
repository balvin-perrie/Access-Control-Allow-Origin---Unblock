'use strict';

var prefs = {
  'enabled': false,
  'overwrite-origin': true,
  'overwrite-methods': true,
  'methods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']
};

var cors = {};
cors.onHeadersReceived = ({responseHeaders}) => {
  if (
    prefs['overwrite-origin'] === true ||
    responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-origin') === undefined
  ) {
    responseHeaders.push({
      'name': 'Access-Control-Allow-Origin',
      'value': '*'
    });
  }
  if (
    prefs['overwrite-methods'] === true ||
    responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-methods') === undefined
  ) {
    responseHeaders.push({
      'name': 'Access-Control-Allow-Origin',
      'value': '*'
    });
    responseHeaders.push({
      'name': 'Access-Control-Allow-Methods',
      'value': prefs.methods.join(', ')
    });
  }

  return {responseHeaders};
};
cors.install = () => {
  cors.remove();
  chrome.webRequest.onHeadersReceived.addListener(cors.onHeadersReceived, {
    urls: ['<all_urls>']
  }, ['blocking', 'responseHeaders', 'extraHeaders']);
};
cors.remove = () => {
  chrome.webRequest.onHeadersReceived.removeListener(cors.onHeadersReceived);
};

cors.onCommand = () => {
  if (prefs.enabled) {
    cors.install();
  }
  else {
    cors.remove();
  }
  chrome.browserAction.setIcon({
    path: {
      '16': 'data/icons/' + (prefs.enabled ? '' : 'disabled/') + '16.png',
      '19': 'data/icons/' + (prefs.enabled ? '' : 'disabled/') + '19.png',
      '32': 'data/icons/' + (prefs.enabled ? '' : 'disabled/') + '32.png',
      '38': 'data/icons/' + (prefs.enabled ? '' : 'disabled/') + '38.png',
      '48': 'data/icons/' + (prefs.enabled ? '' : 'disabled/') + '48.png',
      '64': 'data/icons/' + (prefs.enabled ? '' : 'disabled/') + '64.png'
    }
  });
  chrome.browserAction.setTitle({
    title: prefs.enabled ? 'Access-Control-Allow-Origin is unblocked' : 'Disabled: Default server behavior'
  });
};

chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(name => prefs[name] = ps[name].newValue);
  cors.onCommand();
});

chrome.browserAction.onClicked.addListener(() => chrome.storage.local.set({
  enabled: prefs.enabled === false
}));

chrome.contextMenus.onClicked.addListener(info => {
  const ps = {};
  if (info.menuItemId === 'overwrite-origin' || info.menuItemId === 'overwrite-methods') {
    ps[info.menuItemId] = info.checked;
  }
  else {
    if (info.checked) {
      prefs.methods.push(info.menuItemId);
    }
    else {
      const index = prefs.methods.indexOf(info.menuItemId);
      if (index !== -1) {
        prefs.methods.splice(index, 1);
      }
    }
    ps.methods = prefs.methods;
  }
  console.log(ps);
  chrome.storage.local.set(ps);
});

/* init */
chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);
  /* context menu */
  chrome.contextMenus.create({
    title: 'Overwrite access-control-allow-origin',
    type: 'checkbox',
    id: 'overwrite-origin',
    contexts: ['browser_action'],
    checked: prefs['overwrite-origin']
  });
  chrome.contextMenus.create({
    title: 'Overwrite access-control-allow-methods',
    type: 'checkbox',
    id: 'overwrite-methods',
    contexts: ['browser_action'],
    checked: prefs['overwrite-methods']
  });

  const menu = chrome.contextMenus.create({
    title: 'Methods',
    contexts: ['browser_action']
  });

  chrome.contextMenus.create({
    title: 'PUT',
    type: 'checkbox',
    id: 'PUT',
    contexts: ['browser_action'],
    checked: prefs.methods.indexOf('PUT') !== -1,
    parentId: menu
  });
  chrome.contextMenus.create({
    title: 'DELETE',
    type: 'checkbox',
    id: 'DELETE',
    contexts: ['browser_action'],
    checked: prefs.methods.indexOf('DELETE') !== -1,
    parentId: menu
  });
  chrome.contextMenus.create({
    title: 'OPTIONS',
    type: 'checkbox',
    id: 'OPTIONS',
    contexts: ['browser_action'],
    checked: prefs.methods.indexOf('OPTIONS') !== -1,
    parentId: menu
  });
  chrome.contextMenus.create({
    title: 'PATCH',
    type: 'checkbox',
    id: 'PATCH',
    contexts: ['browser_action'],
    checked: prefs.methods.indexOf('PATCH') !== -1,
    parentId: menu
  });

  cors.onCommand();
});
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
