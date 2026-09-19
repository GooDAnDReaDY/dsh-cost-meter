# Changelog

Notable changes to `@goodandready/dsh-cost-meter`.

## 0.8.5

### Fixed
- **Settings reachable again on the plugin's own page**: the current DSH core
  (0.1.6-alpha.2) renders a plugin's configuration page only for entries registered
  in the plugin-list seat `plugins.item`. `CostMeterCard` is now registered there
  (`id: 'dsh-cost-meter'`, order 20, static label) alongside the row seat and the
  legacy card, and its page view renders the form open (`page || open`) instead of
  collapsed.

## 0.8.4

### Fixed
- **Settings reachable again**: the card registered into `settings.plugin.item`, a
  slot the current DSH core (0.1.6-alpha.2) no longer renders, so the plugin's
  settings were unreachable. The surface now registers into the Plugins page row
  seat `plugins.row.config`, keyed `@goodandready/dsh-cost-meter#dsh-cost-meter`
  (`rowConfigKey(package, rowId)`): the plugin's row gains a configure control whose
  page is the settings form (`view: 'page'`, open and without our card chrome — the
  host page draws the title, icon, crumb and padding) plus a one-line state for
  `view: 'summary'`. The legacy seat stays registered as a fallback for older cores.

### Added
- This changelog.
