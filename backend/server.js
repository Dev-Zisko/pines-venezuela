const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Servir los archivos estáticos desde la carpeta frontend
app.use(express.static(path.resolve(__dirname, '../frontend')));

// 2. Configuración e inicialización de la Base de Datos
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

// 3. RUTAS DE LA API (Primero registramos los endpoints)
app.get('/api/pins', async (req, res) => {
    try {
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

app.post('/api/pins', async (req, res) => {
    // ... Tu lógica actual de POST para guardar pines permanece idéntica
});

app.post('/api/pins/:id/vote', async (req, res) => {
    // ... Tu lógica actual de votación permanece idéntica
});

// 4. CAPTURA TOTAL (Siempre al final, actúa como red de seguridad para el frontend)
app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// 5. Encendido del Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de emergencia corriendo en puerto ${PORT}`));