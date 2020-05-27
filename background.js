'use strict';

const prefs = {
  'enabled': false,
  'overwrite-origin': true,
  'methods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'],
  'remove-x-frame': true,
  'allow-credentials': true,
  'allow-headers-value': '*',
  'expose-headers-value': '*',
  'allow-headers': true
};

const cors = {};
cors.onHeadersReceived = ({responseHeaders}) => {
  if (prefs['overwrite-origin'] === true) {
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-origin');
    if (o) {
      o.value = '*';
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Allow-Origin',
        'value': '*'
      });
    }
  }
  if (prefs.methods.length > 3) { // GET, POST, HEAD are mandatory
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-methods');
    if (o) {
      o.value = prefs.methods.join(', ');
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Allow-Methods',
        'value': prefs.methods.join(', ')
      });
    }
  }
  if (prefs['allow-credentials'] === true) {
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-credentials');
    if (o) {
      o.value = 'true';
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Allow-Credentials',
        'value': 'true'
      });
    }
  }
  if (prefs['allow-headers'] === true) {
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-headers');
    if (o) {
      o.value = prefs['allow-headers-value'];
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Allow-Headers',
        'value': prefs['allow-headers-value']
      });
    }
  }
  if (prefs['allow-headers'] === true) {
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-expose-headers');
    if (o) {
      o.value = prefs['expose-headers-value'];
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Expose-Headers',
        'value': prefs['expose-headers-value']
      });
    }
  }
  if (prefs['remove-x-frame'] === true) {
    const i = responseHeaders.findIndex(({name}) => name.toLowerCase() === 'x-frame-options');
    if (i !== -1) {
      responseHeaders.splice(i, 1);
    }
  }
  return {responseHeaders};
};
cors.install = () => {
  cors.remove();
  const extra = ['blocking', 'responseHeaders'];
  if (/Firefox/.test(navigator.userAgent) === false) {
    extra.push('extraHeaders');
  }
  chrome.webRequest.onHeadersReceived.addListener(cors.onHeadersReceived, {
    urls: ['<all_urls>']
  }, extra);
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

chrome.contextMenus.onClicked.addListener(({menuItemId, checked}) => {
  const ps = {};
  if (menuItemId === 'test-cors') {
    chrome.tabs.create({
      url: 'https://webbrowsertools.com/test-cors/'
    });
  }
  else if (['overwrite-origin', 'remove-x-frame', 'allow-credentials', 'allow-headers'].indexOf(menuItemId) !== -1) {
    ps[menuItemId] = checked;
  }
  else {
    if (checked) {
      prefs.methods.push(menuItemId);
    }
    else {
      const index = prefs.methods.indexOf(menuItemId);
      if (index !== -1) {
        prefs.methods.splice(index, 1);
      }
    }
    ps.methods = prefs.methods;
  }
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

  const menu = chrome.contextMenus.create({
    title: 'Access-Control-Allow-Methods Methods:',
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

  chrome.contextMenus.create({
    title: 'Remove X-Frame-Options',
    type: 'checkbox',
    id: 'remove-x-frame',
    contexts: ['browser_action'],
    checked: prefs['remove-x-frame']
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
    title: 'Test CORS',
    id: 'test-cors',
    contexts: ['browser_action']
  });

  cors.onCommand();
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
