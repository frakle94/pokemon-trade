function showProfile() {
    document.body.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container-fluid">
                <a class="navbar-brand">Pokémon Trade Platform</a>
                <button class="btn btn-secondary ms-auto me-2" onclick="navigateToFeatures(currentUser.username, currentUser.pokemonId, currentUser.password)">Back</button>
                <button class="btn btn-danger" onclick="logout()">Logout</button>
            </div>
        </nav>
        <div class="container mt-5">
            <h1 class="text-center">Your Profile</h1>
            <form id="updateProfileForm">
                <div class="mb-3">
                    <label for="profile_username" class="form-label">Username</label>
                    <input type="text" class="form-control" id="profile_username" value="${currentUser.username}" required>
                </div>
                <div class="mb-3">
                    <label for="profile_pokemon_id" class="form-label">Pokémon ID</label>
                    <input type="text" class="form-control" id="profile_pokemon_id" value="${currentUser.pokemonId}" required>
                </div>
                <div class="mb-3">
                    <label for="profile_password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="profile_password" value="${currentUser.password}" required>
                </div>
                <button type="submit" class="btn btn-primary">Update Profile</button>
            </form>
        </div>`;

    document.getElementById('updateProfileForm').addEventListener('submit', updateProfile);
}

function logout() {
    currentUser = null;
    location.reload();
}
