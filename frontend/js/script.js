/* ================================================================
   PÁGINA DE VENDAS — RESTAURAÇÃO DAS NOVAS VENDAS
   Executada antes dos filtros para incluir os registros salvos
   ================================================================ */

   (function () {
    "use strict";
  
    const tableBody = document.querySelector("#sales-table-body");
    if (!tableBody) return;
  
    function escapeHTML(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  
    function money(value) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(Number(value) || 0);
    }
  
    function dateBR(value) {
      if (!value) return "—";
      return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" })
        .format(new Date(value + "T00:00:00Z"));
    }
  
    function initials(name) {
      return String(name || "Cliente")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (part) { return part.charAt(0).toUpperCase(); })
        .join("");
    }
  
    function saleHTML(sale, index) {
      const id = escapeHTML(sale.id);
      const customer = escapeHTML(sale.customer);
      const pending = sale.status !== "paid";
      const productsLabel = sale.items.map(function (item) {
        return escapeHTML(item.name) + " × " + Number(item.quantity);
      }).join(", ");
      const quantity = sale.items.reduce(function (total, item) {
        return total + Number(item.quantity || 0);
      }, 0);
  
      return (
        '<tr class="sale-row" data-sale-id="' + id + '" data-customer="' + customer + '" data-status="' + (pending ? "pending" : "paid") + '" data-value="' + Number(sale.total || 0) + '">' +
          '<th scope="row"><div class="sale-customer"><span class="sale-customer-avatar avatar-blue" aria-hidden="true">' + escapeHTML(initials(sale.customer)) + '</span><div><strong>' + customer + '</strong><small>Venda #' + escapeHTML(String(sale.number || index + 6).padStart(3, "0")) + '</small></div></div></th>' +
          '<td data-label="Valor"><strong class="sale-value">' + money(sale.total) + '</strong></td>' +
          '<td data-label="Data da venda">' + dateBR(sale.saleDate) + '</td>' +
          '<td data-label="Pagamento" class="sale-payment-date">' + (pending ? dateBR(sale.dueDate) : dateBR(sale.saleDate)) + '</td>' +
          '<td data-label="Situação"><span class="sale-status ' + (pending ? "is-pending" : "is-paid") + '"><i aria-hidden="true"></i>' + (pending ? "Fiado" : "Pago") + '</span></td>' +
          '<td data-label="Ações"><div class="sale-actions"><button class="view-sale-button" type="button" aria-label="Ver detalhes da venda de ' + customer + '" aria-expanded="false" aria-controls="details-' + id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></svg><span>Ver</span></button>' +
          (pending ? '<button class="mark-paid-button" type="button" aria-label="Marcar a venda de ' + customer + ' como paga"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>' : '') +
          '</div></td></tr>' +
        '<tr class="sale-details-row" id="details-' + id + '" hidden><td colspan="6"><div class="sale-details"><div><span>Produtos</span><strong>' + productsLabel + '</strong></div><div><span>Quantidade</span><strong>' + quantity + ' unidades</strong></div><div><span>Forma de pagamento</span><strong>' + (pending ? "Fiado" : "Pago") + '</strong></div><div><span>Total</span><strong>' + money(sale.total) + '</strong></div></div></td></tr>'
      );
    }
  
    let savedSales = [];
    try {
      savedSales = JSON.parse(localStorage.getItem("mercearia-custom-sales-v1") || "[]");
    } catch (error) {
      savedSales = [];
    }
  
    const emptyRow = tableBody.querySelector("#empty-sales-row");
    savedSales.forEach(function (sale, index) {
      const holder = document.createElement("tbody");
      holder.innerHTML = saleHTML(sale, index);
      Array.from(holder.children).forEach(function (row) {
        tableBody.insertBefore(row, emptyRow);
      });
    });
  })();
  
  /* ================================================================
     PÁGINA DE VENDAS
     Visualização, pesquisa, filtros e confirmação de pagamento
     ================================================================ */
  
     (function () {
      "use strict";
    
      const salesTableBody = document.querySelector("#sales-table-body");
    
      if (!salesTableBody) {
        return;
      }
    
      const saleRows = Array.from(
        document.querySelectorAll(".sale-row")
      );
    
      const viewButtons = Array.from(
        document.querySelectorAll(".view-sale-button")
      );
    
      const filterButtons = Array.from(
        document.querySelectorAll(".sale-filter-button")
      );
  
      const summaryFilterCards = Array.from(
        document.querySelectorAll("[data-sale-summary-filter]")
      );
    
      const searchInput = document.querySelector(
        "#sales-search-input"
      );
    
      const emptyRow = document.querySelector(
        "#empty-sales-row"
      );
    
      const resultsCount = document.querySelector(
        "#sales-results-count"
      );
    
      const totalValue = document.querySelector(
        "#sales-total-value"
      );
    
      const paidValue = document.querySelector(
        "#sales-paid-value"
      );
    
      const pendingValue = document.querySelector(
        "#sales-pending-value"
      );
    
      const paidCount = document.querySelector(
        "#sales-paid-count"
      );
    
      const pendingCount = document.querySelector(
        "#sales-pending-count"
      );
    
      const newSaleButton = document.querySelector(
        "#new-sale-button"
      );
    
      const storageKey = "mercearia-paid-sales";
    
      let selectedFilter = "all";
  
      function selectSalesFilter(filter) {
        selectedFilter = filter || "all";
  
        filterButtons.forEach(
          function (button) {
            const selected =
              button.dataset.saleFilter === selectedFilter;
  
            button.classList.toggle(
              "is-selected",
              selected
            );
  
            button.setAttribute(
              "aria-pressed",
              String(selected)
            );
          }
        );
  
        summaryFilterCards.forEach(
          function (card) {
            const selected =
              card.dataset.saleSummaryFilter === selectedFilter;
  
            card.classList.toggle(
              "is-selected",
              selected
            );
  
            card.setAttribute(
              "aria-pressed",
              String(selected)
            );
          }
        );
  
        renderSales();
      }
    
      function normalize(text) {
        return String(text || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      }
    
      function currency(value) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(value);
      }
    
      function paymentDate() {
        return new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
          .format(new Date())
          .replace(".", "");
      }
    
      function getSavedPaidSales() {
        try {
          return JSON.parse(
            localStorage.getItem(storageKey) || "[]"
          );
        } catch (error) {
          return [];
        }
      }
    
      function savePaidSale(id) {
        const paidSales = getSavedPaidSales();
    
        if (!paidSales.includes(id)) {
          paidSales.push(id);
        }
    
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(paidSales)
          );
        } catch (error) {
          console.warn(
            "Não foi possível salvar o pagamento."
          );
        }
      }
    
      function markAsPaid(row, save) {
        row.dataset.status = "paid";
    
        const date = row.querySelector(
          ".sale-payment-date"
        );
    
        const status = row.querySelector(
          ".sale-status"
        );
    
        const button = row.querySelector(
          ".mark-paid-button"
        );
    
        if (date) {
          date.textContent = paymentDate();
        }
    
        if (status) {
          status.className = "sale-status is-paid";
    
          status.innerHTML =
            '<i aria-hidden="true"></i>Pago';
        }
    
        if (button) {
          button.remove();
        }
    
        if (save) {
          savePaidSale(row.dataset.saleId);
        }
      }
    
      function updateSummary() {
        let total = 0;
        let paid = 0;
        let pending = 0;
        let paidSales = 0;
        let pendingSales = 0;
    
        saleRows.forEach(function (row) {
          const value =
            Number(row.dataset.value) || 0;
    
          total += value;
    
          if (row.dataset.status === "paid") {
            paid += value;
            paidSales += 1;
          } else {
            pending += value;
            pendingSales += 1;
          }
        });
    
        if (totalValue) {
          totalValue.textContent = currency(total);
        }
    
        if (paidValue) {
          paidValue.textContent = currency(paid);
        }
    
        if (pendingValue) {
          pendingValue.textContent = currency(pending);
        }
    
        if (paidCount) {
          paidCount.textContent =
            paidSales === 1
              ? "1 venda paga"
              : paidSales + " vendas pagas";
        }
    
        if (pendingCount) {
          pendingCount.textContent =
            pendingSales === 1
              ? "1 pagamento pendente"
              : pendingSales +
                " pagamentos pendentes";
        }
      }
    
      function renderSales() {
        const term = normalize(
          searchInput ? searchInput.value : ""
        );
    
        let visible = 0;
    
        saleRows.forEach(function (row) {
          const matchesName =
            !term ||
            normalize(
              row.dataset.customer
            ).includes(term);
    
          const matchesStatus =
            selectedFilter === "all" ||
            row.dataset.status === selectedFilter;
    
          const show =
            matchesName && matchesStatus;
    
          row.hidden = !show;
    
          if (show) {
            visible += 1;
          }
    
          if (!show) {
            const details = document.querySelector(
              "#details-" + row.dataset.saleId
            );
    
            if (details) {
              details.hidden = true;
            }
    
            const viewButton = row.querySelector(
              ".view-sale-button"
            );
    
            if (viewButton) {
              viewButton.setAttribute(
                "aria-expanded",
                "false"
              );
            }
          }
        });
    
        if (emptyRow) {
          emptyRow.hidden = visible > 0;
        }
    
        if (resultsCount) {
          if (visible === 0) {
            resultsCount.textContent =
              "Nenhuma venda encontrada";
          } else if (visible === 1) {
            resultsCount.textContent =
              "1 venda encontrada";
          } else {
            resultsCount.textContent =
              visible + " vendas encontradas";
          }
        }
      }

      /* Abre uma cobrança específica quando a página recebe
         parâmetros como: vendas.html?filtro=pending&venda=venda-006 */
      function openRequestedSale() {
        const parameters = new URLSearchParams(
          window.location.search
        );

        const requestedSaleId = parameters.get("venda");
        let requestedFilter = parameters.get("filtro");

        if (!requestedSaleId) {
          return;
        }

        const requestedRow = saleRows.find(
          function (row) {
            return row.dataset.saleId === requestedSaleId;
          }
        );

        if (!requestedRow) {
          return;
        }

        if (searchInput) {
          searchInput.value = "";
        }

        if (
          requestedFilter !== "all" &&
          requestedFilter !== "paid" &&
          requestedFilter !== "pending"
        ) {
          requestedFilter = requestedRow.dataset.status;
        }

        /* Se a cobrança já tiver sido paga, abre em Pagas
           mesmo que o link antigo ainda informe Pendentes. */
        if (
          requestedFilter !== "all" &&
          requestedFilter !== requestedRow.dataset.status
        ) {
          requestedFilter = requestedRow.dataset.status;
        }

        selectSalesFilter(
          requestedFilter || requestedRow.dataset.status
        );

        const details = document.querySelector(
          "#details-" + requestedSaleId
        );

        const viewButton = requestedRow.querySelector(
          ".view-sale-button"
        );

        viewButtons.forEach(function (button) {
          const detailsId = button.getAttribute("aria-controls");
          const otherDetails = document.getElementById(detailsId);

          button.setAttribute("aria-expanded", "false");

          if (otherDetails) {
            otherDetails.hidden = true;
          }
        });

        if (details) {
          details.hidden = false;
        }

        if (viewButton) {
          viewButton.setAttribute("aria-expanded", "true");
        }

        requestedRow.classList.add("is-targeted-sale");

        window.requestAnimationFrame(function () {
          requestedRow.scrollIntoView({
            behavior: window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches ? "auto" : "smooth",
            block: "center"
          });

          if (viewButton) {
            viewButton.focus({ preventScroll: true });
          }
        });

        window.setTimeout(function () {
          requestedRow.classList.remove("is-targeted-sale");
        }, 3200);
      }
    
      viewButtons.forEach(function (button) {
        button.addEventListener(
          "click",
          function () {
            const detailsId =
              button.getAttribute(
                "aria-controls"
              );
    
            const details =
              document.getElementById(
                detailsId
              );
    
            if (!details) {
              return;
            }
    
            const isOpen =
              button.getAttribute(
                "aria-expanded"
              ) === "true";
    
            viewButtons.forEach(
              function (otherButton) {
                const otherDetailsId =
                  otherButton.getAttribute(
                    "aria-controls"
                  );
    
                const otherDetails =
                  document.getElementById(
                    otherDetailsId
                  );
    
                otherButton.setAttribute(
                  "aria-expanded",
                  "false"
                );
    
                if (otherDetails) {
                  otherDetails.hidden = true;
                }
              }
            );
    
            button.setAttribute(
              "aria-expanded",
              String(!isOpen)
            );
    
            details.hidden = isOpen;
          }
        );
      });
    
      salesTableBody.addEventListener(
        "click",
        function (event) {
          const button = event.target.closest(
            ".mark-paid-button"
          );
    
          if (!button) {
            return;
          }
    
          const row = button.closest(
            ".sale-row"
          );
    
          if (!row) {
            return;
          }
    
          const confirmed = window.confirm(
            "Confirmar que a venda de " +
              row.dataset.customer +
              " foi paga?"
          );
    
          if (!confirmed) {
            return;
          }
    
          markAsPaid(row, true);
          updateSummary();
          renderSales();
        }
      );
    
      filterButtons.forEach(
        function (button) {
          button.addEventListener(
            "click",
            function () {
              selectSalesFilter(
                button.dataset.saleFilter || "all"
              );
            }
          );
        }
      );
  
      summaryFilterCards.forEach(
        function (card) {
          card.addEventListener(
            "click",
            function () {
              selectSalesFilter(
                card.dataset.saleSummaryFilter || "all"
              );
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
    
      /* O botão Nova venda é controlado pelo modal logo abaixo. */
    
      const savedSales =
        getSavedPaidSales();
    
      saleRows.forEach(function (row) {
        if (
          savedSales.includes(
            row.dataset.saleId
          )
        ) {
          markAsPaid(row, false);
        }
      });
    
      updateSummary();
      renderSales();
      openRequestedSale();
    })();
  
  
    /* ================================================================
       PÁGINA DE VENDAS — MODAL NOVA VENDA
       Cliente, produtos, cálculo, pagamento e baixa no estoque
       ================================================================ */
  
    (function () {
      "use strict";
  
      const openButton = document.querySelector("#new-sale-button");
      const modal = document.querySelector("#new-sale-modal");
      const form = document.querySelector("#new-sale-form");
      if (!openButton || !modal || !form) return;
  
      const customer = document.querySelector("#sale-customer");
      const saleDate = document.querySelector("#sale-date");
      const dueDate = document.querySelector("#sale-due-date");
      const dueDateField = document.querySelector("#sale-due-date-field");
      const productSelect = document.querySelector("#sale-product-select");
      const quantityInput = document.querySelector("#sale-product-quantity");
      const addProductButton = document.querySelector("#add-sale-product");
      const cartItems = document.querySelector("#sale-cart-items");
      const cartEmpty = document.querySelector("#sale-cart-empty");
      const totalElement = document.querySelector("#new-sale-total");
      const saveButton = document.querySelector("#save-new-sale");
      const productsError = document.querySelector("#sale-products-error");
      const customerError = document.querySelector("#sale-customer-error");
      const saleDateError = document.querySelector("#sale-date-error");
      const dueDateError = document.querySelector("#sale-due-date-error");
      const closeButtons = modal.querySelectorAll("[data-close-sale-modal]");
      const productsStorageKey = "mercearia-products-v1";
      const clientsStorageKey = "mercearia-clients-v1";
      const salesStorageKey = "mercearia-custom-sales-v1";
      let cart = [];
      let lastFocusedElement = null;
  
      function escapeHTML(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }
  
      function money(value) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(Number(value) || 0);
      }
  
      function getProducts() {
        try {
          const products = JSON.parse(localStorage.getItem(productsStorageKey) || "[]");
          if (Array.isArray(products) && products.length) return products;
  
          const initialProducts = [
            { id: "1", name: "Arroz Camil 5 kg", code: "7896006711114", category: "alimentos", unit: "un", stock: 18, minimumStock: 5, price: 29.90, cost: 23.50, expiration: "", description: "", active: true, photo: "" },
            { id: "2", name: "Leite Integral 1 L", code: "7891000100100", category: "bebidas", unit: "un", stock: 4, minimumStock: 5, price: 5.49, cost: 4.20, expiration: "", description: "", active: true, photo: "" },
            { id: "3", name: "Café Pilão 500 g", code: "7896089011118", category: "alimentos", unit: "un", stock: 0, minimumStock: 4, price: 18.90, cost: 14.80, expiration: "", description: "", active: true, photo: "" },
            { id: "4", name: "Açúcar União 1 kg", code: "7891910000194", category: "alimentos", unit: "un", stock: 22, minimumStock: 5, price: 4.99, cost: 3.70, expiration: "", description: "", active: true, photo: "" },
            { id: "5", name: "Detergente Ypê 500 ml", code: "7896098900205", category: "limpeza", unit: "un", stock: 14, minimumStock: 5, price: 2.89, cost: 1.90, expiration: "", description: "", active: true, photo: "" },
            { id: "6", name: "Feijão Carioca 1 kg", code: "7896006744112", category: "alimentos", unit: "un", stock: 3, minimumStock: 5, price: 8.49, cost: 6.30, expiration: "", description: "", active: true, photo: "" },
            { id: "7", name: "Refrigerante Coca-Cola 2 L", code: "7894900011517", category: "bebidas", unit: "un", stock: 12, minimumStock: 5, price: 10.99, cost: 8.20, expiration: "", description: "", active: true, photo: "" },
            { id: "8", name: "Sabonete Dove 90 g", code: "7891037000015", category: "higiene", unit: "un", stock: 0, minimumStock: 5, price: 4.89, cost: 3.40, expiration: "", description: "", active: true, photo: "" },
            { id: "9", name: "Pão francês", code: "2000000000012", category: "padaria", unit: "un", stock: 5, minimumStock: 5, price: 1.00, cost: 0.55, expiration: "", description: "", active: true, photo: "" },
            { id: "10", name: "Óleo de soja Liza 900 ml", code: "7896036090241", category: "alimentos", unit: "un", stock: 16, minimumStock: 5, price: 7.69, cost: 5.80, expiration: "", description: "", active: true, photo: "" }
          ];
  
          localStorage.setItem(productsStorageKey, JSON.stringify(initialProducts));
          return initialProducts;
        } catch (error) {
          return [];
        }
      }
  
      function getSales() {
        try {
          const sales = JSON.parse(localStorage.getItem(salesStorageKey) || "[]");
          return Array.isArray(sales) ? sales : [];
        } catch (error) {
          return [];
        }
      }
  
      function getClientsForSale() {
        const initialClients = [
          { id: "cliente-1", name: "Carlos Oliveira", cpf: "52998224725", phone: "44999910001", address: "Rua das Flores, 120 — Zona 01", active: true },
          { id: "cliente-2", name: "Maria Santos", cpf: "11144477735", phone: "44999910002", address: "Avenida Brasil, 845 — Centro", active: true },
          { id: "cliente-3", name: "João Silva", cpf: "12345678909", phone: "44999910003", address: "Rua Pioneiro José, 76 — Jardim Alvorada", active: true },
          { id: "cliente-4", name: "Ana Costa", cpf: "39053344705", phone: "44999910004", address: "Rua das Acácias, 310 — Zona 07", active: true },
          { id: "cliente-5", name: "Pedro Souza", cpf: "86288366757", phone: "44999910005", address: "Avenida Mandacaru, 1520 — Vila Operária", active: true }
        ];
  
        try {
          const savedClients = JSON.parse(
            localStorage.getItem(clientsStorageKey) || "[]"
          );
  
          if (Array.isArray(savedClients) && savedClients.length) {
            return savedClients;
          }
  
          localStorage.setItem(clientsStorageKey, JSON.stringify(initialClients));
          return initialClients;
        } catch (error) {
          return initialClients;
        }
      }
  
      function populateCustomers() {
        const activeClients = getClientsForSale()
          .filter(function (client) {
            return client.active !== false;
          })
          .sort(function (firstClient, secondClient) {
            return String(firstClient.name).localeCompare(
              String(secondClient.name),
              "pt-BR"
            );
          });
  
        customer.innerHTML =
          '<option value="">Selecione um cliente</option>' +
          activeClients.map(function (client) {
            return '<option value="' + escapeHTML(client.name) + '">' +
              escapeHTML(client.name) +
              "</option>";
          }).join("");
      }
  
      function todayISO() {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
      }
  
      function total() {
        return cart.reduce(function (sum, item) {
          return sum + Number(item.price) * Number(item.quantity);
        }, 0);
      }
  
      function populateProducts() {
        const products = getProducts().filter(function (product) {
          return product.active !== false && Number(product.stock) > 0;
        });
        productSelect.innerHTML = '<option value="">Selecione um produto</option>' + products.map(function (product) {
          return '<option value="' + escapeHTML(product.id) + '">' + escapeHTML(product.name) + ' — ' + money(product.price) + ' (' + Number(product.stock) + ' em estoque)</option>';
        }).join("");
      }
  
      function renderCart() {
        cartEmpty.hidden = cart.length > 0;
        cartItems.innerHTML = cart.map(function (item) {
          return '<div class="sale-cart-item"><div class="sale-cart-product"><strong>' + escapeHTML(item.name) + '</strong><small>' + money(item.price) + ' cada</small></div><span>' + Number(item.quantity) + ' un.</span><strong>' + money(Number(item.price) * Number(item.quantity)) + '</strong><button class="remove-sale-product" type="button" data-remove-sale-product="' + escapeHTML(item.id) + '" aria-label="Remover ' + escapeHTML(item.name) + '">×</button></div>';
        }).join("");
        totalElement.textContent = money(total());
        if (cart.length) productsError.textContent = "";
      }
  
      function updatePaymentFields() {
        const status = form.querySelector('input[name="sale-payment-status"]:checked').value;
        const pending = status === "pending";
        dueDateField.hidden = !pending;
        dueDate.required = pending;
        if (!pending) {
          dueDate.value = "";
          dueDateError.textContent = "";
        }
      }
  
      function resetForm() {
        form.reset();
        cart = [];
        saleDate.value = todayISO();
        quantityInput.value = "1";
        customerError.textContent = "";
        saleDateError.textContent = "";
        dueDateError.textContent = "";
        productsError.textContent = "";
        saveButton.disabled = false;
        saveButton.textContent = "Salvar venda";
        populateCustomers();
        populateProducts();
        updatePaymentFields();
        renderCart();
      }
  
      function openModal() {
        lastFocusedElement = document.activeElement;
        resetForm();
        modal.hidden = false;
        document.body.classList.add("has-open-modal");
        window.setTimeout(function () { customer.focus(); }, 30);
      }
  
      function closeModal() {
        modal.hidden = true;
        document.body.classList.remove("has-open-modal");
        resetForm();
        if (lastFocusedElement) lastFocusedElement.focus();
      }
  
      function addProduct() {
        const product = getProducts().find(function (item) {
          return String(item.id) === String(productSelect.value);
        });
        const quantity = Number(quantityInput.value);
  
        if (!product) {
          productsError.textContent = "Selecione um produto.";
          productSelect.focus();
          return;
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          productsError.textContent = "Informe uma quantidade inteira maior que zero.";
          quantityInput.focus();
          return;
        }
  
        const existing = cart.find(function (item) { return String(item.id) === String(product.id); });
        const finalQuantity = quantity + (existing ? Number(existing.quantity) : 0);
        if (finalQuantity > Number(product.stock)) {
          productsError.textContent = "Quantidade indisponível. Existem " + Number(product.stock) + " unidades em estoque.";
          quantityInput.focus();
          return;
        }
  
        if (existing) existing.quantity = finalQuantity;
        else cart.push({ id: String(product.id), name: product.name, price: Number(product.price), quantity: quantity });
        productSelect.value = "";
        quantityInput.value = "1";
        renderCart();
      }
  
      function validate() {
        let valid = true;
        const status = form.querySelector('input[name="sale-payment-status"]:checked').value;
        const allowedCustomers = Array.from(document.querySelectorAll("#sale-customer option")).map(function (option) {
          return option.value;
        }).filter(Boolean);
        const validCustomer = allowedCustomers.includes(customer.value.trim());
        customerError.textContent = validCustomer ? "" : "Selecione um cliente existente na lista.";
        saleDateError.textContent = saleDate.value ? "" : "Informe a data da venda.";
        dueDateError.textContent = status === "pending" && !dueDate.value ? "Informe o vencimento da venda fiada." : "";
        productsError.textContent = cart.length ? "" : "Adicione pelo menos um produto.";
        if (!validCustomer || !saleDate.value || !cart.length || (status === "pending" && !dueDate.value)) valid = false;
        if (status === "pending" && dueDate.value && saleDate.value && dueDate.value < saleDate.value) {
          dueDateError.textContent = "O vencimento não pode ser anterior à venda.";
          valid = false;
        }
        return valid;
      }
  
      function saveSale() {
        const products = getProducts();
        const savedSales = getSales();
  
        for (const cartItem of cart) {
          const product = products.find(function (item) { return String(item.id) === String(cartItem.id); });
          if (!product || Number(product.stock) < Number(cartItem.quantity)) {
            productsError.textContent = "O estoque de “" + cartItem.name + "” foi alterado. Revise a quantidade.";
            return false;
          }
        }
  
        cart.forEach(function (cartItem) {
          const product = products.find(function (item) { return String(item.id) === String(cartItem.id); });
          product.stock = Number(product.stock) - Number(cartItem.quantity);
        });
  
        const status = form.querySelector('input[name="sale-payment-status"]:checked').value;
        const sale = {
          id: "venda-" + Date.now(),
          number: savedSales.length + 6,
          customer: customer.value,
          saleDate: saleDate.value,
          dueDate: status === "pending" ? dueDate.value : "",
          status: status,
          total: total(),
          items: cart.map(function (item) { return Object.assign({}, item); })
        };
  
        const previousProducts = localStorage.getItem(productsStorageKey);
        const previousSales = localStorage.getItem(salesStorageKey);
        try {
          localStorage.setItem(salesStorageKey, JSON.stringify(savedSales.concat(sale)));
          localStorage.setItem(productsStorageKey, JSON.stringify(products));
          return true;
        } catch (error) {
          if (previousProducts === null) localStorage.removeItem(productsStorageKey); else localStorage.setItem(productsStorageKey, previousProducts);
          if (previousSales === null) localStorage.removeItem(salesStorageKey); else localStorage.setItem(salesStorageKey, previousSales);
          window.alert("Não foi possível salvar a venda neste navegador.");
          return false;
        }
      }
  
      openButton.addEventListener("click", openModal);
      closeButtons.forEach(function (button) { button.addEventListener("click", closeModal); });
      addProductButton.addEventListener("click", addProduct);
      form.querySelectorAll('input[name="sale-payment-status"]').forEach(function (input) {
        input.addEventListener("change", updatePaymentFields);
      });
  
      cartItems.addEventListener("click", function (event) {
        const button = event.target.closest("[data-remove-sale-product]");
        if (!button) return;
        cart = cart.filter(function (item) { return String(item.id) !== String(button.dataset.removeSaleProduct); });
        renderCart();
      });
  
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validate()) return;
        saveButton.disabled = true;
        saveButton.textContent = "Salvando…";
        if (saveSale()) window.location.reload();
        else {
          saveButton.disabled = false;
          saveButton.textContent = "Salvar venda";
        }
      });
  
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeModal();
      });
    })();
    
    
    /* ================================================================
       PRODUTOS — CADASTRO, EDIÇÃO, EXCLUSÃO E AJUSTE DE ESTOQUE
       Armazenamento temporário no navegador até a conexão com o backend
       ================================================================ */
    
    (function () {
      "use strict";
    
      const productsStorageKey = "mercearia-products-v1";
    
      const defaultProducts = [
        { id: "1", name: "Arroz Camil 5 kg", code: "7896006711114", category: "alimentos", unit: "un", stock: 18, minimumStock: 5, price: 29.90, cost: 23.50, expiration: "", description: "", active: true },
        { id: "2", name: "Leite Integral 1 L", code: "7891000100100", category: "bebidas", unit: "un", stock: 4, minimumStock: 5, price: 5.49, cost: 4.20, expiration: "", description: "", active: true },
        { id: "3", name: "Café Pilão 500 g", code: "7896089011118", category: "alimentos", unit: "un", stock: 0, minimumStock: 4, price: 18.90, cost: 14.80, expiration: "", description: "", active: true },
        { id: "4", name: "Açúcar União 1 kg", code: "7891910000194", category: "alimentos", unit: "un", stock: 22, minimumStock: 5, price: 4.99, cost: 3.70, expiration: "", description: "", active: true },
        { id: "5", name: "Detergente Ypê 500 ml", code: "7896098900205", category: "limpeza", unit: "un", stock: 14, minimumStock: 5, price: 2.89, cost: 1.90, expiration: "", description: "", active: true },
        { id: "6", name: "Feijão Carioca 1 kg", code: "7896006744112", category: "alimentos", unit: "un", stock: 3, minimumStock: 5, price: 8.49, cost: 6.30, expiration: "", description: "", active: true },
        { id: "7", name: "Refrigerante Coca-Cola 2 L", code: "7894900011517", category: "bebidas", unit: "un", stock: 12, minimumStock: 5, price: 10.99, cost: 8.20, expiration: "", description: "", active: true },
        { id: "8", name: "Sabonete Dove 90 g", code: "7891037000015", category: "higiene", unit: "un", stock: 0, minimumStock: 5, price: 4.89, cost: 3.40, expiration: "", description: "", active: true },
        { id: "9", name: "Pão francês", code: "2000000000012", category: "padaria", unit: "un", stock: 5, minimumStock: 5, price: 1.00, cost: 0.55, expiration: "", description: "", active: true },
        { id: "10", name: "Óleo de soja Liza 900 ml", code: "7896036090241", category: "alimentos", unit: "un", stock: 16, minimumStock: 5, price: 7.69, cost: 5.80, expiration: "", description: "", active: true }
      ];
    
      const categoryNames = {
        alimentos: "Alimentos",
        bebidas: "Bebidas",
        limpeza: "Limpeza",
        higiene: "Higiene",
        padaria: "Padaria"
      };
    
      const unitNames = {
        un: "un.",
        kg: "kg",
        g: "g",
        l: "L",
        ml: "ml",
        pct: "pct.",
        cx: "cx."
      };
    
      function cloneDefaultProducts() {
        return defaultProducts.map(function (product) {
          return Object.assign({}, product);
        });
      }
    
      function getProducts() {
        try {
          const savedProducts = localStorage.getItem(productsStorageKey);
    
          if (!savedProducts) {
            const initialProducts = cloneDefaultProducts();
            localStorage.setItem(productsStorageKey, JSON.stringify(initialProducts));
            return initialProducts;
          }
    
          const parsedProducts = JSON.parse(savedProducts);
          return Array.isArray(parsedProducts) ? parsedProducts : cloneDefaultProducts();
        } catch (error) {
          console.warn("Não foi possível carregar os produtos.");
          return cloneDefaultProducts();
        }
      }
    
      function saveProducts(products) {
        try {
          localStorage.setItem(productsStorageKey, JSON.stringify(products));
          return true;
        } catch (error) {
          console.warn("Não foi possível salvar os produtos.");
          return false;
        }
      }
    
      function escapeHTML(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }
    
      function formatCurrency(value) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(Number(value) || 0);
      }
    
      function parseCurrency(value) {
        const normalizedValue = String(value || "")
          .replace(/\s/g, "")
          .replace(/R\$/gi, "")
          .replace(/\./g, "")
          .replace(",", ".");
    
        const parsedValue = Number(normalizedValue);
        return Number.isFinite(parsedValue) ? parsedValue : 0;
      }
    
      function getProductStatus(product) {
        const stock = Number(product.stock) || 0;
        const minimumStock = Number(product.minimumStock) || 0;
    
        if (stock <= 0) return "empty";
        if (stock <= minimumStock) return "low";
        return "available";
      }
    
      function getStatusData(status) {
        if (status === "empty") {
          return { label: "Sem estoque", className: "status-empty", stockClass: "stock-empty" };
        }
    
        if (status === "low") {
          return { label: "Estoque baixo", className: "status-low", stockClass: "stock-low" };
        }
    
        return { label: "Em estoque", className: "status-available", stockClass: "" };
      }
    
      function getThumbnailClass(category) {
        const classes = {
          alimentos: "product-rice",
          bebidas: "product-milk",
          limpeza: "product-cleaning",
          higiene: "product-sugar",
          padaria: "product-rice"
        };
    
        return classes[category] || "product-sugar";
      }
    
      function createProductRow(product) {
        const status = getProductStatus(product);
        const statusData = getStatusData(status);
        const productId = escapeHTML(product.id);
        const productName = escapeHTML(product.name);
        const category = escapeHTML(product.category);
        const unit = unitNames[product.unit] || "un.";
        const firstLetter = escapeHTML(String(product.name || "P").charAt(0).toUpperCase());
        const productPhoto = String(product.photo || "");
        const thumbnail = productPhoto
          ? '<span class="product-thumbnail has-image"><img src="' + escapeHTML(productPhoto) + '" alt="" loading="lazy"></span>'
          : '<span class="product-thumbnail ' + getThumbnailClass(product.category) + '">' + firstLetter + '</span>';
    
        return (
          '<tr class="product-row"' +
          ' data-product-id="' + productId + '"' +
          ' data-name="' + productName + '"' +
          ' data-code="' + escapeHTML(product.code) + '"' +
          ' data-category="' + category + '"' +
          ' data-status="' + status + '"' +
          ' data-stock="' + Number(product.stock || 0) + '"' +
          ' data-minimum-stock="' + Number(product.minimumStock || 0) + '"' +
          ' data-price="' + Number(product.price || 0) + '">' +
            '<th scope="row"><div class="product-cell">' +
              thumbnail +
              '<div><strong>' + productName + '</strong><small>Cód. ' + escapeHTML(product.code) + '</small></div>' +
            '</div></th>' +
            '<td data-label="Categoria">' + escapeHTML(categoryNames[product.category] || product.category) + '</td>' +
            '<td data-label="Estoque"><strong class="stock-number ' + statusData.stockClass + '">' + Number(product.stock || 0) + ' ' + escapeHTML(unit) + '</strong></td>' +
            '<td data-label="Preço"><strong class="product-price">' + formatCurrency(product.price) + '</strong></td>' +
            '<td data-label="Situação"><span class="product-status ' + statusData.className + '"><i aria-hidden="true"></i>' + statusData.label + '</span></td>' +
            '<td><div class="product-actions">' +
              '<button class="product-menu-button" type="button" aria-label="Abrir ações de ' + productName + '" data-open-label="Abrir ações de ' + productName + '" aria-controls="product-menu-' + productId + '" aria-expanded="false">' +
                '<i class="ri-add-line" aria-hidden="true"></i>' +
              '</button>' +
              '<div class="product-actions-menu" id="product-menu-' + productId + '" aria-label="Ações de ' + productName + '" hidden>' +
                '<button class="product-action-view" type="button" data-product-action="view" data-product-id="' + productId + '" aria-label="Visualizar ' + productName + '" title="Visualizar"><i class="ri-eye-line" aria-hidden="true"></i></button>' +
                '<a class="product-action-edit" href="./cadastro-produto.html?id=' + encodeURIComponent(product.id) + '" aria-label="Editar ' + productName + '" title="Editar"><i class="ri-pencil-line" aria-hidden="true"></i></a>' +
                '<button class="product-action-stock" type="button" data-product-action="stock" data-product-id="' + productId + '" aria-label="Ajustar estoque de ' + productName + '" title="Ajustar estoque"><i class="ri-inbox-2-line" aria-hidden="true"></i></button>' +
                '<button class="product-action-delete" type="button" data-product-action="delete" data-product-id="' + productId + '" aria-label="Excluir ' + productName + '" title="Excluir"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>' +
              '</div>' +
            '</div></td>' +
          '</tr>'
        );
      }
    
      function createEmptyRow() {
        return (
          '<tr id="empty-products-row" class="empty-products-row" hidden>' +
            '<td colspan="6"><div class="empty-products">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8.5 11h5"/></svg>' +
              '<strong>Nenhum produto encontrado</strong>' +
              '<span>Tente alterar a pesquisa ou os filtros.</span>' +
              '<button id="clear-products-filters" type="button">Limpar filtros</button>' +
            '</div></td>' +
          '</tr>'
        );
      }
    
      function renderStoredProducts() {
        const tableBody = document.querySelector("#products-table-body");
        if (!tableBody) return;
    
        const products = getProducts().filter(function (product) {
          return product.active !== false;
        });
    
        tableBody.innerHTML = products.map(createProductRow).join("") + createEmptyRow();
    
        const inventoryValue = products.reduce(function (total, product) {
          return total + (Number(product.price) || 0) * (Number(product.stock) || 0);
        }, 0);
    
        const inventoryElement = document.querySelector("#metric-inventory-value");
        if (inventoryElement) inventoryElement.textContent = formatCurrency(inventoryValue);
      }
    
      function closeProductMenu(menu, menuButton) {
        if (!menu || !menuButton) return;

        window.clearTimeout(menu.closeTimer);
        menu.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute(
          "aria-label",
          menuButton.dataset.openLabel || "Abrir ações do produto"
        );

        menu.closeTimer = window.setTimeout(function () {
          if (!menu.classList.contains("is-open")) menu.hidden = true;
        }, 170);
      }

      function closeProductMenus(exceptionButton) {
        document.querySelectorAll(".product-actions-menu").forEach(function (menu) {
          const menuButton = menu.previousElementSibling;
          if (menuButton !== exceptionButton) closeProductMenu(menu, menuButton);
        });
      }

      function openProductMenu(menu, menuButton) {
        window.clearTimeout(menu.closeTimer);
        menu.hidden = false;
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Fechar ações do produto");

        window.requestAnimationFrame(function () {
          menu.classList.add("is-open");
        });
      }
    
      function showProductDetails(product) {
        const category = categoryNames[product.category] || product.category;
        const unit = unitNames[product.unit] || product.unit;
        const expiration = product.expiration
          ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(product.expiration + "T00:00:00Z"))
          : "Não informada";
    
        window.alert(
          "Produto: " + product.name + "\n" +
          "Código: " + product.code + "\n" +
          "Categoria: " + category + "\n" +
          "Preço: " + formatCurrency(product.price) + "\n" +
          "Estoque: " + product.stock + " " + unit + "\n" +
          "Estoque mínimo: " + product.minimumStock + "\n" +
          "Validade: " + expiration
        );
      }
    
      function initializeProductsPage() {
        const tableBody = document.querySelector("#products-table-body");
        if (!tableBody) return;
    
        renderStoredProducts();
    
        document.addEventListener("click", function (event) {
          const menuButton = event.target.closest(".product-menu-button");
    
          if (menuButton) {
            const menu = document.getElementById(menuButton.getAttribute("aria-controls"));
            if (!menu) return;

            const isOpen = menuButton.getAttribute("aria-expanded") === "true";
            closeProductMenus(menuButton);

            if (isOpen) {
              closeProductMenu(menu, menuButton);
            } else {
              openProductMenu(menu, menuButton);
            }

            return;
          }
    
          if (!event.target.closest(".product-actions")) closeProductMenus();
    
          const actionButton = event.target.closest("[data-product-action]");
          if (!actionButton) return;

          closeProductMenus();
    
          const productId = actionButton.dataset.productId;
          const products = getProducts();
          const productIndex = products.findIndex(function (product) {
            return String(product.id) === String(productId);
          });
    
          if (productIndex < 0) return;
          const product = products[productIndex];
    
          if (actionButton.dataset.productAction === "view") {
            showProductDetails(product);
          }
    
          if (actionButton.dataset.productAction === "stock") {
            const newStock = window.prompt(
              "Informe a nova quantidade em estoque para " + product.name + ":",
              String(product.stock)
            );
    
            if (newStock === null) return;
    
            const parsedStock = Number(newStock);
            if (!Number.isInteger(parsedStock) || parsedStock < 0) {
              window.alert("Informe uma quantidade inteira igual ou maior que zero.");
              return;
            }
    
            products[productIndex].stock = parsedStock;
            saveProducts(products);
            window.location.reload();
          }
    
          if (actionButton.dataset.productAction === "delete") {
            const confirmed = window.confirm(
              "Deseja realmente excluir o produto “" + product.name + "”?"
            );
    
            if (!confirmed) return;
            products.splice(productIndex, 1);
            saveProducts(products);
            window.location.reload();
          }
        });
    
        document.querySelectorAll("[data-product-status-shortcut]").forEach(function (shortcut) {
          shortcut.addEventListener("click", function () {
            const filter = shortcut.dataset.productStatusShortcut || "all";
            const filterButton = document.querySelector('.filter-button[data-filter="' + filter + '"]');
            if (filterButton) filterButton.click();
          });
        });
    
        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape") closeProductMenus();
        });
      }
    
      function setFieldError(field, message) {
        const wrapper = document.querySelector("#" + field.id + "-wrapper");
        const errorElement = document.querySelector("#" + field.id + "-error");
    
        if (wrapper) {
          wrapper.classList.toggle("has-error", Boolean(message));
          wrapper.classList.toggle("is-valid", !message && Boolean(field.value));
        }
    
        field.setAttribute("aria-invalid", String(Boolean(message)));
        if (errorElement) errorElement.textContent = message || "";
      }
    
      function initializeProductForm() {
        const form = document.querySelector("#product-form");
        if (!form) return;
    
        const fields = {
          id: document.querySelector("#product-id"),
          name: document.querySelector("#product-name"),
          code: document.querySelector("#product-code"),
          category: document.querySelector("#product-category"),
          unit: document.querySelector("#product-unit"),
          expiration: document.querySelector("#product-expiration"),
          description: document.querySelector("#product-description"),
          price: document.querySelector("#product-price"),
          cost: document.querySelector("#product-cost"),
          stock: document.querySelector("#product-stock"),
          minimumStock: document.querySelector("#product-minimum-stock"),
          active: document.querySelector("#product-active")
        };
    
        const title = document.querySelector("#product-form-title");
        const pageTitle = document.querySelector("title");
        const message = document.querySelector("#product-form-message");
        const cancelButton = document.querySelector("#cancel-product-button");
        const photoInput = document.querySelector("#product-photo-input");
        const removePhotoButton = document.querySelector("#remove-product-photo");
        const photoImage = document.querySelector("#product-photo-image");
        const photoPlaceholder = document.querySelector("#product-photo-placeholder");
        const photoError = document.querySelector("#product-photo-error");
        const summaryPhotoImage = document.querySelector("#summary-product-photo-image");
        const summaryPhotoPlaceholder = document.querySelector("#summary-product-photo-placeholder");
        const queryId = new URLSearchParams(window.location.search).get("id");
        let initialFormState = "";
        let selectedPhoto = "";
    
        function updatePhotoPreview() {
          const productName = fields.name.value.trim() || "Produto";
          const initial = productName.charAt(0).toUpperCase() || "P";
    
          if (photoImage) {
            photoImage.src = selectedPhoto || "";
            photoImage.alt = selectedPhoto ? "Foto de " + productName : "";
            photoImage.hidden = !selectedPhoto;
          }
    
          if (photoPlaceholder) {
            photoPlaceholder.textContent = initial;
            photoPlaceholder.hidden = Boolean(selectedPhoto);
          }
    
          if (summaryPhotoImage) {
            summaryPhotoImage.src = selectedPhoto || "";
            summaryPhotoImage.alt = selectedPhoto ? "Miniatura de " + productName : "";
            summaryPhotoImage.hidden = !selectedPhoto;
          }
    
          if (summaryPhotoPlaceholder) {
            summaryPhotoPlaceholder.textContent = initial;
            summaryPhotoPlaceholder.hidden = Boolean(selectedPhoto);
          }
    
          if (removePhotoButton) removePhotoButton.disabled = !selectedPhoto;
        }
    
        function compressProductPhoto(file) {
          return new Promise(function (resolve, reject) {
            const reader = new FileReader();
    
            reader.onerror = function () {
              reject(new Error("Não foi possível ler a imagem."));
            };
    
            reader.onload = function () {
              const image = new Image();
    
              image.onerror = function () {
                reject(new Error("O arquivo selecionado não é uma imagem válida."));
              };
    
              image.onload = function () {
                const maximumSize = 700;
                const scale = Math.min(1, maximumSize / Math.max(image.width, image.height));
                const width = Math.max(1, Math.round(image.width * scale));
                const height = Math.max(1, Math.round(image.height * scale));
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
    
                canvas.width = width;
                canvas.height = height;
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, width, height);
                context.drawImage(image, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.78));
              };
    
              image.src = reader.result;
            };
    
            reader.readAsDataURL(file);
          });
        }
    
        function serializeForm() {
          return JSON.stringify({
            name: fields.name.value,
            code: fields.code.value,
            category: fields.category.value,
            unit: fields.unit.value,
            expiration: fields.expiration.value,
            description: fields.description.value,
            price: fields.price.value,
            cost: fields.cost.value,
            stock: fields.stock.value,
            minimumStock: fields.minimumStock.value,
            active: fields.active.checked,
            photo: selectedPhoto
          });
        }
    
        function updateSummary() {
          const summaryName = document.querySelector("#summary-product-name");
          const summaryCategory = document.querySelector("#summary-product-category");
          const summaryPrice = document.querySelector("#summary-product-price");
          const summaryStock = document.querySelector("#summary-product-stock");
    
          if (summaryName) summaryName.textContent = fields.name.value.trim() || "Não informado";
          if (summaryCategory) summaryCategory.textContent = categoryNames[fields.category.value] || "Não informada";
          if (summaryPrice) summaryPrice.textContent = formatCurrency(parseCurrency(fields.price.value));
          if (summaryStock) summaryStock.textContent = (Number(fields.stock.value) || 0) + " unidades";
          updatePhotoPreview();
        }
    
        function validateForm() {
          let valid = true;
          const products = getProducts();
    
          const name = fields.name.value.trim();
          const code = fields.code.value.replace(/\D/g, "");
          const price = parseCurrency(fields.price.value);
          const cost = fields.cost.value.trim() ? parseCurrency(fields.cost.value) : 0;
          const stock = Number(fields.stock.value);
          const minimumStock = Number(fields.minimumStock.value);
          const duplicatedCode = products.some(function (product) {
            return product.code === code && String(product.id) !== String(fields.id.value);
          });
    
          const validations = [
            [fields.name, name.length < 2 ? "Informe um nome com pelo menos 2 caracteres." : ""],
            [fields.code, !/^\d{8,14}$/.test(code) ? "Informe de 8 a 14 números." : duplicatedCode ? "Este código já pertence a outro produto." : ""],
            [fields.category, !fields.category.value ? "Selecione uma categoria." : ""],
            [fields.unit, !fields.unit.value ? "Selecione uma unidade de medida." : ""],
            [fields.price, price <= 0 ? "Informe um preço de venda maior que zero." : ""],
            [fields.cost, fields.cost.value.trim() && cost < 0 ? "O preço de custo não pode ser negativo." : ""],
            [fields.stock, !Number.isInteger(stock) || stock < 0 ? "Informe um número inteiro igual ou maior que zero." : ""],
            [fields.minimumStock, !Number.isInteger(minimumStock) || minimumStock < 0 ? "Informe um número inteiro igual ou maior que zero." : ""]
          ];
    
          validations.forEach(function (validation) {
            setFieldError(validation[0], validation[1]);
            if (validation[1]) valid = false;
          });
    
          return valid;
        }
    
        if (queryId) {
          const product = getProducts().find(function (item) {
            return String(item.id) === String(queryId);
          });
    
          if (product) {
            fields.id.value = product.id;
            fields.name.value = product.name;
            fields.code.value = product.code;
            fields.category.value = product.category;
            fields.unit.value = product.unit || "un";
            fields.expiration.value = product.expiration || "";
            fields.description.value = product.description || "";
            fields.price.value = Number(product.price || 0).toFixed(2).replace(".", ",");
            fields.cost.value = product.cost ? Number(product.cost).toFixed(2).replace(".", ",") : "";
            fields.stock.value = product.stock;
            fields.minimumStock.value = product.minimumStock;
            fields.active.checked = product.active !== false;
            selectedPhoto = product.photo || "";
    
            if (title) title.textContent = "Editar produto";
            if (pageTitle) pageTitle.textContent = "Editar produto | Mercearia do João";
          } else {
            if (message) {
              message.hidden = false;
              message.className = "form-message product-form-message is-error";
              message.textContent = "O produto solicitado não foi encontrado.";
            }
          }
        }
    
        updateSummary();
        initialFormState = serializeForm();
    
        form.addEventListener("input", updateSummary);
        form.addEventListener("change", updateSummary);
    
        if (photoInput) {
          photoInput.addEventListener("change", async function () {
            const file = photoInput.files && photoInput.files[0];
            if (!file) return;
    
            if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
              if (photoError) photoError.textContent = "Use uma imagem JPG, PNG ou WebP.";
              photoInput.value = "";
              return;
            }
    
            if (file.size > 5 * 1024 * 1024) {
              if (photoError) photoError.textContent = "A imagem deve ter no máximo 5 MB.";
              photoInput.value = "";
              return;
            }
    
            try {
              if (photoError) photoError.textContent = "Preparando a imagem…";
              selectedPhoto = await compressProductPhoto(file);
              if (photoError) photoError.textContent = "";
              updatePhotoPreview();
            } catch (error) {
              if (photoError) photoError.textContent = error.message;
            }
          });
        }
    
        if (removePhotoButton) {
          removePhotoButton.addEventListener("click", function () {
            selectedPhoto = "";
            if (photoInput) photoInput.value = "";
            if (photoError) photoError.textContent = "";
            updatePhotoPreview();
          });
        }
    
        fields.code.addEventListener("input", function () {
          fields.code.value = fields.code.value.replace(/\D/g, "").slice(0, 14);
        });
    
        [fields.price, fields.cost].forEach(function (field) {
          field.addEventListener("blur", function () {
            if (!field.value.trim()) return;
            field.value = parseCurrency(field.value).toFixed(2).replace(".", ",");
            updateSummary();
          });
        });
    
        form.addEventListener("submit", function (event) {
          event.preventDefault();
    
          if (!validateForm()) {
            const firstInvalidField = form.querySelector('[aria-invalid="true"]');
            if (firstInvalidField) firstInvalidField.focus();
            return;
          }
    
          const products = getProducts();
          const productId = fields.id.value || String(Date.now());
          const existingIndex = products.findIndex(function (product) {
            return String(product.id) === String(productId);
          });
    
          const productData = {
            id: productId,
            name: fields.name.value.trim(),
            code: fields.code.value.replace(/\D/g, ""),
            category: fields.category.value,
            unit: fields.unit.value,
            expiration: fields.expiration.value,
            description: fields.description.value.trim(),
            price: parseCurrency(fields.price.value),
            cost: fields.cost.value.trim() ? parseCurrency(fields.cost.value) : 0,
            stock: Number(fields.stock.value),
            minimumStock: Number(fields.minimumStock.value),
            active: fields.active.checked,
            photo: selectedPhoto
          };
    
          if (existingIndex >= 0) products[existingIndex] = productData;
          else products.push(productData);
    
          if (!saveProducts(products)) {
            window.alert("Não foi possível salvar o produto neste navegador.");
            return;
          }
    
          initialFormState = serializeForm();
          window.location.href = "./produtos.html";
        });
    
        if (cancelButton) {
          cancelButton.addEventListener("click", function (event) {
            if (serializeForm() !== initialFormState) {
              const confirmed = window.confirm("Descartar as alterações feitas neste produto?");
              if (!confirmed) {
                event.preventDefault();
              } else {
                initialFormState = serializeForm();
              }
            }
          });
        }
    
        window.addEventListener("beforeunload", function (event) {
          if (serializeForm() !== initialFormState) {
            event.preventDefault();
            event.returnValue = "";
          }
        });
      }
    
      initializeProductsPage();
      initializeProductForm();
    })();
    
    /* ================================================================
       CONFIGURAÇÕES GERAIS DO SISTEMA
       Tema, dashboard, perfil e página de produtos
       ================================================================ */
    
    (function () {
      "use strict";
    
      const root = document.documentElement;
    
    
      /* ==========================================================
         TEMA CLARO E ESCURO
         ========================================================== */
    
      const themeButton =
        document.querySelector(
          ".theme-toggle"
        );
    
      const themeColor =
        document.querySelector(
          'meta[name="theme-color"]'
        );
    
      const themeStorageKey =
        "mercearia-theme";
    
      const systemTheme =
        window.matchMedia
          ? window.matchMedia(
              "(prefers-color-scheme: dark)"
            )
          : null;
    
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
          systemTheme &&
          systemTheme.matches
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
              root.getAttribute(
                "data-theme"
              );
    
            const nextTheme =
              currentTheme === "dark"
                ? "light"
                : "dark";
    
            applyTheme(nextTheme, true);
          }
        );
      }
    
      function handleSystemThemeChange(
        event
      ) {
        if (!getSavedTheme()) {
          applyTheme(
            event.matches
              ? "dark"
              : "light"
          );
        }
      }
    
      if (systemTheme) {
        if (
          systemTheme.addEventListener
        ) {
          systemTheme.addEventListener(
            "change",
            handleSystemThemeChange
          );
        } else if (
          systemTheme.addListener
        ) {
          systemTheme.addListener(
            handleSystemThemeChange
          );
        }
      }
    
    
      /* ==========================================================
         DASHBOARD — DATA E SAUDAÇÃO AUTOMÁTICAS
         ========================================================== */
    
      const currentDateElement =
        document.querySelector(
          "#current-date"
        );
    
      const greetingElement =
        document.querySelector(
          "#page-title[data-owner-name]"
        );
    
      if (currentDateElement) {
        const now = new Date();
    
        const formattedDate =
          new Intl.DateTimeFormat(
            "pt-BR",
            {
              weekday: "long",
              day: "numeric",
              month: "long"
            }
          ).format(now);
    
        currentDateElement.dateTime =
          now.toISOString().slice(0, 10);
    
        currentDateElement.textContent =
          formattedDate
            .charAt(0)
            .toUpperCase() +
          formattedDate.slice(1);
      }
    
      if (greetingElement) {
        const hour =
          new Date().getHours();
    
        let greeting = "Boa noite";
    
        if (hour < 12) {
          greeting = "Bom dia";
        } else if (hour < 18) {
          greeting = "Boa tarde";
        }
    
        greetingElement.textContent =
          greeting +
          ", " +
          greetingElement.dataset.ownerName;
      }
    
    
      /* ==========================================================
         MENU DO PERFIL
         ========================================================== */
    
      const profileButton =
        document.querySelector(
          "#profile-menu-button"
        );
    
      const profileMenu =
        document.querySelector(
          "#profile-menu"
        );
    
      const logoutButton =
        document.querySelector(
          "#logout-button"
        );
    
      function closeProfileMenu() {
        if (
          !profileButton ||
          !profileMenu
        ) {
          return;
        }
    
        profileMenu.hidden = true;
    
        profileButton.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    
      if (
        profileButton &&
        profileMenu
      ) {
        profileButton.addEventListener(
          "click",
          function () {
            const willOpen =
              profileMenu.hidden;
    
            profileMenu.hidden =
              !willOpen;
    
            profileButton.setAttribute(
              "aria-expanded",
              String(willOpen)
            );
          }
        );
    
        document.addEventListener(
          "click",
          function (event) {
            const clickedOutside =
              !profileMenu.contains(
                event.target
              ) &&
              !profileButton.contains(
                event.target
              );
    
            if (
              !profileMenu.hidden &&
              clickedOutside
            ) {
              closeProfileMenu();
            }
          }
        );
    
        document.addEventListener(
          "keydown",
          function (event) {
            if (
              event.key === "Escape" &&
              !profileMenu.hidden
            ) {
              closeProfileMenu();
              profileButton.focus();
            }
          }
        );
      }
    
    
      /* ==========================================================
         SAIR DO SISTEMA
         ========================================================== */
    
      if (logoutButton) {
        logoutButton.addEventListener(
          "click",
          function () {
            const confirmed =
              window.confirm(
                "Deseja realmente sair do sistema?"
              );
    
            if (!confirmed) {
              return;
            }
    
            try {
              sessionStorage.removeItem(
                "mercearia-user-session"
              );
            } catch (error) {
              console.warn(
                "Não foi possível limpar a sessão local."
              );
            }
    
            window.location.href =
              "./login.html";
          }
        );
      }
    
    
      /* ==========================================================
         FUNÇÕES QUE SERÃO CRIADAS FUTURAMENTE
         ========================================================== */
    
      document
        .querySelectorAll(
          "[data-future-feature]"
        )
        .forEach(function (element) {
          element.addEventListener(
            "click",
            function (event) {
              event.preventDefault();
    
              window.alert(
                "Esta função será criada em uma próxima etapa."
              );
            }
          );
        });
    
    
      /* ==========================================================
         NOTIFICAÇÕES DO DASHBOARD
         ========================================================== */
    
      const notificationButton =
        document.querySelector(
          ".notification-button"
        );
    
      if (notificationButton) {
        notificationButton.addEventListener(
          "click",
          function () {
            window.alert(
              "Você tem 2 avisos: produtos com estoque baixo e uma cobrança vencida."
            );
          }
        );
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
       * Se a tabela não existir, não estamos
       * na página de produtos.
       *
       * As funções gerais acima continuam
       * funcionando normalmente.
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
  
      const metricFilterButtons = Array.from(
        document.querySelectorAll(
          "[data-product-status-shortcut]"
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
         PRODUTOS — NORMALIZAÇÃO DA PESQUISA
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
         PRODUTOS — CONTADORES GERAIS
         ========================================================== */
    
      function getProductsByStatus(
        status
      ) {
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
          getProductsByStatus(
            "low"
          ).length;
    
        const emptyTotal =
          getProductsByStatus(
            "empty"
          ).length;
    
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
         PRODUTOS — FILTRAGEM
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
         PRODUTOS — DESCRIÇÃO DOS RESULTADOS
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
         PRODUTOS — BOTÕES DA PAGINAÇÃO
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
         PRODUTOS — PAGINAÇÃO
         ========================================================== */
    
      function renderPagination(
        totalPages
      ) {
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
                "Página " +
                pageNumber,
    
              className:
                pageNumber ===
                currentPage
                  ? "is-current"
                  : "",
    
              current:
                pageNumber ===
                currentPage,
    
              onClick: function () {
                currentPage =
                  pageNumber;
    
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
              currentPage ===
              totalPages,
    
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
         PRODUTOS — EXIBIÇÃO
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
          emptyRow.hidden =
            hasResults;
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
         PRODUTOS — SELEÇÃO DO FILTRO
         ========================================================== */
    
      function selectStatusFilter(
        selectedButton
      ) {
        filterButtons.forEach(
          function (button) {
            const isSelected =
              button ===
              selectedButton;
    
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
  
        metricFilterButtons.forEach(
          function (metricButton) {
            const isSelected =
              metricButton.dataset
                .productStatusShortcut ===
              selectedStatus;
  
            metricButton.classList.toggle(
              "is-selected",
              isSelected
            );
  
            metricButton.setAttribute(
              "aria-pressed",
              String(isSelected)
            );
          }
        );
  
        currentPage = 1;
    
        renderProducts();
      }
    
    
      /* ==========================================================
         PRODUTOS — EVENTOS DOS FILTROS
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
         PRODUTOS — LIMPAR FILTROS
         ========================================================== */
    
      if (clearFiltersButton) {
        clearFiltersButton.addEventListener(
          "click",
          function () {
            if (searchInput) {
              searchInput.value = "";
            }
    
            if (categorySelect) {
              categorySelect.value =
                "all";
            }
    
            const allButton =
              filterButtons.find(
                function (button) {
                  return (
                    button.dataset
                      .filter === "all"
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
         PRODUTOS — INICIALIZAÇÃO
         ========================================================== */
    
      updateGeneralCounters();
      renderProducts();
    })();
  
  
  /* ================================================================
     PÁGINA DE CLIENTES
     Cadastro, consulta, edição, exclusão, pesquisa e filtros
     ================================================================ */
  
  (function () {
    "use strict";
  
    const tableBody = document.querySelector("#clients-table-body");
  
    /* Se a tabela não existe, esta não é a página de clientes. */
    if (!tableBody) {
      return;
    }
  
    const storageKey = "mercearia-clients-v1";
    const searchInput = document.querySelector("#clients-search-input");
    const resultDescription = document.querySelector("#clients-result-description");
    const resultsCount = document.querySelector("#clients-results-count");
    const newClientButton = document.querySelector("#new-client-button");
    const modal = document.querySelector("#client-modal");
    const form = document.querySelector("#client-form");
    const modalEyebrow = document.querySelector("#client-modal-eyebrow");
    const modalTitle = document.querySelector("#client-modal-title");
    const modalDescription = document.querySelector("#client-modal-description");
    const cancelButton = document.querySelector("#client-cancel-button");
    const saveButton = document.querySelector("#client-save-button");
    const closeButtons = modal
      ? Array.from(modal.querySelectorAll("[data-close-client-modal]"))
      : [];
    const toast = document.querySelector("#client-toast");
    const idInput = document.querySelector("#client-id");
    const nameInput = document.querySelector("#client-name");
    const cpfInput = document.querySelector("#client-cpf");
    const phoneInput = document.querySelector("#client-phone");
    const addressInput = document.querySelector("#client-address");
    const fields = [nameInput, cpfInput, phoneInput, addressInput].filter(Boolean);
    const errors = {
      name: document.querySelector("#client-name-error"),
      cpf: document.querySelector("#client-cpf-error"),
      phone: document.querySelector("#client-phone-error"),
      address: document.querySelector("#client-address-error")
    };
  
    let clients = [];
    let modalMode = "create";
    let formChanged = false;
    let lastFocusedElement = null;
    let toastTimer = null;
  
    const initialClients = [
      {
        id: "cliente-1",
        name: "Carlos Oliveira",
        cpf: "52998224725",
        phone: "44999910001",
        address: "Rua das Flores, 120 — Zona 01",
        active: true,
        createdAt: "2026-09-01T10:00:00.000Z"
      },
      {
        id: "cliente-2",
        name: "Maria Santos",
        cpf: "11144477735",
        phone: "44999910002",
        address: "Avenida Brasil, 845 — Centro",
        active: true,
        createdAt: "2026-09-02T10:00:00.000Z"
      },
      {
        id: "cliente-3",
        name: "João Silva",
        cpf: "12345678909",
        phone: "44999910003",
        address: "Rua Pioneiro José, 76 — Jardim Alvorada",
        active: true,
        createdAt: "2026-09-03T10:00:00.000Z"
      },
      {
        id: "cliente-4",
        name: "Ana Costa",
        cpf: "39053344705",
        phone: "44999910004",
        address: "Rua das Acácias, 310 — Zona 07",
        active: true,
        createdAt: "2026-09-04T10:00:00.000Z"
      },
      {
        id: "cliente-5",
        name: "Pedro Souza",
        cpf: "86288366757",
        phone: "44999910005",
        address: "Avenida Mandacaru, 1520 — Vila Operária",
        active: true,
        createdAt: "2026-09-05T10:00:00.000Z"
      }
    ];
  
    function escapeHTML(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  
    function onlyDigits(value) {
      return String(value || "").replace(/\D/g, "");
    }
  
    function normalizeText(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    }
  
    function formatCPF(value) {
      const digits = onlyDigits(value).slice(0, 11);
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
  
    function formatPhone(value) {
      const digits = onlyDigits(value).slice(0, 11);
  
      if (digits.length <= 10) {
        return digits
          .replace(/(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{4})(\d)/, "$1-$2");
      }
  
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
  
    function getInitials(name) {
      const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
  
      if (!parts.length) {
        return "CL";
      }
  
      return (
        parts[0].charAt(0) +
        (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")
      ).toUpperCase();
    }
  
    function isValidCPF(value) {
      const cpf = onlyDigits(value);
  
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
      }
  
      function calculateDigit(length) {
        let sum = 0;
        let weight = length + 1;
  
        for (let index = 0; index < length; index += 1) {
          sum += Number(cpf.charAt(index)) * weight;
          weight -= 1;
        }
  
        const result = (sum * 10) % 11;
        return result === 10 ? 0 : result;
      }
  
      return (
        calculateDigit(9) === Number(cpf.charAt(9)) &&
        calculateDigit(10) === Number(cpf.charAt(10))
      );
    }
  
    function loadClients() {
      try {
        const savedClients = JSON.parse(localStorage.getItem(storageKey) || "[]");
  
        if (Array.isArray(savedClients) && savedClients.length) {
          clients = savedClients;
        } else {
          clients = initialClients.map(function (client) {
            return Object.assign({}, client);
          });
          localStorage.setItem(storageKey, JSON.stringify(clients));
        }
      } catch (error) {
        clients = initialClients.map(function (client) {
          return Object.assign({}, client);
        });
      }
    }
  
    function saveClients() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(clients));
        return true;
      } catch (error) {
        window.alert("Não foi possível salvar os clientes neste navegador.");
        return false;
      }
    }
  
    function showToast(message) {
      if (!toast) {
        return;
      }
  
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.hidden = false;
  
      toastTimer = window.setTimeout(function () {
        toast.hidden = true;
      }, 3200);
    }
  
    function getActiveClients() {
      return clients.filter(function (client) {
        return client.active !== false;
      });
    }
  
    function getFilteredClients() {
      const searchTerm = normalizeText(searchInput ? searchInput.value : "");
      const searchDigits = onlyDigits(searchInput ? searchInput.value : "");
  
      return getActiveClients()
        .filter(function (client) {
          const matchesText =
            searchTerm === "" ||
            normalizeText(client.name).includes(searchTerm) ||
            normalizeText(client.address).includes(searchTerm) ||
            (searchDigits !== "" && onlyDigits(client.cpf).includes(searchDigits)) ||
            (searchDigits !== "" && onlyDigits(client.phone).includes(searchDigits));
  
          return matchesText;
        })
        .sort(function (firstClient, secondClient) {
          return String(firstClient.name).localeCompare(
            String(secondClient.name),
            "pt-BR"
          );
        });
    }
  
    function closeClientActionMenu(menu, menuButton) {
      if (!menu || !menuButton) {
        return;
      }

      window.clearTimeout(menu.closeTimer);
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", menuButton.dataset.openLabel || "Abrir ações do cliente");

      menu.closeTimer = window.setTimeout(function () {
        if (!menu.classList.contains("is-open")) {
          menu.hidden = true;
        }
      }, 170);
    }

    function closeActionMenus(exceptionButton) {
      document.querySelectorAll(".client-actions-menu").forEach(function (menu) {
        const menuButton = menu.previousElementSibling;
  
        if (menuButton !== exceptionButton) {
          closeClientActionMenu(menu, menuButton);
        }
      });
    }

    function openClientActionMenu(menu, menuButton) {
      window.clearTimeout(menu.closeTimer);
      menu.hidden = false;
      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", "Fechar ações do cliente");

      window.requestAnimationFrame(function () {
        menu.classList.add("is-open");
      });
    }
  
    function createClientRow(client) {
      const row = document.createElement("tr");
      const safeId = escapeHTML(client.id);
      const phone = onlyDigits(client.phone) ? formatPhone(client.phone) : "Não informado";
      const address = String(client.address || "").trim() || "Não informado";
  
      row.dataset.clientId = client.id;
      row.innerHTML =
        '<th scope="row">' +
          '<div class="client-cell">' +
            '<span class="client-avatar" aria-hidden="true">' + escapeHTML(getInitials(client.name)) + "</span>" +
            "<div><strong>" + escapeHTML(client.name) + "</strong><small>Cliente cadastrado</small></div>" +
          "</div>" +
        "</th>" +
        '<td><span class="client-cpf">' + escapeHTML(formatCPF(client.cpf)) + "</span></td>" +
        '<td><span class="client-phone">' + escapeHTML(phone) + "</span></td>" +
        '<td><span class="client-address" title="' + escapeHTML(address) + '">' + escapeHTML(address) + "</span></td>" +
        '<td><div class="client-actions">' +
          '<button class="client-menu-button" type="button" aria-label="Abrir ações de ' + escapeHTML(client.name) + '" data-open-label="Abrir ações de ' + escapeHTML(client.name) + '" aria-expanded="false">' +
            '<i class="ri-add-line" aria-hidden="true"></i>' +
          "</button>" +
          '<div class="client-actions-menu" aria-label="Ações de ' + escapeHTML(client.name) + '" hidden>' +
            '<button class="client-action-view" type="button" data-client-action="view" data-client-id="' + safeId + '" aria-label="Visualizar ' + escapeHTML(client.name) + '" title="Visualizar"><i class="ri-eye-line" aria-hidden="true"></i></button>' +
            '<button class="client-action-edit" type="button" data-client-action="edit" data-client-id="' + safeId + '" aria-label="Editar ' + escapeHTML(client.name) + '" title="Editar"><i class="ri-pencil-line" aria-hidden="true"></i></button>' +
            '<button class="client-action-delete" type="button" data-client-action="delete" data-client-id="' + safeId + '" aria-label="Excluir ' + escapeHTML(client.name) + '" title="Excluir"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>' +
          "</div>" +
        "</div></td>";
  
      return row;
    }
  
    function renderClients() {
      const filteredClients = getFilteredClients();
  
      tableBody.innerHTML = "";
  
      if (!filteredClients.length) {
        const emptyRow = document.createElement("tr");
        emptyRow.className = "clients-empty-state";
        emptyRow.innerHTML =
          '<td colspan="5"><div class="clients-empty-content">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>' +
            "<strong>Nenhum cliente encontrado</strong>" +
            "<span>Altere a pesquisa ou volte para a lista completa.</span>" +
            '<button type="button" id="clear-client-filters">Limpar filtros</button>' +
          "</div></td>";
        tableBody.appendChild(emptyRow);
      } else {
        filteredClients.forEach(function (client) {
          tableBody.appendChild(createClientRow(client));
        });
      }
  
      const total = filteredClients.length;
      resultDescription.textContent =
        total === 0
          ? "Nenhum cliente encontrado"
          : total === 1
            ? "1 cliente encontrado"
            : total + " clientes encontrados";
      resultsCount.textContent = resultDescription.textContent;
      closeActionMenus();
    }
  
    function clearErrors() {
      Object.keys(errors).forEach(function (key) {
        if (errors[key]) {
          errors[key].textContent = "";
        }
      });
  
      fields.forEach(function (field) {
        field.removeAttribute("aria-invalid");
      });
    }
  
    function setFieldError(field, errorElement, message) {
      if (errorElement) {
        errorElement.textContent = message;
      }
  
      if (field) {
        if (message) {
          field.setAttribute("aria-invalid", "true");
        } else {
          field.removeAttribute("aria-invalid");
        }
      }
    }
  
    function setFieldsDisabled(disabled) {
      fields.forEach(function (field) {
        field.disabled = disabled;
      });
    }
  
    function fillForm(client) {
      idInput.value = client ? client.id : "";
      nameInput.value = client ? client.name : "";
      cpfInput.value = client ? formatCPF(client.cpf) : "";
      phoneInput.value = client ? formatPhone(client.phone) : "";
      addressInput.value = client ? client.address || "" : "";
    }
  
    function configureModal(mode, client) {
      modalMode = mode;
      formChanged = false;
      clearErrors();
      fillForm(client);
      setFieldsDisabled(mode === "view");
      saveButton.hidden = mode === "view";
      cancelButton.textContent = mode === "view" ? "Fechar" : "Cancelar";
  
      if (mode === "create") {
        modalEyebrow.textContent = "Cadastro de cliente";
        modalTitle.textContent = "Novo cliente";
        modalDescription.textContent = "Preencha os dados para incluir um cliente na mercearia.";
        saveButton.textContent = "Salvar cliente";
      } else if (mode === "edit") {
        modalEyebrow.textContent = "Atualização de cadastro";
        modalTitle.textContent = "Editar cliente";
        modalDescription.textContent = "Confira os dados e salve somente o que foi alterado.";
        saveButton.textContent = "Salvar alterações";
      } else {
        modalEyebrow.textContent = "Consulta de cadastro";
        modalTitle.textContent = "Detalhes do cliente";
        modalDescription.textContent = "Visualize as informações registradas para este cliente.";
      }
    }
  
    function openModal(mode, client) {
      if (!modal || !form) {
        return;
      }
  
      lastFocusedElement = document.activeElement;
      configureModal(mode, client || null);
      modal.hidden = false;
      document.body.classList.add("has-open-modal");
  
      window.setTimeout(function () {
        if (mode === "view") {
          cancelButton.focus();
        } else {
          nameInput.focus();
        }
      }, 30);
    }
  
    function closeModal(forceClose) {
      if (!modal || modal.hidden) {
        return;
      }
  
      if (
        !forceClose &&
        modalMode !== "view" &&
        formChanged &&
        !window.confirm("Deseja sair sem salvar as alterações?")
      ) {
        return;
      }
  
      modal.hidden = true;
      document.body.classList.remove("has-open-modal");
      form.reset();
      clearErrors();
      setFieldsDisabled(false);
      formChanged = false;
  
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }
  
    function validateForm() {
      clearErrors();
  
      const name = nameInput.value.trim();
      const cpf = onlyDigits(cpfInput.value);
      const phone = onlyDigits(phoneInput.value);
      const address = addressInput.value.trim();
      const currentId = idInput.value;
      let valid = true;
  
      if (name.length < 2) {
        setFieldError(nameInput, errors.name, "Informe o nome completo do cliente.");
        valid = false;
      }
  
      if (!isValidCPF(cpf)) {
        setFieldError(cpfInput, errors.cpf, "Informe um CPF válido.");
        valid = false;
      } else {
        const duplicatedCPF = clients.some(function (client) {
          return (
            client.active !== false &&
            client.id !== currentId &&
            onlyDigits(client.cpf) === cpf
          );
        });
  
        if (duplicatedCPF) {
          setFieldError(cpfInput, errors.cpf, "Este CPF já pertence a outro cliente.");
          valid = false;
        }
      }
  
      if (phone && phone.length !== 10 && phone.length !== 11) {
        setFieldError(phoneInput, errors.phone, "Informe um telefone com DDD.");
        valid = false;
      }
  
      if (addressInput.value !== "" && address === "") {
        setFieldError(addressInput, errors.address, "O endereço não pode conter apenas espaços.");
        valid = false;
      }
  
      if (!valid) {
        const firstInvalidField = form.querySelector('[aria-invalid="true"]');
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
      }
  
      return valid;
    }
  
    function saveClient() {
      if (!validateForm()) {
        return;
      }
  
      const clientData = {
        name: nameInput.value.trim(),
        cpf: onlyDigits(cpfInput.value),
        phone: onlyDigits(phoneInput.value),
        address: addressInput.value.trim()
      };
      let successMessage = "";
  
      if (modalMode === "edit") {
        const client = clients.find(function (item) {
          return item.id === idInput.value;
        });
  
        if (!client) {
          window.alert("Não foi possível localizar este cliente.");
          return;
        }
  
        Object.assign(client, clientData);
        successMessage = "Cliente alterado com sucesso.";
      } else {
        clients.push(Object.assign({
          id: "cliente-" + Date.now(),
          active: true,
          createdAt: new Date().toISOString()
        }, clientData));
        successMessage = "Cliente cadastrado com sucesso.";
      }
  
      if (!saveClients()) {
        return;
      }
  
      formChanged = false;
      renderClients();
      closeModal(true);
      showToast(successMessage);
    }
  
    function findClient(clientId) {
      return clients.find(function (client) {
        return client.id === clientId && client.active !== false;
      });
    }
  
    function deleteClient(client) {
      const confirmed = window.confirm(
        "Excluir “" + client.name + "” da lista de clientes?\n\nO histórico de vendas será preservado."
      );
  
      if (!confirmed) {
        return;
      }
  
      client.active = false;
  
      if (saveClients()) {
        renderClients();
        showToast("Cliente removido da lista. O histórico foi preservado.");
      }
    }
  
    if (searchInput) {
      searchInput.addEventListener("input", renderClients);
    }
  
    if (newClientButton) {
      newClientButton.addEventListener("click", function () {
        openModal("create", null);
      });
    }
  
    if (form) {
      form.addEventListener("input", function () {
        if (modalMode !== "view") {
          formChanged = true;
        }
      });
  
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        saveClient();
      });
    }
  
    cpfInput.addEventListener("input", function () {
      cpfInput.value = formatCPF(cpfInput.value);
      setFieldError(cpfInput, errors.cpf, "");
    });
  
    phoneInput.addEventListener("input", function () {
      phoneInput.value = formatPhone(phoneInput.value);
      setFieldError(phoneInput, errors.phone, "");
    });
  
    nameInput.addEventListener("input", function () {
      setFieldError(nameInput, errors.name, "");
    });
  
    addressInput.addEventListener("input", function () {
      setFieldError(addressInput, errors.address, "");
    });
  
    closeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        closeModal(false);
      });
    });
  
    tableBody.addEventListener("click", function (event) {
      const clearButton = event.target.closest("#clear-client-filters");
  
      if (clearButton) {
        searchInput.value = "";
        renderClients();
        searchInput.focus();
        return;
      }
  
      const menuButton = event.target.closest(".client-menu-button");
  
      if (menuButton) {
        const menu = menuButton.nextElementSibling;
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        closeActionMenus(menuButton);

        if (isOpen) {
          closeClientActionMenu(menu, menuButton);
        } else {
          openClientActionMenu(menu, menuButton);
        }

        return;
      }
  
      const actionButton = event.target.closest("[data-client-action]");
  
      if (!actionButton) {
        return;
      }
  
      const client = findClient(actionButton.dataset.clientId);
      closeActionMenus();
  
      if (!client) {
        showToast("Este cliente não está mais disponível.");
        renderClients();
        return;
      }
  
      if (actionButton.dataset.clientAction === "view") {
        openModal("view", client);
      } else if (actionButton.dataset.clientAction === "edit") {
        openModal("edit", client);
      } else if (actionButton.dataset.clientAction === "delete") {
        deleteClient(client);
      }
    });
  
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".client-actions")) {
        closeActionMenus();
      }
    });
  
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeActionMenus();
        if (modal && !modal.hidden) {
          closeModal(false);
        }
      }
    });
  
    loadClients();
    renderClients();
  })();
    
  
