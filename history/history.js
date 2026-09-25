/* =========================================================
   EK RAHENGE TO NEK RAHENGE
   HISTORY — DYNAMIC ARTICLE ENGINE
   ========================================================= */

const ARTICLE_INDEX = "data/articles.json";

const state = {
  articles: [],
  activeEra: "all",
  activeCategory: "all",
  searchTerm: "",
  currentArticle: null
};


/* =========================================================
   DOM REFERENCES
   ========================================================= */

let cardsContainer;
let searchInput;
let categoryFilter;
let eraButtons;

let reader;
let readerImage;
let readerTitle;
let readerDeck;
let readerToc;
let readerContent;
let readerClose;

let modal;


/* =========================================================
   INITIALISE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  cacheDOM();

  console.log("EK RAHENGE HISTORY.JS LOADED");

  setupSearch();
  setupEraFilters();
  setupCategoryFilter();
  setupKeyboardControls();
  setupReaderCloseButton();
  setupArticleClickHandler();

  loadArticleIndex();

});


/* =========================================================
   CACHE DOM
   ========================================================= */

function cacheDOM() {

  cardsContainer = document.getElementById("cards");

  searchInput = document.getElementById("searchInput");

  categoryFilter = document.getElementById("categoryFilter");

  eraButtons = document.querySelectorAll("[data-era]");

  reader = document.getElementById("reader");

  readerImage = document.getElementById("readerImage");

  readerTitle = document.getElementById("readerTitle");

  readerDeck = document.getElementById("readerDeck");

  readerToc = document.getElementById("readerToc");

  readerContent = document.getElementById("readerContent");

  readerClose = document.querySelector(
    "[data-reader-close], #readerClose, .reader-close"
  );

  modal = document.getElementById("modal");
}


/* =========================================================
   ARTICLE CLICK HANDLER
   ========================================================= */

/*
   ONE global click handler only.

   This is important.

   Previous versions had multiple click handlers, including a
   separate Somnath handler. That is unnecessary and can create
   conflicts.

   Every article card should have:

       data-article-id="somnath"

   or

       data-article-id="mahmud-of-ghazni"

   etc.
*/

function setupArticleClickHandler() {

  document.addEventListener("click", event => {

    const card = event.target.closest("[data-article-id]");

    if (!card) {
      return;
    }

    const articleId = card.getAttribute("data-article-id");

    if (!articleId) {
      return;
    }

    /*
       If the click is already on a normal hyperlink, allow the
       hyperlink unless it is explicitly an article card.
    */

    event.preventDefault();
    event.stopPropagation();

    console.log("ARTICLE CARD CLICKED:", articleId);

    openArticle(articleId);

  });

}


/* =========================================================
   LOAD ARTICLE INDEX
   ========================================================= */

async function loadArticleIndex() {

  try {

    console.log("Loading article index:", ARTICLE_INDEX);

    const response = await fetch(
      ARTICLE_INDEX,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {

      throw new Error(
        `Unable to load ${ARTICLE_INDEX} (${response.status})`
      );

    }

    const data = await response.json();

    if (Array.isArray(data)) {

      state.articles = data;

    } else if (Array.isArray(data.articles)) {

      state.articles = data.articles;

    } else {

      state.articles = [];

    }

    console.log(
      "History articles loaded:",
      state.articles.length
    );

    renderCards();

  }

  catch (error) {

    console.error(
      "History index error:",
      error
    );

    /*
       IMPORTANT:

       Static cards can still open even if the index fails.
       Therefore we do NOT destroy the existing cards.
    */

    if (cardsContainer) {

      console.warn(
        "Article index unavailable. Existing static cards remain usable."
      );

    }

  }

}


/* =========================================================
   RENDER ARTICLE CARDS
   ========================================================= */

function renderCards() {

  if (!cardsContainer) {
    return;
  }

  /*
     If the page uses static cards instead of dynamically
     generated cards, don't erase them when there is no index.
  */

  if (!state.articles.length) {

    console.warn(
      "No articles found in article index."
    );

    return;

  }


  const filteredArticles = state.articles.filter(article => {

    /*
       Dark Chapters can have their own static cards.
       Do not duplicate them in the normal History grid.
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

      article.id,
      article.title,
      article.subtitle,
      article.period,
      article.category,
      article.section,
      article.era

    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();


    const matchesSearch =
      !state.searchTerm ||
      searchableText.includes(
        state.searchTerm.toLowerCase()
      );


    return (
      matchesEra &&
      matchesCategory &&
      matchesSearch
    );

  });


  if (!filteredArticles.length) {

    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p>No historical articles match your search.</p>
      </div>
    `;

    return;

  }


  cardsContainer.innerHTML =
    filteredArticles
      .map(createArticleCard)
      .join("");

}


/* =========================================================
   CREATE ARTICLE CARD
   ========================================================= */

function createArticleCard(article) {

  const image = getArticleImage(article);

  return `

    <article
      class="article-card"
      data-article-id="${escapeHtml(article.id)}"
      tabindex="0"
      role="button"
      aria-label="Read ${escapeHtml(article.title || article.id)}"
    >

      <div class="article-card-image">

        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(article.title || "")}"
          loading="lazy"
          onerror="
            this.style.display='none';
            this.parentElement.classList.add('image-missing');
          "
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
          ${escapeHtml(article.title || "")}
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

    console.error(
      "openArticle(): No article ID supplied."
    );

    return;

  }


  console.log(
    "Opening article:",
    articleId
  );


  /*
     Find article information in the index if available.
  */

  const indexedArticle =
    state.articles.find(
      article =>
        String(article.id).toLowerCase() ===
        String(articleId).toLowerCase()
    );


  const loadingArticle =
    indexedArticle ||
    {
      id: articleId,
      title: formatArticleTitle(articleId),
      subtitle: "",
      era: "medieval",
      period: ""
    };


  /*
     Show reader immediately.
  */

  showReaderLoading(loadingArticle);


  /*
     IMPORTANT PATH

     Your repository structure is:

       history/
         articles/
           somnath/
             article.json

     Therefore, from history.html/history.js:

       articles/somnath/article.json

     is correct.
  */

  const articlePath =
    `articles/${encodeURIComponent(articleId)}/article.json`;


  console.log(
    "Fetching article:",
    articlePath
  );


  try {

    const response = await fetch(
      articlePath,
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status} while loading ${articlePath}`
      );

    }


    const article = await response.json();


    if (!article || typeof article !== "object") {

      throw new Error(
        "Article JSON is empty or invalid."
      );

    }


    state.currentArticle = article;


    console.log(
      "Article loaded successfully:",
      article.id
    );


    renderArticle(article);

  }

  catch (error) {

    console.error(
      "ARTICLE LOAD ERROR:",
      error
    );


    showReaderError(
      `
        <h2>Unable to open this article</h2>

        <p>
          The article file could not be loaded.
        </p>

        <p class="reader-error-path">
          ${escapeHtml(articlePath)}
        </p>

        <p>
          Please check that the article exists at this exact path.
        </p>
      `
    );

  }

}


/* =========================================================
   SHOW READER LOADING
   ========================================================= */

function showReaderLoading(article) {

  if (!reader) {

    console.error(
      "Reader element #reader was not found."
    );

    return;

  }


  reader.classList.add("open");

  document.body.classList.add("reader-open");


  if (readerTitle) {

    readerTitle.textContent =
      article.title || "";

  }


  if (readerDeck) {

    readerDeck.textContent =
      article.subtitle || "";

  }


  if (readerImage) {

    const image =
      getArticleImage(article);


    readerImage.style.display = "";

    readerImage.src = image;

    readerImage.alt =
      article.title || "";

  }


  if (readerToc) {

    readerToc.innerHTML = "";

  }


  if (readerContent) {

    readerContent.innerHTML = `

      <div class="reader-loading">

        <div class="loader"></div>

        <p>
          Loading research article…
        </p>

      </div>

    `;

  }


  document.body.style.overflow = "hidden";

}


/* =========================================================
   RENDER ARTICLE
   ========================================================= */

function renderArticle(article) {

  if (!reader) {

    console.error(
      "#reader element not found."
    );

    return;

  }


  reader.classList.add("open");

  document.body.classList.add("reader-open");

  document.body.style.overflow = "hidden";


  /*
     TITLE
  */

  if (readerTitle) {

    readerTitle.textContent =
      article.title || "";

  }


  /*
     SUBTITLE / DECK
  */

  if (readerDeck) {

    readerDeck.textContent =
      article.subtitle || "";

  }


  /*
     HERO IMAGE
  */

  if (readerImage) {

    const image =
      getArticleImage(article);


    readerImage.style.display = "";

    readerImage.src = image;

    readerImage.alt =
      article.title || "";


    readerImage.onerror = () => {

      readerImage.style.display =
        "none";

    };

  }


  /*
     TABLE OF CONTENTS
  */

  buildTableOfContents(article);


  /*
     MAIN ARTICLE CONTENT
  */

  buildArticleContent(article);


  /*
     Start reader at the top.
  */

  if (reader) {

    reader.scrollTop = 0;

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   BUILD TABLE OF CONTENTS
   ========================================================= */

function buildTableOfContents(article) {

  if (!readerToc) {
    return;
  }


  readerToc.innerHTML = "";


  if (
    !Array.isArray(article.sections) ||
    !article.sections.length
  ) {

    return;

  }


  const fragment =
    document.createDocumentFragment();


  article.sections.forEach(
    (section, index) => {

      const id =
        section.id ||
        `section-${index + 1}`;


      const button =
        document.createElement("button");


      button.type = "button";

      button.className =
        "reader-toc-item";


      button.textContent =
        section.title ||
        `Section ${index + 1}`;


      button.addEventListener(
        "click",
        () => {

          const target =
            document.getElementById(id);


          if (target) {

            target.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

          }

        }
      );


      fragment.appendChild(button);

    }
  );


  readerToc.appendChild(fragment);

}


/* =========================================================
   BUILD ARTICLE CONTENT
   ========================================================= */

function buildArticleContent(article) {

  if (!readerContent) {
    return;
  }


  let html = "";


  /*
     ABSTRACT
  */

  if (article.abstract) {

    html += `

      <section class="reader-abstract">

        <p>
          ${formatText(article.abstract)}
        </p>

      </section>

    `;

  }


  /*
     SECTIONS
  */

  if (
    Array.isArray(article.sections) &&
    article.sections.length
  ) {

    article.sections.forEach(
      (section, index) => {

        const sectionId =
          section.id ||
          `section-${index + 1}`;


        html += `

          <section
            id="${escapeHtml(sectionId)}"
            class="reader-section reader-section-${escapeHtml(section.type || "historical")}"
          >

            <h2>
              ${escapeHtml(
                section.title ||
                `Section ${index + 1}`
              )}
            </h2>

        `;


        /*
           Section content can contain multiple
           paragraphs.
        */

        if (
          Array.isArray(section.content)
        ) {

          section.content.forEach(
            paragraph => {

              if (!paragraph) {
                return;
              }


              html += `

                <p>
                  ${formatText(paragraph)}
                </p>

              `;

            }
          );

        }


        /*
           Lesson / takeaway
        */

        if (section.lesson) {

          html += `

            <aside class="reader-lesson">

              <strong>
                LESSON
              </strong>

              <p>
                ${formatText(section.lesson)}
              </p>

            </aside>

          `;

        }


        html += `

          </section>

        `;

      }
    );

  }


  /*
     CHRONOLOGY
  */

  if (
    Array.isArray(article.chronology) &&
    article.chronology.length
  ) {

    html += `

      <section
        id="chronology"
        class="reader-section reader-chronology"
      >

        <h2>
          CHRONOLOGY
        </h2>

        <div class="chronology-list">

    `;


    article.chronology.forEach(
      item => {

        html += `

          <div class="chronology-item">

            <div class="chronology-date">
              ${escapeHtml(item.date || "")}
            </div>

            <div class="chronology-event">
              ${formatText(item.event || "")}
            </div>

          </div>

        `;

      }
    );


    html += `

        </div>

      </section>

    `;

  }


  /*
     RESEARCH QUESTIONS
  */

  if (
    Array.isArray(article.researchQuestions) &&
    article.researchQuestions.length
  ) {

    html += `

      <section
        id="research-questions"
        class="reader-section reader-research"
      >

        <h2>
          QUESTIONS FOR FURTHER RESEARCH
        </h2>

        <ol>

    `;


    article.researchQuestions.forEach(
      question => {

        html += `

          <li>
            ${formatText(question)}
          </li>

        `;

      }
    );


    html += `

        </ol>

      </section>

    `;

  }


  /*
     SOURCES
  */

  if (
    Array.isArray(article.sources) &&
    article.sources.length
  ) {

    html += `

      <section
        id="sources"
        class="reader-section reader-sources"
      >

        <h2>
          SOURCES
        </h2>

        <div class="source-list">

    `;


    article.sources.forEach(
      source => {

        html += buildSourceHTML(source);

      }
    );


    html += `

        </div>

      </section>

    `;

  }


  /*
     BIBLIOGRAPHY
  */

  if (
    Array.isArray(article.bibliography) &&
    article.bibliography.length
  ) {

    html += `

      <section
        id="bibliography"
        class="reader-section reader-bibliography"
      >

        <h2>
          BIBLIOGRAPHY
        </h2>

        <ul>

    `;


    article.bibliography.forEach(
      item => {

        html += `

          <li>
            ${formatText(item)}
          </li>

        `;

      }
    );


    html += `

        </ul>

      </section>

    `;

  }


  /*
     If absolutely nothing was available.
  */

  if (!html.trim()) {

    html = `

      <section class="reader-section">

        <p>
          No article content is available.
        </p>

      </section>

    `;

  }


  readerContent.innerHTML =
    html;

}


/* =========================================================
   SOURCE HTML
   ========================================================= */

function buildSourceHTML(source) {

  if (!source) {
    return "";
  }


  if (typeof source === "string") {

    return `

      <div class="source-item">

        <p>
          ${formatText(source)}
        </p>

      </div>

    `;

  }


  const title =
    source.title || "Source";


  const author =
    source.author || "";


  const publisher =
    source.publisher || "";


  const type =
    source.type || "";


  let sourceMeta = [

    author,
    publisher,
    type

  ]
    .filter(Boolean)
    .join(" · ");


  let titleHTML =
    escapeHtml(title);


  if (source.url) {

    titleHTML = `

      <a
        href="${escapeHtml(source.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(title)}
      </a>

    `;

  }


  return `

    <div class="source-item">

      <h3>
        ${titleHTML}
      </h3>

      ${
        sourceMeta
          ? `<p>${escapeHtml(sourceMeta)}</p>`
          : ""
      }

    </div>

  `;

}


/* =========================================================
   READER ERROR
   ========================================================= */

function showReaderError(message) {

  if (!reader) {
    return;
  }


  reader.classList.add("open");

  document.body.classList.add("reader-open");

  document.body.style.overflow = "hidden";


  if (readerContent) {

    readerContent.innerHTML = `

      <div class="reader-error">

        ${message}

      </div>

    `;

  }

}


/* =========================================================
   CLOSE READER
   ========================================================= */

function closeReader() {

  if (!reader) {
    return;
  }


  reader.classList.remove("open");

  document.body.classList.remove(
    "reader-open"
  );

  document.body.style.overflow = "";


  state.currentArticle = null;

}


/* =========================================================
   READER CLOSE BUTTON
   ========================================================= */

function setupReaderCloseButton() {

  if (!readerClose) {
    return;
  }


  readerClose.addEventListener(
    "click",
    event => {

      event.preventDefault();

      closeReader();

    }
  );

}


/* =========================================================
   KEYBOARD CONTROLS
   ========================================================= */

function setupKeyboardControls() {

  document.addEventListener(
    "keydown",
    event => {

      /*
         ESC closes reader.
      */

      if (
        event.key === "Escape" &&
        reader &&
        reader.classList.contains("open")
      ) {

        closeReader();

        return;

      }


      /*
         ENTER / SPACE opens focused article card.
      */

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        const active =
          document.activeElement;


        if (
          active &&
          active.matches &&
          active.matches(
            "[data-article-id]"
          )
        ) {

          event.preventDefault();


          const articleId =
            active.getAttribute(
              "data-article-id"
            );


          if (articleId) {

            openArticle(articleId);

          }

        }

      }

    }
  );

}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

  if (!searchInput) {
    return;
  }


  searchInput.addEventListener(
    "input",
    () => {

      state.searchTerm =
        searchInput.value
          .trim()
          .toLowerCase();


      renderCards();

    }
  );

}


/* =========================================================
   ERA FILTER
   ========================================================= */

function setupEraFilters() {

  if (!eraButtons || !eraButtons.length) {
    return;
  }


  eraButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          state.activeEra =
            button.dataset.era ||
            "all";


          eraButtons.forEach(
            item => {

              item.classList.toggle(
                "active",
                item === button
              );

            }
          );


          renderCards();

        }
      );

    }
  );

}


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

function setupCategoryFilter() {

  if (!categoryFilter) {
    return;
  }


  categoryFilter.addEventListener(
    "change",
    () => {

      state.activeCategory =
        categoryFilter.value ||
        "all";


      renderCards();

    }
  );

}


/* =========================================================
   IMAGE RESOLUTION
   ========================================================= */

function getArticleImage(article) {

  /*
     If the JSON explicitly specifies an image,
     use it.
  */

  if (
    article &&
    article.image
  ) {

    return article.image;

  }


  if (
    article &&
    article.hero &&
    article.hero.image
  ) {

    return article.hero.image;

  }


  /*
     Optional common image locations.
  */

  if (
    article &&
    article.images &&
    article.images.hero
  ) {

    return article.images.hero;

  }


  /*
     Default transparent placeholder.

     This prevents broken-image icons from interfering
     with the article reader.
  */

  return "assets/images/history-placeholder.jpg";

}


/* =========================================================
   ERA FORMAT
   ========================================================= */

function formatEra(era) {

  if (!era) {
    return "";
  }


  const value =
    String(era)
      .replace(/-/g, " ")
      .trim();


  return value.toUpperCase();

}


/* =========================================================
   ARTICLE TITLE FROM ID
   ========================================================= */

function formatArticleTitle(id) {

  if (!id) {
    return "Historical Article";
  }


  return String(id)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, char =>
      char.toUpperCase()
    );

}


/* =========================================================
   TEXT FORMATTER
   ========================================================= */

/*
   Converts normal text to safe HTML.

   Also recognises:
      **bold**
      *italic*

   This allows article JSON to contain richer prose without
   allowing arbitrary HTML.
*/

function formatText(text) {

  if (
    text === null ||
    text === undefined
  ) {

    return "";

  }


  let value =
    escapeHtml(String(text));


  /*
     Bold
  */

  value =
    value.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
     Italic
  */

  value =
    value.replace(
      /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
      "$1<em>$2</em>"
    );


  return value;

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   BACKDROP CLICK
   ========================================================= */

/*
   If #reader itself acts as the overlay/backdrop,
   clicking outside the reader article closes it.

   This is deliberately defensive because the exact HTML
   structure can vary.
*/

if (document.readyState !== "loading") {

  setupReaderBackdrop();

} else {

  document.addEventListener(
    "DOMContentLoaded",
    setupReaderBackdrop
  );

}


function setupReaderBackdrop() {

  const readerElement =
    document.getElementById("reader");


  if (!readerElement) {
    return;
  }


  readerElement.addEventListener(
    "click",
    event => {

      /*
         Only close when the actual backdrop is clicked.
      */

      if (
        event.target === readerElement
      ) {

        closeReader();

      }

    }
  );

}


/* =========================================================
   OPTIONAL MODAL SUPPORT
   ========================================================= */

function closeModal() {

  if (!modal) {
    return;
  }


  modal.classList.remove("open");

}


/* =========================================================
   DEBUG HELPERS
   ========================================================= */

window.HistoryEngine = {

  openArticle,

  closeReader,

  renderCards,

  loadArticleIndex,

  getState: () => state

};


console.log(
  "History article engine ready."
);
