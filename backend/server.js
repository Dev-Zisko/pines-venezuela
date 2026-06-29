const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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

// Corrige la ruta estática al final de tu server.js para que apunte bien en Docker:
//const path = require('path');

// Deja el bloque de cierre simplemente así (sin volver a declarar const path):
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `Endpoint de API no encontrado: ${req.method} ${req.path}` });
    }
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Asegúrate de que tu constante de puerto esté definida ASÍ:
const PORT = process.env.PORT || 8080;

// Y que tu app escuche esa variable:
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});