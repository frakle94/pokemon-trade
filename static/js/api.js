// Shared global variable for user session
let currentUser = null;

// Handles user registration
function handleRegistration(e) {
    e.preventDefault();
    const username = document.getElementById('reg_username').value;
    const password = document.getElementById('reg_password').value;
    const pokemonId = document.getElementById('reg_pokemon_id').value;

    axios.post('/register', { username, password, pokemon_id: pokemonId })
        .then(response => {
            alert(response.data.message);
            navigateToFeatures(response.data.username, pokemonId, password);
        })
        .catch(error => {
            alert('Error: ' + (error.response?.data?.message || error.message));
        });
}

// Handles user login
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login_username').value;
    const password = document.getElementById('login_password').value;

    axios.post('/login', { username, password })
        .then(response => {
            navigateToFeatures(response.data.username, response.data.pokemon_id, password);
        })
        .catch(error => {
            alert('Invalid username or password. Please try again.');
        });
}


// Navigates to the main application after login/registration
function navigateToMainApp(username) {
    currentUser = { username };

    // Replace the login/registration content with the main app content
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
            <div class="text-center mb-4">
                <!-- Centered Heading -->
                <h3 id="offerHeading" class="mb-4">Offer a Pokémon</h3>

                <!-- Flexbox Container for Buttons -->
                <div class="button-container d-flex justify-content-center align-items-center">
                    <button id="offerPokemonBtn" class="btn btn-primary me-1">Offer Pokémon</button>
                    <button id="searchPokemonBtn" class="btn btn-secondary">Search Pokémon</button>
                </div>
            </div>
            <div id="actionArea" class="mt-4"></div>
        </div>
    `;

    // Automatically activate Offer Pokémon
    activateOfferPokemon();
}


// Activates the "Offer Pokémon" button and deactivates "Search Pokémon"
function activateOfferPokemon() {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');

    offerButton.classList.remove('btn-secondary');
    offerButton.classList.add('btn-primary');

    searchButton.classList.remove('btn-primary');
    searchButton.classList.add('btn-secondary');

    // Load Offer Pokémon functionality
    offerPokemon();
}

// Activates the "Search Pokémon" button and deactivates "Offer Pokémon"
function activateSearchPokemon() {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');

    searchButton.classList.remove('btn-secondary');
    searchButton.classList.add('btn-primary');

    offerButton.classList.remove('btn-primary');
    offerButton.classList.add('btn-secondary');

    // Load Search Pokémon functionality
    searchPokemon();
}

// Offers a Pokémon
function offerPokemon() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <div class="centered-content">
            <h3 class="mb-4">Offer a Pokémon</h3>
            <form id="offerPokemonForm" class="mx-auto">
                <div class="mb-3">
                    <input type="text" class="form-control" id="offerPokemonName" placeholder="Enter Pokémon name" required>
                </div>
                <button type="submit" class="btn btn-primary">Submit Offer</button>
            </form>
            <h4 class="mt-4">Your Offered Pokémon</h4>
            <ul id="offeredPokemonList" class="list-group"></ul>
        </div>
    `;
    fetchOfferedPokemon();

    document.getElementById('offerPokemonForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const pokemonName = document.getElementById('offerPokemonName').value;

        axios.post('/pokemon/offer', { username: currentUser.username, pokemon: pokemonName })
            .then(() => {
                fetchOfferedPokemon();
                document.getElementById('offerPokemonName').value = '';
            })
            .catch(error => {
                alert('Error: ' + (error.response?.data?.message || error.message));
            });
    });
}




// Fetches the list of offered Pokémon
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
                    <button class="btn btn-danger tiny-btn" onclick="deleteOffer(${offer.id})">Delete</button>
                `;
                offeredList.appendChild(listItem);
            });
        })
        .catch(error => {
            alert('Error fetching offered Pokémon: ' + (error.response?.data?.message || error.message));
        });
}

// Deletes an offered Pokémon
function deleteOffer(offerId) {
    axios.delete('/pokemon/offer/delete', { data: { offer_id: offerId } })
        .then(() => {
            fetchOfferedPokemon(); // Refresh the list after deletion
        })
        .catch(error => {
            alert('Error deleting offer: ' + (error.response?.data?.message || error.message));
        });
}

// Searches for Pokémon
function searchPokemon() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <div class="centered-content">
            <h3 class="mb-4">Search for a Pokémon</h3>
            <form id="searchPokemonForm" class="mx-auto">
                <div class="mb-3">
                    <input type="text" class="form-control" id="searchPokemonName" placeholder="Enter Pokémon name" required>
                </div>
                <button type="submit" class="btn btn-primary">Search</button>
            </form>
            <div id="searchResults" class="mt-4"></div>
        </div>
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
                        resultsDiv.innerHTML += `
                            <div class="card my-3">
                                <div class="card-body">
                                    <h5 class="card-title">User: ${result.username}</h5>
                                    <p class="card-text">Pokémon Pocket ID: ${result.pokemon_id}</p>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    resultsDiv.innerHTML = '<p class="text-muted">No matches found.</p>';
                }
            })
            .catch(error => {
                alert('Error searching for Pokémon: ' + (error.response?.data?.message || error.message));
            });
    });
}

function showProfile() {
    const profileCard = document.getElementById('profileCard');
    const username = currentUser.username || 'Unknown User';
    const pokemonId = currentUser.pokemon_id || 'N/A';

    document.getElementById('profileUsername').textContent = username;
    document.getElementById('profilePokemonId').textContent = pokemonId;

    profileCard.classList.remove('hidden'); // Show the profile card
}

function closeProfileCard() {
    const profileCard = document.getElementById('profileCard');
    profileCard.classList.add('hidden'); // Hide the profile card
}
