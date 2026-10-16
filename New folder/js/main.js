/* =========================================================
   Personal website — shared interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Current year in the footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header shadow after scrolling ---------- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  function closeMenu() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("is-open");
  }
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      navMenu.classList.toggle("is-open", !isOpen);
    });
    // Close after choosing a page
    navMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
    // Close when clicking outside the nav
    document.addEventListener("click", function (e) {
      if (
        navMenu.classList.contains("is-open") &&
        !e.target.closest(".nav")
      ) {
        closeMenu();
      }
    });
    // Close with the Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeMenu();
        navToggle.blur();
      }
    });
    // Reset state when resizing back up to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 640) closeMenu();
    });
  }

  /* ---------- Reveal-on-scroll animations ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Contact form (front-end demo) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var success = document.getElementById("form-success");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (success) success.classList.add("show");
      form.reset();
      // Move focus to the success message for screen-reader users
      if (success) {
        success.setAttribute("tabindex", "-1");
        success.focus({ preventScroll: true });
      }
    });
  }

  /* ---------- Print / save resume as PDF ---------- */
  var printBtn = document.getElementById("print-resume");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  /* =========================================================
     To-Do List app (Projects page)
     Calendar date picker + task list; persists to Supabase
     ========================================================= */
  var todoForm = document.getElementById("todo-form");
  if (todoForm) {
    /* ---------- Supabase client ---------- */
    var SUPABASE_URL = "https://btsztcktrwmkuqtektmm.supabase.co";
    var SUPABASE_KEY = "sb_publishable_55kmc5Ydy-b1NfVkkqmb3g_9C96Oim8";
    var supabaseClient = window.supabase
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

    var state = {
      tasks: [],
      selectedDate: todayISO(),
      viewYear: new Date().getFullYear(),
      viewMonth: new Date().getMonth() // 0-11
    };

    var todoInput = document.getElementById("todo-input");
    var todoList = document.getElementById("todo-list");
    var emptyState = document.getElementById("empty-state");
    var selectedDateEl = document.getElementById("selected-date");
    var calGrid = document.getElementById("cal-grid");
    var calTitle = document.getElementById("cal-title");
    var calPrev = document.getElementById("cal-prev");
    var calNext = document.getElementById("cal-next");
    var emojiPicker = document.getElementById("emoji-picker");
    var prioritySelect = document.getElementById("todo-priority");
    var todoCounter = document.getElementById("todo-counter");
    var selectedEmoji = "";

    var MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];

    /* ---------- Helpers ---------- */
    function todayISO() {
      var d = new Date();
      return toISO(d);
    }
    function toISO(d) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }
    function parseISO(iso) {
      var parts = iso.split("-");
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    function formatDateLong(iso) {
      var d = parseISO(iso);
      return d.toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
    }
    function formatDateShort(iso) {
      var d = parseISO(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    /* ---------- Supabase data layer ---------- */
    /* Map a Supabase row to the app's task shape.
       DB columns -> app fields:
         task -> text, is_complete -> completed */
    function mapRow(r) {
      return {
        id: r.id,
        text: r.task,
        completed: r.is_complete,
        date: r.date,
        emoji: r.emoji,
        priority: r.priority,
        created_at: r.created_at
      };
    }

    async function loadTasks() {
      if (!supabaseClient) return [];
      var res = await supabaseClient
        .from("todos")
        .select("*")
        .order("created_at", { ascending: true });
      if (res.error) {
        console.error("Failed to load todos:", res.error.message);
        return [];
      }
      return (res.data || []).map(mapRow);
    }

    /* ---------- Calendar ---------- */
    function renderCalendar() {
      calTitle.textContent = MONTHS[state.viewMonth] + " " + state.viewYear;
      calGrid.innerHTML = "";

      var firstDay = new Date(state.viewYear, state.viewMonth, 1).getDay();
      var daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
      var today = todayISO();

      // Leading blanks
      for (var i = 0; i < firstDay; i++) {
        var blank = document.createElement("span");
        blank.className = "cal-cell cal-blank";
        calGrid.appendChild(blank);
      }

      // Day cells
      for (var d = 1; d <= daysInMonth; d++) {
        var cellISO = toISO(new Date(state.viewYear, state.viewMonth, d));
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cal-cell cal-day";
        cell.textContent = String(d);
        cell.dataset.date = cellISO;

        if (cellISO === today) cell.classList.add("is-today");
        if (cellISO === state.selectedDate) cell.classList.add("is-selected");

        // Show a dot if there are tasks on this date
        if (state.tasks.some(function (t) { return t.date === cellISO; })) {
          cell.classList.add("has-tasks");
        }

        cell.addEventListener("click", function () {
          state.selectedDate = this.dataset.date;
          renderCalendar();
          renderTasks();
        });
        calGrid.appendChild(cell);
      }
    }

    /* ---------- Tasks ---------- */
    function getTasksForDate(iso) {
      return state.tasks.filter(function (t) { return t.date === iso; });
    }

    async function addTask(text, emoji, priority) {
      var trimmed = text.trim();
      if (!trimmed) return;
      var row = {
        task: trimmed,
        date: state.selectedDate,
        is_complete: false,
        emoji: emoji || "",
        priority: priority || "medium"
      };
      var res = await supabaseClient
        .from("todos")
        .insert(row)
        .select()
        .single();
      if (res.error) {
        console.error("Insert failed:", res.error.message);
        return;
      }
      state.tasks.push(mapRow(res.data));
      renderCalendar();
      renderTasks();
    }

    async function toggleTask(id) {
      var task = state.tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      var newVal = !task.completed;
      var res = await supabaseClient
        .from("todos")
        .update({ is_complete: newVal })
        .eq("id", id);
      if (res.error) {
        console.error("Toggle failed:", res.error.message);
        return;
      }
      task.completed = newVal;
      renderTasks();
    }

    async function deleteTask(id) {
      var res = await supabaseClient
        .from("todos")
        .delete()
        .eq("id", id);
      if (res.error) {
        console.error("Delete failed:", res.error.message);
        return;
      }
      state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
      renderCalendar();
      renderTasks();
    }

    /* ---------- Inline editing ---------- */
    function startEdit(span) {
      if (span.isContentEditable) return;
      span.contentEditable = "true";
      span.focus();
      var range = document.createRange();
      range.selectNodeContents(span);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    function finishEdit(span, task, save) {
      if (!span.isContentEditable) return;
      var original = task.text;
      var next = span.textContent.trim();
      span.contentEditable = "false";
      if (save && next && next !== original) {
        task.text = next;
        supabaseClient
          .from("todos")
          .update({ task: next })
          .eq("id", task.id)
          .then(function (res) {
            if (res.error) console.error("Edit save failed:", res.error.message);
          });
      } else {
        span.textContent = original;
      }
    }

    function renderTasks() {
      var dayTasks = getTasksForDate(state.selectedDate);

      selectedDateEl.textContent = "Tasks for " + formatDateLong(state.selectedDate);

      todoList.innerHTML = "";
      dayTasks.forEach(function (task) {
        var li = document.createElement("li");
        li.className = "todo-item" + (task.completed ? " completed" : "");

        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-check";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Mark task as " + (task.completed ? "incomplete" : "complete"));
        checkbox.addEventListener("change", function () { toggleTask(task.id); });

        var textSpan = document.createElement("span");
        textSpan.className = "todo-text";
        textSpan.textContent = task.text;
        textSpan.title = "Click to edit";
        textSpan.tabIndex = 0;
        textSpan.addEventListener("click", function () { startEdit(textSpan); });
        textSpan.addEventListener("keydown", function (e) {
          if (textSpan.isContentEditable) {
            if (e.key === "Enter") { e.preventDefault(); finishEdit(textSpan, task, true); }
            else if (e.key === "Escape") { e.preventDefault(); finishEdit(textSpan, task, false); }
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEdit(textSpan);
          }
        });
        textSpan.addEventListener("blur", function () { finishEdit(textSpan, task, true); });

        var emojiSpan = document.createElement("span");
        emojiSpan.className = "todo-emoji";
        emojiSpan.textContent = task.emoji || "";

        var badge = document.createElement("span");
        badge.className = "priority-badge priority-" + (task.priority || "medium");
        badge.textContent = (task.priority || "medium").charAt(0).toUpperCase() + (task.priority || "medium").slice(1);

        var del = document.createElement("button");
        del.type = "button";
        del.className = "todo-delete";
        del.innerHTML = "&times;";
        del.setAttribute("aria-label", "Delete task");
        del.addEventListener("click", function () { deleteTask(task.id); });

        li.appendChild(checkbox);
        li.appendChild(emojiSpan);
        li.appendChild(textSpan);
        li.appendChild(badge);
        li.appendChild(del);
        todoList.appendChild(li);
      });

      emptyState.hidden = dayTasks.length !== 0;

      if (todoCounter) {
        var done = dayTasks.filter(function (t) { return t.completed; }).length;
        var total = dayTasks.length;
        todoCounter.textContent = done + " of " + total + " task" + (total === 1 ? "" : "s") + " completed";
        todoCounter.hidden = total === 0;
      }
    }

    /* ---------- Events ---------- */
    todoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      addTask(todoInput.value, selectedEmoji, prioritySelect.value);
      todoInput.value = "";
      todoInput.focus();
      // Reset emoji picker to "no emoji"
      selectedEmoji = "";
      emojiPicker.querySelectorAll(".emoji-btn").forEach(function (btn) {
        btn.classList.toggle("selected", btn.dataset.emoji === "");
      });
    });

    // Emoji picker selection
    if (emojiPicker) {
      emojiPicker.addEventListener("click", function (e) {
        var btn = e.target.closest(".emoji-btn");
        if (!btn) return;
        selectedEmoji = btn.dataset.emoji;
        emojiPicker.querySelectorAll(".emoji-btn").forEach(function (b) {
          b.classList.toggle("selected", b === btn);
        });
      });
    }

    calPrev.addEventListener("click", function () {
      state.viewMonth--;
      if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
      renderCalendar();
    });

    calNext.addEventListener("click", function () {
      state.viewMonth++;
      if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
      renderCalendar();
    });

    /* ---- Initial render ---- */
    renderCalendar();
    renderTasks();
    // Load todos from Supabase on page load, ordered by created time
    (async function init() {
      state.tasks = await loadTasks();
      renderCalendar();
      renderTasks();
    })();
  }

  /* =========================================================
     Weather app (Projects page)
     Search a city and show its current weather from the UAPI API:
     https://uapis.cn/api/v1/misc/weather?city=...
     ========================================================= */
  var weatherForm = document.getElementById("weather-form");
  if (weatherForm) {
    var WEATHER_API_URL = "https://uapis.cn/api/v1/misc/weather";
    var weatherInput = document.getElementById("weather-city");
    var weatherResult = document.getElementById("weather-result");

    /* Weather icon codes -> emoji (same code scheme as the API response) */
    var WEATHER_ICONS = {
      "100": "☀️", "101": "⛅", "102": "⛅", "103": "⛅", "104": "☁️",
      "150": "🌙", "151": "🌙", "152": "🌙", "153": "🌙",
      "302": "⛈️", "303": "⛈️", "304": "⛈️",
      "404": "🌨️", "405": "🌨️",
      "503": "🌪️", "504": "🌪️", "507": "🌪️", "508": "🌪️",
      "900": "🔥", "901": "🥶"
    };

    /* The API returns conditions in Chinese; the site is in English */
    var WEATHER_TEXT_EN = {
      "晴": "Clear", "少云": "Mostly clear", "晴间多云": "Mostly sunny",
      "多云": "Partly cloudy", "阴": "Overcast", "阴天": "Overcast",
      "阵雨": "Showers", "雷阵雨": "Thunderstorm", "强雷阵雨": "Severe thunderstorm",
      "雷阵雨伴有冰雹": "Thunderstorm with hail", "雷阵雨伴冰雹": "Thunderstorm with hail",
      "毛毛雨": "Drizzle", "小毛毛雨": "Light drizzle", "细雨": "Light drizzle",
      "小雨": "Light rain", "中雨": "Moderate rain", "大雨": "Heavy rain",
      "暴雨": "Rainstorm", "大暴雨": "Heavy rainstorm", "特大暴雨": "Severe rainstorm",
      "极端降雨": "Extreme rain", "冻雨": "Freezing rain",
      "雨夹雪": "Sleet", "阵雨夹雪": "Sleet showers",
      "小雪": "Light snow", "中雪": "Moderate snow", "大雪": "Heavy snow",
      "暴雪": "Blizzard", "阵雪": "Snow showers",
      "雾": "Fog", "薄雾": "Mist", "浓雾": "Dense fog", "大雾": "Fog",
      "强浓雾": "Heavy fog", "特强浓雾": "Very heavy fog",
      "霾": "Haze", "中度霾": "Moderate haze", "重度霾": "Heavy haze", "严重霾": "Severe haze",
      "浮尘": "Dust", "扬沙": "Blowing sand",
      "沙尘暴": "Sandstorm", "强沙尘暴": "Severe sandstorm",
      "热": "Hot", "冷": "Cold"
    };

    /* One pinyin spelling can match several real cities (the API only
       ever resolves one of them), so index the well-known homophone
       sets by adcode and show every city the name could mean. */
    var HOMOPHONE_CITIES = {
      "suzhou":   ["320500", "341300"], // 苏州 (Jiangsu) / 宿州 (Anhui)
      "fuzhou":   ["350100", "361000"], // 福州 (Fujian) / 抚州 (Jiangxi)
      "taizhou":  ["331000", "321200"], // 台州 (Zhejiang) / 泰州 (Jiangsu)
      "yichun":   ["360900", "230700"], // 宜春 (Jiangxi) / 伊春 (Heilongjiang)
      "jinzhou":  ["210700", "130183"], // 锦州 (Liaoning) / 晋州 (Hebei)
      "yulin":    ["610800", "450900"], // 榆林 (Shaanxi) / 玉林 (Guangxi)
      "dali":     ["532900", "610523"], // 大理 (Yunnan) / 大荔 (Shaanxi)
      "quanzhou": ["350500", "450324"], // 泉州 (Fujian) / 全州 (Guangxi)
      "jian":     ["360800", "220582"], // 吉安 (Jiangxi) / 集安 (Jilin)
      "suining":  ["510900", "320324"], // 遂宁 (Sichuan) / 睢宁 (Jiangsu)
      "jixi":     ["230300", "341824"]  // 鸡西 (Heilongjiang) / 绩溪 (Anhui)
    };

    /* Normalize a typed name so "Su Zhou", "Sūzhōu" and "suzhou" all match */
    function cityKey(value) {
      return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")  // drop tone marks
        .toLowerCase()
        .replace(/[^a-z]/g, "");          // letters only
    }

    /* Pick an icon from the API code, falling back to the condition text */
    function weatherIcon(code, text) {
      if (code && WEATHER_ICONS[code]) return WEATHER_ICONS[code];
      if (code) {
        var group = String(code).charAt(0);
        if (group === "1") return "⛅";
        if (group === "2") return "🌬️";
        if (group === "3") return "🌧️";
        if (group === "4") return "❄️";
        if (group === "5") return "🌫️";
      }
      var t = String(text || "");
      if (/雪/.test(t)) return "❄️";
      if (/雷/.test(t)) return "⛈️";
      if (/雨/.test(t)) return "🌧️";
      if (/霾|雾|尘|沙/.test(t)) return "🌫️";
      if (/阴/.test(t)) return "☁️";
      if (/云/.test(t)) return "⛅";
      if (/晴/.test(t)) return "☀️";
      return "🌡️";
    }

    /* Translate a Chinese condition into a short English label */
    function weatherText(zh) {
      var raw = String(zh || "").trim();
      if (!raw) return "—";
      if (WEATHER_TEXT_EN[raw]) return WEATHER_TEXT_EN[raw];
      var keys = Object.keys(WEATHER_TEXT_EN).sort(function (a, b) {
        return b.length - a.length; // longest match first
      });
      for (var i = 0; i < keys.length; i++) {
        if (raw.indexOf(keys[i]) !== -1) return WEATHER_TEXT_EN[keys[i]];
      }
      return raw;
    }

    /* Replace the result area with a plain status message */
    function showWeatherMessage(message, kind) {
      weatherResult.innerHTML = "";
      var p = document.createElement("p");
      p.className = "weather-message" + (kind ? " is-" + kind : "");
      p.textContent = message;
      weatherResult.appendChild(p);
    }

    /* Fetch the current weather for one location (null if unavailable) */
    async function fetchWeather(params) {
      var query = Object.keys(params).map(function (key) {
        return key + "=" + encodeURIComponent(params[key]);
      }).join("&");
      try {
        var res = await fetch(WEATHER_API_URL + "?" + query);
        if (!res.ok) return null;
        var data = await res.json();
        if (!data || typeof data.temperature !== "number" || !data.weather) return null;
        return data;
      } catch (err) {
        return null;
      }
    }

    /* Build one result card. showRegion adds the province so that two
       cities sharing a name can be told apart. */
    function buildWeatherCard(data, showRegion) {
      var card = document.createElement("div");
      card.className = "weather-card";

      var icon = document.createElement("span");
      icon.className = "weather-icon";
      icon.textContent = weatherIcon(data.weather_icon, data.weather);
      icon.setAttribute("aria-hidden", "true");

      var info = document.createElement("div");
      info.className = "weather-info";

      var cityEl = document.createElement("p");
      cityEl.className = "weather-city";
      cityEl.textContent = data.district || data.city || data.province || "—";

      var tempEl = document.createElement("p");
      tempEl.className = "weather-temp";
      tempEl.textContent = (Math.round(data.temperature * 10) / 10) + "°C";

      var condEl = document.createElement("p");
      condEl.className = "weather-cond";
      condEl.textContent = weatherText(data.weather);

      info.appendChild(cityEl);
      info.appendChild(tempEl);
      info.appendChild(condEl);

      if (showRegion) {
        var region = [data.province, data.district ? data.city : ""].filter(function (part) {
          return part && part !== cityEl.textContent;
        }).join(" · ");
        if (region) {
          var regionEl = document.createElement("p");
          regionEl.className = "weather-region";
          regionEl.textContent = region;
          info.appendChild(regionEl);
        }
      }

      card.appendChild(icon);
      card.appendChild(info);
      return card;
    }

    /* A single match: one card */
    function showWeather(data) {
      weatherResult.innerHTML = "";
      weatherResult.appendChild(buildWeatherCard(data, false));
    }

    /* Several matches for the same name: a card for each one */
    function showWeatherList(list, searchedCity) {
      weatherResult.innerHTML = "";

      var note = document.createElement("p");
      note.className = "weather-note";
      note.textContent = list.length + " matches for “" + searchedCity + "”";
      weatherResult.appendChild(note);

      var wrap = document.createElement("div");
      wrap.className = "weather-list";
      list.forEach(function (data) {
        wrap.appendChild(buildWeatherCard(data, true));
      });
      weatherResult.appendChild(wrap);
    }

    weatherForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      var city = weatherInput.value.trim();

      /* Empty search box — don't hit the API at all */
      if (!city) {
        showWeatherMessage("Enter a city first.", "error");
        weatherInput.focus();
        return;
      }

      /* A page opened straight from a file has no origin and the API
         rejects those requests, so send the user to the launcher
         instead of blaming the spelling. */
      if (location.protocol === "file:") {
        showWeatherMessage(
          "Open this site with “Start Website.bat” first — a page opened as a file can’t reach the weather API.",
          "error"
        );
        return;
      }

      var key = cityKey(city);
      var matches = Array.isArray(HOMOPHONE_CITIES[key]) ? HOMOPHONE_CITIES[key] : [];

      showWeatherMessage("Loading…");

      /* Ambiguous name — ask the API about every city it could be */
      if (matches.length > 1) {
        var results = await Promise.all(matches.map(function (adcode) {
          return fetchWeather({ adcode: adcode });
        }));
        var found = results.filter(function (data) { return data; });

        if (found.length > 1) showWeatherList(found, city);
        else if (found.length === 1) showWeather(found[0]);
        else showWeatherMessage("Couldn’t find that city — check the spelling.", "error");
        return;
      }

      var data = await fetchWeather({ city: city });
      if (data) showWeather(data);
      else showWeatherMessage("Couldn’t find that city — check the spelling.", "error");
    });
  }
})();
