(function () {
  const currentScript = document.currentScript;
  const targetSelector = currentScript?.dataset.target || "#titans-fixtures-widget";
  const target = document.querySelector(targetSelector);

  if (!target) {
    return;
  }

  const scriptUrl = new URL(currentScript.src);
  const widgetUrl = new URL(currentScript.dataset.src || "/", scriptUrl.origin);
  const passthroughParams = ["view", "team", "competition", "season", "status", "search", "audience"];

  widgetUrl.searchParams.set("embed", "1");

  passthroughParams.forEach((key) => {
    const value = currentScript.dataset[key];

    if (value) {
      widgetUrl.searchParams.set(key, value);
    }
  });

  const iframe = document.createElement("iframe");

  iframe.src = widgetUrl.toString();
  iframe.title = currentScript.dataset.title || "London Titans fixtures";
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.minHeight = currentScript.dataset.minHeight || "720px";
  iframe.style.border = "0";
  iframe.style.display = "block";

  target.innerHTML = "";
  target.appendChild(iframe);

  window.addEventListener("message", (event) => {
    if (event.origin !== widgetUrl.origin) {
      return;
    }

    if (event.data?.type !== "titans-fixtures-resize" || !event.data.height) {
      return;
    }

    iframe.style.height = `${event.data.height}px`;
  });
})();
