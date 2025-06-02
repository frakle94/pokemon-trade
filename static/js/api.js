// api.js

let currentUser = null;
let allCards = [];
let selectedCards = [];

// Global caches for offered/searched data (two-step approach for iOS copy)
let cachedOfferedData = [];
let cachedSearchedData = [];

let handleOfferOutsideClick = null;
let handleSearchOutsideClick = null;

// Rarity comparator: returns a number for each rarity
// so that sorting places them in the desired order:
// star, 4 diamonds, 3 diamonds, 2 diamonds, 1 diamond
function rarityOrder(rar) {
  switch (rar) {
    case '★':      return 0;
    case '♦♦♦♦':   return 1;
    case '♦♦♦':    return 2;
    case '♦♦':     return 3;
    case '♦':      return 4;
    default:       return 999; // put unknown or other rarities at the end
  }
}

function handleRegistration(e) {
  e.preventDefault();
  const username = document.getElementById('reg_username').value;
  const email = document.getElementById('reg_email').value;
  const password = document.getElementById('reg_password').value;
  const pokemonId = document.getElementById('reg_pokemon_id').value;

  axios.post('/register', { username, email, password, pokemon_id: pokemonId })
    .then(response => {
      alert(
        response.data.message +
        '\n' +
        'Please check your email inbox or your spam folder.'
        );
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
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
      
      <!-- Titolo + pulsante Copy list fianco a fianco -->
      <div class="d-flex align-items-center justify-content-between mt-4" style="width:100%;">
        <h4 class="mb-0">Pokémons For Trade</h4>
        <button
          class="btn btn-info btn-sm"
          onclick="copyOfferedList()"
          style="white-space:nowrap;">
          Copy list
        </button>
      </div>
      <br/>
      <ul id="offeredPokemonList" class="list-group mt-2"></ul>
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

// CHUNKING UTILITY: divides an array into sub-arrays of length `size`
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// fetchOfferedPokemon, sorted by rarity
function fetchOfferedPokemon() {
  axios.get(`/pokemon/offered?username=${currentUser.username}`)
    .then(response => {
      const offeredList = document.getElementById('offeredPokemonList');
      if (!offeredList) return;
      offeredList.innerHTML = '';

      // Sort by custom rarity order
      const sortedOffers = response.data.slice().sort((a, b) => {
        return rarityOrder(a.rarity) - rarityOrder(b.rarity);
      });

      // Cache the sorted data for two-step approach
      cachedOfferedData = sortedOffers;

      // Break the array into groups of 3 so each row can have up to 3 items
      const chunkedOffers = chunkArray(sortedOffers, 3);

      chunkedOffers.forEach(triple => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';

        let rowHTML = '<div class="row text-center">';

        triple.forEach(offer => {
          rowHTML += `
            <div class="col-4" style="margin-bottom: 1rem;">
              <strong>${offer.pokemon}</strong><br/>
              ${offer.expansion || 'N/A'}<br/>
              ${offer.rarity || 'N/A'}<br/>
          `;

          if (offer.image_url) {
            rowHTML += `
              <img
                src="${offer.image_url}"
                alt="Pokémon Image"
                style="max-width: 80px; height: auto; margin: 0.5rem 0;"
              /><br/>
            `;
          } else {
            rowHTML += `<span>No image</span><br/>`;
          }

          rowHTML += `
              <button
                class="btn btn-danger btn-sm"
                onclick="deleteOffer(${offer.id})"
              >
                Delete
              </button>
            </div>
          `;
        });

        rowHTML += '</div>'; // close row
        listItem.innerHTML = rowHTML;
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
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
      
      <!-- Titolo + pulsante Copy list fianco a fianco -->
      <div class="d-flex align-items-center justify-content-between mt-4" style="width:100%;">
        <h4 class="mb-0">Pokémons you Look For</h4>
        <button
          class="btn btn-info btn-sm"
          onclick="copySearchedList()"
          style="white-space:nowrap;">
          Copy list
        </button>
      </div>
      <br/>
      <ul id="searchedPokemonList" class="list-group mt-2"></ul>
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

// fetchSearchedPokemon, also sorted by custom rarity
function fetchSearchedPokemon() {
  axios.get(`/pokemon/searched?username=${currentUser.username}`)
    .then(response => {
      const searchedList = document.getElementById('searchedPokemonList');
      if (!searchedList) return;
      searchedList.innerHTML = '';

      // Sort by custom rarity order
      const sortedSearches = response.data.slice().sort((a, b) => {
        return rarityOrder(a.rarity) - rarityOrder(b.rarity);
      });

      // Cache the sorted data for two-step approach
      cachedSearchedData = sortedSearches;

      // Break data into groups of 3 so each row can have up to 3 items
      const chunkedSearches = chunkArray(sortedSearches, 3);

      chunkedSearches.forEach(triple => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';

        let rowHTML = '<div class="row text-center">';

        triple.forEach(search => {
          rowHTML += `
            <div class="col-4" style="margin-bottom: 1rem;">
              <strong>${search.pokemon}</strong><br/>
              ${search.expansion || 'N/A'}<br/>
              ${search.rarity || 'N/A'}<br/>
          `;

          if (search.image_url) {
            rowHTML += `
              <img
                src="${search.image_url}"
                alt="Pokémon Image"
                style="max-width: 80px; height: auto; margin: 0.5rem 0;"
              /><br/>
            `;
          } else {
            rowHTML += `<span>No image</span><br/>`;
          }

          rowHTML += `
              <button
                class="btn btn-danger btn-sm"
                onclick="deleteSearch(${search.id})"
              >
                Delete
              </button>
            </div>
          `;
        });

        rowHTML += '</div>'; // close row
        listItem.innerHTML = rowHTML;
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

/* ===========================  MAGICAL MATCH  =========================== */
function magicalMatch() {
  /* ------------------------------------------------------------------ */
  /*  pulizia listener esterni                                           */
  /* ------------------------------------------------------------------ */
  if (handleOfferOutsideClick)  { document.removeEventListener('mousedown', handleOfferOutsideClick);  handleOfferOutsideClick  = null; }
  if (handleSearchOutsideClick) { document.removeEventListener('mousedown', handleSearchOutsideClick); handleSearchOutsideClick = null; }

  /* ------------------------------------------------------------------ */
  /*  gancio area azioni                                                 */
  /* ------------------------------------------------------------------ */
  const actionArea = document.getElementById('actionArea');
  actionArea.innerHTML = `
    <div class="mb-3" style="max-width:300px;">
      <label for="match_trade_condition" class="form-label">Trade Status:</label>
      <select id="match_trade_condition" class="form-control" required>
        <option value="NONE">Cannot trade</option>
        <option value="COMMON">Can trade up to ♦♦♦</option>
        <option value="ALL">Can trade all cards</option>
      </select>
    </div>
    <div id="matchResults"></div>
  `;

  /* ------------------------------ helper badge APIs ------------------ */
  const giveBadge   = user => axios.post('/user/badge',        {from_username:currentUser.username, target_username:user});
  const removeBadge = user => axios.post('/user/badge/remove', {from_username:currentUser.username, target_username:user});
  const alertErr    = err  => alert(err.response?.data?.message || err.message);

  /* ------------------------------ UI refresh ------------------------- */
  const tradeSel = document.getElementById('match_trade_condition');
  tradeSel.value = currentUser.trade_condition || 'ALL';

  function loadMatchResults() {
    const resBox = document.getElementById('matchResults');
    resBox.innerHTML = '';

    if (currentUser.trade_condition === 'NONE') {
      resBox.innerHTML = '<p>Your Trade Status is set to "<strong>Cannot trade</strong>".<br>Change it to see potential matches.</p>';
      return;
    }

    axios.get(`/pokemon/magical_match?username=${currentUser.username}`)
      .then(({ data }) => {
        if (!Array.isArray(data) || !data.length) {
          const msg = data.message || 'No users up for a trade at the moment.<br>Try adding ALL Pokémons you can trade and ALL Pokémons you look for.';
          resBox.innerHTML = `<p>${msg}</p>`; return;
        }

        data.forEach(item => {
          const mySTO      = item.mySearch_TheirOffer  || [];
          const theirSMO   = item.theirSearch_MyOffer || [];
          const lastLogin  = item.other_user_last_login ? new Date(item.other_user_last_login).toLocaleString() : 'unknown';
          const safeId     = encodeURIComponent(item.other_user);

          /* ---------- badge visuale accanto al nome ---------- */
          /* ---------- badge visuale accanto al nome ---------- */
          let badgeHTML = '';
          if (item.user_has_badged) {
            // verde: ho assegnato io il badge
            badgeHTML = `<span class="badge bg-success ms-2">🥇</span>`;
          } else if (item.count_badges_received > 0) {
            // grigio: badge ricevuti da altri, con contatore
            badgeHTML = `<span class="badge bg-secondary ms-2">🥇 ${item.count_badges_received}</span>`;
          }

          /* ---------- pulsante verde / giallo (in alto a destra) ---------- */
          const badgeBtn = item.user_has_badged
            ? `<button class="btn btn-warning btn-sm position-absolute d-flex align-items-center"
                      style="position:absolute; top:10px; right:10px; gap:4px;"
                      onclick="removeBadge('${item.other_user}').then(loadMatchResults).catch(alertErr)">
                  Remove&nbsp;Badge&nbsp;🥇
              </button>`
            : `<button class="btn btn-success btn-sm position-absolute d-flex align-items-center"
                      style="position:absolute; top:10px; right:10px; gap:4px;"
                      onclick="giveBadge('${item.other_user}').then(loadMatchResults).catch(alertErr)">
                  Assign&nbsp;Badge&nbsp;🥇
              </button>`;

          /* ---------- card HTML ---------- */
          resBox.insertAdjacentHTML('beforeend', `
            <div class="card my-3 position-relative">
              <div class="card-body" style="padding-bottom:5rem;">
                <h5 class="card-title">
                  Match with ${item.other_user} ${badgeHTML}
                </h5>
                <p><strong>Other User's Pokémon ID:</strong> ${item.other_user_pokemon_id}</p>
                <p><strong>Last login:</strong> ${lastLogin}</p>
                <p><strong>You want from them:</strong> ${mySTO.join(', ')}</p>
                <p><strong>They want from you:</strong> ${theirSMO.join(', ')}</p>

                <label class="form-label mt-2"><strong>Preferred Pokémon to receive:</strong></label>
                <select id="pref_${safeId}" class="form-select form-select-sm mb-2">
                  ${mySTO.map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>

                ${badgeBtn}

                <button class="btn btn-primary btn-sm send-pokeball-btn d-flex align-items-center"
                        style="position:absolute; bottom:10px; right:10px; gap:4px;"
                        onclick="sendPokeball('${item.other_user}')">
                  Send&nbsp;Pokéball <span style="font-size:1.1rem;">◓</span>
                </button>
              </div>
            </div>
          `);
        });
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Unexpected error while fetching matches.';
        resBox.innerHTML = `<p>${msg}</p>`;
      });
  }

  /* ------------------------------ cambio Trade-Status --------------- */
  tradeSel.addEventListener('change', e => {
    const newVal = e.target.value;
    axios.put('/user/trade_condition', {username: currentUser.username, trade_condition: newVal})
         .then(() => { currentUser.trade_condition = newVal; loadMatchResults(); })
         .catch(err => { alert('Error updating Trade Status: ' + (err.response?.data?.message || err.message)); tradeSel.value = currentUser.trade_condition; });
  });

  loadMatchResults();
}

/* ===================  NUOVA FUNZIONE sendPokeball  ===================== */

function sendPokeball(otherUsername) {
  // id HTML codificato come nell’inserimento card
  const sel = document.getElementById(
    'pref_' + encodeURIComponent(otherUsername)
  );
  const preferred = sel ? sel.value : '';

  axios.post('/send_pokeball', {
    from_username     : currentUser.username,
    to_username       : otherUsername,
    preferred_pokemon : preferred        // ← ora esiste sempre
  })
  .then(() => {
    alert(`Pokéball sent to ${otherUsername}! Check your inbox (or spam) for received Pokéballs.`);
    if (window.goatcounter?.count) {
      goatcounter.count({
        path : '/event/pokeball',
        title: 'Send Pokéball',
        event: true
      });
    }
  })
  .catch(err => {
    alert(
      'Error sending Pokéball: ' +
      (err.response?.data?.message || err.message)
    );
  });
}

function showProfile() {
  // mostra/occulta i contenitori
  document.getElementById('mainAppContainer').classList.add('hidden');
  document.getElementById('profileViewContainer').classList.remove('hidden');

  // popola i campi ancora presenti nel form
  document.getElementById('profile_username').value   = currentUser.username  || '';
  document.getElementById('profile_email').value      = currentUser.email     || '';
  document.getElementById('profile_pokemon_id').value = currentUser.pokemonId || '';
  document.getElementById('profile_password').value   = currentUser.password  || '';

  // registra **una sola** volta il listener per l’update
  const form = document.getElementById('updateProfileForm');
  form.removeEventListener('submit', updateProfile);   // evita duplicati
  form.addEventListener   ('submit', updateProfile);
}

function updateProfile(event) {
  event.preventDefault();

  const newUsername  = document.getElementById('profile_username').value;
  const newEmail     = document.getElementById('profile_email').value;
  const newPokemonId = document.getElementById('profile_pokemon_id').value;
  const newPassword  = document.getElementById('profile_password').value;

  // Trade Status non è più nel form → usiamo quello già in memoria
  const newTradeCondition = currentUser.trade_condition;

  axios.put('/user/update', {
    old_username: currentUser.username,
    username: newUsername,
    email: newEmail,
    pokemon_id: newPokemonId,
    password: newPassword,
    trade_condition: newTradeCondition        // manteniamo invariato
  })
  .then(res => {
    alert(res.data.message || 'Profile updated successfully!');

    // aggiorna l’oggetto utente in cache
    Object.assign(currentUser, {
      username: newUsername,
      email: newEmail,
      password: newPassword,
      pokemonId: newPokemonId,
      trade_condition: newTradeCondition
    });

    // torna alla schermata principale
    navigateToFeatures(
      currentUser.username,
      currentUser.email,
      currentUser.pokemonId,
      currentUser.password,
      currentUser.trade_condition
    );
  })
  .catch(err => {
    alert(
      'Error updating profile: ' +
      (err.response?.data?.message || err.message)
    );
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

function groupByRarityAndExpansion(dataArray) {
  const grouped = {};
  dataArray.forEach(item => {
    const rar = item.rarity || 'Unknown';
    const exp = item.expansion || 'Unknown';
    if (!grouped[rar]) {
      grouped[rar] = {};
    }
    if (!grouped[rar][exp]) {
      grouped[rar][exp] = [];
    }
    grouped[rar][exp].push(item);
  });
  return grouped;
}

async function copyText(text) {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    return new Promise((resolve, reject) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        document.body.removeChild(textArea);
        resolve();
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
      }
    });
  }
}

// Copy FOR TRADE list (rarity -> expansion)
function copyOfferedList() {
  if (!cachedOfferedData || !cachedOfferedData.length) {
    alert("No offered data is loaded yet. Please refresh or add some offers first!");
    return;
  }

  const groupedOffered = groupByRarityAndExpansion(cachedOfferedData);
  let textResult = "**FOR TRADE:**\n\n";

  const rarities = Object.keys(groupedOffered).sort();
  let isFirstRarity = true;

  rarities.forEach(rar => {
    if (!isFirstRarity) {
      // Add a blank line before printing the next rarity
      textResult += "\n";
    } else {
      isFirstRarity = false;
    }

    textResult += `**${rar}**\n`; // Rarità in grassetto

    const expansions = Object.keys(groupedOffered[rar]).sort();
    expansions.forEach(exp => {
      // Expansion in bold
      textResult += `**${exp}**\n`;

      // List Pokémon
      groupedOffered[rar][exp].forEach(poke => {
        textResult += `- ${poke.pokemon}\n`;
      });
    });
  });

  copyText(textResult)
    .then(() => {
      alert("Offered list copied to clipboard!");
    })
    .catch(err => {
      console.error("Failed to copy offered list:", err);
      alert("Unable to copy the offered list to clipboard.");
    });
}

// Copy LOOKING FOR list (rarity -> expansion)
function copySearchedList() {
  if (!cachedSearchedData || !cachedSearchedData.length) {
    alert("No searched data is loaded yet. Please refresh or add some searches first!");
    return;
  }

  const groupedSearched = groupByRarityAndExpansion(cachedSearchedData);
  let textResult = "**LOOKING FOR:**\n\n";

  const rarities = Object.keys(groupedSearched).sort();
  let isFirstRarity = true;

  rarities.forEach(rar => {
    if (!isFirstRarity) {
      textResult += "\n";
    } else {
      isFirstRarity = false;
    }

    textResult += `**${rar}**\n`; // Rarità in grassetto

    const expansions = Object.keys(groupedSearched[rar]).sort();
    expansions.forEach(exp => {
      textResult += `**${exp}**\n`; // Expansion in bold

      groupedSearched[rar][exp].forEach(poke => {
        textResult += `- ${poke.pokemon}\n`;
      });
    });
  });

  copyText(textResult)
    .then(() => {
      alert("Searched list copied to clipboard!");
    })
    .catch(err => {
      console.error("Failed to copy searched list:", err);
      alert("Unable to copy the searched list to clipboard.");
    });
}

function giveBadge(other){axios.post('/user/badge',
  {from_username: currentUser.username, target_username: other})
  .then(magicalMatch).catch(alertErr);}
function removeBadge(other){axios.post('/user/badge/remove',
  {from_username: currentUser.username, target_username: other})
  .then(magicalMatch).catch(alertErr);}
function alertErr(err){
  alert(err.response?.data?.message || err.message);
}