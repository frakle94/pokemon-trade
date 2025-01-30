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
        <form id="offerPokemonForm" class="mx-auto" autocomplete="off">
          <div class="mb-3">
            <input 
              type="text" 
              class="form-control"
              id="offerPokemonName" 
              list="pokemonList"
              placeholder="Enter Pokémon name"
              required
              autocomplete="off"
            >
            <datalist id="pokemonList"></datalist>
          </div>
          <button type="submit" class="btn btn-primary">Submit Offer</button>
        </form>
        <h4 class="mt-4">Your Offered Pokémon</h4>
        <ul id="offeredPokemonList" class="list-group"></ul>
      </div>
    `;
  
    loadPokemonNamesDatalist();
    fetchOfferedPokemon();
  
    document.getElementById('offerPokemonForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const pokemonName = document.getElementById('offerPokemonName').value;
  
      const allOptions = [...document.querySelectorAll('#pokemonList option')].map(opt => opt.value);
      if (!allOptions.includes(pokemonName)) {
        alert("Nome Pokémon non valido! Seleziona un nome presente nell'elenco.");
        return;
      }
  
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
  
  function loadPokemonNamesDatalist() {
    axios.get('/get_pokemon_names')
      .then(response => {
        const validNames = response.data;
        const dataList = document.getElementById('pokemonList');
        dataList.innerHTML = '';
  
        validNames.forEach(nome => {
          const opt = document.createElement('option');
          opt.value = nome;
          dataList.appendChild(opt);
        });
      })
      .catch(error => {
        console.error("Errore caricamento nomi Pokémon:", error);
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
        <!-- Disable browser autocomplete to avoid old inputs -->
        <form id="searchPokemonForm" class="mx-auto" autocomplete="off">
          <div class="mb-3">
            <!-- Use list for the datalist -->
            <input 
              type="text" 
              class="form-control" 
              id="searchPokemonName" 
              list="pokemonListSearch"
              placeholder="Enter Pokémon name" 
              required 
              autocomplete="off"
            >
            <!-- Datalist for valid Pokémon names -->
            <datalist id="pokemonListSearch"></datalist>
          </div>
          <button type="submit" class="btn btn-primary">Submit Search</button>
        </form>
        <h4 class="mt-4">Your Searched Pokémon</h4>
        <ul id="searchedPokemonList" class="list-group"></ul>
      </div>
    `;
  
    // 1) Load valid Pokémon names for the datalist
    loadPokemonNamesDatalistSearch();
  
    // 2) Fetch the user's previously searched Pokémon
    fetchSearchedPokemon();
  
    // 3) Handle the form submission
    document.getElementById('searchPokemonForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const pokemonName = document.getElementById('searchPokemonName').value;
  
      // Collect all valid <option> values
      const allOptions = [...document.querySelectorAll('#pokemonListSearch option')]
        .map(opt => opt.value);
  
      // Block if it's not in the valid list
      if (!allOptions.includes(pokemonName)) {
        alert("Invalid Pokémon name! Please select a name from the list.");
        return;
      }
  
      // If valid, proceed with adding the new 'searched' Pokémon
      axios.post('/pokemon/search', {
        username: currentUser.username,
        pokemon: pokemonName
      })
      .then(() => {
        fetchSearchedPokemon();
        document.getElementById('searchPokemonName').value = '';
      })
      .catch(error => {
        alert('Error: ' + (error.response?.data?.message || error.message));
      });
    });
  }
  
  // Loads valid Pokémon names into the <datalist> for searching
  function loadPokemonNamesDatalistSearch() {
    // Change '/pokemon/get_pokemon_names' to your actual endpoint if needed
    axios.get('/get_pokemon_names') 
      .then(response => {
        const validNames = response.data; // e.g. ["Bulbasaur", "Charmander", ...]
        const dataList = document.getElementById('pokemonListSearch');
        dataList.innerHTML = '';
  
        validNames.forEach(nome => {
          const opt = document.createElement('option');
          opt.value = nome;
          dataList.appendChild(opt);
        });
      })
      .catch(error => {
        console.error("Error loading Pokémon names:", error);
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
    // 1. Grab the container from your HTML
    const someContainer = document.getElementById('actionArea');
  
    // 2. Optionally clear it and add a heading
    someContainer.innerHTML = '<h3>Two-Sided Magical Match Results</h3>';
  
    // 3. Make the request to your Flask route
    axios.get(`/pokemon/magical_match?username=${currentUser.username}`)
      .then(response => {
        const data = response.data; // an array of match objects
        if (!data || data.length === 0) {
          someContainer.innerHTML += '<p>No two-sided matches found.</p>';
          return;
        }
  
        let html = '';
        data.forEach(item => {
          // item might look like:
          // {
          //   "other_user": "User_2",
          //   "other_user_pokemon_id": "XYZ123",
          //   "mySearch_TheirOffer": ["E"],
          //   "theirSearch_MyOffer": ["A"]
          // }
          html += `
            <div class="card my-3">
              <div class="card-body">
                <h5 class="card-title">Match with ${item.other_user}</h5>
                <p>Other User's Pokémon ID: ${item.other_user_pokemon_id}</p>
                <p>You want from them: ${item.mySearch_TheirOffer.join(', ')}</p>
                <p>They want from you: ${item.theirSearch_MyOffer.join(', ')}</p>
              </div>
            </div>
          `;
        });
  
        // 4. Add all match cards to the container
        someContainer.innerHTML += html;
      })
      .catch(error => {
        alert('Error fetching two-sided match: ' + (error.response?.data?.message || error.message));
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
