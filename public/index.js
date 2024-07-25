document.addEventListener('DOMContentLoaded', function () {
    const productos = document.querySelectorAll('.producto');
    const carrito = document.getElementById('carrito');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const ordenarPorNombreBtn = document.getElementById('ordenar-por-nombre');
    const ordenarPorPrecioBtn = document.getElementById('ordenar-por-precio');
    let pedido = {};
    const totalCarritoElement = document.getElementById('total-carrito'); // Elemento donde se mostrará el total del carrito
    const vozBtn = document.getElementById('voz-btn');    
    const leerBtn = document.getElementById('leer-pedido-btn')
    const socket = io("/client");
    ordenarPorNombre();
    

// ========================================================
//              SECCIÓN DE FAVORITOS
// ========================================================


    // Función para agregar eventos a los botones de favoritos
    function agregarEventosFavoritos() {
        const favoritoBtns = document.querySelectorAll('.favorito-btn');
        favoritoBtns.forEach(btn => {
            btn.addEventListener('click', function(event) {
                const svg = event.target.querySelector('svg');
                const path = svg.querySelector('path');
                if (path.getAttribute('fill') === 'none') {
                    path.setAttribute('fill', 'red');
                } else {
                    path.setAttribute('fill', 'none');
                }
            });
        });
    }

    // Agregar eventos a los botones de favoritos inicialmente
    agregarEventosFavoritos();


// ========================================================
//              SECCIÓN DE CARRITO
// ========================================================


    productos.forEach(producto => {
        const nombre = producto.getAttribute('data-nombre');
        const precio = parseFloat(producto.getAttribute('data-precio'));
        const cantidadInput = producto.querySelector('input[type="number"]');
        const addButton = document.createElement('button');
        addButton.textContent = "Añadir al carrito";
        addButton.addEventListener('click', () => {
            const cantidad = parseInt(cantidadInput.value);
            agregarAlCarrito(nombre, precio, cantidad);
        });
        producto.appendChild(addButton);
    });

    carrito.addEventListener('click', e => {
        if (e.target.classList.contains('eliminar')) {
            const cantidadEliminar = parseInt(prompt('¿Cuántos deseas eliminar?', 1));
            if (!isNaN(cantidadEliminar)) {
                const li = e.target.parentElement;
                const cantidadActual = parseInt(li.querySelector('.cantidad').textContent);
                console.log(li);
                const nombre = li.getAttribute('data-nombre');
                if (cantidadEliminar >= cantidadActual) {
                    delete pedido[nombre]
                    li.remove();
                } else {
                    li.querySelector('.cantidad').textContent = cantidadActual - cantidadEliminar;
                    li.querySelector('.total').textContent = (cantidadActual - cantidadEliminar) * parseFloat(li.querySelector('.precio').textContent);
                    pedido[nombre].cantidad = cantidadActual - cantidadEliminar
                }

                totalCarritoElement.textContent = calcularTotalCarrito();
                
            }
        }
    });

    // Detectar movimiento del dispositivo (agitar el móvil)
    let lastX, lastY, lastZ;
    let lastTime = 0;
    let moveCounter = 0;

    window.addEventListener('devicemotion', function (e) {
      const acceleration = e.accelerationIncludingGravity;
      const curTime = new Date().getTime();
      if ((curTime - lastTime) > 100) {
        const diffTime = curTime - lastTime;
        lastTime = curTime;
        const speed = Math.abs(acceleration.x + acceleration.y + acceleration.z - lastX - lastY - lastZ) / diffTime * 10000;
        if (speed > 1000) { // Si la velocidad es mayor a 1000 (umbral de agitación)
          moveCounter++;
          if (moveCounter >= 5) { // Agitar el móvil al menos dos veces
              procederConCompra();
              moveCounter = 0;
          }
        } else {
            moveCounter = 0;
          }

        lastX = acceleration.x;
        lastY = acceleration.y;
        lastZ = acceleration.z;
      }
    }, false);

    function procederConCompra() {
        console.log(pedido);
        if (Object.keys(pedido).length === 0) {
            Swal.fire('No hay productos en el carrito.');
            return;
        }
        Swal.fire({
            title: "¿Proceder con la compra?",
            showCancelButton: true,
            confirmButtonText: "Sí",
            cancelButtonText: "No"
          }).then((result) => {
            if (result.isConfirmed) {
                const queryString = Object.keys(pedido)
                .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(pedido[key]))).join('&');
                console.log(queryString);
        
                // Emitir un evento 'nuevo-pedido' al server con los datos del pedido
                socket.emit('nuevo-pedido', pedido);
            }
          });
    }

    document.querySelector('#burger-button').addEventListener('click', function() {
        document.querySelector('#menu-carrito').classList.toggle('open');
        document.querySelector('body').classList.toggle('no-scroll');
    });

    function agregarAlCarrito(nombre, precio, cantidad) {
        const liExistente = [...carrito.children].find(item => item.dataset.nombre === nombre);
        if (liExistente) {
            const cantidadExistente = parseInt(liExistente.querySelector('.cantidad').textContent);
            liExistente.querySelector('.cantidad').textContent = cantidadExistente + cantidad;
            liExistente.querySelector('.total').textContent = (cantidadExistente + cantidad) * precio;
        } else {
            const li = document.createElement('li');
            li.dataset.nombre = nombre;
            li.innerHTML = `${nombre} x <span class="cantidad">${cantidad}</span> - Precio unitario: €<span class="precio">${precio}</span> - Total: €<span class="total">${precio * cantidad}</span> <button class="eliminar">Eliminar</button>`;
            carrito.appendChild(li);
        }

        // Actualizar el total del carrito después de agregar un producto
        totalCarritoElement.textContent = calcularTotalCarrito();

        // Agregar el artículo al pedido
        if (pedido[nombre]) {
            pedido[nombre].cantidad += cantidad;
        } else {
            pedido[nombre] = {
                precio: precio,
                cantidad: cantidad
            };
        }
        console.log(pedido);
    }

    siguienteBtn.addEventListener('click', function() {
        procederConCompra();
    });

    // Función para calcular el total del carrito
    function calcularTotalCarrito() {
        let totalCarrito = 0;
        const itemsCarrito = carrito.querySelectorAll('li');
        itemsCarrito.forEach(item => {
            const totalItem = parseFloat(item.querySelector('.total').textContent);
            totalCarrito += totalItem;
        });
        return totalCarrito.toFixed(2) + "€";
    }


// ========================================================
//              SECCIÓN BOTONES ORDENAR
// ========================================================


    // Función para ordenar los productos por precio
    function ordenarPorPrecio() {
        agregarEventosFavoritos();
        const contenedorProductos = document.getElementById('productos');
        const productosOrdenados = [...productos].sort((a, b) => {
            const precioA = parseFloat(a.getAttribute('data-precio'));
            const precioB = parseFloat(b.getAttribute('data-precio'));
            return precioA - precioB;
        });
        productosOrdenados.forEach(producto => contenedorProductos.appendChild(producto));
        agregarEventosFavoritos(); // Vincular eventos a los botones de favoritos después de ordenar
    }

    function ordenarPorNombre() {
        agregarEventosFavoritos();
        const contenedorProductos = document.getElementById('productos');
        const productosOrdenados = [...productos].sort((a, b) => {
            const nombreA = a.getAttribute('data-nombre').toLowerCase();
            const nombreB = b.getAttribute('data-nombre').toLowerCase();
            return nombreA.localeCompare(nombreB);
        });
        productosOrdenados.forEach(producto => contenedorProductos.appendChild(producto));
        agregarEventosFavoritos(); // Vincular eventos a los botones de favoritos después de ordenar
    }

    // Manejadores de eventos para los botones de ordenar
    ordenarPorNombreBtn.addEventListener('click', ordenarPorNombre);
    ordenarPorPrecioBtn.addEventListener('click', ordenarPorPrecio);


    // ========================================================
    //              SECCIÓN BOTONES DE VOZ
    // ========================================================


    // Agregar evento al botón de voz
    vozBtn.addEventListener('click', activarReconocimientoVoz);

    // Función para activar el reconocimiento de voz
    function activarReconocimientoVoz() {
        if (!('webkitSpeechRecognition' in window)) {
            Swal.fire("La API de reconocimiento de voz no es compatible con este navegador.");
            return;
        }
        const reconocimientoVoz = new webkitSpeechRecognition(); // Crear instancia de reconocimiento de voz
        reconocimientoVoz.lang = 'es-ES'; // Establecer idioma
        reconocimientoVoz.start(); // Iniciar reconocimiento de voz

        Swal.fire({
            title: "Diga el comando a realizar:",
            text: "Los comandos disponibles son 'Añadir', 'Eliminar', 'Ordenar por nombre' y 'Ordenar por precio'.",
            confirmButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                reconocimientoVoz.stop(); // Detener reconocimiento de voz
            }
        }); 

        // Manejar resultado del reconocimiento de voz
        var resultado;
        reconocimientoVoz.onresult = function(event) {
            resultado = event.results[0][0].transcript; // Obtener el texto reconocido
            Swal.close();
            reconocimientoVoz.stop(); // Detener reconocimiento de voz
        }
        reconocimientoVoz.onend = function() {
            if (!resultado) {
                Swal.fire("No se reconoció el comando.");
            }else {
                procesarComandoVoz(resultado); // Llamar a la función para agregar el producto al carrito
            }
        }
    }
    // Función para procesar el comando de voz
    function procesarComandoVoz(comando) {
        comando = comando.trim().toLowerCase();
        if (comando === 'añadir') {
            agregarProductoPorVoz();
        } else if (comando === 'eliminar') {
            eliminarProductoPorVoz();
        } else if (comando === 'ordenar por nombre') {
            ordenarPorNombre();
        } else if (comando === 'ordenar por precio') {
            ordenarPorPrecio(); 
        } else {
            mostrarMensajeError();
        } 
    }
    var producto;
    // Función para agregar producto al carrito por voz
    function agregarProductoPorVoz(resultado) {
        if (!('webkitSpeechRecognition' in window)) {
            Swal.fire("La API de reconocimiento de voz no es compatible con este navegador.");
            return;
        }  
        const reconocimientoVoz = new webkitSpeechRecognition(); // Crear instancia de reconocimiento de voz
        reconocimientoVoz.lang = 'es-ES'; // Establecer idioma
    
        // Conseguir el nombre del producto
        reconocimientoVoz.start(); // Iniciar reconocimiento de voz

        Swal.fire({
            title: "Añadir producto",
            text: "Diga en voz alta el nombre del producto a añadir.",
            confirmButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                reconocimientoVoz.stop(); // Detener reconocimiento de voz
            }
        }); 

        // Manejar resultado del reconocimiento de voz
        var productoNombre;
        reconocimientoVoz.onresult = function(event) {
            const resultado = event.results[0][0].transcript; // Obtener el texto reconocido
            productoNombre = resultado;
            reconocimientoVoz.stop(); // Detener reconocimiento de voz
            if (!productoNombre) {
                Swal.fire("No se reconoció el nombre del producto.");
            }else {
                Swal.close();
            }
        }
        reconocimientoVoz.onend = function() {
            // Encontramos el producto
            producto = [...productos].find(item => item.getAttribute('data-nombre').toLowerCase() === productoNombre.toLowerCase());
            if (!producto) {
                Swal.fire("No se encontró el producto.");
                return;
            } else {
                obtenerNumeroDeProductosYAñadir();                
            }        
        }
    }

    function obtenerNumeroDeProductosYAñadir(){
        if (!('webkitSpeechRecognition' in window)) {
            Swal.fire("La API de reconocimiento de voz no es compatible con este navegador.");
            return -1;
        }  
        const reconocimientoVoz = new webkitSpeechRecognition(); // Crear instancia de reconocimiento de voz
        reconocimientoVoz.lang = 'es-ES'; // Establecer idioma
        
        // Ahora obtenemos la cantidad
        reconocimientoVoz.start(); // Iniciar reconocimiento de voz

        Swal.fire({
            title: "Cantidad",
            text: `Diga en voz alta la cantidad del producto.`,
            confirmButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                reconocimientoVoz.stop(); // Detener reconocimiento de voz
                return -1;
            }
        }); 

        // Manejar resultado del reconocimiento de voz
        var cantidad
        reconocimientoVoz.onresult = function(event) {
            Swal.close();
            const resultado = event.results[0][0].transcript; // Obtener el texto reconocido
            const cantidadTexto = resultado;
            cantidad = spanishTextToNumber(cantidadTexto);
            if (isNaN(cantidad)) {
                Swal.fire("Cantidad no válida.");
                return -1;
            }
        }
        reconocimientoVoz.onend = function() {
            if (cantidad === -1 || isNaN(cantidad)) {
                return;
            }
            // Agregar el producto al carrito
            const nombre = producto.getAttribute('data-nombre');
            const precio = parseFloat(producto.getAttribute('data-precio'));
            agregarAlCarrito(nombre, precio, cantidad);
        }
    }

    function spanishTextToNumber(texto) {
        // La única forma de hacer esto, no hay apis que lo hagan
        const map = {
            'cero': 0,
            'uno': 1,
            'dos': 2,
            'tres': 3,
            'cuatro': 4,
            'cinco': 5,
            'seis': 6,
            'siete': 7,
            'ocho': 8,
            'nueve': 9,
            'diez': 10
        };
        return map[texto.toLowerCase()];
    }

    // Función para eliminar producto del carrito por voz
    function eliminarProductoPorVoz() {
        if (!('webkitSpeechRecognition' in window)) {
            Swal.fire("La API de reconocimiento de voz no es compatible con este navegador.");
            return;
        }  
        const reconocimientoVoz = new webkitSpeechRecognition(); // Crear instancia de reconocimiento de voz
        reconocimientoVoz.lang = 'es-ES'; // Establecer idioma
    
        // Conseguir el nombre del producto
        reconocimientoVoz.start(); // Iniciar reconocimiento de voz

        Swal.fire({
            title: "Eliminar producto",
            text: "Diga en voz alta el nombre del producto a eliminar.",
            confirmButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                reconocimientoVoz.stop(); // Detener reconocimiento de voz
            }
        }); 

        // Manejar resultado del reconocimiento de voz
        var productoNombre;
        reconocimientoVoz.onresult = function(event) {
            const resultado = event.results[0][0].transcript; // Obtener el texto reconocido
            productoNombre = resultado;
            reconocimientoVoz.stop(); // Detener reconocimiento de voz
            if (!productoNombre) {
                Swal.fire("No se reconoció el nombre del producto.");
            }else {
                Swal.close();
            }
        }
        reconocimientoVoz.onend = function() {
            // Encontramos el producto
            producto = [...productos].find(item => item.getAttribute('data-nombre').toLowerCase() === productoNombre.toLowerCase());
            if (!producto) {
                Swal.fire("No se encontró el producto.");
                return;
            } else {
                obtenerNumeroDeProductosYEliminar();                
            }
        }
    }

    function obtenerNumeroDeProductosYEliminar(){
        if (!('webkitSpeechRecognition' in window)) {
            Swal.fire("La API de reconocimiento de voz no es compatible con este navegador.");
            return -1;
        }  
        const reconocimientoVoz = new webkitSpeechRecognition(); // Crear instancia de reconocimiento de voz
        reconocimientoVoz.lang = 'es-ES'; // Establecer idioma
        
        // Ahora obtenemos la cantidad
        reconocimientoVoz.start(); // Iniciar reconocimiento de voz

        Swal.fire({
            title: "Cantidad",
            text: `Diga en voz alta la cantidad del producto.`,
            confirmButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                reconocimientoVoz.stop(); // Detener reconocimiento de voz
                return -1;
            }
        }); 

        // Manejar resultado del reconocimiento de voz
        var cantidad
        reconocimientoVoz.onresult = function(event) {
            Swal.close();
            const resultado = event.results[0][0].transcript; // Obtener el texto reconocido
            const cantidadTexto = resultado;
            cantidad = spanishTextToNumber(cantidadTexto);
            if (isNaN(cantidad)) {
                Swal.fire("Cantidad no válida.");
                return -1;
            }
        }
        reconocimientoVoz.onend = function() {
            if (cantidad === -1 || isNaN(cantidad)) {
                return;
            }
            // Agregar el producto al carrito
            const nombre = producto.getAttribute('data-nombre');
            const precio = parseFloat(producto.getAttribute('data-precio'));
            eliminarDelCarrito(nombre, precio, cantidad);
        }
    }

    function eliminarDelCarrito(nombreProducto, cantidadEliminar) {
        const li = document.querySelector(`li[data-nombre='${nombreProducto}']`);
        if (li) {
            const cantidadActual = parseInt(li.querySelector('.cantidad').textContent);
            if (cantidadEliminar >= cantidadActual) {
                delete pedido[nombreProducto]
                li.remove();
            } else {
                li.querySelector('.cantidad').textContent = cantidadActual - cantidadEliminar;
                li.querySelector('.total').textContent = (cantidadActual - cantidadEliminar) * parseFloat(li.querySelector('.precio').textContent);
                pedido[nombreProducto].cantidad = cantidadActual - cantidadEliminar
            }

            // Actualizar el total del carrito después de eliminar un producto
            totalCarritoElement.textContent = calcularTotalCarrito();
        } else {
            console.log(`No se encontró el producto ${nombreProducto} en el carrito.`);
        }
    }

    // Leer el pedido en voz alta
    leerBtn.addEventListener('click', leerPedidoEnVoz);  
  
    // Función para leer el pedido en voz alta
    function leerPedidoEnVoz() {
        let mensajeVoz = 'Tu pedido actual es: ';
        let productos = Object.entries(pedido);
        
        if (productos.length === 0) {
            mensajeVoz = 'Tu carrito está vacío.';
        } else {
            productos.forEach(([producto, detalles], index) => {
                // Determinar si el nombre del producto es femenino
                let esFemenino = ['manzana', 'naranja', 'pera', 'pizza', 'galletas'].includes(producto.toLowerCase());
                let esGalletas = producto.toLowerCase() === 'galletas';

                // Agregar "una" para nombres femeninos y "unas" para el plural
                let cantidadTexto = detalles.cantidad === 1 ? (esGalletas ? 'unas' : (esFemenino ? 'una' : 'un')) : detalles.cantidad;
                let productoTexto = detalles.cantidad === 1 ? producto : producto + 's';
                
                mensajeVoz += `${cantidadTexto} ${productoTexto}`;
                
                // Agregar "y" antes del último producto si no es el único
                if (index === productos.length - 1) {
                    mensajeVoz += '.';
                } else if (index === productos.length - 2) {
                    mensajeVoz += ' y ';
                } else {
                    mensajeVoz += ', ';
                }
            });
        }

        // Utiliza la síntesis de voz para leer el mensaje
        if ('speechSynthesis' in window) {
            const synthesis = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(mensajeVoz);
            synthesis.speak(utterance);
        } else {
            Swal.fire("La síntesis de voz no es compatible con este navegador.");
        }
    }
});