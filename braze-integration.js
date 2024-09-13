import { sha256 } from "@rs/hash/v1";

// Regular expression for a valid email address
const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Regular expressions for allowlist patterns
const allowlistPatterns = [
    /tickets/,
    /plus/,
    /newsletter/,
    /shop/,
    /premium/,
    /power-rankings/
];

// Function to check if the URL matches any allowlist pattern
function isAllowedURL(url) {
    return allowlistPatterns.some(pattern => pattern.test(url));
}

export async function transformEvent(event, metadata) {
  if (event.request_ip) {
    try {
      event.context.geo = await geolocation(event.request_ip);
    } catch (e) {
      log(e.message);
    }
  }

  const traits = event.context?.traits;

  if (traits) {
    const email = traits.email;

    if (email) {
      if (emailRegex.test(email)) {
        const cleanedEmail = email.replace(/\s/g, '').toLowerCase();
        const hashedEmail = sha256(cleanedEmail);

        traits.external_id = hashedEmail;
        traits.email = cleanedEmail
        event.userId = hashedEmail;
      }
    }
  }

  try {
    // Extracting game_id from keywords array
    const keywords = event.properties.keywords;
    log("Keywords:", keywords);

    let gameId = null;
    for (const keyword of keywords) {
      if (keyword.includes("cfl_game_id=")) {
        const match = keyword.match(/cfl_game_id=(\d+)/);
        if (match && match[1]) {
          gameId = match[1];
          log("Extracted Game ID:", gameId);
          break;
        }
      }
    }

    if (!gameId) {
      log("No game ID found in keywords.");
      return event;
    }

    // Dynamically construct API URL using the gameId
    const apiUrl = `https://echo.pims.cfl.ca/api/fixtures/${gameId}`;
    log("API URL:", apiUrl);

    // Fetch data from the API
    const res = await fetchV2(apiUrl, { timeout: 1000 });
    log("API Response:", res);

    if (res.status === 200) {
      log("API request successful.");

      // Update event properties with data from the API response
      event.properties.game_id = res.body.ID;
      event.properties.season_id = res.body.season_id;
      event.properties.season_game_count = res.body.season_game_count;
      event.properties.home_team_id = res.body.home_team_id;
      event.properties.home_game_count = res.body.home_game_count;
      event.properties.away_team_id = res.body.away_team_id;
      event.properties.week = res.body.week;
      event.properties.game_type_id = res.body.game_type_id;
      event.properties.start_at_local = res.body.start_at_local;
      event.properties.venue_id = res.body.venue_id;
      event.properties.genius_id = res.body.genius.id;
    } else {
      log("API request failed with status:", res.status);
    }
  } catch (err) {
    log("Error:", err.message);
  }

    const property = event.event || event.type; // Edit property

    const denylist = ["video_content_playing", "page"]; // Edit allowlist contents

    // Check if the property is in the denylist
    if (property && denylist.includes(property)) {
        // If it's in the denylist, check if it's a page event and if the URL contains any allowlist pattern
        if (event.type === 'page' && event.properties && event.properties.url) {
            const url = event.properties.url.toLowerCase();
            if (isAllowedURL(url)) {
                // Allow the event if the URL contains any allowlist pattern
                return event;
            } else {
                // Block the event if the URL doesn't contain any allowlist pattern
                return;
            }
        } else {
            // Block the event if it's not a page event
            return;
        }
    }

    // If the property is not in the allowlist, allow the event
    return event;
}
