(function() {
  const welcome = "Hello! I'm DentaCare AI Assistant. I'm here to help you book appointments, answer dental questions, guide you through the website, and provide support.";
  const services = {
    "teeth cleaning": "Teeth Cleaning removes plaque and tartar, polishes teeth, and helps prevent gum disease. Estimated time: 45 minutes. Recovery: none, though gums may feel tender. Benefits: fresher breath, cleaner teeth, early issue detection. Recommended for most patients every 6 months.",
    fillings: "Fillings repair cavities or small damaged areas with durable material. Estimated time: 60 minutes. Recovery: numbness may last a few hours. Benefits: stops decay, restores tooth shape, protects the tooth. Recommended for patients with cavities or chipped teeth.",
    "teeth whitening": "Teeth Whitening brightens stained teeth using professional whitening products. Estimated time: 90 minutes. Recovery: temporary sensitivity is possible. Benefits: brighter smile and improved confidence. Recommended for patients with healthy teeth and surface stains.",
    "tooth extraction": "Tooth Extraction safely removes a damaged, impacted, or problematic tooth. Estimated time: 75 minutes. Recovery: rest, bite on gauze, avoid straws and smoking. Benefits: relieves pain and prevents infection spread. Recommended when a tooth cannot be saved.",
    "root canal": "Root Canal Treatment removes infected pulp inside a tooth and seals it. Estimated time: 120 minutes. Recovery: mild soreness is common. Benefits: saves the natural tooth and relieves infection pain. Recommended for deep infection or abscess.",
    "dental implants": "Dental Implants replace missing teeth with a long-term artificial root and crown. Estimated time: varies over multiple visits. Recovery: healing occurs over weeks to months. Benefits: stable bite, natural look, jawbone support. Recommended for suitable patients with missing teeth."
  };
  const faqs = [
    [/brush/i, "Brush your teeth twice a day for two minutes with fluoride toothpaste. Floss daily to clean between teeth."],
    [/visit|checkup|check-up/i, "Most patients should visit a dentist every 6 months, though some need more frequent care based on gum health or risk factors."],
    [/cavit/i, "Cavities are caused by bacteria, sugar, and acid weakening tooth enamel. Brushing, flossing, fluoride, and regular cleanings help prevent them."],
    [/whitening.*last|last.*whitening/i, "Teeth whitening can last several months to a few years depending on diet, smoking, oral hygiene, and touch-up care."],
    [/root canal.*pain|pain.*root canal/i, "Root canal treatment is usually done with local anesthetic. Many patients say it feels similar to getting a filling."],
    [/after.*extraction|extraction.*after/i, "After an extraction, bite on gauze as directed, avoid straws, smoking, hard foods, and vigorous rinsing for the first 24 hours."],
    [/plaque/i, "Plaque is a sticky film of bacteria that forms on teeth. If not removed, it can harden into tartar and contribute to cavities or gum disease."],
    [/implant/i, services["dental implants"]],
    [/toothache|tooth ache/i, "A toothache can come from cavities, infection, gum problems, grinding, or trauma. Schedule a dental appointment, especially if pain persists or swelling appears."]
  ];
  const emergencies = /severe bleeding|facial swelling|difficulty breathing|dental trauma|broken jaw|knocked[- ]out tooth|knocked out/i;
  const symptoms = /tooth pain|gum bleeding|bad breath|sensitive teeth|loose tooth|swollen gums|swelling|bleeding gums/i;

  let isOpen = false;
  let isLoggedIn = false;

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function addMessage(text, sender) {
    const body = document.querySelector(".dc-chat-body");
    const message = document.createElement("div");
    message.className = `dc-chat-message ${sender}`;
    message.innerHTML = `<p>${text}</p><time>${nowTime()}</time>`;
    body.appendChild(message);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping(callback) {
    const body = document.querySelector(".dc-chat-body");
    const typing = document.createElement("div");
    typing.className = "dc-chat-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    setTimeout(function() {
      typing.remove();
      callback();
    }, 520);
  }

  function goDashboard(action) {
    if (!isLoggedIn) {
      window.location.href = "login.html";
      return "Please sign in first. I'll take you to the login page.";
    }
    if (typeof window[action] === "function") {
      window[action]();
      return "Done. I opened that section for you.";
    }
    window.location.href = "dashboard.html";
    return "I'll take you to your dashboard.";
  }

  function botReply(input) {
    const text = input.toLowerCase();
    if (!isLoggedIn) return "Please log in to use DentaCare AI Assistant features. You can sign in from the login page.";
    if (emergencies.test(input)) return "This may be a dental or medical emergency. Please contact DentaCare Clinic immediately or visit the nearest emergency medical facility as soon as possible. I cannot replace professional medical care.";
    if (/book|appointment|cleaning next week|take me to booking/.test(text)) return goDashboard("showBookingFlow");
    if (/existing|view.*appointment|upcoming|history|remind/.test(text)) return goDashboard("showHistoryView");
    if (/profile|update my information|my information/.test(text)) return goDashboard("showProfileView");
    if (/password|settings|change my password/.test(text)) return goDashboard("showSettingsView");
    if (/reschedule/.test(text)) return "To reschedule, open History, choose the appointment, and select Reschedule. I can open History for you. " + goDashboard("showHistoryView");
    if (/cancel/.test(text)) return "To cancel, open History and choose Cancel on the appointment card. For urgent cancellations, call the clinic. " + goDashboard("showHistoryView");
    if (/process|how.*book/.test(text)) return "Booking is simple: 1. Choose a service. 2. Pick a dentist. 3. Select a date and time. 4. Confirm your appointment. You will see it under Dashboard and History.";
    if (symptoms.test(input)) return "I can share general information, but I cannot diagnose. Symptoms like pain, gum bleeding, bad breath, sensitivity, loose teeth, or swollen gums can have several causes, including cavities, gum irritation, infection, grinding, or trauma. Please schedule a dental appointment for a professional evaluation.";
    for (const key in services) if (text.includes(key)) return services[key];
    for (const pair of faqs) if (pair[0].test(input)) return pair[1];
    if (/hours|open/.test(text)) return "DentaCare Clinic is open Monday to Friday, 8:00 AM to 5:00 PM, and Saturday, 9:00 AM to 1:00 PM.";
    if (/contact|phone|email|address|parking|directions|payment/.test(text)) return "Clinic info: Phone (+27) 456-7890, email info@dentacareclinic.com, address 123 Dental Street, Smile City. Parking is available near the entrance. We accept card, cash, and common medical aid/insurance plans.";
    if (/prepare|bring|arrive|eat|post-treatment|duration/.test(text)) return "Bring your ID, insurance/medical aid card, medication list, and previous dental records if available. Arrive 10-15 minutes early. For most routine care you may eat beforehand; follow specific instructions for surgery. Post-treatment care depends on the procedure.";
    return "I can help with bookings, appointments, dental FAQs, service information, symptoms, emergency guidance, clinic info, and website navigation. Try asking: 'Take me to booking' or 'What causes cavities?'";
  }

  function sendMessage(text) {
    if (!text.trim()) return;
    addMessage(text, "user");
    showTyping(function() {
      addMessage(botReply(text), "bot");
    });
  }

  function createWidget() {
    const widget = document.createElement("div");
    widget.className = "dc-chatbot";
    widget.innerHTML = `
      <button class="dc-chat-fab" type="button" aria-label="Open DentaCare AI Assistant"><img src="images/robot.png" alt="" aria-hidden="true"></button>
      <section class="dc-chat-window" aria-label="DentaCare AI Assistant">
        <header><div><strong>DentaCare AI</strong><small>Dental support assistant</small></div><button type="button" aria-label="Close chat">&times;</button></header>
        <div class="dc-chat-body"></div>
        <div class="dc-quick-replies">
          <button>Book appointment</button><button>View appointments</button><button>Dental FAQ</button><button>Emergency help</button>
        </div>
        <form class="dc-chat-form"><input type="text" placeholder="Ask me anything..." autocomplete="off"><button type="submit">Send</button></form>
      </section>`;
    document.body.appendChild(widget);
    const fab = widget.querySelector(".dc-chat-fab");
    const win = widget.querySelector(".dc-chat-window");
    const close = widget.querySelector("header button");
    const form = widget.querySelector("form");
    const input = widget.querySelector("input");
    fab.addEventListener("click", function() {
      isOpen = !isOpen;
      win.classList.toggle("open", isOpen);
      if (isOpen && !widget.dataset.welcomed) {
        addMessage(welcome, "bot");
        widget.dataset.welcomed = "true";
      }
    });
    close.addEventListener("click", function() { isOpen = false; win.classList.remove("open"); });
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const text = input.value;
      input.value = "";
      sendMessage(text);
    });
    widget.querySelectorAll(".dc-quick-replies button").forEach(function(button) {
      button.addEventListener("click", function() { sendMessage(button.textContent); });
    });
  }

  function init() {
    if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged(function(user) {
        isLoggedIn = Boolean(user);
      });
    }
    createWidget();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
