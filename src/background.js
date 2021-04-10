'use strict';

// Tests:
// https://mail.google.com/mail/u/0/#inbox
// https://drive.google.com/drive/my-drive


const DEFAULT_METHODS = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK'];

const prefs = {
  'enabled': false,
  'overwrite-origin': true,
  'methods': DEFAULT_METHODS,
  'remove-x-frame': true,
  'allow-credentials': true,
  'allow-headers-value': '*',
  'allow-origin-value': '*',
  'expose-headers-value': '*',
  'allow-headers': false,
  'unblock-initiator': true
};

const redirects = {};
chrome.tabs.onRemoved.addListener(tabId => delete redirects[tabId]);
const cors = {};

cors.onBeforeRedirect = d => {
  if (d.type === 'main_frame') {
    return;
  }
  redirects[d.tabId] = redirects[d.tabId] || {};
  redirects[d.tabId][d.requestId] = true;
};

cors.onHeadersReceived = d => {
  if (d.type === 'main_frame') {
    return;
  }
  const {initiator, originUrl, responseHeaders, requestId, tabId} = d;
  let origin = '';

  const redirect = redirects[tabId] ? redirects[tabId][requestId] : false;
  if (prefs['unblock-initiator'] && redirect !== true) {
    try {
      const o = new URL(initiator || originUrl);
      origin = o.origin;
    }
    catch (e) {
      console.warn('cannot extract origin for initiator', initiator);
    }
  }
  else {
    origin = '*';
  }
  if (redirects[tabId]) {
    delete redirects[tabId][requestId];
  }

  if (prefs['overwrite-origin'] === true) {
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-origin');

    if (o) {
      if (o.value !== '*') {
        o.value = origin || prefs['allow-origin-value'];
      }
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Allow-Origin',
        'value': origin || prefs['allow-origin-value']
      });
    }
  }
  if (prefs.methods.length > 3) { // GET, POST, HEAD are mandatory
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-methods');
    if (o) {
      // only append methods that are not in the supported list
      o.value = [...new Set([...prefs.methods, ...o.value.split(/\s*,\s*/).filter(a => {
        return DEFAULT_METHODS.indexOf(a) === -1;
      })])].join(', ');
    }
    else {
      responseHeaders.push({
        'name': 'Access-Control-Allow-Methods',
        'value': prefs.methods.join(', ')
      });
    }
  }
  // The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*'
  // when the request's credentials mode is 'include'.
  if (prefs['allow-credentials'] === true) {
    const o = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-origin');
    if (!o || o.value !== '*') {
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
  }
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
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
  chrome.webRequest.onBeforeRedirect.addListener(cors.onBeforeRedirect, {
    urls: ['<all_urls>']
  });
};
cors.remove = () => {
  chrome.webRequest.onHeadersReceived.removeListener(cors.onHeadersReceived);
  chrome.webRequest.onBeforeRedirect.removeListener(cors.onBeforeRedirect);
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
  else if (menuItemId === 'tutorial') {
    chrome.tabs.create({
      url: 'https://www.youtube.com/watch?v=8berLeTjKDM'
    });
  }
  else if (['overwrite-origin', 'remove-x-frame', 'allow-credentials', 'allow-headers', 'unblock-initiator'].indexOf(menuItemId) !== -1) {
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

  chrome.storage.local.set(ps, () => chrome.storage.local.get({
    'allow-credentials': true,
    'unblock-initiator': true
  }, prefs => {
    if (prefs['allow-credentials'] && prefs['unblock-initiator'] === false) {
      alert(`CORS Unblock Extension

Conflicting Options:
The value of the 'Access-Control-Allow-Origin' header must not be '*' when the credentials mode is 'include'

How to Fix:
Either disable sending credentials or enable allow origin only for the request initiator`);
    }
  }));
});

/* init */
chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);
  /* context menu */
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

  const extra = chrome.contextMenus.create({
    title: 'Extra Options',
    contexts: ['browser_action']
  });

  chrome.contextMenus.create({
    title: 'Remove X-Frame-Options',
    type: 'checkbox',
    id: 'remove-x-frame',
    contexts: ['browser_action'],
    checked: prefs['remove-x-frame'],
    parentId: extra
  });
  chrome.contextMenus.create({
    title: 'Only Unblock Initiator',
    type: 'checkbox',
    id: 'unblock-initiator',
    contexts: ['browser_action'],
    checked: prefs['unblock-initiator'],
    parentId: extra
  });


  const menu = chrome.contextMenus.create({
    title: 'Access-Control-Allow-Methods Methods:',
    contexts: ['browser_action'],
    parentId: extra
  });
  for (const method of ['PUT', 'DELETE', 'OPTIONS', 'PATCH', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK']) {
    chrome.contextMenus.create({
      title: method,
      type: 'checkbox',
      id: method,
      contexts: ['browser_action'],
      checked: prefs.methods.indexOf(method) !== -1,
      parentId: menu
    });
  }

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
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
