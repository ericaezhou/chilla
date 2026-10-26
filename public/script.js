(() => {
  const params = new URLSearchParams(location.search);
  // Track where sign-ups come from (e.g. ?utm_source=reddit or ?ref=lenny)
  const source = params.get("utm_source") || params.get("ref") || "";
  const referrer = document.referrer || "";

  const joinCard = document.querySelector(".join-card");
  const mainForm = document.querySelector('[data-form="main"]');
  const toastEl = document.querySelector(".toast");

  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (toastEl.hidden = true), 4200);
  }

  function setPlan(plan) {
    const radio = mainForm.querySelector(`input[name="plan"][value="${plan}"]`);
    if (radio) radio.checked = true;
  }

  async function submit(data) {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source, referrer }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
    return body;
  }

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Hero quick form: save the email right away, then offer the longer form
  document.querySelector('[data-form="hero"]').addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector("button");
    const email = form.email.value.trim();
    if (!validEmail(email)) return toast("That email doesn't look right.");
    btn.disabled = true;
    try {
      await submit({ email, plan: "standard", step: "hero" });
      mainForm.email.value = email;
      setPlan("standard");
      toast("You're on the list! 🎉 Add a few details below to help us set you up.");
      document.getElementById("join").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  // Pricing buttons preselect the plan
  document.querySelectorAll("[data-plan]").forEach((btn) =>
    btn.addEventListener("click", () => {
      setPlan(btn.dataset.plan);
      document.getElementById("join").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => mainForm.email.focus({ preventScroll: true }), 500);
    })
  );

  // Main form
  mainForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = mainForm.querySelector(".form-msg");
    const btn = mainForm.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(mainForm));
    msg.className = "form-msg";
    if (!validEmail((data.email || "").trim())) {
      msg.textContent = "Please enter a valid work email.";
      msg.classList.add("err");
      return;
    }
    btn.disabled = true;
    msg.textContent = "Saving your spot…";
    try {
      await submit({ ...data, step: "full" });
      const planLabel = { free: "Free", standard: "Standard ($15/mo)", premium: "Premium ($29/mo)" }[data.plan] || "";
      const thanks = document.createElement("div");
      thanks.className = "thanks";
      thanks.innerHTML = `<span class="hand">squeak squeak! 🐭</span><h3>You're in.</h3>
        <p>We saved your spot on the <b></b> pilot. Look for an email from the Chilla team this week.</p>`;
      thanks.querySelector("b").textContent = planLabel;
      joinCard.classList.add("done");
      joinCard.appendChild(thanks);
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add("err");
    } finally {
      btn.disabled = false;
    }
  });
})();
