// Shared global variable for user session
let currentUser = null;

// Handles user registration
function handleRegistration(e) {
  e.preventDefault();
  const username = document.getElementById('reg_username').value;
  const email = document.getElementById('reg_email').value;
  const password = document.getElementById('reg_password').value;
  const pokemonId = document.getElementById('reg_pokemon_id').value;

  axios.post('/register', { username, email, password, pokemon_id: pokemonId })
    .then(response => {
      alert(response.data.message);
      navigateToFeatures(response.data.username, email, pokemonId, password);
    })
    .catch(error => {
      alert('Error: ' + (error.response?.data?.message || error.message));
    });
}

// Handles user login using email
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login_email').value;
  const password = document.getElementById('login_password').value;

  axios.post('/login', { email, password })
    .then(response => {
      navigateToFeatures(response.data.username, response.data.email, response.data.pokemon_id, password);
    })
    .catch(error => {
      alert('Invalid email or password. Please try again.');
    });
}

// Handles forgot password
function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot_email').value;

  axios.post('/forgot-password', { email })
    .then(() => {
      alert('Check your email for reset instructions.');
    })
    .catch(error => {
      alert('Error: ' + (error.response?.data?.message || error.message));
    });
}

/**
 * Salva i dati utente in currentUser e chiama navigateToMainApp()
 */
function navigateToFeatures(username, email, pokemonId, password) {
  currentUser = { username, email, pokemonId, password };
  navigateToMainApp(username);
}

/**
 * Ricostruisce il body con i pulsanti Offer/Search,
 * e di default mostra "Offer Pokémon"
 */
function navigateToMainApp(username) {
  // Aggiorniamo se necessario
  currentUser = { ...currentUser, username };

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
        <h3 id="offerHeading" class="mb-4">Offer a Pokémon</h3>
        <div class="button-container d-flex justify-content-center align-items-center">
          <button id="offerPokemonBtn" class="btn btn-primary me-1">Offer Pokémon</button>
          <button id="searchPokemonBtn" class="btn btn-secondary">Search Pokémon</button>
        </div>
      </div>
      <div id="actionArea" class="mt-4"></div>
    </div>
  `;

  // Bind pulsanti
  document.getElementById('offerPokemonBtn').addEventListener('click', activateOfferPokemon);
  document.getElementById('searchPokemonBtn').addEventListener('click', activateSearchPokemon);

  // Mostriamo la sezione "Offer Pokémon" di default
  activateOfferPokemon();
}

// Attiva Offer Pokémon
function activateOfferPokemon() {
  const offerButton = document.getElementById('offerPokemonBtn');
  const searchButton = document.getElementById('searchPokemonBtn');

  offerButton.classList.remove('btn-secondary');
  offerButton.classList.add('btn-primary');

  searchButton.classList.remove('btn-primary');
  searchButton.classList.add('btn-secondary');

  offerPokemon();
}

// Attiva Search Pokémon
function activateSearchPokemon() {
  const offerButton = document.getElementById('offerPokemonBtn');
  const searchButton = document.getElementById('searchPokemonBtn');

  searchButton.classList.remove('btn-secondary');
  searchButton.classList.add('btn-primary');

  offerButton.classList.remove('btn-primary');
  offerButton.classList.add('btn-secondary');

  searchPokemon();
}

/**
 * parseComboString(comboStr):
 * Given a string like "Bulbasaur (Geni Supremi, 1 R)",
 * returns an object { name, expansion, rarity } or null if invalid format.
 */
function parseComboString(comboStr) {
  // Example input: "Bulbasaur (Geni Supremi, 1 R)"
  const pattern = /^(.*?)\s*\((.*?),\s*(.*?)\)$/;
  const match = comboStr.match(pattern);
  if (!match) return null;

  // match[1] => "Bulbasaur"
  // match[2] => "Geni Supremi"
  // match[3] => "1 R"
  return {
    name: match[1].trim(),
    expansion: match[2].trim(),
    rarity: match[3].trim()
  };
}

/**
 * loadExpansions(selectId)
 * -> /get_pokemon_names?list_expansions=true
 *    per popolare <select id="selectId">
 */
function loadExpansions(selectId) {
  axios.get('/get_pokemon_names?list_expansions=true')
    .then(response => {
      const expansions = response.data; // es: ["Base set","Fossil","Jungle"...]
      const selectEl = document.getElementById(selectId);
      if (!selectEl) return;

      // Pulisco e aggiungo un placeholder
      selectEl.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.hidden = true;
      placeholder.textContent = 'Select expansion';
      selectEl.appendChild(placeholder);

      // Opzione "All expansions"
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = '— ALL —';
      selectEl.appendChild(allOpt);

      expansions.forEach(exp => {
        const opt = document.createElement('option');
        opt.value = exp;  // manteniamo la capitalizzazione
        opt.textContent = exp;
        selectEl.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Errore expansions:", err);
    });
}

/**
 * loadPokemonNamesDatalist(selectId, dataListId)
 * -> se selectId ha un expansionValue, filtra i Pokémon
 * -> altrimenti mostra tutti
 * -> riempie <datalist id="dataListId">
 *   con stringhe "Nome (Espansione, Rarità)" grazie a ?with_rarity=true
 */
function loadPokemonNamesDatalist(selectId, dataListId) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;

  const expansionValue = selectEl.value || '';
  // Always request combos: "Name (Expansion, Rarity)"
  let url = '/get_pokemon_names?with_rarity=true';

  // If the user picked an expansion, append it
  if (expansionValue) {
    // e.g. &expansion=geni supremi
    url += `&expansion=${encodeURIComponent(expansionValue.toLowerCase())}`;
  }

  axios.get(url)
    .then(response => {
      const dataList = document.getElementById(dataListId);
      if (!dataList) return;
      dataList.innerHTML = '';

      response.data.forEach(combo => {
        // combo might be: "Bulbasaur (Geni Supremi, 1 R)"
        const opt = document.createElement('option');
        opt.value = combo;
        dataList.appendChild(opt);
      });
    })
    .catch(error => {
      console.error("Errore caricamento nomi Pokémon (with combos):", error);
    });
}

/**
 * offerPokemon() -> disegna <select id="offerExpansionSelect"> e <input list="offerPokemonList">
 */
function offerPokemon() {
  const actionArea = document.getElementById('actionArea');
  actionArea.innerHTML = `
    <div class="centered-content">
      <!-- Replaced the heading with a small spacing -->
      <div class="mb-2"></div>

      <div class="mb-3">
        <select
          id="offerExpansionSelect"
          class="form-control"
          style="background-color: #000; color: #fff;"
        ></select>
      </div>

      <form id="offerPokemonForm" class="mx-auto" autocomplete="off">
        <div class="mb-3">
          <input
            type="text"
            class="form-control"
            id="offerPokemonName"
            list="offerPokemonList"
            placeholder="Enter Pokémon name"
            required
          >
          <datalist id="offerPokemonList"></datalist>
        </div>
        <button type="submit" class="btn btn-primary">Submit Offer</button>
      </form>

      <h4 class="mt-4">Your Offered Pokémon</h4>
      <ul id="offeredPokemonList" class="list-group"></ul>
    </div>
  `;

  // Load expansions in #offerExpansionSelect
  loadExpansions("offerExpansionSelect");

  // Populate the datalist with Pokémon combos
  loadPokemonNamesDatalist("offerExpansionSelect", "offerPokemonList");

  // Fetch and display offered Pokémon
  fetchOfferedPokemon();

  // When expansion changes, reload the Pokémon combos
  const selectEl = document.getElementById('offerExpansionSelect');
  selectEl.addEventListener('change', () => {
    loadPokemonNamesDatalist("offerExpansionSelect", "offerPokemonList");
  });

  // Handle form submission
  document.getElementById('offerPokemonForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const typedValue = document.getElementById('offerPokemonName').value.trim();
    const allOptions = [...document.querySelectorAll('#offerPokemonList option')].map(o => o.value);
    if (!allOptions.includes(typedValue)) {
      alert("Invalid Pokémon combo! Please select from the list.");
      return;
    }

    const parsed = parseComboString(typedValue);
    if (!parsed) {
      alert("Invalid combo format! Use: Name (Expansion, Rarity)");
      return;
    }

    axios.post('/pokemon/offer', {
      username: currentUser.username,
      pokemon: parsed.name,
      expansion: parsed.expansion,
      rarity: parsed.rarity
    })
    .then(() => {
      fetchOfferedPokemon();
      document.getElementById('offerPokemonName').value = '';
    })
    .catch(error => {
      alert('Error: ' + (error.response?.data?.message || error.message));
    });
  });
}

// GET /pokemon/offered
function fetchOfferedPokemon() {
  axios.get(`/pokemon/offered?username=${currentUser.username}`)
    .then(response => {
      const offeredList = document.getElementById('offeredPokemonList');
      if (!offeredList) return;
      offeredList.innerHTML = '';

      response.data.forEach(offer => {
        // Each offer object has: { id, pokemon, expansion, rarity, image_url }

        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';

        // Build HTML showing name, expansion, rarity, and image if present
        let displayHTML = `
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <strong>Pokémon:</strong> ${offer.pokemon}<br/>
              <strong>Expansion:</strong> ${offer.expansion || 'N/A'}<br/>
              <strong>Rarity:</strong> ${offer.rarity || 'N/A'}
            </div>
            <div class="d-flex align-items-center">
        `;

        if (offer.image_url) {
          displayHTML += `
              <img 
                src="${offer.image_url}" 
                alt="Pokémon Image"
                style="max-width: 80px; height: auto; margin-right: 12px;"
              />
          `;
        } else {
          displayHTML += `
              <span style="margin-right: 12px;">No image</span>
          `;
        }

        displayHTML += `
              <button 
                class="btn btn-danger btn-sm" 
                onclick="deleteOffer(${offer.id})">
                Delete
              </button>
            </div>
          </div>
        `;

        listItem.innerHTML = displayHTML;
        offeredList.appendChild(listItem);
      });
    })
    .catch(error => {
      alert('Error fetching offered Pokémon: ' + (error.response?.data?.message || error.message));
    });
}

// DELETE /pokemon/offer/delete
function deleteOffer(offerId) {
  axios.delete('/pokemon/offer/delete', { data: { offer_id: offerId } })
    .then(() => {
      fetchOfferedPokemon();
    })
    .catch(error => {
      alert('Error deleting offer: ' + (error.response?.data?.message || error.message));
    });
}

/**
 * searchPokemon() -> stesse expansions e filtraggio
 * + salvataggio expansion in /pokemon/search
 */
function searchPokemon() {
  const actionArea = document.getElementById('actionArea');
  actionArea.innerHTML = `
    <div class="centered-content">
      <!-- Replaced the heading with a small spacing -->
      <div class="mb-2"></div>

      <div class="mb-3">
        <select
          id="searchExpansionSelect"
          class="form-control"
          style="background-color: #000; color: #fff;"
        ></select>
      </div>

      <form id="searchPokemonForm" class="mx-auto" autocomplete="off">
        <div class="mb-3">
          <input 
            type="text"
            class="form-control"
            id="searchPokemonName"
            list="searchPokemonList"
            placeholder="Enter Pokémon name"
            required
          >
          <datalist id="searchPokemonList"></datalist>
        </div>
        <button type="submit" class="btn btn-primary">Submit Search</button>
      </form>

      <h4 class="mt-4">Your Searched Pokémon</h4>
      <ul id="searchedPokemonList" class="list-group"></ul>
    </div>
  `;

  // 1) Carichiamo expansions in #searchExpansionSelect
  loadExpansions("searchExpansionSelect");

  // 2) Carichiamo i Pokémon combos => (selectId="searchExpansionSelect", dataListId="searchPokemonList")
  loadPokemonNamesDatalist("searchExpansionSelect", "searchPokemonList");

  // 3) Carichiamo la lista "searched"
  fetchSearchedPokemon();

  // Cambi di expansions => ricarico i Pokémon combo
  const selectEl = document.getElementById('searchExpansionSelect');
  selectEl.addEventListener('change', () => {
    loadPokemonNamesDatalist("searchExpansionSelect", "searchPokemonList");
  });

  // Gestione form
  document.getElementById('searchPokemonForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const typedValue = document.getElementById('searchPokemonName').value.trim();

    const allOptions = [...document.querySelectorAll('#searchPokemonList option')].map(o => o.value);
    if (!allOptions.includes(typedValue)) {
      alert("Invalid Pokémon combo! Please select from the list.");
      return;
    }

    // Parse "Name (Expansion, Rarity)"
    const parsed = parseComboString(typedValue);
    if (!parsed) {
      alert("Invalid format! Use 'Name (Expansion, Rarity)'");
      return;
    }

    // POST /pokemon/search => pass all three
    axios.post('/pokemon/search', {
      username: currentUser.username,
      pokemon: parsed.name,
      expansion: parsed.expansion,
      rarity: parsed.rarity
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

/** GET /pokemon/searched?username=... */
function fetchSearchedPokemon() {
  axios.get(`/pokemon/searched?username=${currentUser.username}`)
    .then(response => {
      const searchedList = document.getElementById('searchedPokemonList');
      if (!searchedList) return;
      searchedList.innerHTML = '';

      response.data.forEach(search => {
        // Each search object might have: { id, pokemon, expansion, rarity, image_url }

        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';

        // Build HTML with name, expansion, rarity, and image if present
        let displayHTML = `
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <strong>Pokémon:</strong> ${search.pokemon}<br/>
              <strong>Expansion:</strong> ${search.expansion || 'N/A'}<br/>
              <strong>Rarity:</strong> ${search.rarity || 'N/A'}
            </div>
            <div class="d-flex align-items-center">
        `;

        if (search.image_url) {
          displayHTML += `
            <img
              src="${search.image_url}"
              alt="Pokémon Image"
              style="max-width: 80px; height: auto; margin-right: 12px;"
            />
          `;
        } else {
          displayHTML += `
            <span style="margin-right: 12px;">No image</span>
          `;
        }

        displayHTML += `
            <button
              class="btn btn-danger btn-sm"
              onclick="deleteSearch(${search.id})">
              Delete
            </button>
          </div>
        </div>
        `;

        listItem.innerHTML = displayHTML;
        searchedList.appendChild(listItem);
      });
    })
    .catch(error => {
      alert('Error fetching searched Pokémon: ' + (error.response?.data?.message || error.message));
    });
}

/** DELETE /pokemon/search/delete */
function deleteSearch(searchId) {
  axios.delete('/pokemon/search/delete', { data: { search_id: searchId } })
    .then(() => {
      fetchSearchedPokemon();
    })
    .catch(error => {
      alert('Error deleting search: ' + (error.response?.data?.message || error.message));
    });
}

/** activateMagicalMatch() -> pulsanti e poi magicalMatch() */
function activateMagicalMatch() {
  const offerButton = document.getElementById('offerPokemonBtn');
  const searchButton = document.getElementById('searchPokemonBtn');
  const matchButton = document.getElementById('magicalMatchBtn');

  matchButton.classList.remove('btn-secondary');
  matchButton.classList.add('btn-primary');

  offerButton.classList.remove('btn-primary');
  offerButton.classList.add('btn-secondary');
  searchButton.classList.remove('btn-primary');
  searchButton.classList.add('btn-secondary');

  magicalMatch();
}

function magicalMatch() {
  const someContainer = document.getElementById('actionArea');
  someContainer.innerHTML = '<h3>Two-Sided Magical Match Results</h3>';

  axios.get(`/pokemon/magical_match?username=${currentUser.username}`)
    .then(response => {
      const data = response.data;
      if (!data || data.length === 0) {
        someContainer.innerHTML += '<p>No users up for a trade at the moment.<br>Try adding ALL Pokémons you can offer and ALL Pokémons you search.<br>Try later on the Magical Match!</p>';
        return;
      }

      let html = '';
      data.forEach(item => {
        // Safely fallback to empty arrays so we can do join without errors
        const mySTO = item.mySearch_TheirOffer || [];
        const theirSMO = item.theirSearch_MyOffer || [];

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
      someContainer.innerHTML += html;
    })
    .catch(error => {
      alert('Error fetching two-sided match: ' + (error.response?.data?.message || error.message));
    });
}

/** showProfile(), updateProfile(), closeProfileCard() -> invariati se li usi */
function showProfile() {
  const profileCard = document.getElementById('profileCard');
  const username = currentUser.username || 'Unknown User';
  const email = currentUser.email || 'N/A';
  const pokemonId = currentUser.pokemon_id || 'N/A';

  document.getElementById('profileUsername').textContent = username;
  document.getElementById('profileEmail').textContent = email;
  document.getElementById('profilePokemonId').textContent = pokemonId;

  profileCard.classList.remove('hidden');
}

function updateProfile(event) {
  event.preventDefault();
  const newUsername = document.getElementById('profile_username').value;
  const newEmail = document.getElementById('profile_email').value;
  const newPokemonId = document.getElementById('profile_pokemon_id').value;
  const newPassword = document.getElementById('profile_password').value;

  axios.put('/user/update', {
    old_username: currentUser.username,
    username: newUsername,
    email: newEmail,
    pokemon_id: newPokemonId,
    password: newPassword
  })
  .then(response => {
    alert(response.data.message || 'Profile updated successfully!');
    currentUser.username = newUsername;
    currentUser.email = newEmail;
    currentUser.pokemonId = newPokemonId;
    currentUser.password = newPassword;
    navigateToMainApp(newUsername);
  })
  .catch(error => {
    alert('Error updating profile: ' + (error.response?.data?.message || error.message));
  });
}

function closeProfileCard() {
  const profileCard = document.getElementById('profileCard');
  profileCard.classList.add('hidden');
}
