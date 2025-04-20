chrome.action.onClicked.addListener(async tab => {
  const prefs = await chrome.storage.session.get({
    start: 0
  });

  const args = new URLSearchParams();
  args.set('start', prefs.start);
  args.set('id', tab.id);
  args.set('href', tab.url);
  args.set('title', tab.title);
  const win = await chrome.windows.getCurrent();

  chrome.windows.create({
    url: '/data/debug/index.html?' + args.toString(),
    width: 800,
    height: 800,
    left: win.left + Math.round((win.width - 800) / 2),
    top: win.top + Math.round((win.height - 800) / 2),
    type: 'popup'
  });

  chrome.storage.session.set({
    start: prefs.start + 20
  });
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
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
