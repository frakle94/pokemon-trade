// api.js

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
      const tc = response.data.trade_condition || 'ALL';
      navigateToFeatures(response.data.username, email, pokemonId, password, tc);
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
      const tc = response.data.trade_condition || 'ALL';
      navigateToFeatures(
        response.data.username,
        response.data.email,
        response.data.pokemon_id,
        password,
        tc
      );
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
 * Abbiamo aggiunto un quinto parametro tradeCondition.
 */
function navigateToFeatures(username, email, pokemonId, password, tradeCondition = 'ALL') {
  currentUser = { username, email, pokemonId, password, trade_condition: tradeCondition };
  navigateToMainApp(username);
}

/**
 * Ricostruisce il body con i pulsanti Offer/Search,
 * e di default mostra "Offer Pokémon"
 */
function navigateToMainApp(username) {
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

  document.getElementById('offerPokemonBtn').addEventListener('click', activateOfferPokemon);
  document.getElementById('searchPokemonBtn').addEventListener('click', activateSearchPokemon);
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

// parseComboString(comboStr)
function parseComboString(comboStr) {
  const pattern = /^(.*?)\s*\((.*?),\s*(.*?)\)$/;
  const match = comboStr.match(pattern);
  if (!match) return null;
  return {
    name: match[1].trim(),
    expansion: match[2].trim(),
    rarity: match[3].trim()
  };
}

// loadExpansions(selectId)
function loadExpansions(selectId) {
  axios.get('/get_pokemon_names?list_expansions=true')
    .then(response => {
      const expansions = response.data;
      const selectEl = document.getElementById(selectId);
      if (!selectEl) return;
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = '— ALL —';
      selectEl.appendChild(allOpt);
      expansions.forEach(exp => {
        const opt = document.createElement('option');
        opt.value = exp;
        opt.textContent = exp;
        selectEl.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Errore expansions:", err);
    });
}

// loadPokemonNamesDatalist(selectId, dataListId)
function loadPokemonNamesDatalist(selectId, dataListId) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const expansionValue = selectEl.value || '';
  let url = '/get_pokemon_names?with_rarity=true';
  if (expansionValue) {
    url += `&expansion=${encodeURIComponent(expansionValue.toLowerCase())}`;
  }

  axios.get(url)
    .then(response => {
      const dataList = document.getElementById(dataListId);
      if (!dataList) return;
      dataList.innerHTML = '';
      response.data.forEach(combo => {
        const opt = document.createElement('option');
        opt.value = combo;
        dataList.appendChild(opt);
      });
    })
    .catch(error => {
      console.error("Errore caricamento nomi Pokémon (with combos):", error);
    });
}

// offerPokemon()
function offerPokemon() {
  const actionArea = document.getElementById('actionArea');
  actionArea.innerHTML = `
    <div class="centered-content">
      <div class="mb-2"></div>
      <div class="mb-3">
        <select
          id="offerExpansionSelect"
          class="form-control"
          style="background-color: #000; color: #fff;"
        >
          <option value="" selected>Select expansion</option>
        </select>
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
  loadExpansions("offerExpansionSelect");
  loadPokemonNamesDatalist("offerExpansionSelect", "offerPokemonList");
  fetchOfferedPokemon();
  document.getElementById('offerExpansionSelect')
    .addEventListener('change', () => {
      loadPokemonNamesDatalist("offerExpansionSelect", "offerPokemonList");
    });
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

// fetchOfferedPokemon()
function fetchOfferedPokemon() {
  axios.get(`/pokemon/offered?username=${currentUser.username}`)
    .then(response => {
      const offeredList = document.getElementById('offeredPokemonList');
      if (!offeredList) return;
      offeredList.innerHTML = '';
      response.data.forEach(offer => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
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
          displayHTML += `<span style="margin-right: 12px;">No image</span>`;
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

// deleteOffer()
function deleteOffer(offerId) {
  axios.delete('/pokemon/offer/delete', { data: { offer_id: offerId } })
    .then(() => {
      fetchOfferedPokemon();
    })
    .catch(error => {
      alert('Error deleting offer: ' + (error.response?.data?.message || error.message));
    });
}

// searchPokemon()
function searchPokemon() {
  const actionArea = document.getElementById('actionArea');
  actionArea.innerHTML = `
    <div class="centered-content">
      <div class="mb-2"></div>
      <div class="mb-3">
        <select
          id="searchExpansionSelect"
          class="form-control"
          style="background-color: #000; color: #fff;"
        >
          <option value="" selected>Select expansion</option>
        </select>
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
  loadExpansions("searchExpansionSelect");
  loadPokemonNamesDatalist("searchExpansionSelect", "searchPokemonList");
  fetchSearchedPokemon();
  document.getElementById('searchExpansionSelect')
    .addEventListener('change', () => {
      loadPokemonNamesDatalist("searchExpansionSelect", "searchPokemonList");
    });
  document.getElementById('searchPokemonForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const typedValue = document.getElementById('searchPokemonName').value.trim();
    const allOptions = [...document.querySelectorAll('#searchPokemonList option')].map(o => o.value);
    if (!allOptions.includes(typedValue)) {
      alert("Invalid Pokémon combo! Please select from the list.");
      return;
    }
    const parsed = parseComboString(typedValue);
    if (!parsed) {
      alert("Invalid format! Use 'Name (Expansion, Rarity)'");
      return;
    }
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

// fetchSearchedPokemon()
function fetchSearchedPokemon() {
  axios.get(`/pokemon/searched?username=${currentUser.username}`)
    .then(response => {
      const searchedList = document.getElementById('searchedPokemonList');
      if (!searchedList) return;
      searchedList.innerHTML = '';
      response.data.forEach(search => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
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
          displayHTML += `<span style="margin-right: 12px;">No image</span>`;
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

// deleteSearch()
function deleteSearch(searchId) {
  axios.delete('/pokemon/search/delete', { data: { search_id: searchId } })
    .then(() => {
      fetchSearchedPokemon();
    })
    .catch(error => {
      alert('Error deleting search: ' + (error.response?.data?.message || error.message));
    });
}

function magicalMatch() {
  const someContainer = document.getElementById('actionArea');
  someContainer.innerHTML = '<h3>Two-Sided Magical Match Results</h3>';

  axios.get(`/pokemon/magical_match?username=${currentUser.username}`)
    .then(response => {
      const data = response.data;

      // If the server returns something like { message: "..."} instead of an array
      if (data && data.message && !Array.isArray(data)) {
        someContainer.innerHTML += `<p>${data.message}</p>`;
        return;
      }

      // If data is an array but empty => no matches found
      if (!data || data.length === 0) {
        someContainer.innerHTML += '<p>No users up for a trade at the moment.<br>Try adding ALL Pokémons you can offer and ALL Pokémons you search.<br>Try later on the Magical Match!</p>';
        return;
      }

      // Otherwise, data is an array of matches
      let html = '';
      data.forEach(item => {
        const mySTO = item.mySearch_TheirOffer || [];
        const theirSMO = item.theirSearch_MyOffer || [];
        html += `
          <div class="card my-3">
            <div class="card-body">
              <h5 class="card-title">Match with ${item.other_user}</h5>
              <p>Other User's Pokémon Pocket ID: ${item.other_user_pokemon_id}</p>
              <p>You want from them: ${mySTO.join(', ')}</p>
              <p>They want from you: ${theirSMO.join(', ')}</p>
            </div>
          </div>
        `;
      });
      someContainer.innerHTML += html;
    })
    .catch(error => {
      // If the server responded with 403, meaning user in "ALL" condition
      if (error.response && error.response.status === 403) {
        // Instead of a big alert, show the message inline
        const msg = error.response.data.message || "You are in a 'no trade' status, no matches found.";
        someContainer.innerHTML += `<p>${msg}</p>`;
      } else {
        alert('Error fetching two-sided match: ' + (error.response?.data?.message || error.message));
      }
    });
}

/**
 * showProfile(), updateProfile(), closeProfileCard() -> Gestione del profilo utente
 */
function showProfile() {
  const profileCard = document.getElementById('profileCard');
  const username = currentUser.username || 'Unknown User';
  const email = currentUser.email || 'N/A';
  const pokemonId = currentUser.pokemonId || 'N/A';

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
  const newTradeCondition = document.getElementById('profile_trade_condition').value;

  axios.put('/user/update', {
    old_username: currentUser.username,
    username: newUsername,
    email: newEmail,
    pokemon_id: newPokemonId,
    password: newPassword,
    trade_condition: newTradeCondition
  })
  .then(response => {
    alert(response.data.message || 'Profile updated successfully!');

    // Update currentUser in memory
    currentUser.username = newUsername;
    currentUser.email = newEmail;
    currentUser.password = newPassword;
    currentUser.pokemonId = newPokemonId;
    currentUser.trade_condition = newTradeCondition;

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