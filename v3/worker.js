/* global v2 */
self.DEFAULT_METHODS = [
  'GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK'
];
self.DEFAULT_STATUS_METHODS = ['GET', 'POST', 'PUT', 'OPTIONS', 'PATCH', 'PROPFIND', 'PROPPATCH'];

const notify = e => alert(e.message || e);

const core = {};
core.badge = () => chrome.storage.local.get({
  enabled: false
}, prefs => {
  chrome.browserAction.setIcon({
    path: {
      '16': '/data/icons' + (prefs.enabled ? '' : '/disabled') + '/16.png',
      '32': '/data/icons' + (prefs.enabled ? '' : '/disabled') + '/32.png',
      '48': '/data/icons' + (prefs.enabled ? '' : '/disabled') + '/48.png'
    }
  });
  chrome.browserAction.setTitle({
    title: prefs.enabled ? 'Access-Control-Allow-Origin is unblocked' : 'Disabled: Default server behavior'
  });
});

core['overwrite-origin'] = () => chrome.storage.local.get({
  'enabled': false,
  'overwrite-origin': true,
  'fake-supported-methods': true,
  'methods': self.DEFAULT_METHODS,
  'unblock-initiator': true, // used in v2.install
  'allow-credentials': true, // used in v2.install
  'fix-origin': false // used in v2.install
}, prefs => {
  if (prefs.enabled && (prefs['overwrite-origin'] || prefs['fix-origin'])) {
    v2.install(prefs);
  }
  else {
    v2.remove();
  }

  if (prefs.enabled && prefs['overwrite-origin']) {
    const rules = {
      removeRuleIds: [1, 2],
      addRules: [{
        'id': 1,
        'priority': 1,
        'action': {
          'type': 'modifyHeaders',
          'responseHeaders': [{
            'operation': 'set',
            'header': 'Access-Control-Allow-Methods',
            'value': prefs.methods.length === self.DEFAULT_METHODS.length ? '*' : prefs.methods.join(', ')
          }]
        },
        'condition': {}
      }]
    };
    if (prefs['fake-supported-methods']) {
      rules.addRules.push({
        'id': 2,
        'priority': 1,
        'action': {
          'type': 'modifyHeaders',
          'responseHeaders': [{
            'operation': 'set',
            'header': 'Allow',
            'value': prefs.methods.join(', ')
          }]
        },
        'condition': {
          'requestMethods': ['options']
        }
      });
    }

    chrome.declarativeNetRequest.updateDynamicRules(rules);
  }
  else {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2]
    });
  }
});

const toggle = (name, rule, value) => chrome.storage.local.get({
  'enabled': false,
  [name]: value
}, prefs => {
  chrome.declarativeNetRequest.updateEnabledRulesets(prefs.enabled && prefs[name] ? {
    enableRulesetIds: [rule]
  } : {
    disableRulesetIds: [rule]
  });
});

core['csp'] = () => toggle('remove-csp', 'csp', false);
core['allow-shared-array-buffer'] = () => toggle('allow-shared-array-buffer', 'allow-shared-array-buffer', false);
core['x-frame'] = () => toggle('remove-x-frame', 'x-frame', true);
core['allow-credentials'] = () => toggle('allow-credentials', 'allow-credentials', true);
core['allow-headers'] = () => toggle('allow-headers', 'allow-headers', false);
core['referer'] = () => toggle('remove-referer', 'referer', false);

// changes
{
  const once = () => {
    core.badge();
    core['x-frame']();
    core['overwrite-origin']();
    core['allow-credentials']();
    core['allow-headers']();
    core['referer']();
    core['csp']();
    core['allow-shared-array-buffer']();
  };
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.enabled) {
    core.badge();
  }
  if (prefs.enabled || prefs['remove-x-frame']) {
    core['x-frame']();
  }
  if (
    prefs.enabled || prefs['overwrite-origin'] || prefs.methods ||
    prefs['allow-credentials'] || prefs['unblock-initiator'] ||
    prefs['fix-origin'] ||
    prefs['fake-supported-methods']
  ) {
    core['overwrite-origin']();
  }
  if (prefs.enabled || prefs['allow-credentials']) {
    core['allow-credentials']();
  }
  if (prefs.enabled || prefs['allow-headers']) {
    core['allow-headers']();
  }
  if (prefs.enabled || prefs['remove-referer']) {
    core['referer']();
  }
  if (prefs.enabled || prefs['remove-csp']) {
    core['csp']();
  }
  if (prefs.enabled || prefs['allow-shared-array-buffer']) {
    core['allow-shared-array-buffer']();
  }

  // validate
  if (prefs['allow-credentials'] || prefs['unblock-initiator']) {
    chrome.storage.local.get({
      'allow-credentials': true,
      'unblock-initiator': true
    }, prefs => {
      if (prefs['allow-credentials'] && prefs['unblock-initiator'] === false) {
        notify(`CORS Unblock Extension

  Conflicting Options:
  The value of the 'Access-Control-Allow-Origin' header must not be '*' when the credentials mode is 'include'

  How to Fix:
  Either disable sending credentials or enable allow origin only for the request initiator`);
      }
    });
  }
});

// action
chrome.browserAction.onClicked.addListener(() => chrome.storage.local.get({
  enabled: false
}, prefs => chrome.storage.local.set({
  enabled: prefs.enabled === false
})));

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
