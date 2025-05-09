// navigation.js

function navigateToFeatures(
  username,
  email,
  pokemonId,
  password,
  tradeCondition = 'ALL'
) {
  currentUser = {
    username,
    email,
    pokemonId,
    password,
    trade_condition: tradeCondition
  };

  /* ─── nascondi autenticazione + landing steps ─────────────────── */
  const authContainer  = document.getElementById('authContainer');
  if (authContainer)   authContainer.classList.add('hidden');

  const heroSection    = document.getElementById('heroSection');   // NEW
  if (heroSection)     heroSection.classList.add('hidden');        // NEW

  const profileViewContainer = document.getElementById('profileViewContainer');
  if (profileViewContainer)  profileViewContainer.classList.add('hidden');

  const infoViewContainer    = document.getElementById('infoViewContainer');
  if (infoViewContainer)     infoViewContainer.classList.add('hidden');

  const mainAppContainer = document.getElementById('mainAppContainer');
  if (mainAppContainer)  mainAppContainer.classList.remove('hidden');

  const userSpan = document.getElementById('username');
  if (userSpan) userSpan.textContent = username;

  const offerBtn  = document.getElementById('offerPokemonBtn');
  const searchBtn = document.getElementById('searchPokemonBtn');
  const matchBtn  = document.getElementById('magicalMatchBtn');

  if (offerBtn)  offerBtn.onclick  = () => setActiveButton('offer');
  if (searchBtn) searchBtn.onclick = () => setActiveButton('search');
  if (matchBtn)  matchBtn.onclick  = () => setActiveButton('match');

  setActiveButton('offer');
}

function setActiveButton(activeButton) {
  const offerButton  = document.getElementById('offerPokemonBtn');
  const searchButton = document.getElementById('searchPokemonBtn');
  const matchButton  = document.getElementById('magicalMatchBtn');

  if (offerButton && searchButton && matchButton) {
    if (activeButton === 'offer') {
      offerButton .classList.remove('btn-secondary');
      offerButton .classList.add   ('btn-primary');
      searchButton.classList.remove('btn-primary');
      searchButton.classList.add   ('btn-secondary');
      matchButton .classList.remove('btn-primary');
      matchButton .classList.add   ('btn-secondary');
      offerPokemon();
    } else if (activeButton === 'search') {
      searchButton.classList.remove('btn-secondary');
      searchButton.classList.add   ('btn-primary');
      offerButton .classList.remove('btn-primary');
      offerButton .classList.add   ('btn-secondary');
      matchButton .classList.remove('btn-primary');
      matchButton .classList.add   ('btn-secondary');
      searchPokemon();
    } else if (activeButton === 'match') {
      matchButton .classList.remove('btn-secondary');
      matchButton .classList.add   ('btn-primary');
      offerButton .classList.remove('btn-primary');
      offerButton .classList.add   ('btn-secondary');
      searchButton.classList.remove('btn-primary');
      searchButton.classList.add   ('btn-secondary');
      magicalMatch();
    }
  }
}

function backFromProfile() {
  if (currentUser) {
    navigateToFeatures(
      currentUser.username,
      currentUser.email,
      currentUser.pokemonId,
      currentUser.password,
      currentUser.trade_condition
    );
  } else {
    location.reload();
  }
}

function logout() {
  currentUser = null;
  location.reload();
}

/* ======================== */
/*  NUOVA FUNZIONE showInfo */
/* ======================== */

function showInfo() {
  // Hide main app container
  const mainAppContainer = document.getElementById('mainAppContainer');
  if (mainAppContainer) {
    mainAppContainer.classList.add('hidden');
  }

  // Create or reuse the info container
  let infoViewContainer = document.getElementById('infoViewContainer');
  if (!infoViewContainer) {
    infoViewContainer = document.createElement('div');
    infoViewContainer.id = 'infoViewContainer';
    document.body.appendChild(infoViewContainer);
  }

  // Left-align everything (no .text-center, no auto margins)
  infoViewContainer.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container">
        <a class="navbar-brand">Pokémon Trade Platform</a>
        <div class="ms-auto">
          <button class="btn btn-secondary btn-sm me-2" onclick="backFromProfile()">Back</button>
        </div>
      </div>
    </nav>

    <div class="container mt-5">
      <h2>Turn the website link into an app on your smartphone home screen</h2>

      <div class="mt-4" style="max-width: 600px;">
        <h4 class="mt-3">iPhone</h4>
        <ol>
          <li>Open your browser (Safari, Chrome) and paste the link.</li>
          <li>Tap the Share icon.</li>
          <li>Tap Add to Home Screen.</li>
          <li>Tap Add.</li>
          <li>Enjoy the cool icon!</li>
        </ol>

        <h4 class="mt-3">Android</h4>
        <ol>
          <li>Open Chrome and paste the link.</li>
          <li>Tap the Menu (three dots).</li>
          <li>Select Add to Home screen.</li>
          <li>Tap Add.</li>
          <li>Enjoy the cool icon!</li>
        </ol>
      </div>

      <hr class="my-4">
  `;

  infoViewContainer.classList.remove('hidden');
}