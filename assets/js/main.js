"use strict";

(() => { 

$(document).ready(function () {
    const LOCAL_STORAGE_KEY = "selectedCoins";
    const COIN_DETAILS_API = "https://api.coingecko.com/api/v3/coins/";
    const MAX_SELECTED_COINS = 5;
    const coinsURL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd";
    // const coinsURL = "coins.json";
    const coinsPerPage = 20;
    let selectedCoins = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    let currentPage = 1;
    let allCoins = [];
    let currencySymbols = {
        usd: '$',
        eur: '€',
        ils: '₪'
    };

    // INITIALIZES PAGE-SPECIFIC CONTENT  //
    const currentPagePath = window.location.pathname.split("/").pop();
    if (currentPagePath === "index.html" || currentPagePath === "") {
        initializeMainPage();
    } else if (currentPagePath === "live-reports.html") {
        initializeLiveReportsPage();
    }

    //  SCROLL PARALLAX //
    window.addEventListener('scroll', function () {
        let scrollPosition = window.pageYOffset;
        let baseLayer = document.querySelector('.base-layer');
        let depthLayer = document.querySelector('.depth-layer');

        let baseOffset = (scrollPosition * 0.1) % window.innerHeight;
        let depthOffset = (scrollPosition * 0.3) % window.innerHeight;

        baseLayer.style.transform = `translateY(${baseOffset}px)`;
        depthLayer.style.transform = `translateY(${depthOffset}px)`;
    });

    // MAIN PAGE FUNCTIONS //
    function initializeMainPage() {
        function fetchCoins() {
            axios.get(coinsURL)
                .then(response => {
                    allCoins = response.data;
                    renderCoins();
                })
                .catch(error => {
                    console.error("Failed to fetch coins:", error);
                    showError("Failed to load coin data. Please check your connection.");
                });
        }

        // MORE INFO COINS //
        async function fetchCoinDetails(coinId) {
            const currentCurrency = $("#currency-toggle").text().toLowerCase(); 
            const coinInfoContainer = $(`#info-${coinId}`);
            coinInfoContainer.html(`
                <div class="text-center">
                    <img src="assets/images/crypto-loading.png" alt="Loading..." class="snail-animation" style="width: 150px; height: 120px;">
                </div>
            `).slideDown();

            try {
                const response = await axios.get(`${COIN_DETAILS_API}${coinId}?vs_currency=${currentCurrency}`);
                const data = response.data;
                renderCoinDetails(coinId, data, currentCurrency);
            } catch (error) {
                console.error("Failed to fetch coin details:", error);
                showError("Failed to fetch coin details. Please try again.");
            }
        }


        function renderCoinDetails(coinId, data, currency) {
            const coinInfoContainer = $(`#info-${coinId}`);
            const price = data.market_data.current_price[currency];
            const marketCap = data.market_data.market_cap[currency];
            const volume = data.market_data.total_volume[currency];
            coinInfoContainer.html(`
                <div class="d-flex align-items-center">
                    <img src="${data.image.small}" alt="${data.name}" class="me-3" style="width: 40px; height: 40px; margin-left: 5px;">
                    <div>
                        <p>Price (${currency.toUpperCase()}): ${currencySymbols[currency]}${price.toLocaleString('en-US')}</p>
                        <p>Market Cap: ${currencySymbols[currency]}${marketCap.toLocaleString('en-US')}</p>
                        <p>24h Volume: ${currencySymbols[currency]}${volume.toLocaleString('en-US')}</p>
                    </div>
                </div>
            `).slideDown();
        }

        // FUNCTION ATTACHES EVENT LISTENERS FOR INFO AND SELECTION BUTTONS //
        function attachEventListeners() {
            $(".info-btn").on("click", function () {
                const coinId = $(this).data("id");
                const coinInfoContainer = $(`#info-${coinId}`);

                if (coinInfoContainer.is(":visible")) {
                    coinInfoContainer.slideUp();
                } else {
                    fetchCoinDetails(coinId);
                }
            });

            $(".select-btn").on("change", function () {
                const coinId = $(this).data("id");
                const coinName = $(this).data("name");
                const coinSymbol = $(this).data("symbol");                
                toggleCoinSelection({ id: coinId, name: coinName, symbol: coinSymbol }, $(this));
            });
        }


        // FUNCTION DISPLAYS AND UPDATES COIN CARDS BASED ON PAGINATION AND ATTACHES EVENT LISTENERS //
        function renderCoins() {
            const start = (currentPage - 1) * coinsPerPage;
            const end = start + coinsPerPage;
            const coinsToRender = allCoins.slice(start, end);

            const container = $("#coins-container");
            container.empty();

            coinsToRender.forEach((coin) => {
                const isSelected = selectedCoins.some((c) => c.id === coin.id);
                const marketCapChange = coin.market_cap_change_percentage_24h;

                container.append(`
                    <div class="col-md-3 mb-4">
                        <div class="card shadow position-relative">
                            <div class="card-body">
                                <img src="${coin.image}" alt="${coin.name} logo" class="img-fluid mb-3" style="max-height: 60px;">
                                <h5 class="card-title">${coin.name}</h5>
                                <p class="percent-change ${marketCapChange < 0 ? 'negative' : 'positive'}">${marketCapChange.toFixed(2)}%</p>
                                <div class="form-check form-switch position-absolute top-0 end-0 m-2">
                                    <input class="form-check-input select-btn" type="checkbox" id="select-${coin.id}" data-id="${coin.id}" data-name="${coin.name}" data-symbol="${coin.symbol}" ${isSelected ? "checked" : ""}>
                                </div>
                            </div>
                            <button class="btn btn-secondary btn-sm info-btn w-100" id="MoreInfo" data-id="${coin.id}" style="margin-top: 10px;">More Info</button>
                            <div class="coin-info mt-2" id="info-${coin.id}" style="display: none;"></div>
                        </div>
                    </div>
                `);
            });

            updatePagination();
            attachEventListeners();
        }

        // SWITCHING BETWEEN CURRENCY PAGES //
        function updatePagination() {
            const totalPages = Math.ceil(allCoins.length / coinsPerPage);
            const paginationContainer = $("#top-pagination");
            paginationContainer.empty();

            for (let i = 1; i <= totalPages; i++) {
                paginationContainer.append(`
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <button class="page-link" data-page="${i}">${i}</button>
                    </li>
                `);
            }

            $(".page-link").on("click", function () {
                currentPage = parseInt($(this).data("page"));
                renderCoins();
            });
        }

        // MODAL 5 COINS //
        function toggleCoinSelection(coin, checkbox) {
            const existingIndex = selectedCoins.findIndex((c) => c.id === coin.id);
            if (existingIndex !== -1) {
                selectedCoins.splice(existingIndex, 1);
                checkbox.removeClass("bg-success").addClass("bg-secondary").prop("checked", false);
            } else {
                if (selectedCoins.length >= MAX_SELECTED_COINS) {
                    showSelectionModal(coin);
                    checkbox.prop("checked", false);
                    return;
                }
                selectedCoins.push(coin);
                checkbox.removeClass("bg-secondary").addClass("bg-success").prop("checked", true);
            }

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedCoins));
            renderCoins();
        }

        function showSelectionModal(newCoin) {
            const modalElement = $('#selection-modal');
            const bsModal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
            });
            bsModal.show();

            const modalBody = $("#modal-body");
            modalBody.empty();

            selectedCoins.forEach((coin) => {
                modalBody.append(`
                    <p>${coin.name} (${coin.symbol.toUpperCase()}) 
                    <button class="btn btn-danger btn-sm remove-modal-btn" data-id="${coin.id}">Remove</button>
                    </p>
                `);
            });

            attachModalListeners(newCoin);
        }

        function attachModalListeners(newCoin) {
            $(".remove-modal-btn").on("click", function () {
                const coinId = $(this).data("id");
                selectedCoins = selectedCoins.filter((coin) => coin.id !== coinId);
                selectedCoins.push(newCoin);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedCoins));
                $("#selection-modal").modal("hide");
                fetchCoins();
            });
        }


        fetchCoins();

        //  SEARCH FUNCTIONALITY // 
        $("#coin-search").on("input", function () {
            const query = $(this).val().toLowerCase();
            $(".card-title").each(function () {
                const cardTitle = $(this).text().toLowerCase();
                $(this).closest(".col-md-3").toggle(cardTitle.includes(query));
            });
        });

        // BUTTONS SEARCH AND TOGGLE //
        let currencyImages = {
            usd: 'assets/images/dollar.png',
            eur: 'assets/images/euro.png',
            ils: 'assets/images/shekel.png'
        };

        const clearSearchBtn = $('<button class="btn btn-secondary";">Clear Search</button>').on("click", function () {
            $("#coin-search").val("").trigger("input");
        });

        const toggleCurrencyBtn = $('<button class="btn btn-secondary" id="ToggleCurrency">Toggle Currency</button>').on("click", function () {
            const currentCurrency = $("#currency-toggle").attr("data-currency");
            const newCurrency = currentCurrency === "USD" ? "EUR" : currentCurrency === "EUR" ? "ILS" : "USD";
            $("#currency-toggle").attr("data-currency", newCurrency).html(`<img src="${currencyImages[newCurrency.toLowerCase()]}" alt="${newCurrency}" style="width: 35px; height: 35px;"><span style="display:none;">${newCurrency}</span>`);
            $(".coin-info:visible").each(function () {
                const coinId = $(this).attr("id").replace("info-", "");
                fetchCoinDetails(coinId, newCurrency.toLowerCase());
            });
        });

        $(".search-bar").append(clearSearchBtn, toggleCurrencyBtn);
        $(".search-bar").append(`<span id="currency-toggle" data-currency="USD"><img src="${currencyImages['usd']}" alt="USD" style="width: 35px; height: 35px;"><span style="display:none;">USD</span></span>`);
    }

    /** LIVE REPORTS PAGE FUNCTIONS **/
    function initializeLiveReportsPage() {
        if (selectedCoins.length === 0) {
            alert("Please select a coin to view live reports.");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
            return;
        }

        const reportContainer = $("#reports-container");
        reportContainer.empty();

        selectedCoins.forEach((coin) => {
            reportContainer.append(`
                <div class="col-md-6 mb-4">
                    <div class="card shadow-lg p-3 mb-5 bg-white rounded">
                        <div class="card-body">
                            <h4 class="card-title text-center">${coin.name} (${coin.symbol.toUpperCase()})</h4>
                            <div class="chart-container"
                            id="tradingview-chart-${coin.symbol}"
                            style="height: 300px;
                            width: 500px;
                            max-width: 100%;
">
                        </div>
                    </div>
                </div>
            `);

            renderTradingViewChart(coin.symbol);
        });
    }

    function renderTradingViewChart(symbol) {
        new TradingView.widget({
            container_id: `tradingview-chart-${symbol}`,
            autosize: true,
            symbol: `${symbol.toUpperCase()}USD`,
            interval: "1",
            timezone: "Asia/Jerusalem",
            theme: "light",
            style: "10",
            locale: "en",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            hide_top_toolbar: true,
            save_image: false,
            studies: [],
            show_popup_button: true,
            popup_width: "1000",
            popup_height: "650",
        });
    }

    function showError(message) {
        $("#error-container").text(message).fadeIn().delay(3000).fadeOut();
    }
});

// FIX NAVBAR FOR MOBILE //  
document.addEventListener("DOMContentLoaded", function () {
    const toggler = document.querySelector('.navbar-toggler');
    const logo = document.querySelector('.navbar-brand');
    const coin = document.querySelector('#coin-button');

    toggler.addEventListener('click', function () {
        const isExpanded = toggler.getAttribute('aria-expanded') === 'true';
        logo.style.display = isExpanded ? 'none' : 'block';
        coin.style.display = isExpanded ? 'none' : 'block';
    });
});

//  CONTACT FOR ABOUT.HTML //
$(document).ready(function() {
    if (window.location.pathname.endsWith('about.html')) {
        setupModalInteractions();
    }
});

function setupModalInteractions() {
    $('.cta button').on('click', function() {
        toggleModal('flex');
    });

    $('.close-modal').on('click', function() {
        toggleModal('none');
        $('#consultationForm').trigger('reset');
    });

    $('#consultationForm').on('submit', function(e) {
        e.preventDefault();
        alert('Form submitted successfully!');
        toggleModal('none');
        $(this).trigger('reset');
    });
}

function toggleModal(displayStyle) {
    $('body').css('overflow', displayStyle === 'flex' ? 'hidden' : '');
    $('#consultation-modal').css('display', displayStyle);
}

})();


// GAME PANE //
function openGameModal() {
    const iframe = $('#game-frame');
    iframe.attr('src', "https://lagged.com/en/g/dino-dash#goog_game_inter");
    $('#game-modal').css('display', 'flex');
}

function closeGameModal() {
    const iframe = $('#game-frame');
    iframe.attr('src', "");
    $('#game-modal').css('display', 'none');
}

$(window).on('click', function(event) {
    if (event.target === $('#game-modal')[0]) {
        closeGameModal();
    }
});
