'use strict';

// Tests:
// https://mail.google.com/mail/u/0/#inbox
// https://drive.google.com/drive/my-drive

const redirects = {};
chrome.tabs.onRemoved.addListener(tabId => delete redirects[tabId]);

const v2 = {};
v2.install = prefs => {
  v2.prefs = prefs;
  chrome.webRequest.onHeadersReceived.removeListener(v2.observe);
  chrome.webRequest.onHeadersReceived.addListener(v2.observe, {
    urls: ['<all_urls>']
  }, ['blocking', 'responseHeaders', 'extraHeaders']);
};
v2.remove = () => {
  chrome.webRequest.onHeadersReceived.removeListener(v2.observe);
};
v2.observe = d => {
  if (d.type === 'main_frame') {
    return;
  }

  // Access-Control-Allow-Origin
  const {initiator, originUrl, responseHeaders} = d;
  let origin = '*';

  if (v2.prefs['unblock-initiator'] || v2.prefs['allow-credentials']) {
    if (!redirects[d.tabId] || !redirects[d.tabId][d.requestId]) {
      try {
        const o = new URL(initiator || originUrl);
        origin = o.origin;
      }
      catch (e) {}
    }
  }
  if (d.statusCode === 301 || d.statusCode === 302) {
    redirects[d.tabId] = redirects[d.tabId] || {};
    redirects[d.tabId][d.requestId] = true;
  }

  const r = responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-origin');

  if (r) {
    if (r.value !== '*') {
      r.value = origin;
    }
  }
  else {
    responseHeaders.push({
      'name': 'Access-Control-Allow-Origin',
      'value': origin
    });
  }

  return {responseHeaders};
};
