// select all navigation buttons and all page sections on the HTML
const navButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");

// select the HTML elements used for movie search and genre discovery
const movieSearch = document.getElementById("movieSearch");
const searchButton = document.getElementById("searchButton");
const genreFilter = document.getElementById("genreFilter");
const movieResults = document.getElementById("movieResults");
const discoverMessage = document.getElementById("discoverMessage");

// select the HTML elements used to display the saved watchlist and its messages
const watchlistResults = document.getElementById("watchlistResults");
const watchlistMessage = document.getElementById("watchlistMessage");

// store the movies returned from the latest title search
let searchedMovies = [];

// map each supported movie genre to its TMDB genre ID
const genreIds = {
    Action: 28,
    Comedy: 35,
    Horror: 27,
    Romance: 10749,
    "Science Fiction": 878
};


// retrieve the saved watchlist from local storage
function getWatchlist() {
    try {
        // get the saved watchlist. use an empty array if no data exists
        return JSON.parse(
            localStorage.getItem("myMovieWatchlist") || "[]"
        );
    } catch (error) {
        // display an error in the console if the saved data cannot be read
        console.error("Unable to read watchlist:", error);

        // return an empty array to prevent the application from crashing
        return [];
    }
}

// save the updated watchlist to local storage
function saveWatchlist(watchlist) {
    // convert the watchlist array into a JSON string before saving it
    localStorage.setItem(
        "myMovieWatchlist",
        JSON.stringify(watchlist)
    );
}


// add a click event listener to each navigation button
navButtons.forEach((button) => {
    button.addEventListener("click", () => {
        // get the ID of the page selected by the user
        const selectedPage = button.dataset.page;

        // remove the active class from all pages and navigation buttons
        pages.forEach((page) => page.classList.remove("active"));
        navButtons.forEach((item) => item.classList.remove("active"));

        // display the selected page by adding the active class
        document.getElementById(selectedPage).classList.add("active");
        // highlight the navigation button that was clicked
        button.classList.add("active");

        // refresh the watchlist whenever the user opens the watchlist page
        if (selectedPage === "watchlist") {
            renderWatchlist();
        }
    });
});


// create and return a movie card containing the movie information
function createMovieCard(movie) {

    // create the main container for the movie card
    const card = document.createElement("div");
    card.className = "movie-card";

    // display the movie poster if a poster image is available 
    if (movie.poster_path) {
        const poster = document.createElement("img");

        // set the image URL using the poster path returned by TMDB
        poster.src =
            `https://image.tmdb.org/t/p/w342${movie.poster_path}`;

        // provide alternative text describing the movie poster
        poster.alt = `${movie.title} poster`;

        // apply the CSS class used to style the poster
        poster.className = "movie-poster";

        // add the poster image to the movie card
        card.appendChild(poster);
    }

    // create a heading to display the movie title
    const title = document.createElement("h3");
    title.textContent = movie.title || "Untitled";
    card.appendChild(title);

    // create a paragraph to display the movie release date
    const release = document.createElement("p");
    release.textContent =
        `Release date: ${movie.release_date || "Unknown"}`;
    card.appendChild(release);

    // create a pragraph to display the movie rating out of 10
    const rating = document.createElement("p");
    rating.textContent =
        `Rating: ${movie.vote_average ?? "N/A"} / 10`;
    card.appendChild(rating);

    // create a paragraph to display the movie overview
    const overview = document.createElement("p");
    overview.textContent =
        movie.overview || "No description available.";
    card.appendChild(overview);

    // return the completed movie card for display in the application
    return card;
}


// display movie search results and allow users to add movies to the watchlist
function displayMovies(movies) {
    // clear the previous movie results from the page
    movieResults.replaceChildren();

    // display a message if no movies were found
    if (movies.length === 0) {
        discoverMessage.textContent =
            "No movies found. Try another title or genre.";
        return;
    }

    // clear the message when movie results are available
    discoverMessage.textContent = "";

    // create a card and an add to watchlist button for each movie
    movies.forEach((movie) => {
        const card = createMovieCard(movie);
        const button = document.createElement("button");
        button.textContent = "Add to Watchlist";
        button.className = "primary-button";

        // check whether the movie is already saved in the watchlist
        const existingMovie = getWatchlist().some(
            (item) => item.id === movie.id
        );

        // disable the button if the movie has already been added
        if (existingMovie) {
            button.textContent = "Already Added";
            button.disabled = true;
        }

        // handle the action when the user clicks add to watchlist
        button.addEventListener("click", async () => {
            // retrieve the latest saved watchlist
            const watchlist = getWatchlist();

            // prevent the same movie from being added more than once 
            if (watchlist.some((item) => item.id === movie.id)) {
                discoverMessage.textContent =
                    `${movie.title} is already in your watchlist.`;
                button.textContent = "Already Added";
                button.disabled = true;
                return;
            }

        // add the selected movie and its basic details to the watchlist
        watchlist.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            overview: movie.overview,
            watched: false,
            runtime: 0
        });

        // save the new watchlist to local storage
        saveWatchlist(watchlist);

        // inform the user that the movie runtime is being retrieved
        button.textContent = "Loading runtime...";
        button.disabled = true;

        try {
            // request the movie runtime from the application's API bridge
            const details = await window.movieAPI.getMovieDetails(movie.id);

            // retrieve the latest watchlist and find the saved movie
            const updatedWatchlist = getWatchlist();
            const savedMovie = updatedWatchlist.find(
                (item) => item.id === movie.id
            );

            // update the movie runtime and save the changed record
            if (savedMovie) {
                savedMovie.runtime = details.runtime;
                saveWatchlist(updatedWatchlist);
            }

            // display a success message and update the button label
            discoverMessage.textContent =
                `${movie.title} added to your watchlist!`;
            button.textContent = "Added ✓";

            // refresh the watchlist to display the updated movie data
            renderWatchlist();

            } catch (error) {
                // log the runtime retrieval error for debugging 
                console.error("Runtime lookup failed:", error);

                // inform the user that the movie was saved without its runtime
                discoverMessage.textContent =
                    `${movie.title} was saved, but its runtime could not be loaded.`;
                button.textContent = "Added (runtime unavailable)";

            } finally {
                // keep the button disabled to prevent another addition
                button.disabled = true;
            }
        });

        // add the button to the movie card
        card.appendChild(button);

        // display the completed movie card on the page
        movieResults.appendChild(card);
    });
}


// filter movie results based on the genre selected by the user
async function filterMovies() {
    // get the currently selected genre from the dropdown list
    const selectedGenre = genreFilter.value;

    // display the original search results if no genre is selected
    if (!selectedGenre) {
        displayMovies(searchedMovies);
        return;
    }

    // retrieve the TMDB genre ID associated with the selected genre
    const genreId = genreIds[selectedGenre];

    // display an error message if the selcted genre is invalid
    if (!genreId) {
        discoverMessage.textContent = "Please select a valid genre.";
        return;
    }

    // inform the user that movies for the selcted genre are being loaded
    discoverMessage.textContent = "Finding movies for this genre...";
    // clear the previous results before displaying new movies
    movieResults.replaceChildren();

    try {
        // request popular movies from TMDB that match the selected genre
        const movies = await window.movieAPI.discoverMovies(genreId);

        // Select movies with a rating of 7.0 or higher
        const recommendedMovies = [];

        movies.forEach((movie) => {
            if (movie.vote_average >= 7.0) {
                recommendedMovies.push(movie);
            }
        });

        // Display recommendations or a fallback message
        if (recommendedMovies.length > 0) {
            discoverMessage.textContent =
                "Recommended movies rated 7.0 and above:";
            displayMovies(recommendedMovies);
        } else {
            movieResults.replaceChildren();
            discoverMessage.textContent =
                "No suitable recommendations found. Try another genre.";
        }

    } catch (error) {
        // log the error to the console for debugging 
        console.error("Genre movie lookup failed:", error);

        // inform the user that the genre search could not be completed 
        discoverMessage.textContent =
            `Unable to load movies: ${error.message}`;
    }
}


// search for movies using the TMDB API
async function searchMovies() {
    // get the search input and remove unnecessary spaces
    const query = movieSearch.value.trim();

    // validate the input and prevent searches with an empty title
    if (!query) {
        discoverMessage.textContent =
            "Please enter a movie title first.";
        movieResults.replaceChildren();
        return;
    }

    // inform the user that the search is in progress
    discoverMessage.textContent = "Searching movies...";

    // clear the previous results and disable the search button
    movieResults.replaceChildren();
    searchButton.disabled = true;

    try {
        // check whether the API bridge is available
        if (!window.movieAPI) {
            throw new Error("Movie API bridge is unavailable.");
        }

        // retrieve movie search results from the API bridge
        searchedMovies = await window.movieAPI.searchMovies(query);

        // apply the selected genre filter to the search results
        filterMovies();

    } catch (error) {
        // log the error to the console for debugging
        console.error("Movie search failed:", error);

        // display a user-friendly error message
        discoverMessage.textContent =
            "Unable to load movies. Check your connection and API settings.";

        // clear the results if the search request fails
        movieResults.replaceChildren();

    } finally {
        // re-enable the search button after the request finishes
        searchButton.disabled = false;
    }
}

// run the movie search when the search button is clicked
searchButton.addEventListener("click", searchMovies);

// run the movie search when the user presses the enter key
movieSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchMovies();
    }
});

// update the displayed movies whenever the selected genre changes
genreFilter.addEventListener("change", filterMovies);


// display saved movies and update watchlist statistics
function renderWatchlist() {
    // retrieve saved movies from local storage
    const watchlist = getWatchlist();
    // clear the existing watchlist display before rendering it again
    watchlistResults.replaceChildren();

    // count the movies that have been marked as watched
    const watchedCount = watchlist.filter(
        (movie) => movie.watched
    ).length;

    // calculate the total runtime of movies that have been watched
    const totalWatchTime = watchlist
        .filter((movie) => movie.watched)
        .reduce((total, movie) => total + (Number(movie.runtime) || 0), 0);

    // display the total number of movies in the watchlist
    document.getElementById("totalMovies").textContent =
        watchlist.length;

    // display the number of movies that have been watched
    document.getElementById("watchedMovies").textContent =
        watchedCount;

    // display the total watch time in minutes
    document.getElementById("watchTime").textContent =
        `${totalWatchTime} min`;

    // display an empty-state message if the watchlist has no movies
    if (watchlist.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        // create a heading to inform the user that the watchlist is empty
        const heading = document.createElement("h3");
        heading.textContent = "Your watchlist is empty";

        // create a message explaining how to add movies to the watchlist
        const message = document.createElement("p");
        message.textContent =
            "Discover a movie and add it to your collection.";

        // add the heading and message to the empty-state container
        empty.append(heading, message);
        watchlistResults.appendChild(empty);
        return;
    }

    // create a movie card for each saved movie
    watchlist.forEach((movie) => {
        const card = createMovieCard(movie);

        // display whether the movie has been watched
        const status = document.createElement("p");
        status.textContent = movie.watched 
            ? "Status: Watched" 
            : "Status: Not watched";
        card.appendChild(status);

        // display the movie runtime or a message if it is unavailable
        const runtime = document.createElement("p");
        runtime.textContent = movie.runtime
            ? `Runtime: ${movie.runtime} min`
            : "Runtime: Not available yet";
        card.appendChild(runtime);

        // create a button to toggle the movie's watched status
        const watchedButton = document.createElement("button");
        watchedButton.textContent = movie.watched
            ? "Mark as Not Watched"
            : "Mark as Watched";

        // updated the watched status when the button is clicked
        watchedButton.addEventListener("click", () => {

            // retrieve the latest saved watchlist
            const currentList = getWatchlist();

            // find the selected movie using its unique ID
            const target = currentList.find(
                (item) => item.id === movie.id
            );

            if (target) {
                // toggle the watched status between true and false
                target.watched = !target.watched;

                // save the updated watchlist to local storage
                saveWatchlist(currentList);

                // refresh the watchlist and recalculate its statistics
                renderWatchlist();

                // inform the user that the movie status has been updated
                watchlistMessage.textContent =
                    `${movie.title} status updated.`;
            }
        });

        // create a button to remove the movie from the watchlist
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.className = "remove-button";

        // delete the selcted movie when the remove button is clicked
        removeButton.addEventListener("click", () => {

            // create a new list without the selected movie
            const updatedList = getWatchlist().filter(
                (item) => item.id !== movie.id
            );

            // save the updated list to lacal storage
            saveWatchlist(updatedList);

            // refresh the watchlist and update its statistics
            renderWatchlist();

            // inform the user that the movie has been removed
            watchlistMessage.textContent =
                `${movie.title} removed from your watchlist.`;
        });

        // add both action buttons to the movie card
        card.append(watchedButton, removeButton);

        // display the completed movie card in the watchlist
        watchlistResults.appendChild(card);
    });
}


// retrieve and update the runtime of previously saved movies 
async function updateMissingRuntimes() {
    // retrieve all movies currently saved in local storage
    const watchlist = getWatchlist();

    // check each movie in the saved watchlist
    for (const movie of watchlist) {

        // only request movie details if the runtime is missing or invalid
        if (!movie.runtime || movie.runtime <= 0) {
            try {
                // retrieve the movie runtime through the API bridge
                const details = await window.movieAPI.getMovieDetails(movie.id);

                // get the latest watchlist to avoid overwriting newer changes
                const updatedWatchlist = getWatchlist();

                // find the saved movie using its unique ID
                const savedMovie = updatedWatchlist.find(
                    (item) => item.id === movie.id
                );

                // update and save the runtime if a valid value is available
                if (savedMovie && details.runtime > 0) {
                    savedMovie.runtime = details.runtime;
                    saveWatchlist(updatedWatchlist);
                }

            } catch (error) {
                // log the error if the movie runtime cannot be retrieved
                console.error(
                    `Unable to update runtime for ${movie.title}:`,
                    error.message
                );
            }
        }
    }

    // refresh the watchlist after checking all saved movies
    renderWatchlist();
}

// check for missing movie runtimes when the application starts
updateMissingRuntimes();
