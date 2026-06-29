const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');

// Servir la carpeta frontend de forma estática usando ruta absoluta
app.use(express.static(path.resolve(__dirname, '../frontend')));

// Capturar el resto de rutas y servir el index.html usando ruta absoluta
app.get('(.*)', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Configuración de la conexión a MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'sismo_root_secure',
    database: process.env.DB_NAME || 'sismo_alert_ve'
};

let pool;

async function initDB() {
    pool = mysql.createPool(dbConfig);
    console.log('Pool de conexiones a MySQL inicializado con éxito');
}
initDB();

// 1. Obtener todos los pines activos extraídos como coordenadas puras
app.get('/api/pins', async (req, res) => {
    try {
        // ST_X es Longitud, ST_Y es Latitud
        const [rows] = await pool.query(`
            SELECT id, type, description, status, votes_positive, votes_negative,
                   ST_X(location) AS lng, ST_Y(location) AS lat, created_at 
            FROM pins 
            WHERE status = 'active'
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los pines de la base de datos' });
    }
});

// 2. Crear un nuevo pin insertando un objeto POINT(Longitud Latitud)
app.post('/api/pins', async (req, res) => {
    try {
        const { type, lng, lat, description } = req.body;
        
        if (!type || !lng || !lat) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const cleanDesc = description ? description.substring(0, 160) : '';

        // ST_PointFromText o POINT() construye el dato espacial nativo de MySQL
        const query = `
            INSERT INTO pins (type, location, description, status, votes_positive, votes_negative)
            VALUES (?, POINT(?, ?), ?, 'active', 1, 0)
        `;
        
        const [result] = await pool.query(query, [type, parseFloat(lng), parseFloat(lat), cleanDesc]);
        
        res.status(201).json({ id: result.insertId, type, lng, lat, description: cleanDesc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el pin en MySQL' });
    }
});

// 3. Votar y moderar automáticamente
app.post('/api/pins/:id/vote', async (req, res) => {
    try {
        const { direction } = req.body; // 'up' o 'down'
        const pinId = req.params.id;
        
        const column = direction === 'up' ? 'votes_positive' : 'votes_negative';
        
        // 1. Incrementar el voto correspondiente
        await pool.query(`UPDATE pins SET ${column} = ${column} + 1 WHERE id = ?`, [pinId]);
        
        // 2. Comprobar si debe ser archivado automáticamente por sospecha de falsedad o resuelto
        const [rows] = await pool.query(`SELECT votes_positive, votes_negative FROM pins WHERE id = ?`, [pinId]);
        
        if (rows.length > 0) {
            const pin = rows[0];
            if ((pin.votes_negative - pin.votes_positive) >= 4) {
                await pool.query(`UPDATE pins SET status = 'archived' WHERE id = ?`, [pinId]);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar el voto en el servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de emergencia corriendo en puerto ${PORT}`));