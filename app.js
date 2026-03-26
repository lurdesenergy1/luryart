const WHATSAPP_URL =
  "https://wa.me/34676915264?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20vuestros%20servicios";

const STATUS_LABELS = {
  upcoming: "Próximo",
  soldout: "Completo",
  cancelled: "Cancelado",
};

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
    button.setAttribute("aria-label", isOpen ? "Cerrar navegación" : "Abrir navegación");
  };

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
    });
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
        <p class="text-sm font-semibold text-green-800">Agenda en actualización</p>
        <h3 class="text-2xl font-bold text-gray-900 mt-2">Pronto anunciaremos nuevas fechas</h3>
        <p class="text-gray-600 mt-3">
          Este bloque ya está preparado para futuros conciertos. Mientras tanto, puedes consultar disponibilidad directa para eventos privados o programaciones culturales.
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
      const statusLabel = STATUS_LABELS[item.status] || "Próximo";
      const secondaryCta = item.ticketUrl
        ? `
          <a
            href="${escapeHtml(item.ticketUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center text-green-800 font-semibold hover:underline"
          >
            Más información
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
            ${escapeHtml(item.description || "Programa en actualización.")}
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
        <h3 class="text-2xl font-bold text-gray-900 mt-2">Este espacio ya está listo para nuevas publicaciones</h3>
        <p class="text-gray-600 mt-3">
          Aquí podrás anunciar conciertos, nuevas colaboraciones, estrenos, entrevistas o cualquier novedad importante.
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
          <p class="text-gray-700 mt-4 flex-1">${escapeHtml(item.summary || "Contenido en actualización.")}</p>
          ${linkHtml}
        </article>
      `;
    })
    .join("");
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
    const concerts = await loadCollection("content/concerts.json");
    renderConcerts(concerts);
  } catch (error) {
    console.error(error);
    renderConcerts([]);
  }

  try {
    const news = await loadCollection("content/news.json");
    renderNews(news);
  } catch (error) {
    console.error(error);
    renderNews([]);
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
