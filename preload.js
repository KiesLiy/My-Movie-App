const { contextBridge, ipcRenderer } = require("electron");

// Expose selected functions from the main process to the renderer process.
contextBridge.exposeInMainWorld("movieAPI", {

    // Send a movie search request to the main process.
    searchMovies: (query) => {
        return ipcRenderer.invoke("search-movies", query);
    },

    // Send a request to discover movies by genre.
    discoverMovies: (genreId) => {
        return ipcRenderer.invoke("discover-movies", genreId);
    },

    // Request detailed information about a movie using its ID.
    getMovieDetails: (movieId) => {
        return ipcRenderer.invoke("get-movie-details", movieId);
    }
});
