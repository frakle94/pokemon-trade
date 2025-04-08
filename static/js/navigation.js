// navigation.js

function navigateToFeatures(username, email, pokemonId, password, tradeCondition = 'ALL') {
    currentUser = {
        username,
        email,
        pokemonId,
        password,
        trade_condition: tradeCondition
    };

    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainAppContainer').classList.remove('hidden');

    document.getElementById('username').textContent = username;

    document.getElementById('offerPokemonBtn')
        .addEventListener('click', () => setActiveButton('offer'));
    document.getElementById('searchPokemonBtn')
        .addEventListener('click', () => setActiveButton('search'));
    document.getElementById('magicalMatchBtn')
        .addEventListener('click', () => setActiveButton('match'));

    setActiveButton('offer');
}

function setActiveButton(activeButton) {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');
    const matchButton = document.getElementById('magicalMatchBtn');

    if (activeButton === 'offer') {
        offerButton.classList.remove('btn-secondary');
        offerButton.classList.add('btn-primary');
        searchButton.classList.remove('btn-primary');
        searchButton.classList.add('btn-secondary');
        matchButton.classList.remove('btn-primary');
        matchButton.classList.add('btn-secondary');
        offerPokemon();
    } else if (activeButton === 'search') {
        searchButton.classList.remove('btn-secondary');
        searchButton.classList.add('btn-primary');
        offerButton.classList.remove('btn-primary');
        offerButton.classList.add('btn-secondary');
        matchButton.classList.remove('btn-primary');
        matchButton.classList.add('btn-secondary');
        searchPokemon();
    } else if (activeButton === 'match') {
        matchButton.classList.remove('btn-secondary');
        matchButton.classList.add('btn-primary');
        offerButton.classList.remove('btn-primary');
        offerButton.classList.add('btn-secondary');
        searchButton.classList.remove('btn-primary');
        searchButton.classList.add('btn-secondary');
        magicalMatch();
    }
}