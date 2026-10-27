
 // Load environment variables from the .env file.
require("dotenv").config();

// Import Electron modules for creating the application window and handling IPC.
const { app, BrowserWindow, ipcMain } = require("electron");

// Import the path module to build file paths safely.
const path = require("path");

// Create the main application window.
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            // Load preload.js to provide approved APIs to the renderer process.
            preload: path.join(__dirname, "preload.js"),

            // Isolate the renderer process from Electron's internal context.
            contextIsolation: true,

            // Prevent renderer JavaScript from accessing Node.js directly.
            nodeIntegration: false
        }
    });

    // Load the application's HTML interface.
    win.loadFile("index.html");
}

// Handle movie search requests from the renderer process.
ipcMain.handle("search-movies", async (event, query) => {
    // Retrieve the TMDB API key from the environment variables.
    const apiKey = process.env.TMDB_API_KEY;

    // Stop the request if the API key is missing.
    if (!apiKey) {
        throw new Error("TMDB API key belum ditetapkan dalam fail .env.");
    }

    // Return an empty array if the search query is invalid or empty.
    if (typeof query !== "string" || !query.trim()) {
        return [];
    }

    // Build the TMDB movie search URL and add the required parameters.
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query.trim());

    // Send the request to TMDB.
    const response = await fetch(url);

    // Throw an error if the API request is unsuccessful.
    if (!response.ok) {
        throw new Error("Carian filem gagal. Sila cuba lagi.");
    }

    // Convert the API response from JSON into a JavaScript object.
    const data = await response.json();

    // Return the movie results, or an empty array if no results exist.
    return data.results || [];
});

// Handle requests to discover movies by genre.
ipcMain.handle("discover-movies", async (event, genreId) => {
    // Retrieve the TMDB API key from the environment variables.
    const apiKey = process.env.TMDB_API_KEY;

    // Stop the request if the API key is missing.
    if (!apiKey) {
        throw new Error("TMDB API key is missing.");
    }

    // Define the genre IDs that the application allows.
    const allowedGenres = [28, 35, 27, 10749, 878];

    // Reject genre IDs that are not supported by the application.
    if (!allowedGenres.includes(genreId)) {
        throw new Error("Invalid movie genre.");
    }

    // Build the TMDB movie discovery URL.
    const url = new URL(
        "https://api.themoviedb.org/3/discover/movie"
    );

    // Add the API key, selected genre, sorting order, and page number.
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("with_genres", String(genreId));
    url.searchParams.set("sort_by", "popularity.desc");
    url.searchParams.set("page", "1");

    // Send the request to retrieve movies from the selected genre.
    const response = await fetch(url);

    // Throw an error if the API request is unsuccessful.
    if (!response.ok) {
        throw new Error(
            `Unable to discover movies. Status: ${response.status}`
        );
    }

    // Convert the JSON response and return the movie results.
    const data = await response.json();
    return data.results || [];
});

// Handle requests for details about a specific movie.
ipcMain.handle("get-movie-details", async (event, movieId) => {
    // Retrieve the TMDB API key from the environment variables.
    const apiKey = process.env.TMDB_API_KEY;

    // Stop the request if the API key is missing.
    if (!apiKey) {
        throw new Error("TMDB API key is missing.");
    }

    // Validate the movie ID before sending the API request.
    if (!Number.isInteger(movieId) || movieId <= 0) {
        throw new Error("Invalid movie ID.");
    }

    try {
        // Build the TMDB URL for the selected movie.
        const url = new URL(
            `https://api.themoviedb.org/3/movie/${movieId}`
        );

        // Add the API key to the request URL.
        url.searchParams.set("api_key", apiKey);

        // Request the movie details and stop waiting after 10 seconds.
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });

        // Throw an error if the API request is unsuccessful.
        if (!response.ok) {
            throw new Error(
                `TMDB request failed with status ${response.status}`
            );
        }

        // Convert the API response from JSON into a JavaScript object.
        const movie = await response.json();

        // Log selected movie details to help with debugging.
        console.log("Movie details received:", {
            id: movie.id,
            runtime: movie.runtime
        });

        // Return only the movie ID and runtime required by the application.
        return {
            id: movie.id,
            runtime: movie.runtime || 0
        };

    } catch (error) {
        // Log the error and pass it back to the renderer process.
        console.error("Movie details error:", error.message);
        throw error;
    }
});

// Create the application window when Electron is ready.
app.whenReady().then(createWindow);

// Quit the application when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
