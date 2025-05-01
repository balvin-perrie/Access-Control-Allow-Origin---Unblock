const DEFALUT_PREFS = {
  'COPY': false,
  'DELETE': true,
  'GET': true,
  'HEAD': true,
  'LOCK': false,
  'MKCOL': false,
  'MOVE': false,
  'OPTIONS': true,
  'PATCH': true,
  'POST': true,
  'PROPFIND': false,
  'PROPPATCH': false,
  'PUT': true,
  'acam-1': false,
  'acam-2': true,
  'acao-1': false,
  'acao-2': true,
  'acao-4': false,
  'access-control-allow-credentials-enabled': true,
  'access-control-allow-headers-enabled': false,
  'access-control-allow-methods-checkbox': true,
  'access-control-allow-origin-checkbox': true,
  'access-control-expose-headers-enabled': false,
  'access-control-request-headers-enabled': false,
  'content-security-policy-enabled': false,
  'fake-supported-methods': true,
  'fix-redirect-checkbox': false,
  'fix-origin': false,
  'overwrite-4xx-checkbox': false,
  'overwrite-501-checkbox': false,
  'shared-array-buffer-enabled': true,
  'x-frame-options-enabled': true,
  'add-origin': false,
  'aor-1': false,
  'aor-2': true,
  'add-referer': false,
  'arr-1': false,
  'arr-2': true
};

const args = new URLSearchParams(location.search);
const tabId = Number(args.get('id'));
chrome.runtime.sendMessage({
  method: 'terminate-if',
  tabId
}).catch(e => {});
const START = Number(args.get('start'));
let o;
try {
  o = new URL(args.get('href'));
}
catch (e) {
  o = {
    hostname: '*',
    origin: '*'
  };
}

const ttl = status => {
  if (status) {
    document.title = `[${status}] ` + 'CORS Unblock :: ' + args.get('title');
  }
  else {
    document.title = 'CORS Unblock :: ' + args.get('title');
  }
};
ttl();

const toast = document.getElementById('toast');
const notify = msg => {
  clearTimeout(notify.id);
  toast.textContent = msg;
  notify.id = setTimeout(() => toast.textContent = '', 2000);
};

// Access-Control-Allow-Origin
// document.querySelector('input[data-id="acao-1"]').value = o.origin;
document.querySelector('span[data-id="acao-3"]').textContent = o.origin;

const update = async reason => {
  ttl('Running');
  onbeforeunload = e => {
    e.preventDefault(); // Some browsers require this
    e.returnValue = ''; // Required for most browsers to show a prompt
    return ''; // For older browsers
  };

  await chrome.debugger.detach({tabId}).catch(() => {});

  const rules = [];
  // Access-Control-Allow-Origin
  if (document.getElementById('access-control-allow-origin-checkbox').checked) {
    let value = document.querySelector('input[name="access-control-allow-origin-radio"]:checked').value;
    if (value === '[origin]') {
      value = o.origin;
    }
    else if (value === '[custom]') {
      value = document.querySelector('input[data-id="acao-5"]').value;
    }
    rules.push({
      id: START + 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Access-Control-Allow-Origin',
          operation: 'set',
          value
        }]
      },
      condition: {
        resourceTypes: ['xmlhttprequest'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('access-control-allow-methods-checkbox').checked) {
    let value = document.querySelector('input[name="access-control-allow-methods-radio"]:checked').value;
    if (value === 'defined') {
      const methods = [];
      const f = new FormData(document.getElementById('methods'));
      for (const method of f.keys()) {
        methods.push(method);
      }
      value = methods.join(', ');
    }
    rules.push({
      id: START + 2,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Access-Control-Allow-Methods',
          operation: 'set',
          value
        }]
      },
      condition: {
        resourceTypes: ['xmlhttprequest'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('access-control-allow-credentials-enabled').checked) {
    rules.push({
      id: START + 3,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Access-Control-Allow-Credentials',
          operation: 'set',
          value: 'true'
        }]
      },
      condition: {
        resourceTypes: ['xmlhttprequest'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('access-control-allow-headers-enabled').checked) {
    rules.push({
      id: START + 4,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Access-Control-Allow-Headers',
          operation: 'set',
          value: '*'
        }]
      },
      condition: {
        excludedRequestMethods: ['options'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('access-control-expose-headers-enabled').checked) {
    rules.push({
      id: START + 5,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Access-Control-Expose-Headers',
          operation: 'set',
          value: '*'
        }]
      },
      condition: {
        excludedRequestMethods: ['options'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('x-frame-options-enabled').checked) {
    rules.push({
      id: START + 6,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'x-frame-options',
          operation: 'remove'
        }]
      },
      condition: {
        resourceTypes: ['sub_frame'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('content-security-policy-enabled').checked) {
    rules.push({
      id: START + 7,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'content-security-policy',
          operation: 'remove'
        }, {
          header: 'content-security-policy-report-only',
          operation: 'remove'
        }, {
          header: 'x-webkit-csp',
          operation: 'remove'
        }, {
          header: 'x-content-security-policy',
          operation: 'remove'
        }]
      },
      condition: {
        resourceTypes: ['main_frame'],
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('shared-array-buffer-enabled').checked) {
    rules.push({
      id: START + 8,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Cross-Origin-Opener-Policy',
          operation: 'set',
          value: 'same-origin'
        }, {
          header: 'Cross-Origin-Embedder-Policy',
          operation: 'set',
          value: 'require-corp'
        }]
      },
      condition: {
        resourceTypes: ['main_frame', 'script', 'image'],
        tabIds: [tabId]
      }
    }, {
      id: START + 9,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{
          header: 'Cross-Origin-Resource-Policy',
          operation: 'set',
          value: 'cross-origin'
        }]
      },
      condition: {
        tabIds: [tabId]
      }
    });
  }
  if (document.getElementById('fake-supported-methods').checked) {
    const methods = [];
    const f = new FormData(document.getElementById('methods'));
    for (const method of f.keys()) {
      methods.push(method);
    }
    rules.push({
      'id': START + 10,
      'action': {
        'type': 'modifyHeaders',
        'responseHeaders': [{
          'operation': 'set',
          'header': 'Allow',
          'value': methods.join(', ')
        }]
      },
      'condition': {
        'requestMethods': ['options']
      }
    });
  }
  // limit scope
  const scope = document.querySelector('input[name="urlFilter"]').value;
  if (scope) {
    for (const rule of rules) {
      if (rule.condition.resourceTypes) {
        if (rule.condition.resourceTypes.includes('main_frame') || rule.condition.resourceTypes.includes('sub_frame')) {
          continue;
        }
      }
      rule.condition.urlFilter = scope;
    }
  }
  console.info('[network rules]', rules);

  chrome.declarativeNetRequest.updateSessionRules({
    addRules: rules,
    removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => START + n)
  }).catch(e => {
    console.error(e);
    alert('Network modification failed:\n\n--\n' + e.message);
  });

  // Status code
  if (
    document.getElementById('overwrite-4xx-checkbox').checked ||
    document.getElementById('overwrite-501-checkbox').checked ||
    document.getElementById('access-control-request-headers-enabled').checked ||
    document.getElementById('fix-redirect-checkbox').checked ||
    document.getElementById('add-origin').checked ||
    document.getElementById('add-referer').checked
  ) {
    const patterns = [];
    if (
      document.getElementById('overwrite-4xx-checkbox').checked ||
      document.getElementById('overwrite-501-checkbox').checked ||
      document.getElementById('access-control-request-headers-enabled').checked ||
      document.getElementById('fix-redirect-checkbox').checked
    ) {
      patterns.push({requestStage: 'Response'});
    }
    if (
      document.getElementById('add-origin').checked ||
      document.getElementById('add-referer').checked
    ) {
      patterns.push({requestStage: 'Request'});
    }

    await chrome.debugger.attach({tabId}, '1.3');
    await chrome.debugger.sendCommand({tabId}, 'Fetch.enable', {
      patterns
    });
  }
};

const observe = {};
observe.response = (source, params) => {
  const opts = {
    requestId: params.requestId,
    responseHeaders: params.responseHeaders || []
  };
  let overwrite = false;

  if (document.getElementById('access-control-request-headers-enabled').checked) {
    if (params.request?.method === 'OPTIONS') {
      if ('Access-Control-Request-Headers' in params.request.headers) {
        opts.responseHeaders.push({
          name: 'Access-Control-Allow-Headers',
          value: params.request.headers['Access-Control-Request-Headers']
        });
        overwrite = true;
      }
    }
  }
  if (document.getElementById('overwrite-4xx-checkbox').checked) {
    if (params.responseStatusCode >= 400 && params.responseStatusCode < 500) {
      opts.responseCode = 200;
      overwrite = true;
    }
  }
  if (document.getElementById('overwrite-501-checkbox').checked) {
    if (params.responseStatusCode === 501) {
      opts.responseCode = 200;
      opts.body = btoa('Supported\n');
      overwrite = true;
    }
  }

  if (document.getElementById('fix-redirect-checkbox').checked) {
    if (
      params.responseStatusCode === 301 ||
      params.responseStatusCode === 302
    ) {
      const loc = opts.responseHeaders.find(o => o.name === 'location');
      const {origin} = new URL(loc.value);

      const r = opts.responseHeaders.find(o => o.name === 'access-control-allow-origin');
      if (r) {
        if (r.value !== '*') {
          opts.responseCode = params.responseStatusCode;
          r.value = origin;
          overwrite = true;
        }
      }
      else {
        opts.responseCode = params.responseStatusCode;
        opts.responseHeaders.push({
          'name': 'Access-Control-Allow-Origin',
          'value': origin
        });
        overwrite = true;
      }
    }
    if (params.redirectedRequestId) {
      const origin = '*';
      const r = opts.responseHeaders.find(o => o.name === 'access-control-allow-origin');
      if (r) {
        opts.responseCode = params.responseStatusCode;
        r.value = origin;
        overwrite = true;
      }
      else {
        opts.responseCode = params.responseStatusCode;
        opts.responseHeaders.push({
          'name': 'Access-Control-Allow-Origin',
          'value': origin
        });
        overwrite = true;
      }
    }
  }

  if (overwrite) {
    chrome.debugger.sendCommand(source, 'Fetch.fulfillRequest', opts);
  }
  else {
    chrome.debugger.sendCommand(source, 'Fetch.continueRequest', {
      requestId: params.requestId
    });
  }
};
observe.request = (source, params) => {
  const opts = {
    requestId: params.requestId
  };
  const headers = new Map();
  if (document.getElementById('add-origin').checked) {
    const type = document.querySelector('[name="add-origin-radio"]:checked').value;
    try {
      if (type === 'same') {
        const v = new URL(params.request.url);
        headers.set('origin', v.origin);
      }
      else {
        headers.set('origin', o.origin);
      }
    }
    catch (e) {}
  }
  if (document.getElementById('add-referer').checked) {
    const type = document.querySelector('[name="add-referer-radio"]:checked').value;
    try {
      if (type === 'same') {
        headers.set('referer', params.request.url);
      }
      else if (type === 'page') {
        headers.set('referer', o.href);
      }
    }
    catch (e) {}
  }
  if (headers.size) {
    opts.headers = Object.entries(params.request.headers).map(([name, value]) => ({
      name,
      value
    }));
    for (const [name, value] of headers) {
      opts.headers.push({name, value});
    }
  }
  chrome.debugger.sendCommand(source, 'Fetch.continueRequest', opts);
};

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (source.tabId !== tabId) {
    return;
  }
  if (method === 'Fetch.requestPaused') {
    if (params.responseHeaders) {
      observe.response(source, params);
    }
    else {
      observe.request(source, params);
    }
  }
});

// update
const load = prefs => {
  for (const input of document.querySelectorAll('#rules input')) {
    const value = prefs[input.dataset.id || input.name || input.id];
    if (input.type === 'radio' || input.type === 'checkbox') {
      input.checked = value || false;
    }
    else {
      input.value = value || '';
    }
  }
};
chrome.storage.local.get(null, ps => {
  if (('prefs-' + o.hostname) in ps) {
    load(ps['prefs-' + o.hostname]);
  }
  else if ('prefs-*' in ps) {
    load(ps['prefs-*']);
  }
  else {
    load(DEFALUT_PREFS);
  }
});
document.getElementById('start').onclick = e => {
  update(e.target.value);
  notify(`CORS unblocking is ${e.target.value.toLowerCase()}ed for this tab`);
  e.target.value = 'Restart';
  chrome.action.setIcon({
    tabId,
    path: {
      '16': '/data/icons/16.png',
      '32': '/data/icons/32.png',
      '48': '/data/icons/48.png'
    }
  });
};

// save
document.getElementById('save-hostname').onclick = async () => {
  const prefs = {};
  for (const input of document.querySelectorAll('#rules input')) {
    const value = input.type === 'radio' || input.type === 'checkbox' ? input.checked : input.value;
    prefs[input.dataset.id || input.name || input.id] = value;
  }
  await chrome.storage.local.set({
    ['prefs-' + o.hostname]: prefs
  });
  notify('Rules for this hostname are Saved');
};
document.getElementById('save-all').onclick = async () => {
  const prefs = {};
  for (const input of document.querySelectorAll('#rules input')) {
    const value = input.type === 'radio' || input.type === 'checkbox' ? input.checked : input.value;
    prefs[input.dataset.id || input.name || input.id] = value;
  }
  await chrome.storage.local.set({
    ['prefs-*']: prefs
  });
  notify('Rules for all hostnames are Saved');
};
document.getElementById('load-all').onclick = () => chrome.storage.local.get({
  'prefs-*': DEFALUT_PREFS
}, ps => {
  notify('Loading rules from storage for all hostnames');
  load(ps['prefs-*']);
});
document.getElementById('load-hostname').onclick = async () => {
  const prefs = await chrome.storage.local.get({
    ['prefs-' + o.hostname]: DEFALUT_PREFS
  });
  load(prefs['prefs-' + o.hostname]);
  notify('Loading rules from storage for this hostname');
};

document.getElementById('delete-hostname').onclick = async () => {
  await chrome.storage.local.remove('prefs-' + o.hostname);
  notify('Rules for this hostname are deleted');
};
document.getElementById('delete-all').onclick = async () => {
  await chrome.storage.local.remove('prefs-*');
  notify('Reset to default.');
};
document.getElementById('terminate').onclick = async () => {
  await chrome.debugger.detach({tabId}).catch(() => {});
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => START + n)
  });
  await chrome.action.setIcon({
    tabId,
    path: {
      '16': '/data/icons/disabled/16.png',
      '32': '/data/icons/disabled/32.png',
      '48': '/data/icons/disabled/48.png'
    }
  });
  onbeforeunload = null;
  window.close();
};
document.getElementById('terminate-all').onclick = async () => {
  const ids = (await chrome.declarativeNetRequest.getSessionRules()).map(o => o.id);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: ids
  });
  chrome.runtime.sendMessage({
    method: 'close-instance'
  });
  document.getElementById('terminate').click();
};
document.getElementById('test').onclick = () => chrome.tabs.create({
  url: 'https://webbrowsertools.com/test-cors/'
});
document.getElementById('permission').onclick = e => chrome.permissions.request({
  origins: ['<all_urls>']
}, granted => {
  if (granted) {
    e.target.parentElement.classList.add('hidden');
  }
});
chrome.permissions.contains({
  origins: ['<all_urls>']
}, granted => {
  if (granted) {
    document.getElementById('permission').parentElement.classList.add('hidden');
  }
});
document.getElementById('close-tip').onclick = e => {
  e.target.closest('#tip').classList.add('hidden');
};
chrome.storage.local.get({
  tip: true
}, prefs => {
  if (prefs.tip) {
    document.getElementById('tip').classList.remove('hidden');
    chrome.storage.local.set({
      tip: false
    });
  }
});

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'close-instance') {
    document.getElementById('terminate').click();
  }
  else if (request.method === 'terminate-if' && tabId === request.tabId) {
    document.getElementById('terminate').click();
  }
});

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
