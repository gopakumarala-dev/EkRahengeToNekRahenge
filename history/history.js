/* =========================================================
   HAINDAVEEYAM FOUNDATION
   HISTORY — DYNAMIC ARTICLE ENGINE
   ========================================================= */

const ARTICLE_INDEX = "data/articles.json";

const state = {
  articles: [],
  activeEra: "all",
  searchTerm: ""
};


/* =========================================================
   DOM
   ========================================================= */

const cardsContainer = document.getElementById("cards");
const searchInput = document.getElementById("searchInput");
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

document.addEventListener("click", event => {
  const subject = event.target.closest("[data-dark-subject-id]");
  if (!subject) return;
  event.preventDefault();
  openArticle(subject.dataset.darkSubjectId);
});

document.addEventListener("DOMContentLoaded", async () => {
  setupSearch();
  setupEraFilters();
  setupKeyboardControls();
  setupReaderCloseButton();
  setupDarkChapterCards();

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
   DARK CHAPTERS
   STATIC CARD CLICK HANDLER
   ========================================================= */

function setupDarkChapterCards() {

  const darkChapterCards =
    document.querySelectorAll(
      ".dark-chapter-card[data-article-id]"
    );

  console.log(
    "Dark Chapter cards found:",
    darkChapterCards.length
  );

  darkChapterCards.forEach(card => {

    card.style.cursor = "pointer";

    card.addEventListener("click", function () {

      const articleId =
        this.getAttribute("data-article-id");

      console.log(
        "Dark Chapter clicked:",
        articleId
      );

      openArticle(articleId);

    });

  });

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

    return matchesEra && matchesSearch;
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

  cardsContainer
    .querySelectorAll("[data-article-id]")
    .forEach(card => {
      card.addEventListener("click", () => {
        openArticle(card.dataset.articleId);
      });
    });
}


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

  console.log("Opening article:", articleId);

  if (!articleId) {
    console.error("No article ID supplied.");
    return;
  }

  try {

    /*
      Open the reader immediately.
      This does NOT depend on data/articles.json.
    */

    if (reader) {
      reader.classList.add("open");
      reader.setAttribute("aria-hidden", "false");
    }

    document.body.classList.add("reader-open");

    /*
      Show loading state
    */

    if (readerContent) {
      readerContent.innerHTML = `
        <div class="reader-loading">
          <div class="loader"></div>
          <p>Loading research article…</p>
        </div>
      `;
    }

    /*
      Clear previous table of contents
    */

    if (readerToc) {
      readerToc.innerHTML = "";
    }

    /*
      Load article directly from its folder.
    */

    const articlePath =
      `articles/${encodeURIComponent(articleId)}/article.json`;

    console.log("Loading:", articlePath);

    const response = await fetch(articlePath, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load ${articlePath} (${response.status})`
      );
    }

    const article = await response.json();

    console.log("Article loaded:", article);

    /*
      Render article
    */

    renderArticle(article);

    /*
      Move page to top
    */

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    console.error("Article loading error:", error);

    showReaderError(
      `This research article could not be loaded.`
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


/* =========================================================
   TABLE OF CONTENTS
   ========================================================= */

function buildTableOfContents(article) {
  if (!readerToc) return;

  const sections = Array.isArray(article.sections)
    ? article.sections
    : [];

  readerToc.innerHTML = sections
    .map((section, index) => `
      <a
        href="#section-${escapeHtml(section.id || `section-${index}`)}"
        class="toc-link"
      >
        ${escapeHtml(section.title || `Section ${index + 1}`)}
      </a>
    `)
    .join("");

  readerToc
    .querySelectorAll("a")
    .forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();

        const targetId =
          link.getAttribute("href").substring(1);

        const target =
          document.getElementById(targetId);

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    });
}


/* =========================================================
   ARTICLE BODY
   ========================================================= */

function buildArticleContent(article) {
  if (!readerContent) return;

  const html = [];

  /* -------------------------
     Abstract
     ------------------------- */

  if (article.abstract) {
    html.push(`
      <section class="research-abstract">

        <div class="article-section-label">
          ABSTRACT
        </div>

        <p class="abstract-text">
          ${formatParagraph(article.abstract)}
        </p>

      </section>
    `);
  }


  /* -------------------------
     Keywords
     ------------------------- */

  if (
    Array.isArray(article.keywords) &&
    article.keywords.length
  ) {
    html.push(`
      <section class="article-keywords">

        <div class="article-section-label">
          KEYWORDS
        </div>

        <div class="keyword-list">

          ${article.keywords
            .map(keyword => `
              <span class="keyword">
                ${escapeHtml(keyword)}
              </span>
            `)
            .join("")}

        </div>

      </section>
    `);
  }


  /* -------------------------
     Main sections
     ------------------------- */

  const sections = Array.isArray(article.sections)
    ? article.sections
    : [];

  sections.forEach((section, index) => {
    html.push(
      renderSection(section, index)
    );
  });


  /* -------------------------
     Chronology
     ------------------------- */

  if (
    Array.isArray(article.chronology) &&
    article.chronology.length
  ) {
    html.push(
      renderChronology(article.chronology)
    );
  }


  /* -------------------------
     Major sites
     ------------------------- */

  if (
    Array.isArray(article.majorSites) &&
    article.majorSites.length
  ) {
    html.push(
      renderMajorSites(article.majorSites)
    );
  }


  /* -------------------------
     Evidence categories
     ------------------------- */

  if (
    Array.isArray(article.evidenceCategories) &&
    article.evidenceCategories.length
  ) {
    html.push(
      renderEvidenceCategories(article.evidenceCategories)
    );
  }


  /* -------------------------
     Research questions
     ------------------------- */

  if (
    Array.isArray(article.researchQuestions) &&
    article.researchQuestions.length
  ) {
    html.push(`
      <section class="research-extra">

        <div class="article-section-label">
          RESEARCH QUESTIONS
        </div>

        <div class="question-list">

          ${article.researchQuestions
            .map(question => `
              <div class="question-item">
                ${escapeHtml(question)}
              </div>
            `)
            .join("")}

        </div>

      </section>
    `);
  }


  /* -------------------------
     Scholarly cautions
     ------------------------- */

  if (
    Array.isArray(article.scholarlyCautions) &&
    article.scholarlyCautions.length
  ) {
    html.push(`
      <section class="research-extra">

        <div class="article-section-label">
          SCHOLARLY CAUTIONS
        </div>

        <div class="caution-box">

          ${article.scholarlyCautions
            .map(caution => `
              <p>
                ${escapeHtml(caution)}
              </p>
            `)
            .join("")}

        </div>

      </section>
    `);
  }


  /* -------------------------
     Sources
     ------------------------- */

  if (
    Array.isArray(article.sources) &&
    article.sources.length
  ) {
    html.push(
      renderSources(article.sources)
    );
  }


  /* -------------------------
     Bibliography
     ------------------------- */

  if (
    Array.isArray(article.bibliography) &&
    article.bibliography.length
  ) {
    html.push(
      renderBibliography(article.bibliography)
    );
  }


  /* -------------------------
     Dark Chapter article series
     ------------------------- */

  if (Array.isArray(article.chapterArticles) && article.chapterArticles.length) {
    html.push(renderDarkChapterSeries(article.chapterArticles));
  }

  /* -------------------------
     Final note
     ------------------------- */

  if (article.finalNote) {
    html.push(`
      <section class="article-final-note">

        <div class="article-section-label">
          RESEARCH NOTE
        </div>

        <p>
          ${formatParagraph(article.finalNote)}
        </p>

      </section>
    `);
  }


  readerContent.innerHTML = html.join("");
}


function renderDarkChapterSeries(items) {
  return `
    <section class="dark-chapter-series" id="chapter-series">
      <div class="dark-chapter-series-head">
        <div class="article-section-label">EXPLORE THIS CHAPTER</div>
        <h3>Every incident becomes a detailed historical article.</h3>
        <p>Chapter pages provide the civilisational narrative. Individual subjects will carry the detailed chronology, people, battles, human cost, evidence and sources for that incident.</p>
      </div>
      <div class="dark-chapter-series-grid">
        ${items.map(item => {
          const published = item.status === "published";
          const tag = published ? `<span class="dark-subject-status">READ ARTICLE →</span>` : `<span class="dark-subject-status">DETAILED ARTICLE TO FOLLOW</span>`;
          return published
            ? `<a class="dark-subject-card" href="#" data-dark-subject-id="${escapeHtml(item.id)}">
                 <span class="dark-subject-number">${escapeHtml(item.number)}</span>
                 <h4>${escapeHtml(item.title)}</h4>
                 <p>${escapeHtml(item.summary || "")}</p>${tag}
               </a>`
            : `<div class="dark-subject-card is-planned">
                 <span class="dark-subject-number">${escapeHtml(item.number)}</span>
                 <h4>${escapeHtml(item.title)}</h4>
                 <p>${escapeHtml(item.summary || "")}</p>${tag}
               </div>`;
        }).join("")}
      </div>
    </section>
  `;
}

/* =========================================================
   RENDER SECTION
   ========================================================= */

function renderSection(section, index) {
  const sectionId =
    section.id || `section-${index}`;

  const typeClass =
    section.type
      ? `section-type-${section.type}`
      : "";

  let html = `
    <section
      id="section-${escapeHtml(sectionId)}"
      class="article-section ${typeClass}"
    >

      <div class="article-section-heading">

        <span class="section-number">
          ${String(index + 1).padStart(2, "0")}
        </span>

        <h2>
          ${escapeHtml(section.title || "")}
        </h2>

      </div>
  `;


  /* Date */

  if (section.date) {
    html += `
      <div class="section-date">
        ${escapeHtml(section.date)}
      </div>
    `;
  }


  /* Paragraphs */

  if (Array.isArray(section.content)) {
    html += section.content
      .map(paragraph => `
        <p>
          ${formatParagraph(paragraph)}
        </p>
      `)
      .join("");
  }


  /* Evidence */

  if (
    Array.isArray(section.evidence) &&
    section.evidence.length
  ) {
    html += `
      <div class="evidence-panel">

        <div class="article-section-label">
          EVIDENCE
        </div>

        <div class="evidence-list">

          ${section.evidence
            .map(item => `
              <span>
                ${escapeHtml(item)}
              </span>
            `)
            .join("")}

        </div>

      </div>
    `;
  }


  /* Questions */

  if (
    Array.isArray(section.questions) &&
    section.questions.length
  ) {
    html += `
      <div class="question-panel">

        <div class="article-section-label">
          KEY QUESTIONS
        </div>

        ${section.questions
          .map(question => `
            <p>
              ${escapeHtml(question)}
            </p>
          `)
          .join("")}

      </div>
    `;
  }


  /* Source */

  if (section.source) {
    html += `
      <div class="inline-source">

        <span class="article-section-label">
          SOURCE
        </span>

        <a
          href="${escapeHtml(section.source.url || "#")}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(section.source.title || "Source")}
        </a>

        ${
          section.source.organization
            ? `<span>
                — ${escapeHtml(section.source.organization)}
              </span>`
            : ""
        }

      </div>
    `;
  }


  html += `
    </section>
  `;

  return html;
}


/* =========================================================
   CHRONOLOGY
   ========================================================= */

function renderChronology(items) {
  return `
    <section class="article-extra chronology">

      <div class="article-section-label">
        CHRONOLOGY
      </div>

      <h2>
        Historical Timeline
      </h2>

      <div class="chronology-list">

        ${items
          .map(item => `
            <div class="chronology-item">

              <div class="chronology-date">
                ${escapeHtml(item.date || "")}
              </div>

              <div class="chronology-event">
                <strong>
                  ${escapeHtml(item.period || "")}
                </strong>

                <p>
                  ${escapeHtml(item.significance || item.event || "")}
                </p>
              </div>

            </div>
          `)
          .join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   MAJOR SITES
   ========================================================= */

function renderMajorSites(sites) {
  return `
    <section class="article-extra">

      <div class="article-section-label">
        MAJOR SITES
      </div>

      <h2>
        Archaeological Sites
      </h2>

      <div class="sites-grid">

        ${sites
          .map(site => `
            <article class="site-card">

              <h3>
                ${escapeHtml(site.name || "")}
              </h3>

              <div class="site-location">
                ${escapeHtml(site.location || "")}
              </div>

              <p>
                ${escapeHtml(site.importance || "")}
              </p>

            </article>
          `)
          .join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   EVIDENCE CATEGORIES
   ========================================================= */

function renderEvidenceCategories(items) {
  return `
    <section class="article-extra">

      <div class="article-section-label">
        EVIDENCE
      </div>

      <h2>
        Archaeological Evidence Base
      </h2>

      <div class="evidence-category-grid">

        ${items
          .map(item => `
            <article class="evidence-category">

              <h3>
                ${escapeHtml(item.category || "")}
              </h3>

              <p>
                ${escapeHtml(item.examples || "")}
              </p>

            </article>
          `)
          .join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   SOURCES
   ========================================================= */

function renderSources(sources) {
  return `
    <section class="article-extra sources-section">

      <div class="article-section-label">
        SOURCES
      </div>

      <h2>
        Primary and Research Sources
      </h2>

      <div class="source-list">

        ${sources
          .map((source, index) => `
            <article class="source-item">

              <div class="source-number">
                ${String(index + 1).padStart(2, "0")}
              </div>

              <div class="source-details">

                <h3>
                  ${escapeHtml(source.title || "")}
                </h3>

                ${
                  source.organization
                    ? `<p class="source-organisation">
                        ${escapeHtml(source.organization)}
                      </p>`
                    : ""
                }

                ${
                  source.type
                    ? `<p class="source-type">
                        ${escapeHtml(source.type)}
                      </p>`
                    : ""
                }

                ${
                  source.url
                    ? `<a
                        href="${escapeHtml(source.url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        VIEW SOURCE →
                      </a>`
                    : ""
                }

              </div>

            </article>
          `)
          .join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   BIBLIOGRAPHY
   ========================================================= */

function renderBibliography(items) {
  return `
    <section class="article-extra bibliography-section">

      <div class="article-section-label">
        BIBLIOGRAPHY
      </div>

      <h2>
        Further Academic Reading
      </h2>

      <div class="bibliography-list">

        ${items
          .map((item, index) => `
            <div class="bibliography-item">

              <span class="bibliography-number">
                ${index + 1}.
              </span>

              <div>

                ${
                  item.author
                    ? `<strong>
                        ${escapeHtml(item.author)}
                      </strong>`
                    : ""
                }

                ${
                  item.title
                    ? `<span>
                        — ${escapeHtml(item.title)}
                      </span>`
                    : ""
                }

                ${
                  item.type
                    ? `<small>
                        ${escapeHtml(item.type)}
                      </small>`
                    : ""
                }

              </div>

            </div>
          `)
          .join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", event => {
    state.searchTerm =
      event.target.value.trim().toLowerCase();

    renderCards();
  });
}


/* =========================================================
   ERA FILTERS
   ========================================================= */

function setupEraFilters() {
  eraButtons.forEach(button => {

    button.addEventListener("click", () => {

      state.activeEra =
        button.dataset.era || "all";

      eraButtons.forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      renderCards();

    });

  });
}


/* =========================================================
   KEYBOARD
   ========================================================= */

function setupKeyboardControls() {

  document.addEventListener("keydown", event => {

    /* Escape closes reader */

    if (event.key === "Escape") {
      closeReader();
      closeModal();
    }


    /* Enter activates article cards */

    if (
      event.key === "Enter" &&
      document.activeElement?.dataset?.articleId
    ) {
      openArticle(
        document.activeElement.dataset.articleId
      );
    }

  });
}


/* =========================================================
   CLOSE ARTICLE READER
   ========================================================= */

function closeReader() {

  if (!reader) return;

  reader.classList.remove("open");

  document.body.classList.remove("reader-open");

  /*
    Return the reader to the top for the next article.
  */

  reader.scrollTop = 0;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {
  if (!modal) return;

  modal.classList.remove("open");
}


/* =========================================================
   READER ERROR
   ========================================================= */

function showReaderError(message) {
  if (!readerContent) return;

  readerContent.innerHTML = `
    <div class="reader-error">

      <div class="article-section-label">
        ERROR
      </div>

      <h2>
        Unable to load article
      </h2>

      <p>
        ${escapeHtml(message)}
      </p>

    </div>
  `;
}


/* =========================================================
   IMAGE HANDLING
   ========================================================= */

function getArticleImage(article) {

  /*
    The JSON can eventually specify its own image.

    Example:
    "heroImage": "../images/harappan-hero.jpg"

    Because article JSON files are inside:
    history/articles/<article-id>/

    the path is relative to that JSON location.

    However, HTML cannot directly use that relative path
    because the HTML page is one level higher.

    Therefore we convert it to a web path.
  */

  if (article.heroImage) {

    const cleanPath =
      article.heroImage
        .replace(/^(\.\.\/)+/, "");

    return `articles/${article.id}/${cleanPath}`;
  }

  return "../Bharat-map-clean.png";
}


/* =========================================================
   ERA DISPLAY
   ========================================================= */

function formatEra(era) {

  const names = {
    prehistory: "DEEP ANTIQUITY",
    harappan: "HARAPPAN",
    vedic: "VEDIC",
    classical: "CLASSICAL",
    medieval: "MEDIEVAL",
    earlymodern: "EARLY MODERN",
    colonial: "COLONIAL",
    modern: "MODERN"
  };

  return names[era] || String(era || "").toUpperCase();
}


/* =========================================================
   TEXT FORMATTER
   ========================================================= */

function formatParagraph(text) {

  if (text === null || text === undefined) {
    return "";
  }

  /*
    Convert line breaks safely while keeping the
    historical text readable.
  */

  return escapeHtml(String(text))
    .replace(/\n/g, "<br>");
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.HistoryApp = {
  openArticle,
  closeReader,
  loadArticleIndex,
  renderCards
};
/* =========================================================
   READER CLOSE BUTTON
   ========================================================= */

function setupReaderCloseButton() {

  if (!reader) return;

  /*
    Find the reader's close button.
    This supports the existing design even if the
    button does not yet have a dedicated ID.
  */

  const closeButton =
    reader.querySelector(".reader-close") ||
    reader.querySelector("[data-close-reader]") ||
    Array.from(reader.querySelectorAll("button"))
      .find(button => button.textContent.trim() === "×");

  if (!closeButton) {
    console.warn("History reader close button not found.");
    return;
  }

  closeButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    closeReader();
  });
}
