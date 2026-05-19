/**
 * NewsPulse JavaScript Logic - GNews API Version
 * Features: GNews API Integration, CORS Proxy, Search, Category Filter, Bookmarks, Dark Mode
 */

// --- Configuration ---
// Note: Get a free API key from https://gnews.io/
const API_KEY = '8ea611358876f9b23b87ab83708f341c'; 
const PROXY_URL = 'https://corsproxy.io/?';
const BASE_URL = 'https://gnews.io/api/v4';

// --- State Management ---
let currentCategory = 'general';
let currentQuery = '';
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let isListView = false;

// --- DOM Elements ---
const newsGrid = document.getElementById('news-grid');
const heroSection = document.getElementById('featured-news');
const ticker = document.getElementById('news-ticker');
const categoryTitle = document.getElementById('category-title');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more'); // GNews free tier has limits, load more might be restricted
const themeToggle = document.getElementById('theme-toggle');
const bookmarksBtn = document.getElementById('bookmarks-btn');
const bookmarksModal = document.getElementById('bookmarks-modal');
const bookmarksList = document.getElementById('bookmarks-list');
const closeModal = document.querySelector('.close-modal');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
const gridViewBtn = document.getElementById('grid-view');
const listViewBtn = document.getElementById('list-view');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchNews();
    fetchTickerNews();
    initTheme();
    setupEventListeners();
});

// --- API Functions ---
async function fetchNews() {
    showSkeletons();
    
    let url = '';
    if (currentQuery) {
        // Search Endpoint
        url = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/search?q=${currentQuery}&lang=en&apikey=${API_KEY}`)}`;
    } else {
        // Top Headlines Endpoint
        url = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/top-headlines?category=${currentCategory}&lang=en&apikey=${API_KEY}`)}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        // GNews returns articles array on success
        if (data.articles) {
            displayNews(data.articles);
            // GNews free tier usually returns 10 articles, load more is complex with free limits
            loadMoreBtn.style.display = 'none'; 
        } else if (data.errors) {
            handleError(data.errors[0] || 'API Error occurred');
        } else {
            handleError('Failed to fetch news. Please check your API key.');
        }
    } catch (error) {
        handleError('CORS or Network Error. Please ensure the proxy is working.');
    }
}

async function fetchTickerNews() {
    const url = `${PROXY_URL}${encodeURIComponent(`${BASE_URL}/top-headlines?category=general&lang=en&max=5&apikey=${API_KEY}`)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.articles) {
            displayTicker(data.articles);
        }
    } catch (error) {
        console.error('Ticker fetch failed');
    }
}

// --- Display Functions ---
function displayNews(articles) {
    newsGrid.innerHTML = '';
    
    if (articles.length === 0) {
        newsGrid.innerHTML = '<p class="error-msg">No articles found for this search.</p>';
        heroSection.style.display = 'none';
        return;
    }

    // Set Hero Section with first article
    const featured = articles[0];
    heroSection.style.display = 'block';
    heroSection.innerHTML = `
        <div class="hero-card-inner" onclick="window.open('${featured.url}', '_blank')">
            <img src="${featured.image || 'https://images.unsplash.com/photo-1504711432869-0fd107888b02?auto=format&fit=crop&w=1200&q=80'}" class="hero-img" alt="${featured.title}">
            <div class="hero-content">
                <span class="badge">${currentCategory.toUpperCase()}</span>
                <h1>${featured.title}</h1>
                <p>${featured.description || ''}</p>
            </div>
        </div>
    `;

    // Display rest in grid
    articles.slice(1).forEach(article => {
        newsGrid.appendChild(createArticleCard(article));
    });
}

function createArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    const isBookmarked = bookmarks.some(b => b.url === article.url);
    const date = new Date(article.publishedAt).toLocaleDateString();

    // GNews uses 'image' instead of 'urlToImage' and 'source.name' is same
    card.innerHTML = `
        <div class="card-img-wrap">
            <img src="${article.image || 'https://images.unsplash.com/photo-1504711432869-0fd107888b02?auto=format&fit=crop&w=600&q=80'}" class="card-img" alt="${article.title}">
            <div class="bookmark-icon ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(event, ${JSON.stringify(article).replace(/"/g, '&quot;')})">
                <i class="fas fa-bookmark"></i>
            </div>
        </div>
        <div class="card-content">
            <div class="card-meta">
                <span>${article.source.name}</span>
                <span>${date}</span>
            </div>
            <h3 class="card-title">${article.title}</h3>
            <p class="card-desc">${article.description || 'No description available for this article.'}</p>
            <div class="card-footer">
                <a href="${article.url}" target="_blank" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
            </div>
        </div>
    `;
    return card;
}

function displayTicker(articles) {
    ticker.innerHTML = articles.map(a => `<span class="ticker-item">${a.title} • </span>`).join('');
}

function showSkeletons() {
    newsGrid.innerHTML = Array(6).fill('<div class="skeleton card-skeleton"></div>').join('');
    heroSection.innerHTML = '<div class="skeleton hero-skeleton"></div>';
}

// --- Event Handlers ---
function setupEventListeners() {
    // Category Navigation
    document.querySelectorAll('.nav-link, .footer-links a, .trending-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.currentTarget.dataset.category;
            if (category) {
                currentCategory = category;
                currentQuery = '';
                categoryTitle.textContent = category === 'general' ? 'Latest Headlines' : `${category.charAt(0).toUpperCase() + category.slice(1)} News`;
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(nl => nl.classList.remove('active'));
                if (e.currentTarget.classList.contains('nav-link')) e.currentTarget.classList.add('active');
                
                fetchNews();
                if (window.innerWidth <= 768) navLinks.classList.remove('active');
            }
        });
    });

    // Search
    searchBtn.addEventListener('click', () => {
        currentQuery = searchInput.value.trim();
        if (currentQuery) {
            categoryTitle.textContent = `Search Results for "${currentQuery}"`;
            fetchNews();
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentQuery = searchInput.value.trim();
            if (currentQuery) {
                categoryTitle.textContent = `Search Results for "${currentQuery}"`;
                fetchNews();
            }
        }
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode', !isDark);
        localStorage.setItem('theme', isDark ? 'dark-mode' : 'light-mode');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // Bookmarks
    bookmarksBtn.addEventListener('click', () => {
        renderBookmarks();
        bookmarksModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        bookmarksModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === bookmarksModal) bookmarksModal.style.display = 'none';
    });

    // Hamburger Menu
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // View Toggle
    gridViewBtn.addEventListener('click', () => {
        isListView = false;
        newsGrid.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    });

    listViewBtn.addEventListener('click', () => {
        isListView = true;
        newsGrid.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    });
}

// --- Bookmark Logic ---
function toggleBookmark(event, article) {
    event.stopPropagation();
    const index = bookmarks.findIndex(b => b.url === article.url);
    
    if (index === -1) {
        bookmarks.push(article);
        event.currentTarget.classList.add('active');
    } else {
        bookmarks.splice(index, 1);
        event.currentTarget.classList.remove('active');
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function renderBookmarks() {
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<p class="empty-msg">No bookmarks saved yet.</p>';
        return;
    }

    bookmarksList.innerHTML = bookmarks.map(article => `
        <div class="bookmark-item">
            <img src="${article.image || 'https://images.unsplash.com/photo-1504711432869-0fd107888b02?auto=format&fit=crop&w=100&q=80'}" alt="">
            <div class="bookmark-info">
                <h4><a href="${article.url}" target="_blank">${article.title}</a></h4>
                <button onclick="removeBookmark('${article.url}')">Remove</button>
            </div>
        </div>
    `).join('');
}

function removeBookmark(url) {
    bookmarks = bookmarks.filter(b => b.url !== url);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
    // No need to fetchNews, just update the grid icons if they exist
    const gridIcons = document.querySelectorAll(`.bookmark-icon`);
    gridIcons.forEach(icon => {
        // This is a bit complex to match URL in onclick, but for simplicity:
        fetchNews(); 
    });
}

// --- Helpers ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark-mode';
    document.body.className = savedTheme;
    themeToggle.innerHTML = savedTheme === 'dark-mode' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function handleError(message) {
    newsGrid.innerHTML = `<p class="error-msg">${message}</p>`;
    heroSection.style.display = 'none';
    loadMoreBtn.style.display = 'none';
}
