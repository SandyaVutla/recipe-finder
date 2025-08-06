// Recipe Finder JavaScript

class RecipeFinder {
    constructor() {
        this.apiBase = 'https://www.themealdb.com/api/json/v1/1';
        this.currentPage = 1;
        this.recipesPerPage = 12;
        this.allRecipes = [];
        this.recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCategories();
        this.displayRecentSearches();
        this.initDarkMode();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Category filter
        document.getElementById('categorySelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.searchByCategory(e.target.value);
            } else {
                this.clearResults();
            }
        });

        // Random recipe
        document.getElementById('randomRecipeBtn').addEventListener('click', () => this.getRandomRecipe());

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.apiBase}/list.php?c=list`);
            const data = await response.json();
            
            const categorySelect = document.getElementById('categorySelect');
            data.meals.forEach(category => {
                const option = document.createElement('option');
                option.value = category.strCategory;
                option.textContent = category.strCategory;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (!searchTerm) return;

        this.addToRecentSearches(searchTerm);
        this.showLoading();
        this.hideError();

        try {
            const response = await fetch(`${this.apiBase}/search.php?s=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data.meals) {
                this.allRecipes = data.meals;
                this.currentPage = 1;
                this.displayRecipes();
                this.setupPagination();
            } else {
                this.showError();
            }
        } catch (error) {
            console.error('Error searching recipes:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async searchByCategory(category) {
        this.showLoading();
        this.hideError();

        try {
            const response = await fetch(`${this.apiBase}/filter.php?c=${encodeURIComponent(category)}`);
            const data = await response.json();

            if (data.meals) {
                // Get detailed information for each recipe
                const detailedRecipes = await Promise.all(
                    data.meals.slice(0, 20).map(async (meal) => {
                        const detailResponse = await fetch(`${this.apiBase}/lookup.php?i=${meal.idMeal}`);
                        const detailData = await detailResponse.json();
                        return detailData.meals[0];
                    })
                );

                this.allRecipes = detailedRecipes;
                this.currentPage = 1;
                this.displayRecipes();
                this.setupPagination();
            } else {
                this.showError();
            }
        } catch (error) {
            console.error('Error filtering by category:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async getRandomRecipe() {
        this.showLoading();
        this.hideError();

        try {
            const response = await fetch(`${this.apiBase}/random.php`);
            const data = await response.json();

            if (data.meals) {
                this.allRecipes = data.meals;
                this.currentPage = 1;
                this.displayRecipes();
                this.hidePagination();
            }
        } catch (error) {
            console.error('Error getting random recipe:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    displayRecipes() {
        const container = document.getElementById('recipesContainer');
        container.innerHTML = '';

        const startIndex = (this.currentPage - 1) * this.recipesPerPage;
        const endIndex = startIndex + this.recipesPerPage;
        const recipesToShow = this.allRecipes.slice(startIndex, endIndex);

        recipesToShow.forEach((recipe, index) => {
            const recipeCard = this.createRecipeCard(recipe, index);
            container.appendChild(recipeCard);
        });

        // Scroll to results
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    createRecipeCard(recipe, index) {
        const col = document.createElement('div');
        col.className = 'col-lg-3 col-md-4 col-sm-6';

        col.innerHTML = `
            <div class="card recipe-card h-100" style="animation-delay: ${index * 0.1}s">
                <img src="${recipe.strMealThumb}" class="card-img-top" alt="${recipe.strMeal}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${recipe.strMeal}</h5>
                    <div class="mt-auto">
                        <button class="btn btn-primary w-100" onclick="recipeFinder.showRecipeDetails('${recipe.idMeal}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        return col;
    }

    async showRecipeDetails(mealId) {
        try {
            const response = await fetch(`${this.apiBase}/lookup.php?i=${mealId}`);
            const data = await response.json();
            
            if (data.meals) {
                const recipe = data.meals[0];
                this.populateModal(recipe);
                
                const modal = new bootstrap.Modal(document.getElementById('recipeModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error fetching recipe details:', error);
        }
    }

    populateModal(recipe) {
        // Basic info
        document.getElementById('modalRecipeTitle').textContent = recipe.strMeal;
        document.getElementById('modalRecipeImage').src = recipe.strMealThumb;
        document.getElementById('modalRecipeImage').alt = recipe.strMeal;
        document.getElementById('modalRecipeCategory').textContent = recipe.strCategory;
        document.getElementById('modalRecipeArea').textContent = recipe.strArea;

        // Ingredients
        const ingredientsList = document.getElementById('modalIngredientsList');
        ingredientsList.innerHTML = '';

        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`];
            const measure = recipe[`strMeasure${i}`];

            if (ingredient && ingredient.trim()) {
                const li = document.createElement('li');
                li.className = 'ingredient-item';
                li.innerHTML = `<strong>${measure ? measure.trim() : ''}</strong> ${ingredient.trim()}`;
                ingredientsList.appendChild(li);
            }
        }

        // Instructions
        const instructions = recipe.strInstructions;
        document.getElementById('modalInstructions').innerHTML = instructions.replace(/\n/g, '<br>');

        // YouTube video
        const youtubeContainer = document.getElementById('youtubeContainer');
        const youtubeVideo = document.getElementById('youtubeVideo');

        if (recipe.strYoutube) {
            const videoId = this.extractYouTubeId(recipe.strYoutube);
            if (videoId) {
                youtubeVideo.src = `https://www.youtube.com/embed/${videoId}`;
                youtubeContainer.style.display = 'block';
            } else {
                youtubeContainer.style.display = 'none';
            }
        } else {
            youtubeContainer.style.display = 'none';
        }
    }

    extractYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    setupPagination() {
        const totalPages = Math.ceil(this.allRecipes.length / this.recipesPerPage);
        
        if (totalPages <= 1) {
            this.hidePagination();
            return;
        }

        const paginationList = document.getElementById('paginationList');
        paginationList.innerHTML = '';

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="recipeFinder.goToPage(${this.currentPage - 1})">Previous</a>`;
        paginationList.appendChild(prevLi);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="recipeFinder.goToPage(${i})">${i}</a>`;
            paginationList.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="recipeFinder.goToPage(${this.currentPage + 1})">Next</a>`;
        paginationList.appendChild(nextLi);

        document.getElementById('pagination').style.display = 'block';
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.allRecipes.length / this.recipesPerPage);
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.displayRecipes();
        this.setupPagination();
    }

    hidePagination() {
        document.getElementById('pagination').style.display = 'none';
    }

    addToRecentSearches(searchTerm) {
        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(term => term !== searchTerm);
        
        // Add to beginning
        this.recentSearches.unshift(searchTerm);
        
        // Keep only last 5 searches
        this.recentSearches = this.recentSearches.slice(0, 5);
        
        // Save to localStorage
        localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
        
        this.displayRecentSearches();
    }

    displayRecentSearches() {
        const recentSearchesContainer = document.getElementById('recentSearches');
        const recentSearchesList = document.getElementById('recentSearchesList');

        if (this.recentSearches.length === 0) {
            recentSearchesContainer.style.display = 'none';
            return;
        }

        recentSearchesList.innerHTML = '';
        this.recentSearches.forEach(term => {
            const button = document.createElement('button');
            button.className = 'btn recent-search-item';
            button.textContent = term;
            button.onclick = () => {
                document.getElementById('searchInput').value = term;
                this.handleSearch();
            };
            recentSearchesList.appendChild(button);
        });

        recentSearchesContainer.style.display = 'block';
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showError() {
        document.getElementById('errorAlert').style.display = 'block';
        setTimeout(() => {
            document.getElementById('errorAlert').style.display = 'none';
        }, 5000);
    }

    hideError() {
        document.getElementById('errorAlert').style.display = 'none';
    }

    clearResults() {
        document.getElementById('recipesContainer').innerHTML = '';
        this.hidePagination();
        this.allRecipes = [];
    }

    initDarkMode() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').innerHTML = '☀️ Light Mode';
        }
    }

    toggleDarkMode() {
        const body = document.body;
        const darkModeToggle = document.getElementById('darkModeToggle');
        
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            darkModeToggle.innerHTML = '☀️ Light Mode';
            localStorage.setItem('darkMode', 'true');
        } else {
            darkModeToggle.innerHTML = '🌙 Dark Mode';
            localStorage.setItem('darkMode', 'false');
        }
    }
}

// Initialize the Recipe Finder when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.recipeFinder = new RecipeFinder();
});

// Prevent form submission on Enter key
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        const modal = bootstrap.Modal.getInstance(e.target);
        if (modal) modal.hide();
    }
});

// Add smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading animation to buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn') && !e.target.classList.contains('btn-close')) {
        const originalText = e.target.innerHTML;
        e.target.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
        
        setTimeout(() => {
            e.target.innerHTML = originalText;
        }, 1000);
    }
});

// Lazy loading for images
document.addEventListener('DOMContentLoaded', () => {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
});

// Add keyboard navigation for accessibility
document.addEventListener('keydown', (e) => {
    // ESC key to close modal
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            const modal = bootstrap.Modal.getInstance(openModal);
            if (modal) modal.hide();
        }
    }
    
    // Arrow keys for pagination
    if (e.key === 'ArrowLeft' && window.recipeFinder && window.recipeFinder.currentPage > 1) {
        window.recipeFinder.goToPage(window.recipeFinder.currentPage - 1);
    }
    
    if (e.key === 'ArrowRight' && window.recipeFinder) {
        const totalPages = Math.ceil(window.recipeFinder.allRecipes.length / window.recipeFinder.recipesPerPage);
        if (window.recipeFinder.currentPage < totalPages) {
            window.recipeFinder.goToPage(window.recipeFinder.currentPage + 1);
        }
    }
});

// Performance optimization: Debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add search suggestions (optional enhancement)
const debouncedSearch = debounce((searchTerm) => {
    if (searchTerm.length > 2) {
        // Could implement search suggestions here
        console.log('Searching for:', searchTerm);
    }
}, 300);

// Monitor search input for suggestions
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});
