let currentUser = null; // Shared global variable for user session

// Handles user registration
function handleRegistration(e) {
    e.preventDefault();
    const username = document.getElementById('reg_username').value;
    const password = document.getElementById('reg_password').value;
    const pokemonId = document.getElementById('reg_pokemon_id').value;

    axios.post('/register', { username, password, pokemon_id: pokemonId })
        .then(response => {
            alert(response.data.message);
            navigateToFeatures(response.data.username, response.data.pokemon_id, password);
        })
        .catch(error => alert('Error: ' + error.response.data.message));
}

// Handles user login
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login_username').value;
    const password = document.getElementById('login_password').value;

    axios.post('/login', { username, password })
        .then(response => {
            // Directly navigate to the app without showing an alert
            navigateToFeatures(response.data.username, response.data.pokemon_id, password);
        })
        .catch(error => alert('Invalid username or password. Please try again.'));
}

// Updates user profile
function updateProfile(e) {
    e.preventDefault();
    const newUsername = document.getElementById('profile_username').value;
    const newPokemonId = document.getElementById('profile_pokemon_id').value;
    const newPassword = document.getElementById('profile_password').value;

    axios.put('/user/update', {
        old_username: currentUser.username,
        username: newUsername,
        pokemon_id: newPokemonId,
        password: newPassword
    })
    .then(response => {
        alert(response.data.message);
        navigateToFeatures(newUsername, newPokemonId, newPassword);
    })
    .catch(error => alert('Error updating profile: ' + error.response.data.message));
}

function offerPokemon() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <h3>Offer a Pokémon</h3>
        <form id="offerPokemonForm">
            <div class="mb-3">
                <label for="offerPokemonName" class="form-label">Pokémon Name</label>
                <input type="text" class="form-control" id="offerPokemonName" required>
            </div>
            <button type="submit" class="btn btn-primary">Submit Offer</button>
        </form>
        <h4 class="mt-4">Your Offered Pokémon</h4>
        <ul id="offeredPokemonList" class="list-group"></ul>
    `;

    // Load the list of offered Pokémon
    fetchOfferedPokemon();

    // Handle form submission
    document.getElementById('offerPokemonForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const pokemon = document.getElementById('offerPokemonName').value;

        axios.post('/pokemon/offer', { username: currentUser.username, pokemon })
            .then(() => {
                // Refresh the offered Pokémon list after a successful offer
                fetchOfferedPokemon();
                // Clear the input field for a better user experience
                document.getElementById('offerPokemonName').value = '';
            })
            .catch(error => alert('Error: ' + (error.response?.data?.message || error.message)));
    });
}

function fetchOfferedPokemon() {
    axios.get(`/pokemon/offered?username=${currentUser.username}`)
        .then(response => {
            const offeredList = document.getElementById('offeredPokemonList');
            offeredList.innerHTML = ''; // Clear previous list
            response.data.forEach(offer => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                listItem.innerHTML = `
                    ${offer.pokemon}
                    <button class="btn btn-danger btn-sm" onclick="deleteOffer(${offer.id})">Delete</button>
                `;
                offeredList.appendChild(listItem);
            });
        })
        .catch(error => alert('Error fetching offered Pokémon: ' + (error.response?.data?.message || error.message)));
}

function deleteOffer(offerId) {
    axios.delete('/pokemon/offer/delete', { data: { offer_id: offerId } })
        .then(response => {
            alert(response.data.message);
            fetchOfferedPokemon(); // Refresh the offered Pokémon list
        })
        .catch(error => alert('Error deleting offer: ' + (error.response?.data?.message || error.message)));
}

function searchPokemon() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <h3>Search for a Pokémon</h3>
        <form id="searchPokemonForm">
            <div class="mb-3">
                <label for="searchPokemonName" class="form-label">Pokémon Name</label>
                <input type="text" class="form-control" id="searchPokemonName" required>
            </div>
            <button type="submit" class="btn btn-primary">Search</button> <!-- Use btn-primary for same color -->
        </form>
        <div id="searchResults" class="mt-3"></div>
    `;

    document.getElementById('searchPokemonForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const pokemonName = document.getElementById('searchPokemonName').value;

        axios.get(`/pokemon/search?name=${pokemonName}`)
            .then(response => {
                const resultsDiv = document.getElementById('searchResults');
                resultsDiv.innerHTML = '<h4>Results:</h4>';
                if (response.data.length > 0) {
                    response.data.forEach(result => {
                        resultsDiv.innerHTML += `<p>User: ${result.username}, Pokémon ID: ${result.pokemon_id}, Pokémon: ${result.pokemon}</p>`;
                    });
                } else {
                    resultsDiv.innerHTML = '<p>No matches found.</p>';
                }
            })
            .catch(error => alert('Error searching for Pokémon: ' + (error.response?.data?.message || error.message)));
    });
}
