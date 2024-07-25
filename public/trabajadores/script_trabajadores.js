const socket = io("/worker");
const orderList = document.getElementById('lista-pedidos');
const audioElement = document.getElementById('audio-pagado'); // Obtener el elemento de audio

function addOrderToList(pedido) {
    const listItem = document.createElement('li');
    listItem.className = 'pedido-item';

    const orderData = document.createElement('p');
    orderData.textContent = `ID Pedido: ${pedido.id}`;
    listItem.appendChild(orderData);

    for (let item in pedido) {
        if (item !== 'id') {
            const orderData = document.createElement('p');
            orderData.textContent = `${item}: Precio - ${pedido[item].precio}, Cantidad - ${pedido[item].cantidad}`;
            listItem.appendChild(orderData);
        }
    }

    const button = document.createElement('button');
    button.className = 'boton-marcar-pagado';
    button.textContent = 'Marcar como pagado';
    button.addEventListener('click', () => {
        // Emitir un evento de vuelta al servidor para marcar el pedido como pagado
        socket.emit('marcar-pagado', pedido.id);
        // Reproducir el sonido de tarea completada
        audioElement.play();
    });
    listItem.appendChild(button);

    orderList.appendChild(listItem);
}

socket.on('actualizar-pedidos', (datosJSON) => {
    // Eliminar los pedidos de la lista de pedidos
    orderList.innerHTML = '';

    // Añadir todos los pedidos
    datosJSON.forEach(pedido => {
        addOrderToList(pedido);
    });
});

// Si llega un nuevo pedido, añadirlo a la lista de pedidos
socket.on('nuevo-pedido', (pedido) => {
    addOrderToList(pedido);
});
