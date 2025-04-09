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
  
  function navigateToMainApp(username) {
    currentUser = { ...currentUser, username };
    document.body.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container-fluid">
          <a class="navbar-brand">Pokémon Trade Platform</a>
          <button class="btn btn-outline-primary ms-auto" onclick="showProfile()">Profile</button>
        </div>
      </nav>
      <div class="container mt-5" id="mainAppContainer">
        <h1 class="text-center">Welcome, ${username}!</h1>
        <p class="text-center" style="border: 2px solid black; padding: 0.5rem; border-radius: 0.5rem;">
          <strong>Offer</strong> your spare Pokémons,<br>
          <strong>Search</strong> the Pokémons you need,<br>
          <strong>Magical Match</strong> to find users up for a trade.<br>
          <br>
          Update your Profile <strong>Trade Status</strong> when you are low on points.<br>
        </p>
        <div class="d-flex justify-content-center mb-4 align-items-center">
          <button id="offerPokemonBtn" class="btn btn-primary me-1">Offer Pokémon</button>
          <button id="searchPokemonBtn" class="btn btn-secondary">Search Pokémon</button>
          <button id="magicalMatchBtn" class="btn btn-secondary btn-rainbow">Magical Match</button>
        </div>
        <div id="actionArea" class="mt-4"></div>
      </div>
      <div class="hidden" id="profileViewContainer">
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
          <div class="container">
            <a class="navbar-brand">Pokémon Trade Platform</a>
            <div class="ms-auto">
              <button class="btn btn-secondary btn-sm me-2" onclick="navigateToMainApp()">Back</button>
              <button class="btn btn-danger btn-sm" onclick="logout()">Logout</button>
            </div>
          </div>
        </nav>
        <div class="container profile-centered-container">
          <h1 class="text-center">Your Profile</h1>
          <form id="updateProfileForm">
            <div class="mb-3">
              <label for="profile_username" class="form-label">Pokémon Pocket Username</label>
              <input type="text" class="form-control" id="profile_username" required />
            </div>
            <div class="mb-3">
              <label for="profile_email" class="form-label">Email</label>
              <input type="text" class="form-control" id="profile_email" required />
            </div>
            <div class="mb-3">
              <label for="profile_password" class="form-label">Password</label>
              <input type="password" class="form-control" id="profile_password" required />
            </div>
            <div class="mb-3">
              <label for="profile_pokemon_id" class="form-label">Pokémon Pocket ID</label>
              <input type="text" class="form-control" id="profile_pokemon_id" required />
            </div>
            <div class="mb-3">
              <label for="profile_trade_condition" class="form-label" style="color: blue;">Trade Status</label>
              <select class="form-control" id="profile_trade_condition" required>
                <option value="NONE">Cannot trade</option>
                <option value="COMMON">Common cards only</option>
                <option value="ALL">All cards!</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary w-100">Update Profile</button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('offerPokemonBtn').addEventListener('click', () => setActiveButton('offer'));
    document.getElementById('searchPokemonBtn').addEventListener('click', () => setActiveButton('search'));
    document.getElementById('magicalMatchBtn').addEventListener('click', () => setActiveButton('match'));
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
  
  function logout() {
    currentUser = null;
    location.reload();
  }  