/* =========================================================
   EK RAHENGE TO NEK RAHENGE
   HISTORY — DYNAMIC ARTICLE ENGINE
   VERSION 2 — COMPLETE
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
   Your repository structure is:

   history/
      history.js
      articles/
         somnath/
            article.json
         mahmud-of-ghazni/
            article.json
         hindu-kush-frontier/
            article.json
         prithviraj-chauhan/
            article.json
         captivity-enslavement/
            article.json
         nalanda/
            article.json
         temple-destruction/
            article.json
         invasions-from-the-north-west/
            article.json

   Therefore the article JSON base path is:
*/

const ARTICLE_BASE_PATH = "./articles";

/*
   Article index.
*/
const ARTICLE_INDEX = "./data/articles.json";


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {
    articles: [],
    activeEra: "all",
    activeCategory: "all",
    searchTerm: ""
};


/* =========================================================
   DOM ELEMENTS
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


/* =========================================================
   INITIALISE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("====================================");
    console.log("EK RAHENGE HISTORY.JS STARTED");
    console.log("====================================");

    /*
       Get DOM elements AFTER the page has loaded.
    */

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

    /*
       Try several common close-button selectors.
    */

    readerClose =
        document.getElementById("readerClose") ||
        document.querySelector("[data-reader-close]") ||
        document.querySelector(".reader-close");

    console.log("cards:", cardsContainer);
    console.log("reader:", reader);
    console.log("readerContent:", readerContent);


    /*
       Setup controls.
    */

    setupSearch();
    setupEraFilters();
    setupCategoryFilter();
    setupKeyboardControls();
    setupReaderCloseButton();


    /*
       IMPORTANT:
       There is ONLY ONE article click handler.
       Do NOT create another Somnath-specific listener.
    */

    setupArticleClickHandler();


    /*
       Load article index.
    */

    loadArticleIndex();

});


/* =========================================================
   ARTICLE CLICK HANDLER
   ========================================================= */

function setupArticleClickHandler() {

    document.addEventListener("click", function (event) {

        /*
           Look for any element/card carrying:

           data-article-id="somnath"

           or

           data-article-id="mahmud-of-ghazni"
        */

        const card = event.target.closest("[data-article-id]");

        if (!card) {
            return;
        }

        const articleId = card.getAttribute("data-article-id");

        if (!articleId) {
            return;
        }

        console.log("====================================");
        console.log("ARTICLE CARD CLICKED");
        console.log("ARTICLE ID:", articleId);
        console.log("====================================");

        event.preventDefault();
        event.stopPropagation();

        openArticle(articleId);

    });

}


/* =========================================================
   LOAD ARTICLE INDEX
   ========================================================= */

async function loadArticleIndex() {

    try {

        console.log("Loading article index:");
        console.log(ARTICLE_INDEX);

        const response = await fetch(
            ARTICLE_INDEX + "?v=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {

            throw new Error(
                "Article index HTTP error: " +
                response.status
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
            "Article index loaded:",
            state.articles.length,
            "articles"
        );

        renderCards();

    }

    catch (error) {

        console.error(
            "ARTICLE INDEX ERROR:",
            error
        );

        /*
           IMPORTANT:
           We do NOT stop the page from working.

           Static cards such as Somnath can still open directly.
        */

        state.articles = [];

        renderCards();

    }

}


/* =========================================================
   RENDER ARTICLE CARDS
   ========================================================= */

function renderCards() {

    if (!cardsContainer) {

        console.warn(
            "#cards was not found. Static cards will remain untouched."
        );

        return;

    }


    /*
       Filter articles.
    */

    const filteredArticles = state.articles.filter(function (article) {

        /*
           Dark Chapters are displayed separately.
        */

        if (
            article.section === "dark-chapters" ||
            article.category === "dark-chapters"
        ) {

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


        return (
            matchesEra &&
            matchesCategory &&
            matchesSearch
        );

    });


    /*
       No results.
    */

    if (!filteredArticles.length) {

        cardsContainer.innerHTML = `
            <div class="empty-state">
                <p>No historical articles match your search.</p>
            </div>
        `;

        return;

    }


    /*
       Render.
    */

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
            aria-label="Read ${escapeHtml(article.title || "")}"
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
            "openArticle() called without article ID"
        );

        return;

    }


    console.log("------------------------------------");
    console.log("OPENING ARTICLE");
    console.log("ID:", articleId);
    console.log("------------------------------------");


    /*
       Find article information in index if available.
    */

    let articleIndex =
        state.articles.find(function (article) {
            return article.id === articleId;
        });


    /*
       If the article isn't in the index, create a basic
       temporary object.

       This is especially important for Dark Chapters.
    */

    if (!articleIndex) {

        articleIndex = {
            id: articleId,
            title: formatTitle(articleId),
            subtitle: "",
            era: "medieval",
            period: ""
        };

    }


    /*
       Open reader immediately.
    */

    showReaderLoading(articleIndex);


    /*
       THIS IS THE IMPORTANT PATH.

       For Somnath:

       ./articles/somnath/article.json

       Since history.js is inside /history/,
       this resolves to:

       /history/articles/somnath/article.json
    */

    const articlePath =
        ARTICLE_BASE_PATH +
        "/" +
        encodeURIComponent(articleId) +
        "/article.json";


    console.log("FETCHING ARTICLE:");
    console.log(articlePath);


    try {

        const response = await fetch(
            articlePath + "?v=" + Date.now(),
            {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Accept": "application/json"
                }
            }
        );


        console.log(
            "ARTICLE RESPONSE:",
            response.status,
            response.statusText
        );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status +
                " while loading " +
                articlePath
            );

        }


        const article = await response.json();


        console.log(
            "ARTICLE JSON SUCCESS:",
            article.id
        );


        renderArticle(article);

    }


    catch (error) {

        console.error(
            "ARTICLE LOADING FAILED:",
            error
        );


        showReaderError(
            "Unable to load this research article.",
            error,
            articlePath
        );

    }

}


/* =========================================================
   SHOW READER LOADING
   ========================================================= */

function showReaderLoading(article) {

    if (!reader) {

        console.error(
            "CRITICAL: #reader does not exist in HTML."
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


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   RENDER ARTICLE
   ========================================================= */

function renderArticle(article) {

    if (!reader) {

        console.error(
            "#reader does not exist."
        );

        return;

    }


    reader.classList.add("open");

    document.body.classList.add("reader-open");


    /*
       TITLE
    */

    if (readerTitle) {

        readerTitle.textContent =
            article.title || "";

    }


    /*
       SUBTITLE
    */

    if (readerDeck) {

        readerDeck.textContent =
            article.subtitle || "";

    }


    /*
       IMAGE
    */

    if (readerImage) {

        const image =
            getArticleImage(article);

        readerImage.style.display = "";

        readerImage.src = image;

        readerImage.alt =
            article.title || "";

        readerImage.onerror = function () {

            this.style.display = "none";

        };

    }


    /*
       TABLE OF CONTENTS
    */

    buildTableOfContents(article);


    /*
       ARTICLE BODY
    */

    buildArticleContent(article);


    /*
       Bring reader to top.
    */

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


    article.sections.forEach(function (section, index) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "reader-toc-item";

        button.textContent =
            section.title ||
            ("Section " + (index + 1));


        button.addEventListener(
            "click",
            function () {

                const target =
                    document.getElementById(
                        "article-section-" + index
                    );


                if (target) {

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }
        );


        readerToc.appendChild(button);

    });

}


/* =========================================================
   BUILD ARTICLE CONTENT
   ========================================================= */

function buildArticleContent(article) {

    if (!readerContent) {

        console.error(
            "#readerContent does not exist."
        );

        return;

    }


    let html = "";


    /*
       ABSTRACT
    */

    if (article.abstract) {

        html += `

            <div class="article-abstract">

                <p>
                    ${formatText(article.abstract)}
                </p>

            </div>

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
            function (section, index) {


                html += `

                    <section
                        id="article-section-${index}"
                        class="reader-section"
                    >

                        <h2>
                            ${escapeHtml(
                                section.title || ""
                            )}
                        </h2>

                `;


                /*
                   Section content.
                */

                if (
                    Array.isArray(section.content)
                ) {


                    section.content.forEach(
                        function (paragraph) {

                            html += `

                                <p>
                                    ${formatText(
                                        paragraph
                                    )}
                                </p>

                            `;

                        }
                    );

                }


                /*
                   Optional section lesson.
                */

                if (section.lesson) {

                    html += `

                        <div class="article-lesson">

                            <strong>
                                HISTORICAL LESSON
                            </strong>

                            <p>
                                ${formatText(
                                    section.lesson
                                )}
                            </p>

                        </div>

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
                class="reader-section article-chronology"
            >

                <h2>
                    CHRONOLOGY
                </h2>

        `;


        article.chronology.forEach(
            function (item) {

                html += `

                    <div class="chronology-item">

                        <div class="chronology-date">
                            ${escapeHtml(
                                item.date || ""
                            )}
                        </div>

                        <div class="chronology-event">
                            ${formatText(
                                item.event || ""
                            )}
                        </div>

                    </div>

                `;

            }
        );


        html += `
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
                class="reader-section research-questions"
            >

                <h2>
                    QUESTIONS FOR FURTHER RESEARCH
                </h2>

                <ol>
        `;


        article.researchQuestions.forEach(
            function (question) {

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
                class="reader-section article-sources"
            >

                <h2>
                    SOURCES
                </h2>

                <div class="source-list">
        `;


        article.sources.forEach(
            function (source) {

                html += `

                    <div class="source-item">

                        <strong>
                            ${escapeHtml(
                                source.title || ""
                            )}
                        </strong>

                `;


                if (source.author) {

                    html += `

                        <span>
                            ${escapeHtml(
                                source.author
                            )}
                        </span>

                    `;

                }


                if (source.publisher) {

                    html += `

                        <span>
                            ${escapeHtml(
                                source.publisher
                            )}
                        </span>

                    `;

                }


                if (source.type) {

                    html += `

                        <small>
                            ${escapeHtml(
                                source.type
                            )}
                        </small>

                    `;

                }


                if (source.url) {

                    html += `

                        <a
                            href="${escapeHtml(
                                source.url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            SOURCE →
                        </a>

                    `;

                }


                html += `

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
       BIBLIOGRAPHY
    */

    if (
        Array.isArray(article.bibliography) &&
        article.bibliography.length
    ) {


        html += `

            <section
                class="reader-section article-bibliography"
            >

                <h2>
                    BIBLIOGRAPHY
                </h2>

                <ul>
        `;


        article.bibliography.forEach(
            function (item) {

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
       Put everything into reader.
    */

    readerContent.innerHTML = html;

}


/* =========================================================
   SHOW READER ERROR
   ========================================================= */

function showReaderError(message, error, path) {

    if (!readerContent) {

        return;

    }


    console.error(
        "READER ERROR:",
        error
    );


    readerContent.innerHTML = `

        <div class="reader-error">

            <h2>
                ARTICLE COULD NOT BE LOADED
            </h2>

            <p>
                ${escapeHtml(message)}
            </p>

            <p>
                Please check the article file and path.
            </p>

            <details>

                <summary>
                    Technical information
                </summary>

                <pre>${escapeHtml(
                    String(error)
                )}</pre>

                <p>
                    Requested:
                </p>

                <code>
                    ${escapeHtml(path || "")}
                </code>

            </details>

        </div>

    `;

}


/* =========================================================
   CLOSE READER
   ========================================================= */

function setupReaderCloseButton() {

    if (!readerClose) {

        console.warn(
            "Reader close button not found."
        );

        return;

    }


    readerClose.addEventListener(
        "click",
        closeReader
    );

}


/* =========================================================
   CLOSE READER FUNCTION
   ========================================================= */

function closeReader() {

    if (reader) {

        reader.classList.remove("open");

    }

    document.body.classList.remove(
        "reader-open"
    );

}


/* =========================================================
   CLICK BACKDROP TO CLOSE
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {

        if (!reader) {

            return;

        }


        /*
           Only close when clicking the reader backdrop
           itself, not its contents.
        */

        if (
            event.target === reader
        ) {

            closeReader();

        }

    }
);


/* =========================================================
   ESC KEY
   ========================================================= */

function setupKeyboardControls() {

    document.addEventListener(
        "keydown",
        function (event) {

            /*
               ESC closes reader.
            */

            if (
                event.key === "Escape"
            ) {

                closeReader();

            }


            /*
               ENTER opens focused article card.
            */

            if (
                event.key === "Enter" &&
                document.activeElement &&
                document.activeElement.matches(
                    "[data-article-id]"
                )
            ) {

                const articleId =
                    document.activeElement.getAttribute(
                        "data-article-id"
                    );


                if (articleId) {

                    openArticle(articleId);

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
        function () {

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
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    state.activeEra =
                        button.dataset.era ||
                        "all";


                    eraButtons.forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
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
        function () {

            state.activeCategory =
                categoryFilter.value ||
                "all";


            renderCards();

        }
    );

}


/* =========================================================
   ARTICLE IMAGE
   ========================================================= */

function getArticleImage(article) {

    /*
       If the JSON specifies an image, use it.
    */

    if (article.image) {

        return article.image;

    }


    if (
        article.hero &&
        article.hero.image
    ) {

        return article.hero.image;

    }


    /*
       No image.

       Return transparent placeholder so broken-image
       icons do not appear.
    */

    return "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

}


/* =========================================================
   FORMAT ERA
   ========================================================= */

function formatEra(era) {

    if (!era) {

        return "";

    }


    return String(era)
        .replace(/-/g, " ")
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });

}


/* =========================================================
   FORMAT ARTICLE TITLE
   ========================================================= */

function formatTitle(id) {

    return String(id)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });

}


/* =========================================================
   TEXT FORMATTER
   ========================================================= */

function formatText(text) {

    if (text === null || text === undefined) {

        return "";

    }


    /*
       First escape HTML for safety.
    */

    let value =
        escapeHtml(String(text));


    /*
       Convert line breaks.
    */

    value =
        value.replace(
            /\n/g,
            "<br>"
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
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

console.log(
    "EK RAHENGE HISTORY ENGINE READY"
);

console.log(
    "Article base path:",
    ARTICLE_BASE_PATH
);

console.log(
    "Somnath test path:",
    ARTICLE_BASE_PATH +
    "/somnath/article.json"
);
