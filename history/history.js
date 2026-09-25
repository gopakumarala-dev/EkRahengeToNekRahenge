/* =========================================================
   HAINDAVEEYAM FOUNDATION
   HISTORY — DYNAMIC ARTICLE ENGINE
   ========================================================= */

const ARTICLE_INDEX = "data/articles.json";

const state = {
  articles: [],
  activeEra: "all",
  searchTerm: "",
  activeCategory: "all"
};


/* =========================================================
   DOM
   ========================================================= */

const cardsContainer = document.getElementById("cards");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const eraButtons = document.querySelectorAll("[data-era]");

const reader = document.getElementById("reader");
const readerImage = document.getElementById("readerImage");
const readerTitle = document.getElementById("readerTitle");
const readerDeck = document.getElementById("readerDeck");
const readerToc = document.getElementById("readerToc");
const readerContent = document.getElementById("readerContent");

const modal = document.getElementById("modal");


/* =========================================================
   INITIALISE
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  setupSearch();
  setupEraFilters();
  setupCategoryFilter();
  setupKeyboardControls();
  setupReaderCloseButton();

  await loadArticleIndex();
});


/* =========================================================
   LOAD ARTICLE INDEX
   ========================================================= */

async function loadArticleIndex() {
  try {
    const response = await fetch(ARTICLE_INDEX, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Unable to load ${ARTICLE_INDEX}`);
    }

    const data = await response.json();

    state.articles = Array.isArray(data.articles)
      ? data.articles
      : [];

    renderCards();

  } catch (error) {
    console.error("History index error:", error);

    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="empty-state">
          <p>History content could not be loaded.</p>
          <small>Please check the article data files.</small>
        </div>
      `;
    }
  }
}


/* =========================================================
   RENDER ARTICLE CARDS
   ========================================================= */

function renderCards() {
  if (!cardsContainer) return;

  const filteredArticles = state.articles.filter(article => {

    /*
      Dark Chapters articles are registered in the article index
      so they can be opened by the dedicated Dark Chapters section.

      They must NOT appear in the normal History article grid.
    */

    if (article.section === "dark-chapters") {
      return false;
    }

    const matchesEra =
      state.activeEra === "all" ||
      article.era === state.activeEra;

    const matchesCategory =
      state.activeCategory === "all" ||
      article.category === state.activeCategory ||
      article.section === state.activeCategory;

    const searchableText = [
      article.title,
      article.subtitle,
      article.period,
      article.category,
      article.era
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !state.searchTerm ||
      searchableText.includes(state.searchTerm);

    return matchesEra && matchesCategory && matchesSearch;
  });

  if (!filteredArticles.length) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p>No historical articles match your search.</p>
      </div>
    `;
    return;
  }

  cardsContainer.innerHTML = filteredArticles
    .map(article => createArticleCard(article))
    .join("");

  /*
     Article clicks are handled globally below.
     Do not attach individual listeners here because the
     Dark Chapters cards are static HTML outside #cards.
  */
}


/* =========================================================
   ARTICLE CLICK HANDLER

   Handles BOTH:
   - dynamically generated History cards
   - static Dark Chapters cards

   This deliberately uses event delegation so a click does not
   depend on renderCards() or data/articles.json loading first.
   ========================================================= */

document.addEventListener("click", event => {

  const card = event.target.closest("[data-article-id]");

  if (!card) return;

  const articleId = card.dataset.articleId;

  if (!articleId) return;

  event.preventDefault();

  openArticle(articleId);
});


/* =========================================================
   ARTICLE CARD
   ========================================================= */

function createArticleCard(article) {
  const image = getArticleImage(article);

  return `
    <article
      class="article-card"
      data-article-id="${escapeHtml(article.id)}"
      tabindex="0"
      role="button"
      aria-label="Read ${escapeHtml(article.title)}"
    >

      <div class="article-card-image">
        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(article.title)}"
          loading="lazy"
          onerror="this.style.display='none'; this.parentElement.classList.add('image-missing');"
        >

        <span class="article-card-era">
          ${escapeHtml(formatEra(article.era))}
        </span>
      </div>

      <div class="article-card-body">

        <div class="article-card-period">
          ${escapeHtml(article.period || "")}
        </div>

        <h3>
          ${escapeHtml(article.title)}
        </h3>

        <p>
          ${escapeHtml(article.subtitle || "")}
        </p>

        <span class="article-card-read">
          READ RESEARCH ARTICLE →
        </span>

      </div>

    </article>
  `;
}


/* =========================================================
   OPEN ARTICLE
   ========================================================= */

async function openArticle(articleId) {

  if (!articleId) {
    console.error("No article ID supplied.");
    return;
  }

  /*
     The article index is useful for the normal History grid,
     but Dark Chapters are static HTML cards and must not depend
     on the index being loaded successfully.
  */

  const articleIndex = state.articles.find(
    article => article.id === articleId
  ) || {
    id: articleId,
    title: articleId,
    subtitle: "",
    era: "medieval",
    period: ""
  };

  try {
    console.log("Opening article:", articleId);

    showReaderLoading(articleIndex);

    const articlePath =
      `articles/${encodeURIComponent(articleId)}/article.json`;

    const response = await fetch(articlePath, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load ${articlePath} (${response.status})`
      );
    }

    const article = await response.json();

    renderArticle(article);

  } catch (error) {
    console.error("Article loading error:", error);

    showReaderError(
      "This research article could not be loaded."
    );
  }
}


/* =========================================================
   READER LOADING
   ========================================================= */

function showReaderLoading(article) {
  if (!reader) return;

  reader.classList.add("open");

  document.body.classList.add("reader-open");

  if (readerTitle) {
    readerTitle.textContent = article.title || "";
  }

  if (readerDeck) {
    readerDeck.textContent = article.subtitle || "";
  }

  if (readerImage) {
    const image = getArticleImage(article);

    readerImage.src = image;
    readerImage.alt = article.title || "";
  }

  if (readerToc) {
    readerToc.innerHTML = "";
  }

  if (readerContent) {
    readerContent.innerHTML = `
      <div class="reader-loading">
        <div class="loader"></div>
        <p>Loading research article…</p>
      </div>
    `;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   RENDER FULL ARTICLE
   ========================================================= */

function renderArticle(article) {
  if (!reader) return;

  reader.classList.add("open");
  document.body.classList.add("reader-open");

  if (readerTitle) {
    readerTitle.textContent = article.title || "";
  }

  if (readerDeck) {
    readerDeck.textContent = article.subtitle || "";
  }

  if (readerImage) {
    const image = getArticleImage(article);

    readerImage.src = image;
    readerImage.alt = article.title || "";

    readerImage.onerror = () => {
      readerImage.style.display = "none";
    };
  }

  buildTableOfContents(article);
  buildArticleContent(article);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}
