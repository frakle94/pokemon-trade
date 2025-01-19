function navigateToFeatures(username, pokemonId, password) {
    currentUser = { username, pokemonId, password };

    document.body.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container-fluid">
                <a class="navbar-brand">Pokémon Trade Platform</a>
                <button class="btn btn-outline-primary ms-auto" onclick="showProfile()">Profile</button>
            </div>
        </nav>
        <div class="container mt-5">
            <h1 class="text-center">Welcome, ${username}!</h1>
            <p class="text-center">Now you can offer and search for Pokémon.</p>
            <div class="text-center">
                <button id="offerPokemonBtn" class="btn btn-primary" onclick="setActiveButton('offer')">Offer Pokémon</button>
                <button id="searchPokemonBtn" class="btn btn-secondary" onclick="setActiveButton('search')">Search Pokémon</button>
            </div>
            <div id="actionArea" class="mt-4"></div>
        </div>`;

    // Automatically activate "Offer Pokémon"
    offerPokemon();
}


function setActiveButton(activeButton) {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');

    if (activeButton === 'offer') {
        // Activate "Offer Pokémon"
        offerButton.classList.remove('btn-secondary');
        offerButton.classList.add('btn-primary');

        // Deactivate "Search Pokémon"
        searchButton.classList.remove('btn-primary');
        searchButton.classList.add('btn-secondary');

        // Load the Offer Pokémon functionality
        offerPokemon();
    } else if (activeButton === 'search') {
        // Activate "Search Pokémon"
        searchButton.classList.remove('btn-secondary');
        searchButton.classList.add('btn-primary');

        // Deactivate "Offer Pokémon"
        offerButton.classList.remove('btn-primary');
        offerButton.classList.add('btn-secondary');

        // Load the Search Pokémon functionality
        searchPokemon();
    }
}

