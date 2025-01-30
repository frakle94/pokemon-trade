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

// Searches for Pokémon (behaves like offerPokemon)
function searchPokemon() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <div class="centered-content">
            <h3 class="mb-4">Search for a Pokémon</h3>
            <form id="searchPokemonForm" class="mx-auto">
                <div class="mb-3">
                    <input type="text" class="form-control" id="searchPokemonName" placeholder="Enter Pokémon name" required>
                </div>
                <button type="submit" class="btn btn-primary">Submit Search</button>
            </form>
            <h4 class="mt-4">Your Searched Pokémon</h4>
            <ul id="searchedPokemonList" class="list-group"></ul>
        </div>
    `;

    // Fetch the list of already searched Pokémon for this user
    fetchSearchedPokemon();

    // Handle form submission to search/add a new Pokémon
    document.getElementById('searchPokemonForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const pokemonName = document.getElementById('searchPokemonName').value;

        axios.post('/pokemon/search', { username: currentUser.username, pokemon: pokemonName })
            .then(() => {
                fetchSearchedPokemon();
                document.getElementById('searchPokemonName').value = '';
            })
            .catch(error => {
                alert('Error: ' + (error.response?.data?.message || error.message));
            });
    });
}

// Fetches the list of searched Pokémon
function fetchSearchedPokemon() {
    axios.get(`/pokemon/searched?username=${currentUser.username}`)
        .then(response => {
            const searchedList = document.getElementById('searchedPokemonList');
            searchedList.innerHTML = ''; // Clear previous list
            response.data.forEach(search => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                listItem.innerHTML = `
                    ${search.pokemon}
                    <button class="btn btn-danger tiny-btn" onclick="deleteSearch(${search.id})">Delete</button>
                `;
                searchedList.appendChild(listItem);
            });
        })
        .catch(error => {
            alert('Error fetching searched Pokémon: ' + (error.response?.data?.message || error.message));
        });
}

// Deletes a searched Pokémon entry
function deleteSearch(searchId) {
    axios.delete('/pokemon/search/delete', { data: { search_id: searchId } })
        .then(() => {
            fetchSearchedPokemon(); // Refresh the list after deletion
        })
        .catch(error => {
            alert('Error deleting search: ' + (error.response?.data?.message || error.message));
        });
}

function activateMagicalMatch() {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');
    const matchButton = document.getElementById('magicalMatchBtn');

    // Make Magical Match button primary
    matchButton.classList.remove('btn-secondary');
    matchButton.classList.add('btn-primary');

    // Make Offer and Search buttons secondary
    offerButton.classList.remove('btn-primary');
    offerButton.classList.add('btn-secondary');
    searchButton.classList.remove('btn-primary');
    searchButton.classList.add('btn-secondary');

    // Load Magical Match functionality
    magicalMatch();
}

function magicalMatch() {
    const actionArea = document.getElementById('actionArea');
    actionArea.innerHTML = `
        <div class="centered-content">
            <h3 class="mb-4">Magical Match Results</h3>
            <div id="magicalMatchResults"></div>
        </div>
    `;

    axios.get(`/pokemon/magical_match?username=${currentUser.username}`)
        .then(response => {
            const resultsContainer = document.getElementById('magicalMatchResults');
            const matches = response.data;

            if (!matches || matches.length === 0) {
                resultsContainer.innerHTML = '<p class="text-muted">No matches found.</p>';
                return;
            }

            let output = '';
            matches.forEach(match => {
                output += `
                    <div class="card my-3">
                        <div class="card-body">
                            <h5 class="card-title">Pokémon: ${match.pokemon}</h5>
                            <p class="card-text">Offered By: ${match.offered_by}</p>
                            <p class="card-text">Other User's Pokémon ID: ${match.other_user_pokemon_id}</p>
                        </div>
                    </div>
                `;
            });
            resultsContainer.innerHTML = output;
        })
        .catch(error => {
            alert('Error fetching Magical Match results: ' + (error.response?.data?.message || error.message));
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

function updateProfile(event) {
    event.preventDefault();
  
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
      alert(response.data.message || 'Profile updated successfully!');
  
      // Update currentUser in the client
      currentUser.username = newUsername;
      currentUser.pokemonId = newPokemonId;
      currentUser.password = newPassword;
  
      navigateToMainApp();
    })
    .catch(error => {
      alert('Error updating profile: ' + (error.response?.data?.message || error.message));
    });
  }  


function closeProfileCard() {
    const profileCard = document.getElementById('profileCard');
    profileCard.classList.add('hidden'); // Hide the profile card
}
