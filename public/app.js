let allFixtures = [];
let currentView = "upcoming";
let currentTeam = "all";
let currentSearch = "";
let currentCompetition = "all";
let currentSeason = "all";
let currentStatus = "all";
let lastFocusedElement = null;
const TITANS_TEAM_PREFIX = "Titans ";

async function loadFixtures() {
  const status = document.getElementById("status");

  try {
    status.classList.remove("isError");
    status.textContent = "Syncing";

    allFixtures = await fetchFixtures();

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
  const sources = [
    "fixtures.json",
    "/.netlify/functions/fixtures"
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to load ${source}`);
      }

      return data;
    } catch (error) {
      if (source === sources[sources.length - 1]) {
        throw error;
      }
    }
  }

  return [];
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
  const params = new URLSearchParams(window.location.search);

  if (params.get("embed") === "1") {
    document.body.classList.add("isEmbed");
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
  populateSelect("competitionFilter", getUniqueValues((fixture) => getCompetition(fixture)), "All competitions");
  populateSelect("seasonFilter", getUniqueValues((fixture) => getSeason(fixture)), "All seasons");

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
}

function setupInitialState() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const team = params.get("team");
  const competition = params.get("competition");
  const season = params.get("season");
  const status = params.get("status");
  const search = params.get("search");

  if (["upcoming", "results", "all"].includes(view)) {
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

function renderAll() {
  renderSummary();
  renderHero();
  renderFixtures();
}

function renderSummary() {
  const summaryGrid = document.getElementById("summaryGrid");
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

function createSummaryCard(label, value, detail) {
  return `
    <article class="summaryCard">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
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
  const fixtures = getFilteredFixtures();

  output.innerHTML = "";
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

function createFixtureCard(fixture) {
  const card = document.createElement("article");
  card.className = `fixtureCard ${getCompetitionClasses(fixture)}`;
  card.dataset.competitionLabel = getCompetitionLabel(fixture);

  const score =
    fixture.homeScore !== null && fixture.awayScore !== null
      ? `${fixture.homeScore} - ${fixture.awayScore}`
      : "vs";

  const smartStatus = getSmartStatus(fixture);

  card.innerHTML = `
    <button class="fixtureToggle" type="button" aria-haspopup="dialog">
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
  `;

  const toggle = card.querySelector(".fixtureToggle");

  toggle.addEventListener("click", () => {
    openFixtureModal(fixture);
  });

  return card;
}

function openFixtureModal(fixture) {
  const modal = document.getElementById("fixtureModal");
  const modalContent = document.getElementById("modalContent");
  const closeButton = modal.querySelector(".modalClose");
  const smartStatus = getSmartStatus(fixture);
  const modalClass = `modalDialog ${getCompetitionClasses(fixture).replaceAll("fixtureCard", "modalDialog")} modalDialog--${smartStatus.className || smartStatus.key}`;
  const homeLogoUrl = getTeamLogoUrl(fixture.homeTeam);
  const awayLogoUrl = getTeamLogoUrl(fixture.awayTeam);
  const score =
    fixture.homeScore !== null && fixture.awayScore !== null
      ? `${fixture.homeScore} - ${fixture.awayScore}`
      : "vs";

  lastFocusedElement = document.activeElement;
  modal.querySelector(".modalDialog").className = modalClass;
  modal.querySelector(".modalDialog").dataset.competitionLabel = getCompetitionLabel(fixture);
  modalContent.innerHTML = `
    <div class="modalPoster">
      ${homeLogoUrl ? `<img class="modalWatermark modalWatermark--home" src="${escapeAttribute(homeLogoUrl)}" alt="" aria-hidden="true" />` : ""}
      ${awayLogoUrl ? `<img class="modalWatermark modalWatermark--away" src="${escapeAttribute(awayLogoUrl)}" alt="" aria-hidden="true" />` : ""}

      <div class="modalTeams" id="modalTitle">
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

    <div class="modalDetails">
      ${createOptionalDetailRow("Goal scorers", fixture.goalScorers)}
      ${createOptionalDetailRow("Notes", fixture.notes)}
      ${createVenueRow(fixture.location)}
    </div>
  `;

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

function getUniqueValues(getter) {
  return [...new Set(allFixtures.map(getter).filter(Boolean))].sort((a, b) =>
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
