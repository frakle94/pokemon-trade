function navigateToFeatures(username, pokemonId, password) {
    // Store the current user
    currentUser = { username, pokemonId, password };

    // Hide login/registration and show the main app container
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainAppContainer').classList.remove('hidden');

    // Update the username display
    document.getElementById('username').textContent = username;

    // Attach event listeners to the existing HTML buttons
    document.getElementById('offerPokemonBtn')
        .addEventListener('click', () => setActiveButton('offer'));

    document.getElementById('searchPokemonBtn')
        .addEventListener('click', () => setActiveButton('search'));

    document.getElementById('magicalMatchBtn')
        .addEventListener('click', () => setActiveButton('match'));

    // Activate "Offer Pokémon" by default
    setActiveButton('offer');
}



function setActiveButton(activeButton) {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');
    const matchButton = document.getElementById('magicalMatchBtn');

    if (activeButton === 'offer') {
        // Offer active
        offerButton.classList.remove('btn-secondary');
        offerButton.classList.add('btn-primary');

        // Search inactive
        searchButton.classList.remove('btn-primary');
        searchButton.classList.add('btn-secondary');

        // Match inactive
        matchButton.classList.remove('btn-primary');
        matchButton.classList.add('btn-secondary');

        offerPokemon();

    } else if (activeButton === 'search') {
        // Search active
        searchButton.classList.remove('btn-secondary');
        searchButton.classList.add('btn-primary');

        // Offer inactive
        offerButton.classList.remove('btn-primary');
        offerButton.classList.add('btn-secondary');

        // Match inactive
        matchButton.classList.remove('btn-primary');
        matchButton.classList.add('btn-secondary');

        searchPokemon();

    } else if (activeButton === 'match') {
        // Match active
        matchButton.classList.remove('btn-secondary');
        matchButton.classList.add('btn-primary');

        // Offer inactive
        offerButton.classList.remove('btn-primary');
        offerButton.classList.add('btn-secondary');

        // Search inactive
        searchButton.classList.remove('btn-primary');
        searchButton.classList.add('btn-secondary');

        magicalMatch();
    }
}


