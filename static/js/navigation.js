function navigateToFeatures(username, pokemonId, password) {
    currentUser = { username, pokemonId, password };

    // Replace the login/registration content with the main app content
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainAppContainer').classList.remove('hidden');

    // Update the username dynamically
    document.getElementById('username').textContent = username;

    // Ensure buttons are properly placed
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <div class="button-container d-flex justify-content-center mb-4">
            <button id="offerPokemonBtn" class="btn btn-primary me-2">Offer Pokémon</button>
            <button id="searchPokemonBtn" class="btn btn-secondary">Search Pokémon</button>
        </div>
    `;

    // Add event listeners for the buttons
    document.getElementById('offerPokemonBtn').addEventListener('click', activateOfferPokemon);
    document.getElementById('searchPokemonBtn').addEventListener('click', activateSearchPokemon);

    // Automatically activate Offer Pokémon
    activateOfferPokemon();
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

