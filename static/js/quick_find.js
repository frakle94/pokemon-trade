/* ========= QUICK FIND – always visible ========= */
(function () {
  const box  = document.getElementById("quickFindContainer");
  if (!box) return;

  const inp   = document.getElementById("qfName");
  const grid  = document.getElementById("qfGrid");
  const btn   = document.getElementById("qfSubmit");
  const res   = document.getElementById("qfResult");

  let filtered = [];           // ← array delle carte attualmente in griglia
  let selectedCard = null;

  /* ---------- util ---------- */
  function clearSelection() {
    grid.querySelectorAll(".pokemon-card.selected-card")
        .forEach(el => el.classList.remove("selected-card"));
    selectedCard = null;
    selectedCards.length = 0;  // array globale (api.js) per coerenza
  }

  /* ---------- load dataset una sola volta ---------- */
  loadAllCards().then(() => {
    // bind dopo che allCards[] è pronta
    inp.addEventListener("input", updateGrid);
    grid.addEventListener("click", onCardClick);
  });

  /* ---------- updateGrid ---------- */
  function updateGrid() {
    clearSelection();
    res.textContent = "";

    const term = inp.value.trim();
    if (!term) {                       // input vuoto → griglia nascosta
      grid.classList.add("hidden");
      grid.innerHTML = "";
      filtered = [];
      return;
    }

    // ricrea l’array filtrato come fa updateCardGrid()
    const termLower = term.toLowerCase();
    filtered = allCards.filter(c =>
      c.name.toLowerCase().includes(termLower)
    );

    // disegna la griglia usando l’helper già esistente
    grid.classList.remove("hidden");
    grid.innerHTML = "";
    filtered.forEach((card, i) => {
      const div = document.createElement("div");
      div.className = "pokemon-card";
      div.dataset.idx = i;                        // indice sul filtrato
      div.innerHTML = `
        <img src="${card.image_url}" alt="${card.name}">
        <p>${card.name}</p>
        <p style="font-size:0.8rem;">
          ${card.expansion} (${card.rarity})
        </p>`;
      grid.appendChild(div);
    });
  }

  /* ---------- onCardClick ---------- */
  function onCardClick(e) {
    const cardDiv = e.target.closest(".pokemon-card");
    if (!cardDiv) return;

    clearSelection();
    cardDiv.classList.add("selected-card");

    const idx = Number(cardDiv.dataset.idx);
    selectedCard = filtered[idx];        // ← ora è quella corretta
    selectedCards.push(selectedCard);    // mantieni compatibilità globale
  }

  /* ---------- submit ---------- */
  btn.addEventListener("click", () => {
    if (!selectedCard) {
      alert("Select a Pokémon first!");
      return;
    }
    res.textContent = "⏳ checking…";
    axios
      .get("/pokemon/offer_count", {
        params: {
          pokemon  : selectedCard.name,
          expansion: selectedCard.expansion,
          rarity   : selectedCard.rarity
        }
      })
      .then(({ data }) => {
        if (data.count === 1) {
          res.textContent = `1 user offers ${selectedCard.name} right now. Register and look for a match!`;
        } else {
          res.textContent = `${data.count} users offer ${selectedCard.name} right now. Register and look for a match!`;
        }
      })
      .catch(err => {
        alert("Error: " + (err.response?.data?.message || err.message));
        res.textContent = "";
      });
  });
})();