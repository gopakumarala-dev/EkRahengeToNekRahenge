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

console.log("EK RAHENGE HISTORY.JS LOADED");

document.addEventListener("click", function (event) {
    const somnathCard = event.target.closest('[data-article-id="somnath"]');

    if (!somnathCard) return;

    console.log("SOMNATH CARD CLICKED");

    openArticle("somnath");
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

  console.log("=================================");
  console.log("SOMNATH / ARTICLE CLICK");
  console.log("Article ID:", articleId);
  console.log("Current URL:", window.location.href);

  if (!articleId) {
    console.error("No article ID supplied.");
    return;
  }

  /* ---------------------------------------------------------
     OPEN THE READER IMMEDIATELY
     --------------------------------------------------------- */

  if (!reader) {
    console.error("ERROR: #reader element was NOT found in HTML.");
    return;
  }

  reader.classList.add("open");
  reader.setAttribute("aria-hidden", "false");

  document.body.classList.add("reader-open");

  console.log("Reader opened.");

  /* ---------------------------------------------------------
     SHOW LOADING MESSAGE
     --------------------------------------------------------- */

  if (readerTitle) {
    readerTitle.textContent =
      articleId === "somnath"
        ? "SOMNATH"
        : articleId;
  }

  if (readerDeck) {
    readerDeck.textContent =
      "Loading research article…";
  }

  if (readerContent) {
    readerContent.innerHTML = `
      <div class="reader-loading">
        <div class="loader"></div>
        <p>Loading research article…</p>
      </div>
    `;
  }

  if (readerToc) {
    readerToc.innerHTML = "";
  }

  /* ---------------------------------------------------------
     EXPLICIT HISTORY ARTICLE PATH
     --------------------------------------------------------- */

  const articlePath =
    `/history/articles/${encodeURIComponent(articleId)}/article.json`;

  console.log("Loading article from:");
  console.log(articlePath);

  try {

    const response = await fetch(articlePath, {
      cache: "no-store"
    });

    console.log("HTTP status:", response.status);

    if (!response.ok) {
      throw new Error(
        `Unable to load ${articlePath} (${response.status})`
      );
    }

    const article = await response.json();

    console.log("ARTICLE LOADED SUCCESSFULLY:");
    console.log(article);

    renderArticle(article);

  } catch (error) {

    console.error(
      "ARTICLE LOADING ERROR:",
      error
    );

    if (readerContent) {
      readerContent.innerHTML = `
        <div class="reader-error">
          <h3>ARTICLE LOADING ERROR</h3>
          <p>
            The Somnath article could not be loaded.
          </p>
          <p>
            <small>${escapeHtml(error.message)}</small>
          </p>
        </div>
      `;
    }
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
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
