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
                <button class="btn btn-primary" onclick="offerPokemon()">Offer Pokémon</button>
                <button class="btn btn-success" onclick="searchPokemon()">Search Pokémon</button>
            </div>
            <div id="actionArea" class="mt-4"></div>
        </div>`;
}
