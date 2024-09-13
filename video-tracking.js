export async function transformEvent(event) {
    try {
        // Extracting game_id from keywords array
        const keywords = event.properties.keywords;
        log("Keywords:", keywords);

        let gameId = null;
        for (const keyword of keywords) {
            if (keyword.includes("game_id=")) {
                const match = keyword.match(/game_id=(\d+)/);
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
        const apiUrl = `https://api-url.ca/api/fixtures/genius/${gameId}`;
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

    return event;
}
