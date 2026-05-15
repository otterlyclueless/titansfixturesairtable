let allFixtures = [];
let allEvents = [];
let currentView = "upcoming";
let currentTeam = "all";
let currentSearch = "";
let currentCompetition = "all";
let currentSeason = "all";
let currentStatus = "all";
let lastFocusedElement = null;
let expandedInlineCard = null;
const currentAudience = getAudienceMode();
const currentEmbedLayout = getEmbedLayout();
const TITANS_TEAM_PREFIX = "Titans ";

async function loadFixtures() {
  const status = document.getElementById("status");

  try {
    status.classList.remove("isError");
    status.textContent = "Syncing";

    const data = await fetchFixtures();
    allFixtures = Array.isArray(data) ? data : (data.fixtures || []);
    allEvents = Array.isArray(data) ? [] : (data.events || []);

    status.textContent = "Live";

    setupTabs();
    setupTeamFilters();
    setupSmartFilters();
    setupInitialState();
    setupModal();
    setupEmbedResize();
    renderAll();
  } catch (error) {
    console.error(error);
    handleLoadError(status);
  }
}

function handleLoadError(status) {
  allFixtures = [];
  allEvents = [];
  status.classList.add("isError");
  status.textContent = "Offline";

  setupTabs();
  setupSmartFilters();
  setupInitialState();
  setupModal();
  setupEmbedResize();
  renderAll();
}

async function fetchFixtures() {
  const dataFile = isMembersMode() ? "members.json" : "fixtures.json";
  const response = await fetch(dataFile);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Failed to load ${dataFile}`);
  }

  return data;
}

function setupModal() {
  const modal = document.getElementById("fixtureModal");
  const closeButton = modal.querySelector(".modalClose");

  closeButton.addEventListener("click", closeFixtureModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeFixtureModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeFixtureModal();
    }
  });
}

function setupEmbedResize() {
  const app = document.getElementById("app") || document.querySelector(".app");

  if (isEmbedMode()) {
    document.body.classList.add("isEmbed");

    if (isPanelEmbed()) {
      document.body.classList.add("isPanelEmbed");
    }
  }

  if (!app || typeof ResizeObserver === "undefined") {
    postEmbedHeight();
    return;
  }

  const resizeObserver = new ResizeObserver(postEmbedHeight);
  resizeObserver.observe(app);
  window.addEventListener("load", postEmbedHeight);
}

function postEmbedHeight() {
  const app = document.getElementById("app") || document.querySelector(".app");
  const height = Math.ceil(app?.getBoundingClientRect().height || document.body.scrollHeight);

  window.parent.postMessage({ type: "titans-fixtures-resize", height }, "*");
}

function isEmbedMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("embed") === "1";
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentView = tab.dataset.view;

      document.querySelectorAll(".tab").forEach((button) => {
        button.classList.remove("isActive");
      });

      tab.classList.add("isActive");

      renderAll();
    });
  });
}

function setupTeamFilters() {
  const teamFilters = document.querySelector(".teamFilters");
  const teams = getTitansTeams();

  teams.forEach((team) => {
    const button = document.createElement("button");
    button.className = "teamFilter";
    button.type = "button";
    button.dataset.team = team;
    button.textContent = team.replace("Titans ", "");
    teamFilters.appendChild(button);
  });

  teamFilters.querySelectorAll(".teamFilter").forEach((filter) => {
    filter.addEventListener("click", () => {
      currentTeam = filter.dataset.team;

      document.querySelectorAll(".teamFilter").forEach((button) => {
        button.classList.remove("isActive");
      });

      filter.classList.add("isActive");

      renderAll();
    });
  });
}

function setupSmartFilters() {
  const searchInput = document.getElementById("fixtureSearch");
  const competitionFilter = document.getElementById("competitionFilter");
  const seasonFilter = document.getElementById("seasonFilter");
  const statusFilter = document.getElementById("statusFilter");

  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.trim().toLowerCase();
    renderAll();
  });

  competitionFilter.addEventListener("change", () => {
    currentCompetition = competitionFilter.value;
    renderAll();
  });

  seasonFilter.addEventListener("change", () => {
    currentSeason = seasonFilter.value;
    renderAll();
  });

  statusFilter.addEventListener("change", () => {
    currentStatus = statusFilter.value;
    renderAll();
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    currentSearch = "";
    currentCompetition = "all";
    currentSeason = "all";
    currentStatus = "all";
    searchInput.value = "";
    competitionFilter.value = "all";
    seasonFilter.value = "all";
    statusFilter.value = "all";
    renderAll();
  });

  refreshFilterUi();
}

function setupInitialState() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const team = params.get("team");
  const competition = params.get("competition");
  const season = params.get("season");
  const status = params.get("status");
  const search = params.get("search");

  if (["upcoming", "results", "all", "events"].includes(view)) {
    currentView = view;
  }

  if (team) {
    currentTeam = getTitansTeams().find((teamName) => {
      return teamName.toLowerCase() === team.toLowerCase() ||
        teamName.replace(TITANS_TEAM_PREFIX, "").toLowerCase() === team.toLowerCase();
    }) || currentTeam;
  }

  if (competition && getUniqueValues((fixture) => getCompetition(fixture)).includes(competition)) {
    currentCompetition = competition;
  }

  if (season && getUniqueValues((fixture) => getSeason(fixture)).includes(season)) {
    currentSeason = season;
  }

  if (["all", "upcoming", "played", "postponed", "cancelled", "tbc"].includes(status)) {
    currentStatus = status;
  }

  if (search) {
    currentSearch = search.trim().toLowerCase();
  }

  syncControls();
}

function syncControls() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("isActive", tab.dataset.view === currentView);
  });

  document.querySelectorAll(".teamFilter").forEach((filter) => {
    filter.classList.toggle("isActive", filter.dataset.team === currentTeam);
  });

  document.getElementById("fixtureSearch").value = currentSearch;
  document.getElementById("competitionFilter").value = currentCompetition;
  document.getElementById("seasonFilter").value = currentSeason;
  document.getElementById("statusFilter").value = currentStatus;
}

function refreshFilterUi() {
  const isEventsView = currentView === "events";
  const teamFilters = document.querySelector(".teamFilters");
  const filterGrid = document.querySelector(".filterGrid");
  const searchLabel = document.getElementById("searchLabel");
  const searchInput = document.getElementById("fixtureSearch");
  const competitionLabel = document.getElementById("competitionLabel");
  const competitionFilter = document.getElementById("competitionFilter");
  const seasonField = document.getElementById("seasonField");
  const seasonFilter = document.getElementById("seasonFilter");
  const statusField = document.getElementById("statusField");
  const statusFilter = document.getElementById("statusFilter");

  teamFilters.hidden = isEventsView;
  filterGrid.hidden = isEventsView;

  if (isEventsView) {
    currentSearch = "";
    currentCompetition = "all";
    currentSeason = "all";
    currentStatus = "all";
    searchInput.value = "";
    competitionFilter.value = "all";
    seasonFilter.value = "all";
    statusFilter.value = "all";
  } else {
    searchLabel.textContent = "Search";
    searchInput.placeholder = "Team, opponent, league, venue";
    competitionLabel.textContent = "Competition";
    populateSelect("competitionFilter", getUniqueValues((fixture) => getCompetition(fixture)), "All competitions");
    populateSelect("seasonFilter", getUniqueValues((fixture) => getSeason(fixture)), "All seasons");
    seasonField.hidden = false;
    statusField.hidden = false;
  }

  currentCompetition = optionExists(competitionFilter, currentCompetition) ? currentCompetition : "all";
  currentSeason = optionExists(seasonFilter, currentSeason) ? currentSeason : "all";
  currentStatus = optionExists(statusFilter, currentStatus) ? currentStatus : "all";

  competitionFilter.value = currentCompetition;
  seasonFilter.value = currentSeason;
  statusFilter.value = currentStatus;
}

function optionExists(select, value) {
  return [...select.options].some((option) => option.value === value);
}

function renderAll() {
  refreshFilterUi();
  syncControls();
  document.body.classList.toggle("isEventsView", currentView === "events");
  document.getElementById("app")?.classList.toggle("isEventsView", currentView === "events");
  renderSummary();
  renderHero();
  renderPrimaryList();
}

function renderSummary() {
  const summaryGrid = document.getElementById("summaryGrid");

  if (currentView === "events") {
    const visibleEvents = getVisibleEvents();
    const upcomingEvents = visibleEvents.filter((event) => getEventStatus(event) === "upcoming");
    const nextEvent = getNextEvent();

    summaryGrid.className = "summaryGrid summaryGrid--events summaryGrid--eventsSingle";
    summaryGrid.innerHTML = `
      ${createSummaryCard("Upcoming Events", upcomingEvents.length, nextEvent ? formatKickOff(nextEvent.date, "short") : "No upcoming date", "summaryCard--upcoming")}
    `;

    postEmbedHeight();
    return;
  }

  summaryGrid.className = "summaryGrid";
  const teamFixtures = getTeamScopedFixtures();
  const playedFixtures = teamFixtures.filter((fixture) => getSmartStatus(fixture).key === "played");
  const upcomingFixtures = teamFixtures.filter((fixture) => getSmartStatus(fixture).key === "upcoming");
  const goalsFor = playedFixtures.reduce((total, fixture) => total + getTitansGoalsFor(fixture), 0);
  const nextFixture = getNextFixture(currentTeam);
  const lastResult = playedFixtures.sort((a, b) => getFixtureTime(b) - getFixtureTime(a))[0];

  summaryGrid.innerHTML = `
    ${createSummaryCard("Fixtures", teamFixtures.length, getTeamLabel())}
    ${createSummaryCard("Upcoming", upcomingFixtures.length, nextFixture ? formatKickOff(nextFixture.kickOff, "short") : "No upcoming date")}
    ${createSummaryCard("Played", playedFixtures.length, lastResult ? formatKickOff(lastResult.kickOff, "short") : "No results yet")}
    ${createSummaryCard("Goals For", goalsFor, "Recorded scores")}
  `;

  postEmbedHeight();
}

function createSummaryCard(label, value, detail, extraClass = "") {
  return `
    <article class="summaryCard ${extraClass}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function renderPrimaryList() {
  if (currentView === "events") {
    renderEvents();
    return;
  }

  renderFixtures();
}

function getFilteredFixtures() {
  return allFixtures
    .filter((fixture) => {
      const smartStatus = getSmartStatus(fixture);

      const homeTeamName = fixture.homeTeam?.name || "";
      const awayTeamName = fixture.awayTeam?.name || "";
      const matchesTeam =
        currentTeam === "all" ||
        homeTeamName === currentTeam ||
        awayTeamName === currentTeam;

      if (!matchesTeam) {
        return false;
      }

      if (currentCompetition !== "all" && getCompetition(fixture) !== currentCompetition) {
        return false;
      }

      if (currentSeason !== "all" && getSeason(fixture) !== currentSeason) {
        return false;
      }

      if (currentStatus !== "all" && smartStatus.key !== currentStatus) {
        return false;
      }

      if (currentSearch && !getSearchText(fixture).includes(currentSearch)) {
        return false;
      }

      if (currentStatus !== "all") {
        return true;
      }

      if (currentView === "upcoming") {
        return smartStatus.key === "upcoming" || smartStatus.key === "tbc";
      }

      if (currentView === "results") {
        return smartStatus.key === "played";
      }

      return true;
    })
    .sort(sortFilteredFixtures);
}

function renderHero() {
  const hero = document.getElementById("hero");

  if (currentView === "events") {
    const nextEvent = getNextEvent();

    hero.innerHTML = nextEvent ? `
      <div class="nextFixtures">
        ${createNextEventMarkup(nextEvent)}
      </div>
    ` : "";

    postEmbedHeight();
    return;
  }

  const nextClubFixture = getNextFixture("all");
  const nextTeamFixture = currentTeam === "all" ? null : getNextFixture(currentTeam);
  const cards = [createNextFixtureMarkup("Next club fixture", nextClubFixture)];

  if (nextTeamFixture && nextTeamFixture.id !== nextClubFixture?.id) {
    cards.push(createNextFixtureMarkup(`Next ${currentTeam.replace("Titans ", "")} fixture`, nextTeamFixture));
  }

  if (!nextClubFixture && !nextTeamFixture) {
    hero.innerHTML = "";
    postEmbedHeight();
    return;
  }

  hero.innerHTML = `
    <div class="nextFixtures">
      ${cards.join("")}
    </div>
  `;

  postEmbedHeight();
}

function renderFixtures() {
  const output = document.getElementById("output");
  const listTitle = document.getElementById("listTitle");
  const fixtureCount = document.getElementById("fixtureCount");
  const listEyebrow = document.querySelector(".listHeader .eyebrow");
  const fixtures = getFilteredFixtures();

  output.innerHTML = "";
  output.classList.remove("eventGrid");
  if (listEyebrow) {
    listEyebrow.textContent = "Match Centre";
  }
  listTitle.textContent = getListTitle();
  fixtureCount.textContent = `${fixtures.length} ${fixtures.length === 1 ? "match" : "matches"}`;

  if (fixtures.length === 0) {
    output.innerHTML = `
      <div class="emptyState">
        <h2>No fixtures found</h2>
        <p>${escapeHtml(getEmptyStateMessage())}</p>
      </div>
    `;
    postEmbedHeight();
    return;
  }

  fixtures.forEach((fixture) => {
    output.appendChild(createFixtureCard(fixture));
  });

  postEmbedHeight();
}

function renderEvents() {
  const output = document.getElementById("output");
  const listTitle = document.getElementById("listTitle");
  const fixtureCount = document.getElementById("fixtureCount");
  const listEyebrow = document.querySelector(".listHeader .eyebrow");
  const events = getFilteredEvents();

  output.innerHTML = "";
  output.classList.add("eventGrid");
  if (listEyebrow) {
    listEyebrow.textContent = "Event Calendar";
  }
  listTitle.textContent = isMembersMode() ? "Member Events" : "Events";
  fixtureCount.textContent = `${events.length} ${events.length === 1 ? "event" : "events"}`;

  if (events.length === 0) {
    output.innerHTML = `
      <div class="emptyState">
        <h2>No events found</h2>
        <p>${escapeHtml(getEmptyStateMessage())}</p>
      </div>
    `;
    postEmbedHeight();
    return;
  }

  events.forEach((event) => {
    output.appendChild(createEventCard(event));
  });

  postEmbedHeight();
}

function createFixtureCard(fixture) {
  const card = document.createElement("article");
  card.className = `fixtureCard ${getCompetitionClasses(fixture)}`;
  card.dataset.competitionLabel = getCompetitionLabel(fixture);
  const embedMode = isEmbedMode();

  const score =
    fixture.homeScore !== null && fixture.awayScore !== null
      ? `${fixture.homeScore} - ${fixture.awayScore}`
      : "vs";

  const smartStatus = getSmartStatus(fixture);

  card.innerHTML = `
    <button
      class="fixtureToggle"
      type="button"
      ${embedMode ? 'aria-expanded="false"' : 'aria-haspopup="dialog"'}
    >
      <div class="fixtureTop">
        <span class="league">${escapeHtml(getCompetition(fixture))}</span>
        <span class="result result--${smartStatus.className || smartStatus.key}">${escapeHtml(smartStatus.label)}</span>
      </div>

      <div class="fixtureTeams">
        <div class="team ${getTitansSideClass(fixture, "home")}">
          <span class="teamRole"><span class="sideTag sideTag--home">Home</span></span>
          <span class="teamName">${escapeHtml(fixture.homeTeam?.name || "Unknown")}</span>
        </div>
        <div class="score">${score}</div>
        <div class="team ${getTitansSideClass(fixture, "away")}">
          <span class="teamRole"><span class="sideTag sideTag--away">Away</span></span>
          <span class="teamName">${escapeHtml(fixture.awayTeam?.name || "Unknown")}</span>
        </div>
      </div>

      <div class="fixtureMeta">
        <div>${formatKickOff(fixture.kickOff, "short")}</div>
      </div>
    </button>
    <div class="fixtureInlineDetails" hidden></div>
  `;

  const toggle = card.querySelector(".fixtureToggle");
  const inlineDetails = card.querySelector(".fixtureInlineDetails");

  toggle.addEventListener("click", () => {
    if (embedMode) {
      toggleInlineFixtureDetails(card, inlineDetails, fixture);
      return;
    }

    openFixtureModal(fixture);
  });

  return card;
}

function createEventCard(event) {
  const card = document.createElement("article");
  const embedMode = isEmbedMode();
  const eventStatus = getEventStatus(event);
  const eventTypeClass = getEventThemeClass("eventCard", event.type);

  card.className = `fixtureCard eventCard ${eventTypeClass}`.trim();

  card.innerHTML = `
    <button
      class="fixtureToggle"
      type="button"
      ${embedMode ? 'aria-expanded="false"' : 'aria-haspopup="dialog"'}
    >
      <div class="fixtureTop">
        <span class="league">${escapeHtml(event.type || "Event")}</span>
        <span class="result result--${eventStatus === "upcoming" ? "upcoming" : "played"}">${escapeHtml(eventStatus === "upcoming" ? "Upcoming" : "Past")}</span>
      </div>

      <div class="eventHeading">
        <h3>${escapeHtml(event.name || "Untitled Event")}</h3>
        ${event.isPrivate ? '<span class="eventPrivacy">Private</span>' : ""}
      </div>

      <div class="fixtureMeta eventMeta">
        <div>${formatKickOff(event.date, "long")}</div>
        <div>${escapeHtml(event.location || "Location TBC")}</div>
      </div>
    </button>
    <div class="fixtureInlineDetails" hidden></div>
  `;

  const toggle = card.querySelector(".fixtureToggle");
  const inlineDetails = card.querySelector(".fixtureInlineDetails");

  toggle.addEventListener("click", () => {
    if (embedMode) {
      toggleInlineEventDetails(card, inlineDetails, event);
      return;
    }

    openEventModal(event);
  });

  return card;
}

function toggleInlineEventDetails(card, inlineDetails, event) {
  const isOpen = !inlineDetails.hidden;

  if (expandedInlineCard && expandedInlineCard !== card) {
    collapseInlineFixtureDetails(expandedInlineCard);
  }

  if (isOpen) {
    collapseInlineFixtureDetails(card);
    return;
  }

  inlineDetails.innerHTML = createEventDetailMarkup(event, true);
  inlineDetails.hidden = false;
  inlineDetails.style.height = "0px";
  inlineDetails.style.opacity = "0";
  card.classList.add("isExpanded");
  card.querySelector(".fixtureToggle")?.setAttribute("aria-expanded", "true");
  expandedInlineCard = card;

  requestAnimationFrame(() => {
    animateInlineOpen(inlineDetails);
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    postEmbedHeight();
  });
}

function toggleInlineFixtureDetails(card, inlineDetails, fixture) {
  const toggle = card.querySelector(".fixtureToggle");
  const isOpen = !inlineDetails.hidden;

  if (expandedInlineCard && expandedInlineCard !== card) {
    collapseInlineFixtureDetails(expandedInlineCard);
  }

  if (isOpen) {
    collapseInlineFixtureDetails(card);
    return;
  }

  inlineDetails.innerHTML = createFixtureDetailMarkup(fixture, true);
  inlineDetails.hidden = false;
  inlineDetails.style.height = "0px";
  inlineDetails.style.opacity = "0";
  card.classList.add("isExpanded");
  toggle.setAttribute("aria-expanded", "true");
  expandedInlineCard = card;

  requestAnimationFrame(() => {
    animateInlineOpen(inlineDetails);
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    postEmbedHeight();
  });
}

function collapseInlineFixtureDetails(card) {
  const inlineDetails = card.querySelector(".fixtureInlineDetails");
  const toggle = card.querySelector(".fixtureToggle");

  if (!inlineDetails || inlineDetails.hidden) {
    return;
  }

  animateInlineClose(inlineDetails);
  card.classList.remove("isExpanded");
  toggle?.setAttribute("aria-expanded", "false");

  if (expandedInlineCard === card) {
    expandedInlineCard = null;
  }

  postEmbedHeight();
}

function animateInlineOpen(inlineDetails) {
  inlineDetails.style.height = `${inlineDetails.scrollHeight}px`;
  inlineDetails.style.opacity = "1";

  const onTransitionEnd = (event) => {
    if (event.propertyName !== "height") {
      return;
    }

    inlineDetails.style.height = "auto";
    inlineDetails.removeEventListener("transitionend", onTransitionEnd);
  };

  inlineDetails.addEventListener("transitionend", onTransitionEnd);
}

function animateInlineClose(inlineDetails) {
  inlineDetails.style.height = `${inlineDetails.scrollHeight}px`;
  inlineDetails.style.opacity = "1";
  inlineDetails.offsetHeight;
  inlineDetails.style.height = "0px";
  inlineDetails.style.opacity = "0";

  const onTransitionEnd = (event) => {
    if (event.propertyName !== "height") {
      return;
    }

    inlineDetails.hidden = true;
    inlineDetails.innerHTML = "";
    inlineDetails.removeEventListener("transitionend", onTransitionEnd);
  };

  inlineDetails.addEventListener("transitionend", onTransitionEnd);
}

function openFixtureModal(fixture) {
  const modal = document.getElementById("fixtureModal");
  const modalContent = document.getElementById("modalContent");
  const closeButton = modal.querySelector(".modalClose");
  const smartStatus = getSmartStatus(fixture);
  const modalClass = `modalDialog ${getCompetitionClasses(fixture).replaceAll("fixtureCard", "modalDialog")} modalDialog--${smartStatus.className || smartStatus.key}`;

  lastFocusedElement = document.activeElement;
  modal.querySelector(".modalDialog").className = modalClass;
  modal.querySelector(".modalDialog").dataset.competitionLabel = getCompetitionLabel(fixture);
  modalContent.innerHTML = createFixtureDetailMarkup(fixture);

  modal.hidden = false;
  document.body.classList.add("hasModal");
  closeButton.focus();
}

function openEventModal(event) {
  const modal = document.getElementById("fixtureModal");
  const modalContent = document.getElementById("modalContent");
  const closeButton = modal.querySelector(".modalClose");

  lastFocusedElement = document.activeElement;
  modal.querySelector(".modalDialog").className = `modalDialog ${getEventThemeClass("modalDialog", event.type)}`;
  modal.querySelector(".modalDialog").dataset.competitionLabel = event.type || "Event";
  modalContent.innerHTML = createEventDetailMarkup(event);

  modal.hidden = false;
  document.body.classList.add("hasModal");
  closeButton.focus();
}

function closeFixtureModal() {
  const modal = document.getElementById("fixtureModal");

  modal.hidden = true;
  document.body.classList.remove("hasModal");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function createFixtureDetailMarkup(fixture, inline = false) {
  const smartStatus = getSmartStatus(fixture);
  const homeLogoUrl = getTeamLogoUrl(fixture.homeTeam);
  const awayLogoUrl = getTeamLogoUrl(fixture.awayTeam);
  const score =
    fixture.homeScore !== null && fixture.awayScore !== null
      ? `${fixture.homeScore} - ${fixture.awayScore}`
      : "vs";
  const posterClass = inline ? "modalPoster fixtureInlinePoster" : "modalPoster";
  const detailsClass = inline ? "modalDetails fixtureInlineBody" : "modalDetails";
  const titleId = inline ? "" : ' id="modalTitle"';

  return `
    <div class="${posterClass}">
      ${homeLogoUrl ? `<img class="modalWatermark modalWatermark--home" src="${escapeAttribute(homeLogoUrl)}" alt="" aria-hidden="true" />` : ""}
      ${awayLogoUrl ? `<img class="modalWatermark modalWatermark--away" src="${escapeAttribute(awayLogoUrl)}" alt="" aria-hidden="true" />` : ""}

      <div class="modalTeams"${titleId}>
        <div class="modalTeam ${getTitansSideClass(fixture, "home")}">
          <span class="teamRole"><span class="sideTag sideTag--home">Home</span></span>
          <span class="teamName">${escapeHtml(fixture.homeTeam?.name || "Unknown")}</span>
        </div>
        <div class="modalCentre">
          <span class="modalKicker">Match Details</span>
          <span class="competitionBadge">${escapeHtml(getCompetitionLabel(fixture))}</span>
          <div class="modalScore">${score}</div>
          <span class="result result--${smartStatus.className || smartStatus.key}">${escapeHtml(smartStatus.label)}</span>
        </div>
        <div class="modalTeam ${getTitansSideClass(fixture, "away")}">
          <span class="teamRole"><span class="sideTag sideTag--away">Away</span></span>
          <span class="teamName">${escapeHtml(fixture.awayTeam?.name || "Unknown")}</span>
        </div>
      </div>

      <div class="modalMeta">
        <div><span>Kick Off</span>${formatKickOff(fixture.kickOff, "long")}</div>
      </div>
    </div>

    <div class="${detailsClass}">
      ${createOptionalDetailRow("Goal scorers", fixture.goalScorers)}
      ${createOptionalDetailRow("Notes", fixture.notes)}
      ${createVenueRow(fixture.location)}
    </div>
  `;
}

function createEventDetailMarkup(event, inline = false) {
  const posterClass = inline ? "modalPoster fixtureInlinePoster" : "modalPoster";
  const detailsClass = inline ? "modalDetails fixtureInlineBody" : "modalDetails";
  const titleId = inline ? "" : ' id="modalTitle"';
  const themeClass = getEventThemeClass("eventTypePill", event.type);

  return `
    <div class="${posterClass} eventPosterShell">
      <div class="eventDetailIntro"${titleId}>
        <span class="eventTypePill ${themeClass}">${escapeHtml(event.type || "Event")}</span>
        <h2 class="eventModalTitle">${escapeHtml(event.name || "Untitled Event")}</h2>
        ${event.isPrivate ? '<span class="eventPrivacy">Private</span>' : ""}
      </div>
    </div>

    <div class="${detailsClass} eventDetailsBody">
      ${createDetailRow("Date", formatKickOff(event.date, "long"))}
      ${createOptionalDetailRow("Description", event.description)}
      ${createVenueRow(event.location)}
    </div>
  `;
}

function createNextFixtureMarkup(label, fixture) {
  if (!fixture) {
    return "";
  }

  return `
    <article class="heroCard ${getHeroCardClasses(fixture)}">
      <div class="heroTop">
        <span class="heroLabel">${escapeHtml(label)}</span>
        <span class="heroLeague">${escapeHtml(getCompetitionLabel(fixture))}</span>
      </div>

      <div class="heroTeams">
        <div class="heroTeam">
          <span class="teamRole"><span class="sideTag sideTag--home">Home</span></span>
          ${escapeHtml(fixture.homeTeam?.name || "Unknown")}
        </div>

        <div class="heroVs">vs</div>

        <div class="heroTeam">
          <span class="teamRole"><span class="sideTag sideTag--away">Away</span></span>
          ${escapeHtml(fixture.awayTeam?.name || "Unknown")}
        </div>
      </div>

      <div class="heroMeta">
        <div>${formatKickOff(fixture.kickOff, "long")}</div>
        <div>${escapeHtml(fixture.location || "Location TBC")}</div>
        <div>${escapeHtml(getSeason(fixture))}</div>
      </div>
    </article>
  `;
}

function createNextEventMarkup(event) {
  return `
    <article class="heroCard ${getEventThemeClass("heroCard", event.type)}">
      <div class="heroTop">
        <span class="heroLabel">${isMembersMode() ? "Next member event" : "Next event"}</span>
        <span class="heroLeague">${escapeHtml(event.type || "Event")}</span>
      </div>

      <div class="eventHeroHeading">
        <h2>${escapeHtml(event.name || "Untitled Event")}</h2>
        ${event.isPrivate ? '<span class="eventPrivacy">Private</span>' : ""}
      </div>

      <div class="heroMeta">
        <div>${formatKickOff(event.date, "long")}</div>
        <div>${escapeHtml(event.location || "Location TBC")}</div>
      </div>
    </article>
  `;
}

function createDetailRow(label, value) {
  const displayValue = value || "TBC";

  return `
    <div class="detailRow" data-label="${escapeHtml(label)}">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(displayValue)}</p>
    </div>
  `;
}

function createOptionalDetailRow(label, value) {
  if (!String(value || "").trim()) {
    return "";
  }

  return createDetailRow(label, value);
}

function createVenueRow(location) {
  const displayLocation = location || "Location TBC";
  const hasLocation = Boolean(location);

  return `
    <div class="detailRow detailRow--venue" data-label="Venue">
      <span>Venue</span>
      <p>${escapeHtml(displayLocation)}</p>
      ${hasLocation ? `
        <div class="mapLinks" aria-label="Directions links">
          <a href="${escapeAttribute(getAppleMapsUrl(location))}" target="_blank" rel="noopener noreferrer">Apple Maps</a>
          <a href="${escapeAttribute(getGoogleMapsUrl(location))}" target="_blank" rel="noopener noreferrer">Google Maps</a>
        </div>
      ` : ""}
    </div>
  `;
}

function getNextFixture(team) {
  return allFixtures
    .filter((fixture) => {
      const smartStatus = getSmartStatus(fixture);
      const homeTeamName = fixture.homeTeam?.name || "";
      const awayTeamName = fixture.awayTeam?.name || "";
      const matchesTeam =
        team === "all" ||
        homeTeamName === team ||
        awayTeamName === team;

      if (!matchesTeam || smartStatus.key !== "upcoming") {
        return false;
      }

      if (currentCompetition !== "all" && getCompetition(fixture) !== currentCompetition) {
        return false;
      }

      if (currentSeason !== "all" && getSeason(fixture) !== currentSeason) {
        return false;
      }

      if (currentSearch && !getSearchText(fixture).includes(currentSearch)) {
        return false;
      }

      return true;
    })
    .sort(sortFixtures)[0];
}

function getVisibleEvents() {
  return allEvents.filter((event) => isMembersMode() || !event.isPrivate);
}

function getFilteredEvents() {
  return getVisibleEvents()
    .filter((event) => {
      if (currentCompetition !== "all" && event.type !== currentCompetition) {
        return false;
      }

      if (currentSearch && !getEventSearchText(event).includes(currentSearch)) {
        return false;
      }

      return true;
    })
    .sort(sortEvents);
}

function getNextEvent() {
  return getVisibleEvents()
    .filter((event) => getEventStatus(event) === "upcoming")
    .filter((event) => {
      if (currentCompetition !== "all" && event.type !== currentCompetition) {
        return false;
      }

      if (currentSearch && !getEventSearchText(event).includes(currentSearch)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => getEventTime(a) - getEventTime(b))[0];
}

function getListTitle() {
  const team = getTeamLabel();

  if (currentView === "results") {
    return `${team} Results`;
  }

  if (currentView === "all") {
    return `${team} Fixtures`;
  }

  return `${team} Upcoming`;
}

function getEmptyStateMessage() {
  const status = document.getElementById("status");

  if (status?.classList.contains("isError")) {
    return "Fixture data is temporarily unavailable. Please try again shortly.";
  }

  if (currentView === "events") {
    return "Try a different event type or search above.";
  }

  return "Try a different team or switch the view above.";
}

function getTeamLabel() {
  return currentTeam === "all" ? "All Teams" : currentTeam.replace("Titans ", "");
}

function getTitansTeams() {
  return getUniqueValues((fixture) => {
    const names = [fixture.homeTeam?.name, fixture.awayTeam?.name];
      return names.find((name) => name?.startsWith(TITANS_TEAM_PREFIX));
  });
}

function getTeamScopedFixtures() {
  return allFixtures.filter((fixture) => {
    if (currentTeam === "all") {
      return true;
    }

    return fixture.homeTeam?.name === currentTeam || fixture.awayTeam?.name === currentTeam;
  });
}

function getTitansGoalsFor(fixture) {
  const homeScore = Number(fixture.homeScore || 0);
  const awayScore = Number(fixture.awayScore || 0);

  if (currentTeam !== "all") {
    if (fixture.homeTeam?.name === currentTeam) return homeScore;
    if (fixture.awayTeam?.name === currentTeam) return awayScore;
    return 0;
  }

  return [fixture.homeTeam, fixture.awayTeam].reduce((total, team, index) => {
    if (!team?.name?.startsWith(TITANS_TEAM_PREFIX)) {
      return total;
    }

    return total + (index === 0 ? homeScore : awayScore);
  }, 0);
}

function getSmartStatus(fixture) {
  const explicitStatus = normalizeStatus(fixture.status);
  const notesStatus = normalizeStatus(fixture.notes);

  if (explicitStatus === "postponed" || notesStatus === "postponed") {
    return { key: "postponed", label: "Postponed" };
  }

  if (explicitStatus === "cancelled" || notesStatus === "cancelled") {
    return { key: "cancelled", label: "Cancelled" };
  }

  if (explicitStatus === "tbc") {
    return { key: "tbc", label: "TBC" };
  }

  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;
  const hasResult = Boolean(fixture.result);

  if (hasScore || hasResult) {
    return {
      key: "played",
      className: getResultClass(fixture.result),
      label: fixture.result || "Played"
    };
  }

  if (!fixture.kickOff) {
    return { key: "tbc", label: "TBC" };
  }

  if (new Date(fixture.kickOff) < new Date()) {
    return { key: "played", label: "Played" };
  }

  return { key: "upcoming", label: "Upcoming" };
}

function getEventStatus(event) {
  if (!event.date) {
    return "upcoming";
  }

  return new Date(event.date) < new Date() ? "past" : "upcoming";
}

function normalizeStatus(value) {
  const status = String(value || "").toLowerCase();

  if (status.includes("postpon")) return "postponed";
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("tbc") || status.includes("to be confirmed")) return "tbc";
  if (status.includes("played")) return "played";
  if (status.includes("upcoming")) return "upcoming";

  return "";
}

function getResultClass(result) {
  const value = String(result || "").toLowerCase();

  if (value.includes("win")) return "win";
  if (value.includes("draw")) return "draw";
  if (value.includes("loss") || value.includes("lost")) return "loss";

  return "played";
}

function getTeamLogoUrl(team) {
  return team?.logoUrl || "./ltfc-crest.png";
}

function getTitansSideClass(fixture, side) {
  const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;

  return team?.name?.startsWith(TITANS_TEAM_PREFIX) ? "team--titans" : "";
}

function getCompetitionClasses(fixture) {
  const matchTypes = getMatchTypes(fixture);
  const classes = [];

  if (matchTypes.includes("cup")) classes.push("fixtureCard--cup");
  if (matchTypes.includes("plate")) classes.push("fixtureCard--plate");
  if (matchTypes.includes("shield")) classes.push("fixtureCard--shield");
  if (matchTypes.includes("friendly")) classes.push("fixtureCard--friendly");
  if (matchTypes.includes("final")) classes.push("fixtureCard--final");

  return classes.join(" ");
}

function getEventThemeClass(prefix, eventType) {
  const value = String(eventType || "").trim().toLowerCase();

  if (value.includes("ball")) return `${prefix}--ball`;
  if (value.includes("social")) return `${prefix}--social`;
  if (value.includes("training")) return `${prefix}--training`;
  if (value.includes("tournament")) return `${prefix}--tournament`;

  return "";
}

function getHeroCardClasses(fixture) {
  return getCompetitionClasses(fixture).replaceAll("fixtureCard", "heroCard");
}

function getCompetitionLabel(fixture) {
  const competition = getCompetition(fixture);

  if (getMatchTypes(fixture).includes("final") && !competition.toLowerCase().includes("final")) {
    return `${getCompetition(fixture)} Final`;
  }

  return competition;
}

function getMatchTypes(fixture) {
  const rawMatchType = fixture.matchType;

  if (Array.isArray(rawMatchType)) {
    return rawMatchType.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
  }

  const value = String(rawMatchType || "").trim().toLowerCase();

  return value ? [value] : [];
}

function sortFilteredFixtures(a, b) {
  const aTime = getFixtureTime(a);
  const bTime = getFixtureTime(b);

  if (currentView === "results" || currentStatus === "played" || currentView === "all") {
    return bTime - aTime;
  }

  return sortFixtures(a, b);
}

function getCompetition(fixture) {
  return fixture.competition || fixture.league || "Fixture";
}

function getSeason(fixture) {
  if (fixture.season) {
    return fixture.season;
  }

  if (!fixture.kickOff) {
    return "Season TBC";
  }

  const date = new Date(fixture.kickOff);
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  const endYear = String(startYear + 1).slice(-2);

  return `${startYear}/${endYear}`;
}

function getSearchText(fixture) {
  return [
    fixture.match,
    fixture.homeTeam?.name,
    fixture.awayTeam?.name,
    fixture.league,
    fixture.competition,
    fixture.location,
    fixture.notes,
    fixture.goalScorers
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getEventSearchText(event) {
  return [
    event.name,
    event.type,
    event.description,
    event.location
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getUniqueValues(getter) {
  return [...new Set(allFixtures.map(getter).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en-GB", { numeric: true })
  );
}

function getUniqueValuesFromEvents(getter) {
  return [...new Set(getVisibleEvents().map(getter).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en-GB", { numeric: true })
  );
}

function populateSelect(id, values, label) {
  const select = document.getElementById(id);

  select.innerHTML = `<option value="all">${label}</option>`;

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function formatKickOff(kickOff, format) {
  if (!kickOff) {
    return "Date TBC";
  }

  const options =
    format === "long"
      ? {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit"
        }
      : {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        };

  return new Date(kickOff).toLocaleString("en-GB", options);
}

function getAppleMapsUrl(location) {
  return `https://maps.apple.com/?q=${encodeURIComponent(location)}`;
}

function getGoogleMapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function sortFixtures(a, b) {
  return new Date(a.kickOff || "9999-12-31") - new Date(b.kickOff || "9999-12-31");
}

function getFixtureTime(fixture) {
  return new Date(fixture.kickOff || "0001-01-01").getTime();
}

function sortEvents(a, b) {
  const aStatus = getEventStatus(a);
  const bStatus = getEventStatus(b);

  if (aStatus !== bStatus) {
    return aStatus === "upcoming" ? -1 : 1;
  }

  if (aStatus === "upcoming") {
    return getEventTime(a) - getEventTime(b);
  }

  return getEventTime(b) - getEventTime(a);
}

function getEventTime(event) {
  return new Date(event.date || "9999-12-31").getTime();
}

function getAudienceMode() {
  const params = new URLSearchParams(window.location.search);
  const audience = String(params.get("audience") || "").toLowerCase();
  return audience === "members" ? "members" : "public";
}

function isMembersMode() {
  return currentAudience === "members";
}

function getEmbedLayout() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("layout") || "").toLowerCase();
}

function isPanelEmbed() {
  return currentEmbedLayout === "panel";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

loadFixtures();
