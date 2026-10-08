class Wishlist {
  constructor() {
    this.isWishlistPage = false;
    this.storageKey = "m-wishlist-products";
    this.products = [];
    this.productNodes = {};
    this.pageTemplate = "page.wishlist";
    this.addedClass = "added-to-wishlist";
    this.hasItemClass = "wishlist-has-item";
    this.selectors = {
      container: ".m-wishlist-page-content__wrapper",
      noProducts: ".m-wishlist-no-products",
      wrapper: ".m-wishlist-card",
      productCard: ".m-product-card",
      wishlistButton: ".m-wishlist-button",
      wishlistText: ".m-wishlist-button-text",
      removeButton: ".m-wishlist-remove-button",
      count: ".m-wishlist-count"
    };
    this.products = Array.from(new Set(Array.from(JSON.parse(localStorage.getItem(this.storageKey)) || [])));
    this.isWishlistPage = typeof MinimogSettings !== "undefined" && MinimogSettings.template === this.pageTemplate;
    this.init();
  }

  init = async () => {
    this.migrateLegacyStorage();
    if (this.isWishlistPage) {
      await this.renderWishlistPage();
      this.addEventToRemoveButtons();
    }
    this.setWishlistButtonsState();
    this.addEventToWishlistButtons();
    this.updateWishlistCount();
  };

  migrateLegacyStorage = () => {
    try {
      const legacy = JSON.parse(localStorage.getItem('kerlora_wishlist'));
      if (Array.isArray(legacy) && legacy.length > 0) {
        legacy.forEach(item => {
          if (item && -1 === this.products.indexOf(item)) {
            this.products.push(item);
          }
        });
        this.saveToStorage();
        localStorage.removeItem('kerlora_wishlist');
      }
    } catch (e) {}
  };

  saveToStorage = () => {
    this.products = Array.from(new Set(this.products));
    localStorage.setItem(this.storageKey, JSON.stringify(this.products));
  };

  addToWishlist(handle) {
    if (handle && -1 === this.products.indexOf(handle)) {
      this.products.push(handle);
      this.saveToStorage();
    }
  }

  removeFromWishlist(handle) {
    this.products = this.products.filter(s => s !== handle);
    this.saveToStorage();
  }

  setWishlistButtonsState = () => {
    document.querySelectorAll(this.selectors.wishlistButton).forEach(btn => {
      const handle = btn && btn.dataset.productHandle;
      if (handle) {
        const isAdded = this.products.indexOf(handle) >= 0;
        this.toggleButtonState(btn, isAdded);
        if (this.isWishlistPage && isAdded) {
          btn.classList.remove(this.selectors.wishlistButton.replace(".", ""));
          btn.classList.add(this.selectors.removeButton.replace(".", ""));
        }
      }
    });
  };

  updateWishlistCount = () => {
    const total = this.products.length;
    [...document.querySelectorAll(this.selectors.count)].forEach(el => {
      el.textContent = total;
      if (total < 1) {
        el.classList.add("m:hidden");
      } else {
        el.classList.remove("m:hidden");
      }
    });
    const action = total ? "add" : "remove";
    document.body.classList[action](this.hasItemClass);
  };

  addEventToWishlistButtons = () => {
    addEventDelegate({
      selector: this.selectors.wishlistButton,
      handler: (evt, btn) => {
        evt.preventDefault();
        const handle = btn && btn.dataset.productHandle;
        if (handle) {
          const willAdd = !btn.classList.contains(this.addedClass);
          this.toggleButtonState(btn, willAdd);
          this.updateWishlistCount();
          document.querySelectorAll(this.selectors.wishlistButton).forEach(otherBtn => {
            if (otherBtn && otherBtn.dataset.productHandle === handle && otherBtn !== btn) {
              this.toggleButtonState(otherBtn, willAdd);
            }
          });
        }
      }
    });
  };

  toggleButtonState = (btn, isAdded) => {
    const handle = btn && btn.dataset.productHandle;
    const textEl = btn && btn.querySelector(this.selectors.wishlistText);
    if (isAdded) {
      this.addToWishlist(handle);
      btn.classList.add(this.addedClass);
    } else {
      this.removeFromWishlist(handle);
      btn.classList.remove(this.addedClass);
    }
    if (textEl) {
      const revert = textEl.dataset.revertText;
      if (revert) {
        textEl.dataset.revertText = textEl.textContent;
        textEl.textContent = revert;
      }
    }
  };

  addEventToRemoveButtons = () => {
    addEventDelegate({
      selector: this.selectors.removeButton,
      handler: (evt, btn) => {
        evt.preventDefault();
        const wrapper = btn && btn.closest(this.selectors.wrapper);
        if (wrapper) wrapper.remove();
        const handle = btn && btn.dataset.productHandle;
        if (handle) {
          this.removeFromWishlist(handle);
          this.updateWishlistCount();
          if (!this.products.length) this.showNoProductsMessage();
        }
      }
    });
  };

  wishlistRemoveButton(handle) {
    const div = document.createElement("DIV");
    div.classList.add("m-tooltip", "m-wishlist-remove-button", "m:block", "md:m:hidden");
    div.setAttribute("data-product-handle", handle);
    div.innerHTML = '<svg class="m-svg-icon--medium" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    return div;
  }

  renderWishlistPage = async () => {
    const container = document.querySelector(this.selectors.container);
    if (container) {
      let isEmpty = true;
      if (this.products.length) {
        const promises = this.products.map(async handle => {
          const url = formatUrl("products", handle, "view=grid-card-item");
          const html = await fetchCache(url);
          const cardWrap = document.createElement("DIV");
          cardWrap.classList.add("m:hidden", "m:column", "m-wishlist-card");
          cardWrap.innerHTML = html;
          if (cardWrap.querySelector(this.selectors.productCard)) {
            isEmpty = false;
            cardWrap.appendChild(this.wishlistRemoveButton(handle));
            this.productNodes[handle] = cardWrap;
          }
        });
        await Promise.all(promises);
        this.products.forEach(handle => {
          const node = this.productNodes[handle];
          if (node) {
            container.appendChild(node);
            if (MinimogTheme.CompareProduct) MinimogTheme.CompareProduct.setCompareButtonsState();
            node.classList.remove("m:hidden");
          }
        });
      }
      if (isEmpty) {
        this.showNoProductsMessage();
      } else {
        this.setWishlistButtonsState();
      }
      container.classList.add("is-visible");
    }
  };

  showNoProductsMessage = () => {
    const container = document.querySelector(this.selectors.container);
    const noProducts = document.querySelector(this.selectors.noProducts);
    if (container) container.classList.add("m:hidden");
    if (noProducts) noProducts.classList.remove("m:hidden");
  };
}

if (typeof MinimogTheme !== "undefined") {
  MinimogTheme.Wishlist = new Wishlist();
}