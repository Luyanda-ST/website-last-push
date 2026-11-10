(() => {
  const emailRecipient = "info@helpinghandhaven.org.za";
  const navToggle = document.querySelector("#nav-toggle");
  const primaryNavigation = document.querySelector("#primary-navigation");

  // Close the compact menu after navigation or when Escape is pressed.
  if (navToggle && primaryNavigation) {
    primaryNavigation.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        navToggle.checked = false;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navToggle.checked) {
        navToggle.checked = false;
        navToggle.focus();
      }
    });
  }

  // Validate form fields, then send valid submissions to the email service.
  document.querySelectorAll("form[data-email-form]").forEach((form) => {
    const status = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector('button[type="submit"]');
    const nameField = form.querySelector('input[name="full-name"]');
    const emailField = form.querySelector('input[type="email"]');
    const phoneField = form.querySelector('input[type="tel"]');
    const messageField = form.querySelector("textarea[name=message]");
    if (!(status instanceof HTMLElement) || !(submitButton instanceof HTMLButtonElement)) return;

    const validateName = () => {
      if (!nameField) return;
      const value = nameField.value.trim();
      const isValid = value === "" ? nameField.value === "" : (/\p{L}/u.test(value) && /^[\p{L}\p{M} .’'-]+$/u.test(value));
      nameField.setCustomValidity(isValid ? "" : "Please enter your name using letters. Spaces, apostrophes, and hyphens are also allowed.");
    };

    const validateEmail = () => {
      if (!emailField) return;
      const value = emailField.value.trim();
      const isValid = value === "" ? emailField.value === "" : /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value);
      emailField.setCustomValidity(isValid ? "" : "Enter a complete email address, such as name@example.com.");
    };

    const validatePhone = () => {
      if (!phoneField) return;
      const value = phoneField.value.trim();
      const digits = value.match(/\d/g) || [];
      const isValid = value === "" ? phoneField.value === "" : (/^[0-9\s()+-]+$/.test(value) && digits.length === 10);
      phoneField.setCustomValidity(isValid ? "" : "Enter exactly 10 digits. Spaces, hyphens, and parentheses are okay.");
    };

    const validateMessage = () => {
      if (!messageField) return;
      const value = messageField.value.trim();
      const isValid = value === "" ? messageField.value === "" : value.length >= 10;
      messageField.setCustomValidity(isValid ? "" : "Please write a message with at least 10 characters.");
    };

    // Use our clearer field messages in the browser's validation popup.
    form.noValidate = true;
    form.addEventListener("input", (event) => {
      if (event.target === nameField) validateName();
      if (event.target === emailField) validateEmail();
      if (event.target === phoneField) validatePhone();
      if (event.target === messageField) validateMessage();
      status.hidden = true;
      status.replaceChildren();
    });

    // Clear any message and field warnings when the form is reset.
    form.addEventListener("reset", () => {
      [nameField, emailField, phoneField, messageField].forEach((field) => field?.setCustomValidity(""));
      status.hidden = true;
      status.replaceChildren();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      validateName();
      validateEmail();
      validatePhone();
      validateMessage();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const honeypot = form.querySelector('input[name="_honey"]');
      if (honeypot && honeypot.value.trim() !== "") return;

      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
      status.textContent = "Sending your message...";
      status.hidden = false;
      const submissionData = new FormData(form);
      if (phoneField) submissionData.set("phone", phoneField.value.replace(/\D/g, ""));

      try {
        const response = await fetch(form.dataset.ajaxAction || form.action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
                    body: JSON.stringify(Object.fromEntries(submissionData))
        });
        const result = await response.json();

        if (!response.ok || (result.success !== true && result.success !== "true")) {
          throw new Error("The email service did not accept the message.");
        }

        if (result.message && /confirm|activate/i.test(result.message)) {
          status.textContent = "The email service needs its first-time confirmation before messages can be delivered. Check the website inbox for its verification email.";
        } else {
          status.textContent = "Thank you. Your message was submitted successfully.";
        }
        form.reset();
      } catch (error) {
        const formData = new FormData(form);
        const subject = form.querySelector('input[name="_subject"]')?.value || "Website enquiry";
        const body = Array.from(formData.entries())
          .filter(([name]) => !name.startsWith("_"))
          .map(([name, value]) => `${name}: ${value}`)
          .join("\n");
        const emailLink = document.createElement("a");
        emailLink.href = `mailto:${emailRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        emailLink.textContent = "email us directly instead";
        status.replaceChildren(document.createTextNode("We could not send the form just now. Please "), emailLink, document.createTextNode("."));
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        status.focus();
      }
    });
  });

  // Open gallery photos in a larger view and let visitors move between them.
  const gallery = document.querySelector("#photo-gallery");
  const lightbox = document.querySelector("#gallery-lightbox");
  if (gallery && lightbox && typeof lightbox.showModal === "function") {
    const galleryItems = Array.from(gallery.querySelectorAll("[data-gallery-item]"));
    const lightboxImage = lightbox.querySelector("#lightbox-image");
    const lightboxCaption = lightbox.querySelector("#lightbox-caption");
    const lightboxCount = lightbox.querySelector("#lightbox-count");
    const previousButton = lightbox.querySelector("#lightbox-previous");
    const nextButton = lightbox.querySelector("#lightbox-next");
    let currentIndex = 0;
    let lastOpenedButton = null;

    const showPhoto = () => {
      const item = galleryItems[currentIndex];
      if (!item) return;
      const button = item.querySelector(".gallery-open");
      const thumbnail = button?.querySelector("img");
      if (!button || !thumbnail || !lightboxImage || !lightboxCaption || !lightboxCount) return;
      lightboxImage.src = button.dataset.full;
      lightboxImage.alt = thumbnail.alt;
      lightboxCaption.textContent = item.querySelector("figcaption")?.textContent || "";
      lightboxCount.textContent = `Photo ${currentIndex + 1} of ${galleryItems.length}`;
    };

    const openPhoto = (button) => {
      const item = button.closest("[data-gallery-item]");
      currentIndex = galleryItems.indexOf(item);
      if (currentIndex < 0) return;
      lastOpenedButton = button;
      showPhoto();
      lightbox.showModal();
    };

    const movePhoto = (step) => {
      if (!galleryItems.length) return;
      currentIndex = (currentIndex + step + galleryItems.length) % galleryItems.length;
      showPhoto();
    };

    gallery.addEventListener("click", (event) => {
      if (event.target instanceof Element) {
        const button = event.target.closest(".gallery-open");
        if (button) openPhoto(button);
      }
    });
    lightbox.querySelector(".lightbox-close")?.addEventListener("click", () => lightbox.close());
    previousButton?.addEventListener("click", () => movePhoto(-1));
    nextButton?.addEventListener("click", () => movePhoto(1));
    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") movePhoto(-1);
      if (event.key === "ArrowRight") movePhoto(1);
    });
    lightbox.addEventListener("close", () => lastOpenedButton?.focus());
  }
  // Reveal selected sections as they enter the screen; skip this for reduced motion.
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("has-scroll-reveal");
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));
  }
})();