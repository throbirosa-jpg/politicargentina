/**
 * Mapa interactivo de provincias argentinas (GeoJSON oficial Georef + D3.js v7).
 */
(function () {
  const FILL_CELESTE = '#74ACDF';
  const FILL_SOL = '#F6B40E';
  const STROKE_CREMA = '#FBF7F0';
  const CABA_ID = '02';

  function esCaba(props) {
    return props.id === CABA_ID || /ciudad autónoma/i.test(props.nombre || '');
  }

  function fillDefault(props) {
    return esCaba(props) ? FILL_SOL : FILL_CELESTE;
  }

  function normalizarNombre(nombre) {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,.*/, '')
      .trim();
  }

  function scrollAListado(nombre) {
    const objetivo = normalizarNombre(nombre);
    const cards = document.querySelectorAll('.provincia-card');
    for (const card of cards) {
      const titulo = card.querySelector('.prov-nombre');
      if (!titulo) continue;
      const texto = normalizarNombre(titulo.textContent);
      if (texto === objetivo || texto.startsWith(objetivo) || objetivo.startsWith(texto)) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }

  async function initMapaArgentina(config) {
    const container = document.querySelector(config.container);
    if (!container || typeof d3 === 'undefined') return;

    const tooltip = config.tooltipId ? document.getElementById(config.tooltipId) : null;
    const conClick = config.mode === 'indice';
    const geoUrl = config.geoUrl || 'provincias.geojson';

    let geo;
    try {
      const res = await fetch(geoUrl);
      if (!res.ok) throw new Error(res.statusText);
      geo = await res.json();
    } catch (err) {
      console.error('No se pudo cargar provincias.geojson:', err);
      return;
    }

    container.querySelectorAll('svg.map-svg').forEach((el) => el.remove());

    const svg = d3
      .select(container)
      .append('svg')
      .attr('class', 'map-svg')
      .attr('role', 'img')
      .attr('aria-label', 'Mapa de las provincias de la República Argentina');

    const capa = svg.append('g');

    function posicionarTooltip(evento) {
      if (!tooltip) return;
      const rect = container.getBoundingClientRect();
      tooltip.style.left = evento.clientX - rect.left + 12 + 'px';
      tooltip.style.top = evento.clientY - rect.top + 12 + 'px';
    }

    function dibujar() {
      const { width, height } = container.getBoundingClientRect();
      if (width < 8 || height < 8) return;

      svg.attr('viewBox', `0 0 ${width} ${height}`);

      const proyeccion = d3.geoMercator().fitExtent(
        [[10, 10], [width - 10, height - 10]],
        geo
      );
      const generador = d3.geoPath().projection(proyeccion);

      const provincias = capa
        .selectAll('path.provincia')
        .data(geo.features, (d) => d.properties.id);

      provincias.exit().remove();

      const entrantes = provincias
        .enter()
        .append('path')
        .attr('class', (d) => (esCaba(d.properties) ? 'provincia caba' : 'provincia'))
        .attr('stroke', STROKE_CREMA)
        .attr('stroke-width', 0.8)
        .attr('vector-effect', 'non-scaling-stroke');

      entrantes
        .merge(provincias)
        .attr('d', generador)
        .attr('fill', (d) => fillDefault(d.properties))
        .attr('data-prov', (d) => d.properties.nombre)
        .style('cursor', conClick ? 'pointer' : 'default')
        .on('mouseenter', function (evento, d) {
          if (!esCaba(d.properties)) {
            d3.select(this).attr('fill', FILL_SOL);
          }
          if (tooltip) {
            tooltip.textContent = d.properties.nombre;
            tooltip.style.opacity = '1';
          }
          posicionarTooltip(evento);
        })
        .on('mousemove', posicionarTooltip)
        .on('mouseleave', function (evento, d) {
          d3.select(this).attr('fill', fillDefault(d.properties));
          if (tooltip) tooltip.style.opacity = '0';
        })
        .on('click', function (evento, d) {
          if (!conClick) return;
          evento.preventDefault();
          scrollAListado(d.properties.nombre);
        });
    }

    dibujar();

    if (typeof ResizeObserver !== 'undefined') {
      const observador = new ResizeObserver(() => dibujar());
      observador.observe(container);
    } else {
      window.addEventListener('resize', dibujar);
    }
  }

  window.initMapaArgentina = initMapaArgentina;
})();
