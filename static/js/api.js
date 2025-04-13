// api.js

let currentUser = null;
let allCards = [];
let selectedCards = [];

let handleOfferOutsideClick = null;
let handleSearchOutsideClick = null;

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
    .catch(() => {
      alert('Invalid email or password. Please try again.');
    });
}

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

function loadAllCards() {
  return axios.get('/get_all_cards')
    .then(response => {
      allCards = response.data;
    })
    .catch(err => {
      console.error("Errore caricamento carte:", err);
      allCards = [];
    });
}

function updateCardGrid(containerId, expansionFilter, nameFilter, rarityFilter) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.classList.remove('hidden');

  const filterExp = (expansionFilter || '').trim().toLowerCase();
  const filterName = (nameFilter || '').trim().toLowerCase();
  const filterRarity = (rarityFilter || '').trim().toLowerCase();

  const filtered = allCards.filter(card => {
    const cExp = (card.expansion || '').toLowerCase();
    const cName = (card.name || '').toLowerCase();
    const cRarity = (card.rarity || '').toLowerCase();

    const passExp = !filterExp || cExp === filterExp;
    const passName = !filterName || cName.includes(filterName);
    const passRarity = !filterRarity || cRarity === filterRarity;

    return passExp && passName && passRarity;
  });

  container.innerHTML = '';
  filtered.forEach((card, idx) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'pokemon-card';
    cardDiv.setAttribute('data-index', idx);

    const isSelected = selectedCards.some(
      sc => sc.name === card.name && sc.expansion === card.expansion && sc.rarity === card.rarity
    );
    if (isSelected) {
      cardDiv.classList.add('selected-card');
    }

    cardDiv.innerHTML = `
      <img src="${card.image_url}" alt="${card.name}" />
      <p>${card.name}</p>
      <p style="font-size: 0.8rem;">${card.expansion} (${card.rarity})</p>
    `;
    cardDiv.addEventListener('click', () => toggleCardSelection(card));
    container.appendChild(cardDiv);
  });
}

function toggleCardSelection(card) {
  const index = selectedCards.findIndex(
    sc => sc.name === card.name && sc.expansion === card.expansion && sc.rarity === card.rarity
  );
  if (index === -1) {
    selectedCards.push({ ...card });
  } else {
    selectedCards.splice(index, 1);
  }

  const offExp = document.getElementById('offerExpansionSelect');
  const offRarity = document.getElementById('offerRaritySelect');
  const offName = document.getElementById('offerPokemonName');
  const cardGridOffer = document.getElementById('cardGridContainerOffer');

  const searchExp = document.getElementById('searchExpansionSelect');
  const searchRarity = document.getElementById('searchRaritySelect');
  const searchName = document.getElementById('searchPokemonName');
  const cardGridSearch = document.getElementById('cardGridContainerSearch');

  // If the offer grid exists, re-apply all filters (including rarity)
  if (offExp && offRarity && offName && cardGridOffer) {
    updateCardGrid(
      'cardGridContainerOffer',
      offExp.value,
      offName.value,
      offRarity.value
    );
  }

  // If the search grid exists, re-apply all filters (including rarity)
  if (searchExp && searchRarity && searchName && cardGridSearch) {
    updateCardGrid(
      'cardGridContainerSearch',
      searchExp.value,
      searchName.value,
      searchRarity.value
    );
  }
}

function offerPokemon() {
  if (handleOfferOutsideClick) {
    document.removeEventListener('mousedown', handleOfferOutsideClick);
    handleOfferOutsideClick = null;
  }
  if (handleSearchOutsideClick) {
    document.removeEventListener('mousedown', handleSearchOutsideClick);
    handleSearchOutsideClick = null;
  }

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
      <div class="mb-3">
        <select
          id="offerRaritySelect"
          class="form-control"
          style="background-color: #000; color: #fff;"
        >
          <option value="" selected>Select rarity</option>
        </select>
      </div>
      <form id="offerPokemonForm" class="mx-auto" autocomplete="off">
        <div class="mb-3">
          <input
            type="text"
            class="form-control"
            id="offerPokemonName"
            placeholder="Enter Pokémon name"
          >
        </div>
        <div id="cardGridContainerOffer" class="pokemon-grid hidden"></div>
        <button type="submit" class="btn btn-primary">Submit Offer</button>
      </form>
      <h4 class="mt-4">Your Offered Pokémon</h4>
      <ul id="offeredPokemonList" class="list-group"></ul>
    </div>
  `;

  loadExpansions("offerExpansionSelect");
  loadRarity("offerRaritySelect");
  loadAllCards().then(() => {
    selectedCards = [];

    const selectExp = document.getElementById('offerExpansionSelect');
    const selectRarity = document.getElementById('offerRaritySelect');
    const inputName = document.getElementById('offerPokemonName');
    const gridContainer = document.getElementById('cardGridContainerOffer');
    const offerForm = document.getElementById('offerPokemonForm');

    // When expansion changes, reset selectedCards and update the grid
    selectExp.addEventListener('change', () => {
      selectedCards = [];
      updateCardGrid('cardGridContainerOffer', selectExp.value, inputName.value, selectRarity.value);
    });

    // When rarity changes, also filter the grid
    selectRarity.addEventListener('change', () => {
      selectedCards = [];
      updateCardGrid('cardGridContainerOffer', selectExp.value, inputName.value, selectRarity.value);
    });

    // Focus in name field -> show grid with current filters
    inputName.addEventListener('focus', () => {
      updateCardGrid('cardGridContainerOffer', selectExp.value, inputName.value, selectRarity.value);
    });

    // Typing in name -> reset cards, then update grid
    inputName.addEventListener('input', () => {
      selectedCards = [];
      updateCardGrid('cardGridContainerOffer', selectExp.value, inputName.value, selectRarity.value);
    });

    // Hide the grid when clicking outside, if no cards are selected
    handleOfferOutsideClick = (evt) => {
      const clickInsideForm = offerForm.contains(evt.target);
      const clickInsideGrid = gridContainer.contains(evt.target);
      if (!clickInsideForm && !clickInsideGrid) {
        if (!selectedCards.length) {
          gridContainer.classList.add('hidden');
        }
      }
    };
    document.addEventListener('mousedown', handleOfferOutsideClick);

    gridContainer.classList.add('hidden');
  });

  // Submitting the offer -> post each selected card
  document.getElementById('offerPokemonForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selectedCards.length) {
      alert("Please select at least one card to offer.");
      return;
    }
    const promises = selectedCards.map(card => {
      return axios.post('/pokemon/offer', {
        username: currentUser.username,
        pokemon: card.name,
        expansion: card.expansion,
        rarity: card.rarity
      });
    });
    Promise.all(promises)
      .then(() => {
        fetchOfferedPokemon();
        selectedCards = [];
        const expSel = document.getElementById('offerExpansionSelect');
        const nameInput = document.getElementById('offerPokemonName');
        document.getElementById('cardGridContainerOffer').classList.add('hidden');
        nameInput.value = "";
        expSel.value = "";
      })
      .catch(error => {
        alert('Error: ' + (error.response?.data?.message || error.message));
      });
  });

  fetchOfferedPokemon();
}

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

function deleteOffer(offerId) {
  axios.delete('/pokemon/offer/delete', { data: { offer_id: offerId } })
    .then(() => {
      fetchOfferedPokemon();
    })
    .catch(error => {
      alert('Error deleting offer: ' + (error.response?.data?.message || error.message));
    });
}

function searchPokemon() {
  if (handleOfferOutsideClick) {
    document.removeEventListener('mousedown', handleOfferOutsideClick);
    handleOfferOutsideClick = null;
  }
  if (handleSearchOutsideClick) {
    document.removeEventListener('mousedown', handleSearchOutsideClick);
    handleSearchOutsideClick = null;
  }

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
      <div class="mb-3">
        <select
          id="searchRaritySelect"
          class="form-control"
          style="background-color: #000; color: #fff;"
        >
          <option value="" selected>Select rarity</option>
        </select>
      </div>
      <form id="searchPokemonForm" class="mx-auto" autocomplete="off">
        <div class="mb-3">
          <input
            type="text"
            class="form-control"
            id="searchPokemonName"
            placeholder="Enter Pokémon name"
          >
        </div>
        <div id="cardGridContainerSearch" class="pokemon-grid hidden"></div>
        <button type="submit" class="btn btn-primary">Submit Search</button>
      </form>
      <h4 class="mt-4">Your Searched Pokémon</h4>
      <ul id="searchedPokemonList" class="list-group"></ul>
    </div>
  `;

  loadExpansions("searchExpansionSelect");
  loadRarity("searchRaritySelect");
  loadAllCards().then(() => {
    selectedCards = [];

    const selectExp = document.getElementById('searchExpansionSelect');
    const selectRarity = document.getElementById('searchRaritySelect');
    const inputName = document.getElementById('searchPokemonName');
    const gridContainer = document.getElementById('cardGridContainerSearch');
    const searchForm = document.getElementById('searchPokemonForm');

    // Filter by expansion, name, rarity
    selectExp.addEventListener('change', () => {
      selectedCards = [];
      updateCardGrid('cardGridContainerSearch', selectExp.value, inputName.value, selectRarity.value);
    });

    selectRarity.addEventListener('change', () => {
      selectedCards = [];
      updateCardGrid('cardGridContainerSearch', selectExp.value, inputName.value, selectRarity.value);
    });

    inputName.addEventListener('focus', () => {
      updateCardGrid('cardGridContainerSearch', selectExp.value, inputName.value, selectRarity.value);
    });

    inputName.addEventListener('input', () => {
      selectedCards = [];
      updateCardGrid('cardGridContainerSearch', selectExp.value, inputName.value, selectRarity.value);
    });

    handleSearchOutsideClick = (evt) => {
      const clickInsideForm = searchForm.contains(evt.target);
      const clickInsideGrid = gridContainer.contains(evt.target);
      if (!clickInsideForm && !clickInsideGrid) {
        if (!selectedCards.length) {
          gridContainer.classList.add('hidden');
        }
      }
    };
    document.addEventListener('mousedown', handleSearchOutsideClick);

    gridContainer.classList.add('hidden');
  });

  document.getElementById('searchPokemonForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selectedCards.length) {
      alert("Please select at least one card to search.");
      return;
    }
    const promises = selectedCards.map(card => {
      return axios.post('/pokemon/search', {
        username: currentUser.username,
        pokemon: card.name,
        expansion: card.expansion,
        rarity: card.rarity
      });
    });
    Promise.all(promises)
      .then(() => {
        fetchSearchedPokemon();
        selectedCards = [];
        const expSel = document.getElementById('searchExpansionSelect');
        const nameInput = document.getElementById('searchPokemonName');
        const rarSel = document.getElementById('searchRaritySelect');
        document.getElementById('cardGridContainerSearch').classList.add('hidden');
        nameInput.value = "";
        expSel.value = "";
        rarSel.value = "";
      })
      .catch(error => {
        alert('Error: ' + (error.response?.data?.message || error.message));
      });
  });

  fetchSearchedPokemon();
}

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
  if (handleOfferOutsideClick) {
    document.removeEventListener('mousedown', handleOfferOutsideClick);
    handleOfferOutsideClick = null;
  }
  if (handleSearchOutsideClick) {
    document.removeEventListener('mousedown', handleSearchOutsideClick);
    handleSearchOutsideClick = null;
  }

  const someContainer = document.getElementById('actionArea');
  someContainer.innerHTML = '<h3>Two-Sided Magical Match Results</h3>';

  axios.get(`/pokemon/magical_match?username=${currentUser.username}`)
    .then(response => {
      const data = response.data;
      if (data && data.message && !Array.isArray(data)) {
        someContainer.innerHTML += `<p>${data.message}</p>`;
        return;
      }
      if (!data || data.length === 0) {
        someContainer.innerHTML += '<p>No users up for a trade at the moment.<br>Try adding ALL Pokémons you can offer and ALL Pokémons you search.<br>Try later on the Magical Match!</p>';
        return;
      }
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
      if (error.response && error.response.status === 403) {
        const msg = error.response.data.message || "You are in a 'no trade' status, no matches found.";
        someContainer.innerHTML += `<p>${msg}</p>`;
      } else {
        alert('Error fetching two-sided match: ' + (error.response?.data?.message || error.message));
      }
    });
}

function showProfile() {
  document.getElementById('mainAppContainer').classList.add('hidden');
  document.getElementById('profileViewContainer').classList.remove('hidden');
  document.getElementById('profile_username').value = currentUser?.username || '';
  document.getElementById('profile_email').value = currentUser?.email || '';
  document.getElementById('profile_pokemon_id').value = currentUser?.pokemonId || '';
  document.getElementById('profile_password').value = currentUser?.password || '';
  document.getElementById('profile_trade_condition').value = currentUser?.trade_condition || 'ALL';
  document.getElementById('updateProfileForm').addEventListener('submit', updateProfile);
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
    currentUser.username = newUsername;
    currentUser.email = newEmail;
    currentUser.password = newPassword;
    currentUser.pokemonId = newPokemonId;
    currentUser.trade_condition = newTradeCondition;

    navigateToFeatures(
      currentUser.username,
      currentUser.email,
      currentUser.pokemonId,
      currentUser.password,
      currentUser.trade_condition
    );
  })
  .catch(error => {
    alert('Error updating profile: ' + (error.response?.data?.message || error.message));
  });
}

function closeProfileCard() {
  const profileCard = document.getElementById('profileCard');
  profileCard.classList.add('hidden');
}

// We add a function to load rarity as well
function loadExpansions(selectId) {
  axios.get('/get_pokemon_names?list_expansions=true')
    .then(response => {
      const expansions = response.data;
      const selectEl = document.getElementById(selectId);
      if (!selectEl) return;
      selectEl.innerHTML = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Select expansion';
      selectEl.appendChild(defaultOpt);

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

function loadRarity(selectId) {
  axios.get('/get_pokemon_names?list_rarities=true')
    .then(response => {
      const rarities = response.data;  // array of all distinct rarities from CSV
      const selectEl = document.getElementById(selectId);
      if (!selectEl) return;
      selectEl.innerHTML = '';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Select rarity';
      selectEl.appendChild(defaultOpt);

      rarities.forEach(rar => {
        const opt = document.createElement('option');
        opt.value = rar;
        opt.textContent = rar;
        selectEl.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Error fetching rarities:", err);
    });
}