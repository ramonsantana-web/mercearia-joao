(function () {
    "use strict";
  
    const root = document.documentElement;
    const button = document.querySelector(".theme-toggle");
    const themeColor = document.querySelector(
      'meta[name="theme-color"]'
    );
  
    const storageKey = "mercearia-theme";
    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
  
    if (!button) {
      return;
    }
  
    function getSavedTheme() {
      try {
        return localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    }
  
    function applyTheme(theme, saveTheme) {
      const isDark = theme === "dark";
  
      root.dataset.theme = theme;
  
      button.setAttribute(
        "aria-pressed",
        String(isDark)
      );
  
      button.setAttribute(
        "aria-label",
        isDark
          ? "Ativar modo claro"
          : "Ativar modo escuro"
      );
  
      if (themeColor) {
        themeColor.setAttribute(
          "content",
          isDark ? "#17191d" : "#e7e3dc"
        );
      }
  
      if (saveTheme) {
        try {
          localStorage.setItem(storageKey, theme);
        } catch (error) {
          console.warn("Não foi possível salvar o tema.");
        }
      }
    }
  
    const initialTheme =
      getSavedTheme() ||
      (systemTheme.matches ? "dark" : "light");
  
    applyTheme(initialTheme, false);
  
    button.addEventListener("click", function () {
      const nextTheme =
        root.dataset.theme === "dark"
          ? "light"
          : "dark";
  
      applyTheme(nextTheme, true);
    });
  
    systemTheme.addEventListener("change", function (event) {
      if (!getSavedTheme()) {
        applyTheme(
          event.matches ? "dark" : "light",
          false
        );
      }
    });
  })();