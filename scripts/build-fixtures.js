const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const FIXTURES_TABLE_ID = process.env.AIRTABLE_FIXTURES_TABLE_ID;
const TEAMS_TABLE_ID = process.env.AIRTABLE_TEAMS_TABLE_ID;

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
      season: fields.Season || "",
      status: fields.Status || "",
      result: fields.Result || "",
      location: fields.Location || "",
      notes: fields.Notes || "",
      goalScorers: fields["Goal Scorers"] || ""
    };
  });
}

async function main() {
  const [fixtures, teams] = await Promise.all([
    fetchTable(FIXTURES_TABLE_ID),
    fetchTable(TEAMS_TABLE_ID)
  ]);
  const outputPath = path.join(process.cwd(), "public", "fixtures.json");
  const cleanData = cleanFixtures(fixtures, teams);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(cleanData, null, 2)}\n`);
  console.log(`Wrote ${cleanData.length} fixtures to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
