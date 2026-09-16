(function () {
  "use strict";

  /* ==========================================================
     CONFIGURAÇÕES GERAIS DO SISTEMA
     ========================================================== */

  const root = document.documentElement;


  /* ==========================================================
     TEMA CLARO E ESCURO
     Funciona no index.html e no produtos.html
     ========================================================== */

  const themeButton =
    document.querySelector(".theme-toggle");

  const themeColor =
    document.querySelector(
      'meta[name="theme-color"]'
    );

  const themeStorageKey =
    "mercearia-theme";

  function getSavedTheme() {
    try {
      return localStorage.getItem(
        themeStorageKey
      );
    } catch (error) {
      return null;
    }
  }

  function getSystemTheme() {
    if (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
    ) {
      return "dark";
    }

    return "light";
  }

  function applyTheme(
    theme,
    saveTheme = false
  ) {
    const selectedTheme =
      theme === "dark"
        ? "dark"
        : "light";

    const isDark =
      selectedTheme === "dark";

    root.setAttribute(
      "data-theme",
      selectedTheme
    );

    if (themeButton) {
      themeButton.setAttribute(
        "aria-pressed",
        String(isDark)
      );

      themeButton.setAttribute(
        "aria-label",
        isDark
          ? "Ativar modo claro"
          : "Ativar modo escuro"
      );

      themeButton.title = isDark
        ? "Ativar modo claro"
        : "Ativar modo escuro";
    }

    if (themeColor) {
      themeColor.setAttribute(
        "content",
        isDark
          ? "#17191d"
          : "#e7e3dc"
      );
    }

    if (saveTheme) {
      try {
        localStorage.setItem(
          themeStorageKey,
          selectedTheme
        );
      } catch (error) {
        console.warn(
          "Não foi possível salvar o tema."
        );
      }
    }
  }

  const initialTheme =
    getSavedTheme() ||
    getSystemTheme();

  applyTheme(initialTheme);

  if (themeButton) {
    themeButton.addEventListener(
      "click",
      function () {
        const currentTheme =
          root.getAttribute("data-theme");

        const nextTheme =
          currentTheme === "dark"
            ? "light"
            : "dark";

        applyTheme(nextTheme, true);
      }
    );
  }

  if (window.matchMedia) {
    const systemThemePreference =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    function handleSystemThemeChange(event) {
      if (!getSavedTheme()) {
        applyTheme(
          event.matches
            ? "dark"
            : "light"
        );
      }
    }

    if (
      systemThemePreference.addEventListener
    ) {
      systemThemePreference.addEventListener(
        "change",
        handleSystemThemeChange
      );
    } else if (
      systemThemePreference.addListener
    ) {
      systemThemePreference.addListener(
        handleSystemThemeChange
      );
    }
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS
     Pesquisa, filtros, contadores e paginação
     ========================================================== */

  const productsTableBody =
    document.querySelector(
      "#products-table-body"
    );

  /*
   * Se a tabela não existir, significa que estamos
   * no dashboard. O tema continua funcionando normalmente.
   */
  if (!productsTableBody) {
    return;
  }

  const productRows = Array.from(
    document.querySelectorAll(
      ".product-row"
    )
  );

  const searchInput =
    document.querySelector(
      "#product-search"
    );

  const categorySelect =
    document.querySelector(
      "#category-filter"
    );

  const filterButtons = Array.from(
    document.querySelectorAll(
      ".filter-button"
    )
  );

  const pagination =
    document.querySelector(
      "#products-pagination"
    );

  const productsCounter =
    document.querySelector(
      "#products-counter"
    );

  const resultDescription =
    document.querySelector(
      "#products-result-description"
    );

  const emptyRow =
    document.querySelector(
      "#empty-products-row"
    );

  const clearFiltersButton =
    document.querySelector(
      "#clear-products-filters"
    );

  const allProductsCount =
    document.querySelector(
      "#all-products-count"
    );

  const lowProductsCount =
    document.querySelector(
      "#low-products-count"
    );

  const emptyProductsCount =
    document.querySelector(
      "#empty-products-count"
    );

  const metricTotalProducts =
    document.querySelector(
      "#metric-total-products"
    );

  const metricLowProducts =
    document.querySelector(
      "#metric-low-products"
    );

  const metricEmptyProducts =
    document.querySelector(
      "#metric-empty-products"
    );

  const productsPerPage = 6;

  let selectedStatus = "all";
  let currentPage = 1;


  /* ==========================================================
     PÁGINA DE PRODUTOS — NORMALIZAÇÃO DA PESQUISA
     ========================================================== */

  function normalizeText(text) {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .trim();
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — CONTADORES GERAIS
     ========================================================== */

  function getProductsByStatus(status) {
    return productRows.filter(
      function (row) {
        return (
          row.dataset.status === status
        );
      }
    );
  }

  function updateGeneralCounters() {
    const total =
      productRows.length;

    const lowTotal =
      getProductsByStatus("low").length;

    const emptyTotal =
      getProductsByStatus("empty").length;

    if (allProductsCount) {
      allProductsCount.textContent =
        total;
    }

    if (lowProductsCount) {
      lowProductsCount.textContent =
        lowTotal;
    }

    if (emptyProductsCount) {
      emptyProductsCount.textContent =
        emptyTotal;
    }

    if (metricTotalProducts) {
      metricTotalProducts.textContent =
        total;
    }

    if (metricLowProducts) {
      metricLowProducts.textContent =
        lowTotal;
    }

    if (metricEmptyProducts) {
      metricEmptyProducts.textContent =
        emptyTotal;
    }
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — FILTRAGEM
     ========================================================== */

  function getFilteredProducts() {
    const searchTerm =
      normalizeText(
        searchInput
          ? searchInput.value
          : ""
      );

    const selectedCategory =
      categorySelect
        ? categorySelect.value
        : "all";

    return productRows.filter(
      function (row) {
        const productName =
          normalizeText(
            row.dataset.name || ""
          );

        const productCode =
          normalizeText(
            row.dataset.code || ""
          );

        const productCategory =
          row.dataset.category || "";

        const productStatus =
          row.dataset.status || "";

        const matchesSearch =
          searchTerm === "" ||
          productName.includes(
            searchTerm
          ) ||
          productCode.includes(
            searchTerm
          );

        const matchesCategory =
          selectedCategory === "all" ||
          productCategory ===
            selectedCategory;

        const matchesStatus =
          selectedStatus === "all" ||
          productStatus ===
            selectedStatus;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );
      }
    );
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — DESCRIÇÃO DOS RESULTADOS
     ========================================================== */

  function updateResultDescription(
    totalResults
  ) {
    if (!resultDescription) {
      return;
    }

    if (totalResults === 0) {
      resultDescription.textContent =
        "Nenhum produto encontrado";

      return;
    }

    if (totalResults === 1) {
      resultDescription.textContent =
        "1 produto encontrado";

      return;
    }

    resultDescription.textContent =
      totalResults +
      " produtos encontrados";
  }

  function updateProductsCounter(
    firstVisible,
    lastVisible,
    totalResults
  ) {
    if (!productsCounter) {
      return;
    }

    if (totalResults === 0) {
      productsCounter.textContent =
        "Nenhum produto para mostrar";

      return;
    }

    productsCounter.innerHTML =
      "Mostrando <strong>" +
      firstVisible +
      "–" +
      lastVisible +
      "</strong> de <strong>" +
      totalResults +
      "</strong> produtos";
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — CRIAÇÃO DOS BOTÕES DA PAGINAÇÃO
     ========================================================== */

  function createPaginationButton(
    options
  ) {
    const button =
      document.createElement("button");

    button.type = "button";

    button.disabled =
      Boolean(options.disabled);

    if (options.className) {
      button.className =
        options.className;
    }

    if (options.label) {
      button.setAttribute(
        "aria-label",
        options.label
      );
    }

    if (options.current) {
      button.setAttribute(
        "aria-current",
        "page"
      );
    }

    if (options.html) {
      button.innerHTML =
        options.html;
    } else {
      button.textContent =
        options.text;
    }

    if (
      !options.disabled &&
      options.onClick
    ) {
      button.addEventListener(
        "click",
        options.onClick
      );
    }

    return button;
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — PAGINAÇÃO
     ========================================================== */

  function renderPagination(totalPages) {
    if (!pagination) {
      return;
    }

    pagination.innerHTML = "";

    if (totalPages <= 1) {
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;

    const previousButton =
      createPaginationButton({
        label: "Página anterior",

        disabled:
          currentPage === 1,

        html:
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="m15 18-6-6 6-6"/>' +
          "</svg>",

        onClick: function () {
          currentPage -= 1;
          renderProducts();
        }
      });

    pagination.appendChild(
      previousButton
    );

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber += 1
    ) {
      const pageButton =
        createPaginationButton({
          text: String(pageNumber),

          label:
            "Página " + pageNumber,

          className:
            pageNumber === currentPage
              ? "is-current"
              : "",

          current:
            pageNumber === currentPage,

          onClick: function () {
            currentPage = pageNumber;
            renderProducts();
          }
        });

      pagination.appendChild(
        pageButton
      );
    }

    const nextButton =
      createPaginationButton({
        label: "Próxima página",

        disabled:
          currentPage === totalPages,

        html:
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="m9 18 6-6-6-6"/>' +
          "</svg>",

        onClick: function () {
          currentPage += 1;
          renderProducts();
        }
      });

    pagination.appendChild(
      nextButton
    );
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — EXIBIÇÃO DOS PRODUTOS
     ========================================================== */

  function renderProducts() {
    const filteredProducts =
      getFilteredProducts();

    const totalResults =
      filteredProducts.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalResults /
          productsPerPage
        )
      );

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const startIndex =
      (currentPage - 1) *
      productsPerPage;

    const endIndex =
      startIndex +
      productsPerPage;

    const productsOnCurrentPage =
      filteredProducts.slice(
        startIndex,
        endIndex
      );

    productRows.forEach(
      function (row) {
        row.hidden = true;
      }
    );

    productsOnCurrentPage.forEach(
      function (row) {
        row.hidden = false;
      }
    );

    const hasResults =
      totalResults > 0;

    if (emptyRow) {
      emptyRow.hidden = hasResults;
    }

    updateResultDescription(
      totalResults
    );

    if (hasResults) {
      updateProductsCounter(
        startIndex + 1,
        Math.min(
          endIndex,
          totalResults
        ),
        totalResults
      );
    } else {
      updateProductsCounter(
        0,
        0,
        0
      );
    }

    renderPagination(
      hasResults
        ? totalPages
        : 0
    );
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — SELEÇÃO DO FILTRO
     ========================================================== */

  function selectStatusFilter(
    selectedButton
  ) {
    filterButtons.forEach(
      function (button) {
        const isSelected =
          button === selectedButton;

        button.classList.toggle(
          "is-selected",
          isSelected
        );

        button.setAttribute(
          "aria-pressed",
          String(isSelected)
        );
      }
    );

    selectedStatus =
      selectedButton.dataset.filter ||
      "all";

    currentPage = 1;

    renderProducts();
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — EVENTOS DOS FILTROS
     ========================================================== */

  filterButtons.forEach(
    function (button) {
      button.addEventListener(
        "click",
        function () {
          selectStatusFilter(
            button
          );
        }
      );
    }
  );

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      function () {
        currentPage = 1;
        renderProducts();
      }
    );
  }

  if (categorySelect) {
    categorySelect.addEventListener(
      "change",
      function () {
        currentPage = 1;
        renderProducts();
      }
    );
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — LIMPAR FILTROS
     ========================================================== */

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener(
      "click",
      function () {
        if (searchInput) {
          searchInput.value = "";
        }

        if (categorySelect) {
          categorySelect.value = "all";
        }

        const allButton =
          filterButtons.find(
            function (button) {
              return (
                button.dataset.filter ===
                "all"
              );
            }
          );

        if (allButton) {
          selectStatusFilter(
            allButton
          );
        } else {
          selectedStatus = "all";
          currentPage = 1;

          renderProducts();
        }

        if (searchInput) {
          searchInput.focus();
        }
      }
    );
  }


  /* ==========================================================
     PÁGINA DE PRODUTOS — INICIALIZAÇÃO
     ========================================================== */

  updateGeneralCounters();
  renderProducts();

})();

/* ================================================================
   PÁGINA DE VENDAS
   Visualização, filtros e confirmação de pagamento
   ================================================================ */

   (function () {
    "use strict";
  
    const salesTableBody =
      document.querySelector(
        "#sales-table-body"
      );
  
    /*
     * Se a tabela não existir, não estamos no vendas.html.
     */
    if (!salesTableBody) {
      return;
    }
  
    const saleRows = Array.from(
      document.querySelectorAll(".sale-row")
    );
  
    const viewButtons = Array.from(
      document.querySelectorAll(
        ".view-sale-button"
      )
    );
  
    const filterButtons = Array.from(
      document.querySelectorAll(
        ".sale-filter-button"
      )
    );
  
    const searchInput =
      document.querySelector(
        "#sales-search-input"
      );
  
    const emptySalesRow =
      document.querySelector(
        "#empty-sales-row"
      );
  
    const resultsCount =
      document.querySelector(
        "#sales-results-count"
      );
  
    const totalValueElement =
      document.querySelector(
        "#sales-total-value"
      );
  
    const paidValueElement =
      document.querySelector(
        "#sales-paid-value"
      );
  
    const pendingValueElement =
      document.querySelector(
        "#sales-pending-value"
      );
  
    const paidCountElement =
      document.querySelector(
        "#sales-paid-count"
      );
  
    const pendingCountElement =
      document.querySelector(
        "#sales-pending-count"
      );
  
    const newSaleButton =
      document.querySelector(
        "#new-sale-button"
      );
  
    const salesStorageKey =
      "mercearia-paid-sales";
  
    let selectedSaleFilter = "all";
  
  
    /* ================================================================
       PÁGINA DE VENDAS — FUNÇÕES AUXILIARES
       ================================================================ */
  
    function normalizeSaleText(text) {
      return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .trim();
    }
  
    function formatCurrency(value) {
      return new Intl.NumberFormat(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      ).format(value);
    }
  
    function formatPaymentDate() {
      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      )
        .format(new Date())
        .replace(".", "");
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — SALVAMENTO DOS PAGAMENTOS
       ================================================================ */
  
    function getSavedPaidSales() {
      try {
        const savedSales =
          localStorage.getItem(
            salesStorageKey
          );
  
        return savedSales
          ? JSON.parse(savedSales)
          : [];
      } catch (error) {
        return [];
      }
    }
  
    function savePaidSale(saleId) {
      const savedSales =
        getSavedPaidSales();
  
      if (!savedSales.includes(saleId)) {
        savedSales.push(saleId);
      }
  
      try {
        localStorage.setItem(
          salesStorageKey,
          JSON.stringify(savedSales)
        );
      } catch (error) {
        console.warn(
          "Não foi possível salvar o pagamento."
        );
      }
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — ATUALIZAÇÃO VISUAL DO PAGAMENTO
       ================================================================ */
  
    function markRowAsPaid(
      saleRow,
      savePayment
    ) {
      const saleId =
        saleRow.dataset.saleId;
  
      const customerName =
        saleRow.dataset.customer;
  
      saleRow.dataset.status = "paid";
  
      const paymentDate =
        saleRow.querySelector(
          ".sale-payment-date"
        );
  
      const statusElement =
        saleRow.querySelector(
          ".sale-status"
        );
  
      const paidButton =
        saleRow.querySelector(
          ".mark-paid-button"
        );
  
      if (paymentDate) {
        paymentDate.textContent =
          formatPaymentDate();
      }
  
      if (statusElement) {
        statusElement.classList.remove(
          "is-pending"
        );
  
        statusElement.classList.add(
          "is-paid"
        );
  
        statusElement.innerHTML =
          '<i aria-hidden="true"></i>Pago';
      }
  
      if (paidButton) {
        paidButton.remove();
      }
  
      if (savePayment) {
        savePaidSale(saleId);
  
        /*
         * Confirmação visual para leitor de tela.
         */
        const message =
          "Pagamento de " +
          customerName +
          " confirmado.";
  
        const liveMessage =
          document.createElement("span");
  
        liveMessage.className =
          "visually-hidden";
  
        liveMessage.setAttribute(
          "role",
          "status"
        );
  
        liveMessage.textContent =
          message;
  
        document.body.appendChild(
          liveMessage
        );
  
        window.setTimeout(
          function () {
            liveMessage.remove();
          },
          2000
        );
      }
    }
  
    function restoreSavedPayments() {
      const savedSales =
        getSavedPaidSales();
  
      saleRows.forEach(
        function (saleRow) {
          if (
            savedSales.includes(
              saleRow.dataset.saleId
            )
          ) {
            markRowAsPaid(
              saleRow,
              false
            );
          }
        }
      );
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — INDICADORES
       ================================================================ */
  
    function updateSalesSummary() {
      let totalValue = 0;
      let paidValue = 0;
      let pendingValue = 0;
  
      let paidCount = 0;
      let pendingCount = 0;
  
      saleRows.forEach(
        function (saleRow) {
          const value =
            Number(
              saleRow.dataset.value
            ) || 0;
  
          totalValue += value;
  
          if (
            saleRow.dataset.status ===
            "paid"
          ) {
            paidValue += value;
            paidCount += 1;
          } else {
            pendingValue += value;
            pendingCount += 1;
          }
        }
      );
  
      if (totalValueElement) {
        totalValueElement.textContent =
          formatCurrency(totalValue);
      }
  
      if (paidValueElement) {
        paidValueElement.textContent =
          formatCurrency(paidValue);
      }
  
      if (pendingValueElement) {
        pendingValueElement.textContent =
          formatCurrency(pendingValue);
      }
  
      if (paidCountElement) {
        paidCountElement.textContent =
          paidCount === 1
            ? "1 venda paga"
            : paidCount +
              " vendas pagas";
      }
  
      if (pendingCountElement) {
        pendingCountElement.textContent =
          pendingCount === 1
            ? "1 pagamento pendente"
            : pendingCount +
              " pagamentos pendentes";
      }
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — FILTROS E PESQUISA
       ================================================================ */
  
    function renderSales() {
      const searchTerm =
        normalizeSaleText(
          searchInput
            ? searchInput.value
            : ""
        );
  
      let visibleSales = 0;
  
      saleRows.forEach(
        function (saleRow) {
          const customerName =
            normalizeSaleText(
              saleRow.dataset.customer
            );
  
          const saleStatus =
            saleRow.dataset.status;
  
          const matchesSearch =
            searchTerm === "" ||
            customerName.includes(
              searchTerm
            );
  
          const matchesFilter =
            selectedSaleFilter === "all" ||
            selectedSaleFilter ===
              saleStatus;
  
          const shouldShow =
            matchesSearch &&
            matchesFilter;
  
          saleRow.hidden =
            !shouldShow;
  
          const saleId =
            saleRow.dataset.saleId;
  
          const detailsRow =
            document.querySelector(
              "#details-" + saleId
            );
  
          /*
           * Fecha os detalhes se a venda deixar
           * de aparecer no resultado do filtro.
           */
          if (!shouldShow && detailsRow) {
            detailsRow.hidden = true;
  
            const viewButton =
              saleRow.querySelector(
                ".view-sale-button"
              );
  
            if (viewButton) {
              viewButton.setAttribute(
                "aria-expanded",
                "false"
              );
            }
          }
  
          if (shouldShow) {
            visibleSales += 1;
          }
        }
      );
  
      if (emptySalesRow) {
        emptySalesRow.hidden =
          visibleSales > 0;
      }
  
      if (resultsCount) {
        if (visibleSales === 0) {
          resultsCount.textContent =
            "Nenhuma venda encontrada";
        } else if (visibleSales === 1) {
          resultsCount.textContent =
            "1 venda encontrada";
        } else {
          resultsCount.textContent =
            visibleSales +
            " vendas encontradas";
        }
      }
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — VISUALIZAR DETALHES
       ================================================================ */
  
    viewButtons.forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            const detailsId =
              button.getAttribute(
                "aria-controls"
              );
  
            const detailsRow =
              document.getElementById(
                detailsId
              );
  
            if (!detailsRow) {
              return;
            }
  
            const isOpen =
              button.getAttribute(
                "aria-expanded"
              ) === "true";
  
            /*
             * Fecha os outros detalhes antes
             * de abrir a venda selecionada.
             */
            viewButtons.forEach(
              function (otherButton) {
                if (
                  otherButton !== button
                ) {
                  const otherDetailsId =
                    otherButton.getAttribute(
                      "aria-controls"
                    );
  
                  const otherDetailsRow =
                    document.getElementById(
                      otherDetailsId
                    );
  
                  otherButton.setAttribute(
                    "aria-expanded",
                    "false"
                  );
  
                  if (otherDetailsRow) {
                    otherDetailsRow.hidden =
                      true;
                  }
                }
              }
            );
  
            button.setAttribute(
              "aria-expanded",
              String(!isOpen)
            );
  
            detailsRow.hidden =
              isOpen;
          }
        );
      }
    );
  
  
    /* ================================================================
       PÁGINA DE VENDAS — CONFIRMAR PAGAMENTO
       ================================================================ */
  
    salesTableBody.addEventListener(
      "click",
      function (event) {
        const paidButton =
          event.target.closest(
            ".mark-paid-button"
          );
  
        if (!paidButton) {
          return;
        }
  
        const saleRow =
          paidButton.closest(
            ".sale-row"
          );
  
        if (!saleRow) {
          return;
        }
  
        const customerName =
          saleRow.dataset.customer;
  
        const confirmed =
          window.confirm(
            "Confirmar que a venda de " +
            customerName +
            " foi paga?"
          );
  
        if (!confirmed) {
          return;
        }
  
        markRowAsPaid(
          saleRow,
          true
        );
  
        updateSalesSummary();
        renderSales();
      }
    );
  
  
    /* ================================================================
       PÁGINA DE VENDAS — EVENTOS DOS FILTROS
       ================================================================ */
  
    filterButtons.forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            selectedSaleFilter =
              button.dataset.saleFilter ||
              "all";
  
            filterButtons.forEach(
              function (otherButton) {
                const isSelected =
                  otherButton === button;
  
                otherButton.classList.toggle(
                  "is-selected",
                  isSelected
                );
  
                otherButton.setAttribute(
                  "aria-pressed",
                  String(isSelected)
                );
              }
            );
  
            renderSales();
          }
        );
      }
    );
  
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        renderSales
      );
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — BOTÃO NOVA VENDA
       A função completa será implementada depois
       ================================================================ */
  
    if (newSaleButton) {
      newSaleButton.addEventListener(
        "click",
        function () {
          window.alert(
            "O cadastro de uma nova venda será criado na próxima etapa."
          );
        }
      );
    }
  
  
    /* ================================================================
       PÁGINA DE VENDAS — INICIALIZAÇÃO
       ================================================================ */
  
    restoreSavedPayments();
    updateSalesSummary();
    renderSales();
  
  })();
