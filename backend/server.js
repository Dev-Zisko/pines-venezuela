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
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Pool de conexiones a MySQL inicializado con éxito');
    } catch (err) {
        console.error('❌ Error fatal al inicializar el Pool de MySQL:', err);
    }
}
initDB();

// 3. RUTAS DE LA API
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
        console.error('❌ Error en GET /api/pins:', error);
        res.status(500).json({ error: 'Error al obtener los pines de la base de datos' });
    }
});

app.post('/api/pins', async (req, res) => {
    console.log("📥 Petición POST recibida en /api/pins. Cuerpo:", req.body);
    const { type, description, lat, lng } = req.body;

    // Validación estricta para evitar que el servidor procese basura o falle
    if (!type || lat === undefined || lng === undefined) {
        console.error("❌ Validación fallida: Faltan campos obligatorios");
        return res.status(400).json({ error: 'Faltan campos obligatorios (type, lat, lng)' });
    }

    try {
        // Guardamos usando la propiedad espacial POINT de MySQL para que tu consulta GET funcione perfectamente
        const query = `
            INSERT INTO pins (type, description, location, status, votes_positive, votes_negative) 
            VALUES (?, ?, ST_GeomFromText(?), 'active', 0, 0)
        `;
        const pointText = `POINT(${lng} ${lat})`;

        console.log(`🛢️ Insertando marcador en la BD en la ubicación: ${pointText}`);
        const [result] = await pool.execute(query, [type, description || null, pointText]);
        
        console.log("✅ Inserción en BD exitosa. ID generado:", result.insertId);

        // RESPUESTA OBLIGATORIA: Desbloquea el frontend enviándole el JSON de éxito
        return res.status(201).json({
            id: result.insertId,
            message: 'Pin registrado exitosamente',
            data: { type, description, lat, lng }
        });

    } catch (error) {
        console.error('❌ Error crítico al insertar el pin en MySQL:', error);
        // Evita que el cliente se quede congelado si la consulta explota
        return res.status(500).json({ error: 'Error interno del servidor al guardar en la base de datos', details: error.message });
    }
});

app.post('/api/pins/:id/vote', async (req, res) => {
    const { id } = req.params;
    const { voteType } = req.body; // Se espera 'positive' o 'negative'

    if (voteType !== 'positive' && voteType !== 'negative') {
        return res.status(400).json({ error: 'Tipo de voto inválido. Debe ser positive o negative' });
    }

    try {
        const fieldToUpdate = voteType === 'positive' ? 'votes_positive' : 'votes_negative';
        const query = `UPDATE pins SET ${fieldToUpdate} = ${fieldToUpdate} + 1 WHERE id = ?`;
        
        const [result] = await pool.execute(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Marcador no encontrado' });
        }

        return res.json({ message: 'Voto registrado exitosamente' });
    } catch (error) {
        console.error('❌ Error en POST /api/pins/:id/vote:', error);
        return res.status(500).json({ error: 'Error al procesar el voto en la base de datos' });
    }
});

// 4. ARCHIVOS ESTÁTICOS Y CAPTURA TOTAL (Configurados para Docker)
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `Endpoint de API no encontrado: ${req.method} ${req.path}` });
    }
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// 5. ARRANQUE DEL SERVIDOR EN PROXIES (RAILWAY)
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend corriendo con éxito en el puerto ${PORT}`);
});