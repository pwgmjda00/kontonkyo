export function setupNavigation(doc = document, scroll = () => window.scrollTo(0, 0)) {
  const nav = doc.getElementById('gameNav');
  const panels = [...doc.querySelectorAll('[data-panel]')];
  const controls = [...doc.querySelectorAll('[data-view]')];
  const tabs = [...nav.querySelectorAll('button')];
  let active;

  function show(view) {
    const panel = panels.find(element => element.id === `panel-${view}`);
    if (!panel || active === view) return false;
    active = view;
    for (const element of panels) element.hidden = element !== panel;
    for (const tab of tabs) {
      if (tab.dataset.view === view) tab.setAttribute('aria-current', 'true');
      else tab.removeAttribute('aria-current');
    }
    scroll();
    return true;
  }

  for (const control of controls) control.addEventListener('click', () => {
    if (show(control.dataset.view) && !nav.contains(control)) {
      tabs.find(tab => tab.dataset.view === active).focus({preventScroll: true});
    }
  });
  show('actions');
  nav.hidden = false;
  return show;
}
