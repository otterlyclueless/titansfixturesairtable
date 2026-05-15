# London Titans Embed Snippets

Primary host: `https://fixtures.londontitans.com`

This project now has two app pages:

- Public Fixtures Centre: `https://fixtures.londontitans.com/`
  - Shows fixture data
  - Includes `Fixtures` and `Events` tabs
  - `Events` tab shows public events only

- Members Centre: `https://fixtures.londontitans.com/members.html`
  - Same interface as the public app
  - `Events` tab shows public and private member events

## Recommended embed method

Use the script embed first. It creates the iframe for you and handles resizing automatically.

Basic pattern:

```html
<div id="your-widget-id"></div>
<script
  src="https://fixtures.londontitans.com/embed.js"
  data-target="#your-widget-id"
  data-title="Widget Title"
  data-min-height="100vh"
></script>
```

## 1. Public Fixtures Centre

Use this on the public fixtures page.

What it shows:
- `Fixtures` tab with upcoming, results, and full fixture list
- `Events` tab with public events only

```html
<div id="titans-fixtures-widget"></div>
<script
  src="https://fixtures.londontitans.com/embed.js"
  data-target="#titans-fixtures-widget"
  data-title="London Titans Fixtures"
  data-min-height="100vh"
></script>
```

## 2. Members Centre

Use this inside the members area.

What it shows:
- Same `Fixtures` tab behaviour as the public app
- `Events` tab with public and private events

```html
<div id="titans-members-centre"></div>
<script
  src="https://fixtures.londontitans.com/embed.js"
  data-target="#titans-members-centre"
  data-src="/members.html"
  data-title="London Titans Members Centre"
  data-min-height="100vh"
></script>
```

## 3. Team-specific Fixtures View

Use this when you want the public Fixtures Centre prefiltered to one Titans team.

What it shows:
- Public app
- Starts on the Fixtures side
- Preselects one team

```html
<div id="titans-development-widget"></div>
<script
  src="https://fixtures.londontitans.com/embed.js"
  data-target="#titans-development-widget"
  data-title="London Titans Development Fixtures"
  data-team="Development"
  data-view="all"
  data-min-height="100vh"
></script>
```

## 4. Fallback iframe

Use this only if the website builder strips `<script>` tags.

Public app:

```html
<iframe
  src="https://fixtures.londontitans.com/?embed=1"
  title="London Titans Fixtures"
  loading="lazy"
  style="width:100%;height:100vh;min-height:100vh;border:0;display:block;"
></iframe>
```

Members app:

```html
<iframe
  src="https://fixtures.londontitans.com/members.html?embed=1"
  title="London Titans Members Centre"
  loading="lazy"
  style="width:100%;height:100vh;min-height:100vh;border:0;display:block;"
></iframe>
```

## Parameters you can change

These are the useful `data-*` attributes for the script embed.

- `data-target`
  - CSS selector for the container the widget should render into
  - Example: `#titans-fixtures-widget`

- `data-title`
  - Accessible iframe title
  - Example: `London Titans Fixtures`

- `data-src`
  - Which app page to load
  - Omit it for the public Fixtures Centre
  - Use `data-src="/members.html"` for the members app

- `data-min-height`
  - Minimum iframe height
  - Good defaults:
    - full page: `100vh`
    - smaller section: `720px`

- `data-height`
  - Optional fixed starting height
  - Usually only needed if you want a controlled panel height

- `data-view`
  - Initial fixture-side view
  - Options:
    - `upcoming`
    - `results`
    - `all`
    - `events`
  - Note: `events` opens the Events tab directly

- `data-team`
  - Prefilters the Fixtures tab to one Titans side
  - Examples:
    - `Development`
    - `Turner`
    - `Two Brewers`
    - `Wheeler`

- `data-competition`
  - Initial competition filter for the Fixtures tab
  - Example: `LUL Division 1`

- `data-season`
  - Initial season filter for the Fixtures tab
  - Example: `2025/26`

- `data-status`
  - Initial status filter for the Fixtures tab
  - Example: `played`

- `data-search`
  - Initial search term for the Fixtures tab
  - Example: `Freedom`

- `data-layout`
  - Optional special layout mode
  - Only use if we explicitly decide to run a constrained panel layout again

## Quick guidance

- Use the public app for website visitors.
- Use `data-src="/members.html"` for the members area.
- Keep `data-min-height="100vh"` for full-page sections.
- Use a smaller `data-min-height` only when the widget sits inside a tighter content block.

## Optional wrapper

If the site builder allows inline wrapper styles, this helps remove stray spacing:

```html
<div style="margin:0;padding:0;width:100%;">
  <div id="titans-fixtures-widget"></div>
  <script
    src="https://fixtures.londontitans.com/embed.js"
    data-target="#titans-fixtures-widget"
    data-title="London Titans Fixtures"
    data-min-height="100vh"
  ></script>
</div>
```
