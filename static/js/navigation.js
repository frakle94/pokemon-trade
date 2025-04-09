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
  
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
      authContainer.classList.add('hidden');
    }
  
    const profileViewContainer = document.getElementById('profileViewContainer');
    if (profileViewContainer) {
      profileViewContainer.classList.add('hidden');
    }
  
    const mainAppContainer = document.getElementById('mainAppContainer');
    if (mainAppContainer) {
      mainAppContainer.classList.remove('hidden');
    }
  
    const userSpan = document.getElementById('username');
    if (userSpan) {
      userSpan.textContent = username;
    }
  
    const offerBtn = document.getElementById('offerPokemonBtn');
    const searchBtn = document.getElementById('searchPokemonBtn');
    const matchBtn = document.getElementById('magicalMatchBtn');
  
    if (offerBtn) {
      offerBtn.onclick = () => setActiveButton('offer');
    }
    if (searchBtn) {
      searchBtn.onclick = () => setActiveButton('search');
    }
    if (matchBtn) {
      matchBtn.onclick = () => setActiveButton('match');
    }
  
    setActiveButton('offer');
  }
  
  function setActiveButton(activeButton) {
    const offerButton = document.getElementById('offerPokemonBtn');
    const searchButton = document.getElementById('searchPokemonBtn');
    const matchButton = document.getElementById('magicalMatchBtn');
  
    if (offerButton && searchButton && matchButton) {
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