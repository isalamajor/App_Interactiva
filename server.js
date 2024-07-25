const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3001;


// Middleware para servir archivos estáticos desde el directorio 'public'
app.use(express.static('public'));
app.use(express.static('public/trabajadores'));
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

// Ruta para servir el archivo index.html como la página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Trabajadores conectados es un entero y no un bool para poder escalar en el futuro
let trabajadoresConectados = 0;
// Manejo de trabajadores conectados
io.of("/worker").on('connection', (socket) => {
    console.log('Trabajador conectado');
    trabajadoresConectados += 1;
    fs.readFile('datos.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer los datos:', err);
            return;
        }
        let datosJSON = [];
        if (data) {
            datosJSON = JSON.parse(data);
        }
        // Enviar los datos existentes al trabajador conectado
        console.log('Enviando datos existentes al trabajador');
        socket.emit('actualizar-pedidos', datosJSON);
    });

    socket.on('marcar-pagado', (idPedido) => {
        fs.readFile('datos.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error al leer los datos:', err);
                return;
            }
            let datosJSON = [];
            if (data) {
                datosJSON = JSON.parse(data);
            }
            // Buscar el pedido con el ID especificado
            const pedido = datosJSON.find((p) => p.id === idPedido);
            if (pedido) {
                // Eliminar el pedido que ha sido marcado como pagado
                let index = datosJSON.indexOf(pedido);
                datosJSON.splice(index, 1);
                // Escribir los datos actualizados en el archivo JSON
                fs.writeFile('datos.json', JSON.stringify(datosJSON), (err) => {
                    if (err) {
                        console.error('Error al guardar los datos:', err);
                    } else {
                        console.log('Datos guardados correctamente');
                        // Emitir el evento 'pedido-pagado' a todos los trabajadores conectados
                        io.of("/worker").emit('actualizar-pedidos', datosJSON);
                    }
                });
            }
        });
    });
});

// Manejo de clientes conectados
io.of("/client").on('connection', (socket) => {
    console.log('Cliente conectado');

    socket.on('nuevo-pedido', (nuevoPedido) => {
        // Leer los datos existentes del archivo JSON
        fs.readFile('datos.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error al leer los datos:', err);
                return;
            }

            let datosExistentes = [];
            if (data) {
                datosExistentes = JSON.parse(data);
            }
            let id = 0;
            // Verificar si datosExistentes es un array
            if (!Array.isArray(datosExistentes)) {
                datosExistentes = []; // Inicializar como un array vacío
            }
            // Obtener el nuevo ID de pedido
            if (datosExistentes.length > 0) {
                id = datosExistentes[datosExistentes.length - 1].id + 1;
            }
            nuevoPedido.id = id;
            // Agregar el nuevo pedido con pago a los datos existentes
            datosExistentes.push(nuevoPedido);

            // Emitir el evento 'nuevo-pedido' a todos los trabajadores conectados
            if (trabajadoresConectados > 0) {
                io.of("/worker").emit('nuevo-pedido', nuevoPedido);
            }
            // Escribir los datos actualizados en el archivo JSON
            fs.writeFile('datos.json', JSON.stringify(datosExistentes), (err) => {
                if (err) {
                    console.error('Error al guardar los datos:', err);
                } else {
                    console.log('Datos guardados correctamente');
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Iniciar el servidor y escuchar en el puerto especificado
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
}); 
