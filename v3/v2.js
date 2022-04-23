'use strict';

// Tests:
// https://mail.google.com/mail/u/0/#inbox
// https://drive.google.com/drive/my-drive

const v2 = {};

v2.headersReceived = d => {
  const {responseHeaders} = d;
  for (const c of v2.headersReceived.methods) {
    c(d);
  }

  return {responseHeaders};
};
v2.headersReceived.methods = [];

v2.beforeSendHeaders = d => {
  const {requestHeaders} = d;
  for (const c of v2.beforeSendHeaders.methods) {
    c(d);
  }

  return {requestHeaders};
};
v2.beforeSendHeaders.methods = [];

v2.install = prefs => {
  v2.prefs = prefs;
  chrome.webRequest.onHeadersReceived.removeListener(v2.headersReceived);
  chrome.webRequest.onHeadersReceived.addListener(v2.headersReceived, {
    urls: ['<all_urls>']
  }, ['blocking', 'responseHeaders', 'extraHeaders']);

  chrome.webRequest.onBeforeSendHeaders.removeListener(v2.beforeSendHeaders);

  const m = ['requestHeaders'];
  if (v2.prefs['fix-origin']) {
    m.push('blocking', 'extraHeaders');
  }
  chrome.webRequest.onBeforeSendHeaders.addListener(v2.beforeSendHeaders, {
    urls: ['<all_urls>']
  }, m);
};
v2.remove = () => {
  chrome.webRequest.onHeadersReceived.removeListener(v2.headersReceived);
  chrome.webRequest.onBeforeSendHeaders.removeListener(v2.beforeSendHeaders);
};

// Access-Control-Allow-Headers for OPTIONS
{
  const cache = {};

  v2.beforeSendHeaders.methods.push(d => {
    if (d.method === 'OPTIONS') {
      const r = d.requestHeaders.find(({name}) => name.toLowerCase() === 'access-control-request-headers');

      if (r) {
        cache[d.requestId] = r.value;
      }
    }
  });
  v2.headersReceived.methods.push(d => {
    if (d.method === 'OPTIONS' && cache[d.requestId]) {
      d.responseHeaders.push({
        'name': 'Access-Control-Allow-Headers',
        'value': cache[d.requestId]
      });
      delete cache[d.requestId];
    }
  });
}

// Access-Control-Allow-Origin
{
  const redirects = {};
  chrome.tabs.onRemoved.addListener(tabId => delete redirects[tabId]);

  v2.headersReceived.methods.push(d => {
    if (v2.prefs['overwrite-origin'] && d.type !== 'main_frame') {
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
    }
  });
}

// Referrer and Origin
{
  v2.beforeSendHeaders.methods.push(d => {
    if (v2.prefs['fix-origin']) {
      try {
        const o = new URL(d.url);
        d.requestHeaders.push({
          name: 'referer',
          value: d.url
        }, {
          name: 'origin',
          value: o.origin
        });
      }
      catch (e) {}
    }
  });
}
