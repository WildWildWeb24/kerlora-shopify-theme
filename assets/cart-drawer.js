class MCartDrawer extends HTMLElement {
  constructor() {
    super();
    this.cartDrawerInner = this.querySelector(".m-cart-drawer__inner");
    this.cartDrawerCloseIcon = this.querySelector(".m-cart-drawer__close");
    this.cartOverlay = this.querySelector(".m-cart__overlay");
    this.rootUrl = window.Shopify.routes.root;
    this.setHeaderCartIconAccessibility();
    if (this.cartDrawerCloseIcon) {
      this.cartDrawerCloseIcon.addEventListener("click", this.close.bind(this));
    }
    this.addEventListener("click", (e => {
      if (e.target.closest(".m-cart-drawer__inner") !== this.cartDrawerInner) {
        this.close();
      }
    }));
  }

  setHeaderCartIconAccessibility() {
    document.querySelectorAll(".m-cart-icon-bubble").forEach((e => {
      e.setAttribute("role", "button");
      e.setAttribute("aria-haspopup", "dialog");
      e.addEventListener("click", (t => {
        if (typeof MinimogSettings !== "undefined" && MinimogSettings.enable_cart_drawer) {
          t.preventDefault();
          this.open(e);
        }
      }));
    }));
  }

  open(e) {
    if (e) this.setActiveElement(e);
    this.classList.add("m-cart-drawer--active");
    requestAnimationFrame((() => {
      this.style.setProperty("--m-bg-opacity", "0.5");
      if (this.cartDrawerInner) {
        this.cartDrawerInner.style.setProperty("--translate-x", "0");
      }
    }));
    if (window.MinimogEvents) {
      window.MinimogEvents.emit(MinimogTheme.pubSubEvents.openCartDrawer);
    }
    document.documentElement.classList.add("prevent-scroll");
  }

  close() {
    this.style.setProperty("--m-bg-opacity", "0");
    if (this.cartDrawerInner) {
      this.cartDrawerInner.style.setProperty("--translate-x", "100%");
    }
    setTimeout((() => {
      this.classList.remove("m-cart-drawer--active");
      document.documentElement.classList.remove("prevent-scroll");
    }), 300);
  }

  renderContents(e) {
    if (this.classList.contains("m-cart--empty")) {
      this.classList.remove("m-cart--empty");
    }
    this.productId = e ? e.id : null;
    if (e && e.sections) {
      const drawerSection = e.sections["cart-drawer"] || e.sections["MinimogCartDrawer"] || e.sections["cart-template"];
      this.getSectionsToRender().forEach((t => {
        const el = t.selector ? document.querySelector(t.selector) : document.getElementById(t.id);
        if (el) {
          const sectionContent = e.sections[t.id] || drawerSection;
          if (sectionContent) {
            const innerHTML = this.getSectionInnerHTML(sectionContent, t.selector);
            if (innerHTML !== null && innerHTML !== undefined) {
              el.innerHTML = innerHTML;
            }
          }
        }
      }));
    }
    this.onCartDrawerUpdate();
    setTimeout((() => {
      this.open();
    }));
  }

  updateCartCount(e) {
    document.querySelectorAll(".m-cart-count-bubble").forEach((t => {
      if (e > 0) {
        t.textContent = e;
        t.classList.remove("m:hidden");
      } else {
        t.classList.add("m:hidden");
      }
    }));
  }

  getCart() {
    return fetchJSON(this.rootUrl + "cart.json");
  }

  onCartDrawerUpdate(e = true) {
    const route = typeof MinimogSettings !== "undefined" ? MinimogSettings.routes.cart : "/cart";
    fetch(`${route}?section_id=cart-drawer&t=${Date.now()}`)
      .then((res => res.text()))
      .then((t => {
        this.getSectionsToRender().forEach((r => {
          const el = r.selector ? document.querySelector(r.selector) : document.getElementById(r.id);
          if (el) {
            const innerHTML = this.getSectionInnerHTML(t, r.selector);
            if (innerHTML !== null && innerHTML !== undefined) {
              if ("cart-items" === r.block || e) {
                el.innerHTML = innerHTML;
              }
            }
          }
        }));
      }))
      .catch((err => {}));

    this.getCart().then((c => {
      if (c) {
        this.classList.toggle("m-cart--empty", 0 === c.item_count);
        const drawerItems = this.querySelector("m-cart-drawer-items");
        if (drawerItems) {
          drawerItems.classList.toggle("m-cart--empty", 0 === c.item_count);
        }
        this.updateCartCount(c.item_count);
      }
    })).catch((err => {}));
  }

  getSectionInnerHTML(e, t = ".shopify-section") {
    if (!e) return null;
    const parsed = (new DOMParser()).parseFromString(e, "text/html").querySelector(t);
    return parsed ? parsed.innerHTML : null;
  }

  getSectionsToRender() {
    return [
      { id: "cart-drawer", selector: "[data-minimog-cart-items]", block: "cart-items" },
      { id: "cart-drawer", selector: "[data-minimog-cart-discounts]", block: "cart-footer" },
      { id: "cart-drawer", selector: "[data-cart-subtotal]", block: "cart-footer" },
      { id: "cart-drawer", selector: "[data-minimog-gift-wrapping]", block: "cart-footer" }
    ];
  }

  getSectionDOM(e, t = ".shopify-section") {
    if (!e) return null;
    return (new DOMParser()).parseFromString(e, "text/html").querySelector(t);
  }

  setActiveElement(e) {
    this.activeElement = e;
  }
}

customElements.define("m-cart-drawer", MCartDrawer);

class MCartDrawerItems extends MCartTemplate {
  getSectionsToRender() {
    return [
      { id: "MinimogCartDrawer", section: "cart-drawer", selector: "[data-minimog-cart-items]" },
      { id: "MinimogCartDrawer", section: "cart-drawer", selector: "[data-minimog-cart-discounts]" },
      { id: "MinimogCartDrawer", section: "cart-drawer", selector: "[data-cart-subtotal]" },
      { id: "MinimogCartDrawer", section: "cart-drawer", selector: "[data-minimog-gift-wrapping]" }
    ];
  }
}

customElements.define("m-cart-drawer-items", MCartDrawerItems);