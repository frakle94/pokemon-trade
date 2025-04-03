function showProfile() {
    // Hide main app container
    document.getElementById('mainAppContainer').classList.add('hidden');

    // Ensure the Profile View Container exists
    let profileViewContainer = document.getElementById('profileViewContainer');
    if (!profileViewContainer) {
        profileViewContainer = document.createElement('div');
        profileViewContainer.id = 'profileViewContainer';
        document.body.appendChild(profileViewContainer);
    }

    // Populate profile view
    profileViewContainer.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container-fluid">
                <a class="navbar-brand">Pokémon Trade Platform</a>
                <button class="btn btn-secondary ms-auto me-2" onclick="navigateToMainApp()">Back</button>
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
                    <label for="profile_email" class="form-label">Email</label>
                    <input type="text" class="form-control" id="profile_email" value="${currentUser.email}" required>
                </div>
                <div class="mb-3">
                    <label for="profile_password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="profile_password" value="${currentUser.password}" required>
                </div>
                <div class="mb-3">
                    <label for="profile_pokemon_id" class="form-label">Pokémon Pocket ID</label>
                    <input type="text" class="form-control" id="profile_pokemon_id" value="${currentUser.pokemonId}" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Update Profile</button>
            </form>
        </div>
    `;

    // Show the Profile View
    profileViewContainer.classList.remove('hidden');

    // Add event listener for updating profile
    document.getElementById('updateProfileForm')
            .addEventListener('submit', updateProfile);
}

// Handle Logout
function logout() {
    currentUser = null;
    location.reload(); // Refresh the page to reset
}
