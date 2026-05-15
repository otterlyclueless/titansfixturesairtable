# London Titans Fixtures Widget Embed

Use the Netlify-hosted widget URL for now, not the custom subdomain, until the custom domain has reliable HTTPS.

Replace `https://YOUR-NETLIFY-SITE.netlify.app` below with the live Netlify URL.

## Recommended: HTML Block With Auto-Resizing

This is the best option for GoDaddy if the HTML block allows `<script>` tags.

```html
<div id="titans-fixtures-widget"></div>
<script
  src="https://YOUR-NETLIFY-SITE.netlify.app/embed.js"
  data-target="#titans-fixtures-widget"
  data-title="London Titans Fixtures"
  data-min-height="900px"
></script>
```

## Team-Specific Example

```html
<div id="titans-development-widget"></div>
<script
  src="https://YOUR-NETLIFY-SITE.netlify.app/embed.js"
  data-target="#titans-development-widget"
  data-title="London Titans Development Fixtures"
  data-team="Development"
  data-view="all"
  data-min-height="900px"
></script>
```

## Fallback: Fixed-Height Iframe

Use this only if GoDaddy strips scripts from the HTML block.

```html
<iframe
  src="https://YOUR-NETLIFY-SITE.netlify.app/?embed=1"
  title="London Titans Fixtures"
  loading="lazy"
  style="width:100%;min-height:900px;border:0;display:block;"
></iframe>
```

## Useful Query/Embed Options

These can be passed as `data-*` attributes on the script embed:

- `data-view="upcoming"`
- `data-view="results"`
- `data-view="all"`
- `data-team="Development"`
- `data-team="Turner"`
- `data-competition="LUL Division 1"`
- `data-season="2025/26"`
- `data-status="played"`
- `data-search="Freedom"`

## Recommendation

Use the script embed first. It gives us:

- auto-resizing height
- cleaner website integration
- easier team-specific widgets later

Only fall back to the direct iframe if GoDaddy refuses to run the script in the HTML block.
