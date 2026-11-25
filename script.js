"use strict";

class Punto {
    constructor(fila, columna) {
        this.fila = fila;
        this.columna = columna;
    }

    // Distancia euclidiana entre este punto y otro
    distanciaA(punto) {
        const df = Math.abs(this.fila - punto.fila);
        const dc = Math.abs(this.columna - punto.columna);
        return Math.hypot(df, dc);
    }

    // Indica si ambos puntos ocupan la misma celda
    igualA(punto) {
        return this.fila === punto.fila && this.columna === punto.columna;
    }
}

class Mapa {
    constructor(tamano = 20, maxNodos = 30) {
        this.tamano = tamano;
        this.maxNodos = maxNodos;
        this.inicio = null;
        this.nodos = [];
        this.distancias = [];
    }

    // Define o cambia el inicio
    establecerInicio(fila, columna) {
        if (!this.esPosicionValida(fila, columna)) return false;

        const nuevo = new Punto(fila, columna);
        if (this.nodos.some((nodo) => nodo.igualA(nuevo))) return false;

        this.inicio = nuevo;
        return true;
    }

    agregarNodo(fila, columna) {
        if (!this.inicio) return false;
        if (this.nodos.length >= this.maxNodos) return false;
        if (!this.esPosicionValida(fila, columna)) return false;

        const nuevo = new Punto(fila, columna);
        if (this.inicio.igualA(nuevo)) return false;
        if (this.nodos.some((nodo) => nodo.igualA(nuevo))) return false;

        this.nodos.push(nuevo);
        return true;
    }

    eliminarNodo(id) {
        if (id < 1 || id > this.nodos.length) return false;
        this.nodos.splice(id - 1, 1);
        return true;
    }

    limpiar() {
        this.inicio = null;
        this.nodos = [];
        this.distancias = [];
    }

    esPosicionValida(fila, columna) {
        return Number.isInteger(fila) && Number.isInteger(columna) &&
            fila >= 1 && fila <= this.tamano &&
            columna >= 1 && columna <= this.tamano;
    }

    buscarNodoEn(fila, columna) {
        const punto = new Punto(fila, columna);
        return this.nodos.findIndex((nodo) => nodo.igualA(punto)) + 1;
    }

    obtenerNodo(id) {
        return this.nodos[id - 1];
    }

    getNumeroNodos() {
        return this.nodos.length;
    }

    // Precalcula todas las distancias entre nodos
    construirMatrizDistancias() {
        const puntos = [this.inicio, ...this.nodos];
        this.distancias = puntos.map((a) => puntos.map((b) => a.distanciaA(b)));
    }
}

class Individuo {
    constructor(genes) {
        this.genes = genes;
        this.distanciaTotal = Infinity;
        this.fitness = 0;
    }

    // Genera una permutación aleatoria Fisher-Yates
    static aleatorio(numeroNodos) {
        const genes = Array.from({ length: numeroNodos }, (_, i) => i + 1);

        for (let i = genes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [genes[i], genes[j]] = [genes[j], genes[i]];
        }

        return new Individuo(genes);
    }

    // fitness = (100 / distancia)^2
    calcularFitness(mapa) {
        const d = mapa.distancias;
        let total = 0;
        let actual = 0; // 0 = inicio

        for (const gen of this.genes) {
            total += d[actual][gen];
            actual = gen;
        }
        total += d[actual][0];

        this.distanciaTotal = total;
        this.fitness = total > 0 ? Math.pow(100 / total, 2) : 0;
        return this.fitness;
    }

    // Devuelve dos puntos de corte al azar
    static elegirTramo(n) {
        let a, b;

        do {
            a = Math.floor(Math.random() * (n + 1));
            b = Math.floor(Math.random() * (n + 1));
        } while (a === b || (Math.min(a, b) === 0 && Math.max(a, b) === n));

        return [Math.min(a, b), Math.max(a, b)];
    }

    // El hijo toma la subristra del segundo padre y el resto del primer padre;
    // los número repetidos del resto se resuelven con una correspondencia
    // Cruce basado en correspondencia parcial
    static pmx(p1, p2, ini, fin) {
        const hijo = new Array(p1.length);
        const correspondencia = new Map();

        for (let i = ini; i < fin; i++) {
            hijo[i] = p2[i];
            correspondencia.set(p2[i], p1[i]);
        }

        for (let i = 0; i < p1.length; i++) {
            if (i >= ini && i < fin) continue;

            let gen = p1[i];
            while (correspondencia.has(gen)) {
                gen = correspondencia.get(gen);
            }
            hijo[i] = gen;
        }

        return new Individuo(hijo);
    }

    // Cruza este individuo con otro con PMX y devuelve dos hijos
    cruzar(otroIndividuo) {
        const n = this.genes.length;
        if (n < 2) return [this.clonar(), otroIndividuo.clonar()];

        const [ini, fin] = Individuo.elegirTramo(n);
        return [
            Individuo.pmx(this.genes, otroIndividuo.genes, ini, fin),
            Individuo.pmx(otroIndividuo.genes, this.genes, ini, fin)
        ];
    }

    // Extrae una subristra al azar y la inserta en un lugar aleatorio
    // Mutación opr desplazamiento (DM)
    mutar(probabilidad) {
        const n = this.genes.length;
        if (n < 2 || Math.random() >= probabilidad) return false;

        const [ini, fin] = Individuo.elegirTramo(n);

        const resto = this.genes.slice();
        const subristra = resto.splice(ini, fin - ini);
        const posicion = Math.floor(Math.random() * (resto.length + 1));
        resto.splice(posicion, 0, ...subristra);

        this.genes = resto;
        return true;
    }

    clonar() {
        const copia = new Individuo(this.genes.slice());
        copia.distanciaTotal = this.distanciaTotal;
        copia.fitness = this.fitness;
        return copia;
    }

    toString() {
        return this.genes.join("-");
    }
}


class Poblacion {
    constructor(tamanio, numeroNodos) {
        this.tamanio = tamanio;
        this.numeroNodos = numeroNodos;
        this.individuos = [];
        this.prob_acumulada = [];
    }

    inicializar() {
        this.individuos = Array.from(
            { length: this.tamanio },
            () => Individuo.aleatorio(this.numeroNodos)
        );
    }

    // Calcula el fitness de todos los individuos y prepara la ruleta para la selección de padres
    evaluar(mapa) {
        this.individuos.forEach((individuo) => individuo.calcularFitness(mapa));
        this.prepararRuleta();
    }

    // A cada individuo le toca un área proporcional a su fitness
    prepararRuleta() {
        const total = this.individuos.reduce((suma, ind) => suma + ind.fitness, 0);
        let acumulado = 0;
        this.prob_acumulada = this.individuos.map((ind) => (acumulado += ind.fitness / total));
    }

    seleccionarPadre() {
        const giro = Math.random();
        const indice = this.prob_acumulada.findIndex((limite) => giro <= limite);
        return this.individuos[indice === -1 ? this.individuos.length - 1 : indice];
    }

    mejorIndividuo() {
        return this.individuos.reduce((mejor, actual) => actual.fitness > mejor.fitness ? actual : mejor);
    }

    fitnessPromedio() {
        const suma = this.individuos.reduce((acc, ind) => acc + ind.fitness, 0);
        return suma / this.individuos.length;
    }

    distanciaPromedio() {
        const suma = this.individuos.reduce((acc, ind) => acc + ind.distanciaTotal, 0);
        return suma / this.individuos.length;
    }

    // Fracción de la población que comparte el mismo giro
    porcentajeConvergencia() {
        const conteo = new Map();
        let maximo = 0;

        for (const individuo of this.individuos) {
            const clave = individuo.toString();
            const cantidad = (conteo.get(clave) || 0) + 1;
            conteo.set(clave, cantidad);
            if (cantidad > maximo) maximo = cantidad;
        }

        return maximo / this.individuos.length;
    }

    // Se reemplaza con la nueva generacion
    reemplazar(nuevosIndividuos) {
        this.individuos = nuevosIndividuos;
        this.prepararRuleta();
    }
}

class AlgoritmoGenetico {
    constructor(mapa, config = {}) {
        this.mapa = mapa;
        this.config = {
            tamanoPoblacion: 50,
            generaciones: 1000,    
            probCruce: 0.8,
            probMutacion: 0.03,
            umbralConvergencia: 0.9,
            ...config
        };

        this.poblacion = null;
        this.generacion = 0;
        this.mejor = null;
        this.generacionMejor = 0;
        this.historial = [];          // {mejor, promedio, convergencia}
        this.motivo = "";             // "convergencia"|"maximo"|"detenido"
        this.detenido = false;
        this.onGeneracion = null;
    }

    reiniciar() {
        this.mapa.construirMatrizDistancias();

        // Generar una población inicial
        this.poblacion = new Poblacion(this.config.tamanoPoblacion, this.mapa.getNumeroNodos());
        this.poblacion.inicializar();
        this.poblacion.evaluar(this.mapa);

        this.generacion = 0;
        this.detenido = false;
        this.motivo = "";
        this.mejor = this.poblacion.mejorIndividuo().clonar();
        this.generacionMejor = 0;
        this.historial = [];
        this.registrarHistorial();
    }

    registrarHistorial() {
        this.historial.push({
            mejor: this.poblacion.mejorIndividuo().distanciaTotal,
            promedio: this.poblacion.distanciaPromedio(),
            convergencia: this.poblacion.porcentajeConvergencia()
        });
    }

    haConvergido() {
        return this.poblacion.porcentajeConvergencia() >= this.config.umbralConvergencia;
    }

    // Nueva generación donde hay tamaño(Población)/2 ciclos reproductivos de 2 descendientes
    siguienteGeneracion() {
        const { tamanoPoblacion, probCruce, probMutacion } = this.config;
        const nuevos = [];

        for (let i = 0; i < Math.ceil(tamanoPoblacion / 2); i++) {
            // Seleccionar dos individuos de la generación anterior
            const padre1 = this.poblacion.seleccionarPadre();
            const padre2 = this.poblacion.seleccionarPadre();

            // Cruzar con cierta probabilidad; si no, los descendientes son copias
            const hijos = Math.random() < probCruce
                ? padre1.cruzar(padre2)
                : [padre1.clonar(), padre2.clonar()];

            // Mutar con cierta probabilidad, evaluar e insertar en la nueva generación
            for (const hijo of hijos) {
                hijo.mutar(probMutacion);
                hijo.calcularFitness(this.mapa);
                nuevos.push(hijo);
            }
        }

        nuevos.length = tamanoPoblacion; // Si el tamaño es impar sobra un descendiente
        this.poblacion.reemplazar(nuevos);
        this.generacion++;

        // Se registra el mejor individuo
        const mejorGeneracion = this.poblacion.mejorIndividuo();
        if (mejorGeneracion.fitness > this.mejor.fitness) {
            this.mejor = mejorGeneracion.clonar();
            this.generacionMejor = this.generacion;
        }

        this.registrarHistorial();
    }

    notificar(terminado = false) {
        if (!this.onGeneracion) return;

        this.onGeneracion({
            generacion: this.generacion,
            totalGeneraciones: this.config.generaciones,
            mejor: this.mejor,
            generacionMejor: this.generacionMejor,
            convergencia: this.poblacion.porcentajeConvergencia(),
            historial: this.historial,
            motivo: this.motivo,
            terminado
        });
    }

    async ejecutar() {
        this.reiniciar();
        this.notificar();

        // El algoritmo continua mientras no se detenga manualmente, no haya convergido o
        // el máximo de generaciones no sea alcanzado
        while (!this.detenido && !this.haConvergido() && this.generacion < this.config.generaciones) {
            this.siguienteGeneracion();

            if (this.generacion % 5 === 0) {
                this.notificar();
                await new Promise((resolver) => requestAnimationFrame(resolver));
            }
        }

        if (this.detenido) this.motivo = "detenido";
        else if (this.haConvergido()) this.motivo = "convergencia";
        else this.motivo = "maximo";

        this.notificar(true);
        return this.mejor;
    }

    detener() {
        this.detenido = true;
    }
}



// =====================================================================================================================



class Visualizador {
    constructor(canvasTablero, canvasGrafica, mapa) {
        this.canvas = canvasTablero;
        this.ctx = canvasTablero.getContext("2d");
        this.canvasGrafica = canvasGrafica;
        this.ctxGrafica = canvasGrafica.getContext("2d");
        this.mapa = mapa;

        this.margen = 32;
        this.celda = (canvasTablero.width - this.margen) / mapa.tamano;

        // Los colores viven en el CSS (:root) para tener una sola fuente
        const estilo = getComputedStyle(document.documentElement);
        const color = (nombre) => estilo.getPropertyValue(nombre).trim();
        this.colores = {
            celda: color("--celda"),
            encabezado: color("--encabezado"),
            linea: color("--linea"),
            tinta: color("--tinta"),
            nodo: color("--nodo"),
            inicio: color("--inicio"),
            ruta: color("--ruta"),
            suave: color("--tinta-suave")
        };
    }

    // Centro en píxeles de la celda de un punto
    centro(punto) {
        return {
            x: this.margen + (punto.columna - 0.5) * this.celda,
            y: this.margen + (punto.fila - 0.5) * this.celda
        };
    }

    // Convierte un clic (coordenadas del canvas) en { fila, columna }, o null si cae fuera
    celdaEn(x, y) {
        if (x < this.margen || y < this.margen) return null;

        const columna = Math.floor((x - this.margen) / this.celda) + 1;
        const fila = Math.floor((y - this.margen) / this.celda) + 1;

        return this.mapa.esPosicionValida(fila, columna) ? { fila, columna } : null;
    }

    dibujarTablero(genes = null) {
        const { ctx, margen, celda, colores } = this;
        const n = this.mapa.tamano;
        const lado = margen + n * celda;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = colores.celda;
        ctx.fillRect(margen, margen, n * celda, n * celda);
        ctx.fillStyle = colores.encabezado;
        ctx.fillRect(margen, 0, n * celda, margen);
        ctx.fillRect(0, margen, margen, n * celda);

        ctx.strokeStyle = colores.linea;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const p = margen + i * celda;
            ctx.moveTo(p, 0);
            ctx.lineTo(p, lado);
            ctx.moveTo(0, p);
            ctx.lineTo(lado, p);
        }
        ctx.stroke();

        ctx.fillStyle = colores.tinta;
        ctx.font = `${Math.round(celda * 0.4)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 1; i <= n; i++) {
            const c = margen + (i - 0.5) * celda;
            ctx.fillText(i, c, margen / 2);
            ctx.fillText(i, margen / 2, c);
        }

        if (genes && this.mapa.inicio) this.dibujarRuta(genes);

        this.mapa.nodos.forEach((punto, i) => this.dibujarNodo(punto, String(i + 1), colores.nodo, colores.tinta));
        if (this.mapa.inicio) this.dibujarNodo(this.mapa.inicio, "I", colores.inicio, "#ffffff");
    }

    dibujarNodo(punto, texto, relleno, colorTexto) {
        const { ctx, celda, colores } = this;
        const { x, y } = this.centro(punto);

        ctx.beginPath();
        ctx.arc(x, y, celda * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = relleno;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colores.tinta;
        ctx.stroke();

        ctx.fillStyle = colorTexto;
        ctx.font = `bold ${Math.round(celda * 0.42)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(texto, x, y + 1);
    }

    // Recorrido cerrado: inicio -> nodos en el orden de los genes -> inicio
    dibujarRuta(genes) {
        const puntos = [this.mapa.inicio, ...genes.map((id) => this.mapa.obtenerNodo(id)), this.mapa.inicio];

        this.ctx.strokeStyle = this.colores.ruta;
        this.ctx.fillStyle = this.colores.ruta;
        this.ctx.lineWidth = 2.5;

        for (let i = 0; i < puntos.length - 1; i++) {
            this.dibujarFlecha(this.centro(puntos[i]), this.centro(puntos[i + 1]));
        }
    }

    dibujarFlecha(a, b) {
        const { ctx, celda } = this;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const largo = Math.hypot(dx, dy);
        if (largo === 0) return;

        const ux = dx / largo;
        const uy = dy / largo;
        const radio = celda * 0.4;
        const punta = 10;

        const x1 = a.x + ux * radio;
        const y1 = a.y + uy * radio;
        const x2 = b.x - ux * radio;
        const y2 = b.y - uy * radio;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * punta + uy * punta * 0.5, y2 - uy * punta - ux * punta * 0.5);
        ctx.lineTo(x2 - ux * punta - uy * punta * 0.5, y2 - uy * punta + ux * punta * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    // Gráfica de convergencia: distancia del mejor global y distancia promedio por generación
    dibujarGrafica(historial) {
        const { ctxGrafica: ctx, canvasGrafica: cv, colores } = this;
        const ancho = cv.width;
        const alto = cv.height;
        const izq = 46;
        const der = 10;
        const arriba = 10;
        const abajo = 18;

        ctx.clearRect(0, 0, ancho, alto);
        if (!historial || historial.length < 2) return;

        const mejores = historial.map((r) => r.mejor);
        const promedios = historial.map((r) => r.promedio);
        const minimo = Math.min(...mejores);
        const maximo = Math.max(...promedios);
        const rango = maximo - minimo || 1;

        const x = (i) => izq + (i / (historial.length - 1)) * (ancho - izq - der);
        const y = (v) => arriba + (1 - (v - minimo) / rango) * (alto - arriba - abajo);

        const trazar = (serie, color, grosor) => {
            ctx.beginPath();
            serie.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
            ctx.strokeStyle = color;
            ctx.lineWidth = grosor;
            ctx.stroke();
        };

        trazar(promedios, colores.suave, 1.5);
        trazar(mejores, colores.ruta, 2.5);

        ctx.fillStyle = colores.tinta;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(maximo.toFixed(1), izq - 6, y(maximo));
        ctx.fillText(minimo.toFixed(1), izq - 6, y(minimo));
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("generación 0", izq, alto);
        ctx.textAlign = "right";
        ctx.fillText(`generación ${historial.length - 1}`, ancho - der, alto);
    }
}

class App {
    constructor() {
        this.mapa = new Mapa();
        this.visualizador = new Visualizador($("tablero"), $("grafica"), this.mapa);
        this.ag = null;
        this.modo = "inicio";
        this.ejecutando = false;

        this.registrarEventos();
        this.refrescar();
    }

    registrarEventos() {
        $("tablero").addEventListener("click", (e) => {
            const canvas = $("tablero");
            const rect = canvas.getBoundingClientRect();
            const escala = canvas.width / rect.width;
            const celda = this.visualizador.celdaEn((e.clientX - rect.left) * escala, (e.clientY - rect.top) * escala);
            if (celda) this.alHacerClickEnCelda(celda.fila, celda.columna);
        });

        document.querySelectorAll('input[name="modo"]').forEach((radio) => {
            radio.addEventListener("change", () => (this.modo = radio.value));
        });

        //$("btn-ejemplo").addEventListener("click", () => this.cargarEjemplo());
        $("btn-aleatorios").addEventListener("click", () => this.generarAleatorios());
        $("btn-limpiar").addEventListener("click", () => this.limpiar());
        $("btn-ejecutar").addEventListener("click", () => this.iniciar());
        $("btn-detener").addEventListener("click", () => this.ag && this.ag.detener());

        $("lista-nodos").addEventListener("click", (e) => {
            const boton = e.target.closest("button[data-id]");
            if (!boton || this.ejecutando) return;
            this.mapa.eliminarNodo(Number(boton.dataset.id));
            this.limpiarResultado();
            this.refrescar();
        });
    }

    alHacerClickEnCelda(fila, columna) {
        if (this.ejecutando) return;
        this.avisar("");

        if (this.modo === "inicio") {
            if (!this.mapa.establecerInicio(fila, columna)) {
                return this.avisar("Esa celda ya tiene un nodo. Elige otra para el inicio.");
            }
            this.seleccionarModo("nodo");
        } else {
            const id = this.mapa.buscarNodoEn(fila, columna);

            if (id) {
                this.mapa.eliminarNodo(id);
            } else if (!this.mapa.inicio) {
                return this.avisar("Primero elige el inicio.");
            } else if (this.mapa.getNumeroNodos() >= this.mapa.maxNodos) {
                return this.avisar(`Máximo ${this.mapa.maxNodos} nodos.`);
            } else if (!this.mapa.agregarNodo(fila, columna)) {
                return this.avisar("Esa celda ya es el inicio.");
            }
        }

        this.limpiarResultado();
        this.refrescar();
    }

    seleccionarModo(modo) {
        this.modo = modo;
        document.querySelector(`input[name="modo"][value="${modo}"]`).checked = true;
    }

    cargarEjemplo() {
        this.mapa.limpiar();
        this.mapa.establecerInicio(18, 2);
        [[8, 12], [10, 5], [2, 20], [17, 19], [18, 7], [11, 16], [3, 4]]
            .forEach(([fila, columna]) => this.mapa.agregarNodo(fila, columna));

        this.seleccionarModo("nodo");
        this.avisar("");
        this.limpiarResultado();
        this.refrescar();
    }

    generarAleatorios() {
        const cantidad = this.leerNumero("num-aleatorios", 1, this.mapa.maxNodos);
        const aleatorio = () => 1 + Math.floor(Math.random() * this.mapa.tamano);

        this.mapa.nodos = [];
        while (!this.mapa.inicio) this.mapa.establecerInicio(aleatorio(), aleatorio());
        while (this.mapa.getNumeroNodos() < cantidad) this.mapa.agregarNodo(aleatorio(), aleatorio());

        this.seleccionarModo("nodo");
        this.avisar("");
        this.limpiarResultado();
        this.refrescar();
    }

    limpiar() {
        this.mapa.limpiar();
        this.seleccionarModo("inicio");
        this.avisar("");
        this.limpiarResultado();
        this.refrescar();
    }

    leerNumero(id, minimo, maximo) {
        const campo = $(id);
        let valor = parseFloat(campo.value);
        if (Number.isNaN(valor)) valor = minimo;
        valor = Math.min(maximo, Math.max(minimo, valor));
        campo.value = valor;
        return valor;
    }

    async iniciar() {
        if (this.ejecutando) return;
        if (!this.mapa.inicio) return this.avisar("Elige el inicio en el tablero.");
        if (this.mapa.getNumeroNodos() < 2) return this.avisar("Agrega al menos 2 nodos para tener qué optimizar.");

        const config = {
            tamanoPoblacion: Math.round(this.leerNumero("p-poblacion", 4, 1000)),
            generaciones: Math.round(this.leerNumero("p-generaciones", 1, 5000)),
            probCruce: this.leerNumero("p-cruce", 0, 1),
            probMutacion: this.leerNumero("p-mutacion", 0, 1),
            umbralConvergencia: this.leerNumero("p-convergencia", 50, 100) / 100
        };


        this.avisar("");
        this.establecerEjecutando(true);

        this.ag = new AlgoritmoGenetico(this.mapa, config);
        this.ag.onGeneracion = (info) => this.mostrarProgreso(info);
        await this.ag.ejecutar();

        this.establecerEjecutando(false);
    }

    mostrarProgreso(info) {
        this.visualizador.dibujarTablero(info.mejor.genes);
        this.visualizador.dibujarGrafica(info.historial);

        $("res-ruta").textContent = info.mejor.toString();
        $("res-distancia").textContent = info.mejor.distanciaTotal.toFixed(2);
        $("res-generacion").textContent = info.generacionMejor;
        $("res-convergencia").textContent = `${Math.round(info.convergencia * 100)}%`;

        const motivos = {
            convergencia: "la población convergió",
            maximo: "se alcanzó el máximo de generaciones sin converger",
            detenido: "se detuvo manualmente"
        };
        $("estado").textContent = info.terminado
            ? `Terminó en la generación ${info.generacion}: ${motivos[info.motivo]}.`
            : `Generación ${info.generacion} de ${info.totalGeneraciones} como máximo…`;
    }

    establecerEjecutando(ejecutando) {
        this.ejecutando = ejecutando;
        $("btn-ejecutar").disabled = ejecutando;
        $("btn-detener").disabled = !ejecutando;
        document.querySelectorAll("[data-bloquea]").forEach((el) => (el.disabled = ejecutando));
    }

    limpiarResultado() {
        ["res-ruta", "res-distancia", "res-generacion", "res-convergencia"].forEach((id) => ($(id).textContent = "–"));
        $("estado").textContent = "";
        this.visualizador.dibujarGrafica(null);
    }

    avisar(texto) {
        $("mensaje").textContent = texto;
    }

    // Redibuja tablero y lista de nodos
    refrescar() {
        this.visualizador.dibujarTablero();
        this.renderizarLista();
    }

    renderizarLista() {
        const lista = $("lista-nodos");
        lista.replaceChildren();

        const { inicio, nodos } = this.mapa;
        $("conteo-nodos").textContent = `${nodos.length} de ${this.mapa.maxNodos}`;

        if (!inicio && nodos.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "vacio";
            vacio.textContent = "";
            lista.appendChild(vacio);
            return;
        }

        if (inicio) lista.appendChild(this.crearItem("I", inicio, null));
        nodos.forEach((punto, i) => lista.appendChild(this.crearItem(String(i + 1), punto, i + 1)));
    }

    crearItem(etiqueta, punto, id) {
        const item = document.createElement("li");

        const marca = document.createElement("span");
        marca.className = id === null ? "marca marca-inicio" : "marca";
        marca.textContent = etiqueta;

        const coordenadas = document.createElement("span");
        coordenadas.textContent = `(${punto.fila}, ${punto.columna})`;

        item.append(marca, coordenadas);

        if (id !== null) {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "quitar";
            boton.dataset.id = id;
            boton.setAttribute("aria-label", `Quitar nodo ${id}`);
            boton.textContent = "×";
            item.appendChild(boton);
        }

        return item;
    }
}

function $(id) {
    return document.getElementById(id);
}

window.addEventListener("DOMContentLoaded", () => new App());