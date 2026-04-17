const WHATSAPP_URL =
  "https://wa.me/34676915264?text=Hola%2C%20me%20gustaria%20informacion%20sobre%20vuestros%20servicios";

const STATUS_LABELS = {
  upcoming: "Proximo",
  soldout: "Completo",
  cancelled: "Cancelado",
};

const VIDEO_SECTIONS = [
  {
    section: "zarzuelas",
    containerId: "videos-zarzuelas",
    emptyTitle: "Sube el primer video de zarzuela",
    emptyCopy: "Esta seccion ya esta preparada para nuevos videos de YouTube.",
    gridClass: "grid grid-cols-1 sm:grid-cols-2 gap-6 mt-5",
  },
  {
    section: "recital",
    containerId: "videos-recital",
    emptyTitle: "Sube el siguiente recital",
    emptyCopy: "Puedes anadir nuevas piezas, entrevistas o directos desde contenido.",
    gridClass: "grid grid-cols-1 sm:grid-cols-2 gap-6 mt-5",
  },
  {
    section: "clasico",
    containerId: "videos-clasico",
    emptyTitle: "Sube el primer video clasico",
    emptyCopy: "Esta seccion acepta nuevos enlaces de YouTube para organo y repertorio sacro.",
    gridClass: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-5",
  },
  {
    section: "musicales",
    containerId: "videos-musicales",
    emptyTitle: "Sube el siguiente musical",
    emptyCopy: "Anade trailers, escenas o promocionales a este bloque.",
    gridClass: "grid grid-cols-1 gap-6 mt-5",
  },
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char] || char;
  });
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLongDate(value) {
  const date = parseDate(value);

  if (!date) {
    return "Fecha por confirmar";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateBadge(value) {
  const date = parseDate(value);

  if (!date) {
    return {
      day: "--",
      month: "Fecha",
      year: "",
    };
  }

  return {
    day: new Intl.DateTimeFormat("es-ES", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date),
    year: new Intl.DateTimeFormat("es-ES", { year: "numeric" }).format(date),
  };
}

function setupMobileMenu() {
  const button = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");

  if (!button || !menu) {
    return;
  }

  const setOpen = (isOpen) => {
    menu.classList.toggle("hidden", !isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Cerrar navegacion" : "Abrir navegacion");
  };

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
}

function formatConcertMeta(item) {
  const parts = [];

  if (item.venue) {
    parts.push(escapeHtml(item.venue));
  }

  if (item.city) {
    parts.push(escapeHtml(item.city));
  }

  if (item.time) {
    parts.push(`${escapeHtml(item.time)} h`);
  }

  return parts.length ? parts.join(" · ") : "Lugar y horario por confirmar";
}

function renderConcerts(items) {
  const container = document.getElementById("concerts-list");

  if (!container) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const concerts = [...items]
    .filter((item) => {
      const date = parseDate(item.date);
      return date && date >= today && item.status !== "draft";
    })
    .sort((left, right) => {
      const leftFeatured = left.featured ? 0 : 1;
      const rightFeatured = right.featured ? 0 : 1;

      if (leftFeatured !== rightFeatured) {
        return leftFeatured - rightFeatured;
      }

      return parseDate(left.date) - parseDate(right.date);
    });

  if (!concerts.length) {
    container.innerHTML = `
      <article class="surface-card p-6 md:col-span-2 xl:col-span-3">
        <p class="text-sm font-semibold text-green-800">Agenda en preparacion</p>
        <h3 class="text-2xl font-bold text-gray-900 mt-2">Pronto anunciaremos nuevas fechas</h3>
        <p class="text-gray-600 mt-3">
          Mientras tanto, puedes pedir disponibilidad directa para iglesias, teatros o eventos privados.
        </p>
        <a
          href="${WHATSAPP_URL}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center bg-green-700 text-white px-5 py-3 rounded-full font-semibold hover:bg-green-800 transition mt-5"
        >
          Consultar por WhatsApp
        </a>
      </article>
    `;
    return;
  }

  container.innerHTML = concerts
    .map((item) => {
      const badge = formatDateBadge(item.date);
      const statusLabel = STATUS_LABELS[item.status] || "Proximo";
      const secondaryCta = item.ticketUrl
        ? `
          <a
            href="${escapeHtml(item.ticketUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center text-green-800 font-semibold hover:underline"
          >
            Mas informacion
          </a>
        `
        : `
          <a
            href="${WHATSAPP_URL}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center text-green-800 font-semibold hover:underline"
          >
            Consultar disponibilidad
          </a>
        `;

      return `
        <article class="surface-card p-6 flex flex-col">
          <div class="flex items-start gap-4">
            <div class="date-badge">
              <span class="text-xs uppercase tracking-wide text-green-800">${escapeHtml(badge.month)}</span>
              <strong class="text-gray-900">${escapeHtml(badge.day)}</strong>
              <span class="text-xs text-gray-500">${escapeHtml(badge.year)}</span>
            </div>
            <div class="flex-1">
              <div class="flex flex-wrap gap-2">
                <span class="info-chip">${escapeHtml(statusLabel)}</span>
                ${item.featured ? '<span class="info-chip">Destacado</span>' : ""}
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mt-3">${escapeHtml(item.title || "Concierto")}</h3>
              <p class="text-sm text-gray-600 mt-2">${escapeHtml(formatLongDate(item.date))}</p>
              <p class="text-sm text-gray-600 mt-1">${formatConcertMeta(item)}</p>
            </div>
          </div>
          <p class="text-gray-700 mt-5 flex-1">
            ${escapeHtml(item.description || "Programa en actualizacion.")}
          </p>
          <div class="mt-6">
            ${secondaryCta}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNews(items) {
  const container = document.getElementById("news-list");

  if (!container) {
    return;
  }

  const news = [...items]
    .filter((item) => item.status !== "draft")
    .sort((left, right) => {
      const rightDate = parseDate(right.date);
      const leftDate = parseDate(left.date);
      return rightDate - leftDate;
    });

  if (!news.length) {
    container.innerHTML = `
      <article class="surface-card p-6 md:col-span-2 xl:col-span-3">
        <p class="text-sm font-semibold text-green-800">Sin noticias publicadas</p>
        <h3 class="text-2xl font-bold text-gray-900 mt-2">Este bloque esta listo para nuevos avisos</h3>
        <p class="text-gray-600 mt-3">
          Aqui apareceran estrenos, colaboraciones, entrevistas o nuevas fechas en cuanto se publiquen.
        </p>
      </article>
    `;
    return;
  }

  container.innerHTML = news
    .map((item) => {
      const linkHtml =
        item.linkUrl && item.linkText
          ? `
            <a
              href="${escapeHtml(item.linkUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center text-green-800 font-semibold hover:underline mt-5"
            >
              ${escapeHtml(item.linkText)}
            </a>
          `
          : "";

      return `
        <article class="surface-card p-6 flex flex-col">
          <div class="flex flex-wrap gap-2">
            <span class="info-chip">${escapeHtml(formatLongDate(item.date))}</span>
            ${item.featured ? '<span class="info-chip">Destacada</span>' : ""}
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mt-4">${escapeHtml(item.title || "Noticia")}</h3>
          <p class="text-gray-700 mt-4 flex-1">${escapeHtml(item.summary || "Contenido en actualizacion.")}</p>
          ${linkHtml}
        </article>
      `;
    })
    .join("");
}

function extractYoutubeId(url) {
  try {
    const parsed = new URL(String(url || ""));

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\/+/, "").split("/")[0];
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/")[2] || "";
    }

    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/")[2] || "";
    }

    return parsed.searchParams.get("v") || "";
  } catch (error) {
    return "";
  }
}

function getYoutubeEmbedUrl(url) {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : "";
}

function sortVideos(items) {
  return [...items].sort((left, right) => {
    const leftPosition = Number.isFinite(left.position) ? left.position : Number.MAX_SAFE_INTEGER;
    const rightPosition = Number.isFinite(right.position) ? right.position : Number.MAX_SAFE_INTEGER;

    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    const leftFeatured = left.featured ? 0 : 1;
    const rightFeatured = right.featured ? 0 : 1;

    if (leftFeatured !== rightFeatured) {
      return leftFeatured - rightFeatured;
    }

    return String(left.title || "").localeCompare(String(right.title || ""), "es");
  });
}

function renderVideoCollection(items) {
  VIDEO_SECTIONS.forEach((config) => {
    const container = document.getElementById(config.containerId);

    if (!container) {
      return;
    }

    const videos = sortVideos(items.filter((item) => item.section === config.section));

    if (!videos.length) {
      container.innerHTML = `
        <article class="surface-card p-5">
          <p class="text-sm font-semibold text-green-800">${escapeHtml(config.emptyTitle)}</p>
          <p class="text-gray-600 mt-2">${escapeHtml(config.emptyCopy)}</p>
        </article>
      `;
      container.className = "mt-5";
      return;
    }

    container.className = config.gridClass;
    container.innerHTML = videos
      .map((item) => {
        const embedUrl = getYoutubeEmbedUrl(item.youtubeUrl);

        if (!embedUrl) {
          return "";
        }

        return `
          <article class="surface-card p-5">
            <div class="video-wrapper">
              <iframe
                src="${escapeHtml(embedUrl)}"
                title="${escapeHtml(item.title || "Video de Luryart")}"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
            <div class="flex flex-wrap gap-2 mt-4">
              ${item.featured ? '<span class="info-chip">Destacado</span>' : ""}
            </div>
            <h3 class="text-xl font-bold text-gray-900 mt-3">${escapeHtml(item.title || "Video")}</h3>
            ${item.description ? `<p class="text-gray-600 mt-2">${escapeHtml(item.description)}</p>` : ""}
            <a
              href="${escapeHtml(item.youtubeUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center text-green-800 font-semibold hover:underline mt-4"
            >
              Ver en YouTube
            </a>
          </article>
        `;
      })
      .join("");
  });
}

async function loadCollection(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function initContent() {
  try {
    const [concerts, news, videos] = await Promise.all([
      loadCollection("content/concerts.json"),
      loadCollection("content/news.json"),
      loadCollection("content/videos.json"),
    ]);

    renderConcerts(concerts);
    renderNews(news);
    renderVideoCollection(videos);
  } catch (error) {
    console.error(error);
    renderConcerts([]);
    renderNews([]);
    renderVideoCollection([]);
  }
}

function setCurrentYear() {
  const node = document.getElementById("current-year");

  if (node) {
    node.textContent = String(new Date().getFullYear());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setCurrentYear();
  initContent();
});
