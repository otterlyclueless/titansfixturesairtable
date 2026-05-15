const { mkdir, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");

if (typeof process.loadEnvFile === "function" && existsSync(path.join(process.cwd(), ".env"))) {
  process.loadEnvFile();
}

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const FIXTURES_TABLE_ID = process.env.AIRTABLE_FIXTURES_TABLE_ID;
const TEAMS_TABLE_ID = process.env.AIRTABLE_TEAMS_TABLE_ID;
const EVENTS_TABLE_ID = process.env.AIRTABLE_EVENTS_TABLE_ID || "tblfbGDuFxT8t6tCF";

const requiredVariables = {
  AIRTABLE_BASE_ID,
  AIRTABLE_TOKEN,
  AIRTABLE_FIXTURES_TABLE_ID: FIXTURES_TABLE_ID,
  AIRTABLE_TEAMS_TABLE_ID: TEAMS_TABLE_ID
};

for (const [name, value] of Object.entries(requiredVariables)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

async function fetchTable(tableId) {
  const records = [];
  let offset = "";

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`);

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    records.push(...data.records);
    offset = data.offset || "";
  } while (offset);

  return records;
}

function getAttachmentUrl(fields, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = fields[fieldName];
    const attachment = Array.isArray(value) ? value[0] : value;

    if (attachment?.thumbnails?.large?.url) {
      return attachment.thumbnails.large.url;
    }

    if (attachment?.url) {
      return attachment.url;
    }

    if (typeof attachment === "string" && attachment.startsWith("http")) {
      return attachment;
    }
  }

  return "";
}

function cleanFixtures(fixtures, teams) {
  const teamMap = {};

  for (const team of teams) {
    teamMap[team.id] = {
      id: team.id,
      name: team.fields.Team || "Unknown Team",
      logoUrl: getAttachmentUrl(team.fields, [
        "Logo",
        "Team Logo",
        "Crest",
        "Badge",
        "Image",
        "Attachment"
      ])
    };
  }

  return fixtures.map((fixture) => {
    const fields = fixture.fields;
    const homeTeamId = fields["Home Team"]?.[0];
    const awayTeamId = fields["Away Team"]?.[0];

    return {
      id: fixture.id,
      match: fields.Match || "",
      homeTeam: teamMap[homeTeamId] || null,
      awayTeam: teamMap[awayTeamId] || null,
      homeScore: fields["Home Score"] ?? null,
      awayScore: fields["Away Score"] ?? null,
      kickOff: fields["Kick Off"] || null,
      league: fields.League || "",
      competition: fields.Competition || fields.League || "",
      matchType: fields["Match Type"] || "",
      season: fields.Season || "",
      status: fields.Status || "",
      result: fields.Result || "",
      location: fields.Location || "",
      notes: fields.Notes || "",
      goalScorers: fields["Goal Scorers"] || ""
    };
  });
}

function cleanEvents(events) {
  return events.map((event) => {
    const fields = event.fields;

    return {
      id: event.id,
      name: fields["Event Name"] || "",
      type: fields["Event Type"] || "",
      date: fields.Date || null,
      description: fields.Description || "",
      location: fields.Location || "",
      isPrivate: Boolean(fields.Private)
    };
  });
}

async function main() {
  const [fixtures, teams, events] = await Promise.all([
    fetchTable(FIXTURES_TABLE_ID),
    fetchTable(TEAMS_TABLE_ID),
    fetchTable(EVENTS_TABLE_ID)
  ]);
  const publicOutputPath = path.join(process.cwd(), "public", "fixtures.json");
  const membersOutputPath = path.join(process.cwd(), "public", "members.json");
  const cleanFixturesData = cleanFixtures(fixtures, teams);
  const cleanEventsData = cleanEvents(events);
  const publicData = {
    fixtures: cleanFixturesData,
    events: cleanEventsData.filter((event) => !event.isPrivate)
  };
  const membersData = {
    fixtures: cleanFixturesData,
    events: cleanEventsData
  };

  await mkdir(path.dirname(publicOutputPath), { recursive: true });
  await writeFile(publicOutputPath, `${JSON.stringify(publicData, null, 2)}\n`);
  await writeFile(membersOutputPath, `${JSON.stringify(membersData, null, 2)}\n`);
  console.log(
    `Wrote ${publicData.fixtures.length} fixtures, ${publicData.events.length} public events, and ${membersData.events.length} total events`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
