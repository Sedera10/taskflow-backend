const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

const parsePositiveInteger = (value) => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

// local
// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'taskflow',
//   password: 'postgres',
//   port: 5432
// });

// Prod
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', async (client) => {
  await client.query("SET client_encoding TO 'UTF8'");
});

// ====== Project =======
// GET /api/projects => Liste des projets avec leur avancement
app.get('/api/projects', async (req, res) => {
  try {
    const projectId = req.query.id_projet
      ? parsePositiveInteger(req.query.id_projet)
      : null;

    if (req.query.id_projet && !projectId) {
      return res.status(400).json({ message: 'id_projet doit être un entier positif' });
    }

    const result = projectId
      ? await pool.query(
          'SELECT * FROM project_progress WHERE id_project = $1',
          [projectId]
        )
      : await pool.query('SELECT * FROM project_progress');

    if (projectId && result.rows.length === 0) {
      return res.status(404).json({ message: 'Projet introuvable' });
    }

    res.status(200).json(projectId ? result.rows[0] : result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des projets'
    });
  }
});
// POST /api/projects  => New Project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Le nom du projet est obligatoire' });
    }

    const result = await pool.query(
      `INSERT INTO project (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name.trim(), description ?? null]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur lors de la création du projet'
    });
  }
});

// PATCH /api/projects/:id => Modifier un projet
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const projectId = parsePositiveInteger(req.params.id);
    const { name, description } = req.body;

    if (!projectId || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'id et name sont obligatoires' });
    }

    const result = await pool.query(
      `UPDATE project
       SET name = $1, description = $2
       WHERE id_project = $3
       RETURNING *`,
      [name.trim(), description ?? null, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Projet introuvable' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la modification du projet' });
  }
});

// DELETE /api/projects/:id => Supprimer un projet et son contenu
app.delete('/api/projects/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const projectId = parsePositiveInteger(req.params.id);
    if (!projectId) {
      return res.status(400).json({ message: 'id doit être un entier positif' });
    }

    await client.query('BEGIN');
    await client.query(
      `DELETE FROM task
       WHERE id_module IN (SELECT id_module FROM module_ WHERE id_project = $1)`,
      [projectId]
    );
    await client.query('DELETE FROM module_ WHERE id_project = $1', [projectId]);
    const result = await client.query(
      'DELETE FROM project WHERE id_project = $1 RETURNING id_project',
      [projectId]
    );
    await client.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Projet introuvable' });
    }

    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression du projet' });
  } finally {
    client.release();
  }
});

// ======= MODULE ==========
// GET /api/modules  => List modules d'un projet
app.get('/api/modules', async (req, res) => {
  try {
    const projectId = parsePositiveInteger(req.query.id_projet);

    if (!projectId) {
      return res.status(400).json({ message: 'id_projet doit être un entier positif' });
    }

    const result = await pool.query(
      `SELECT * FROM module_progress WHERE id_project = $1`,
      [projectId]
    );

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des modules'
    });
  }
});
// POST /api/modules  => New module
app.post('/api/modules', async (req, res) => {
  try {
    const { name, id_projet } = req.body;
    const projectId = parsePositiveInteger(id_projet);

    if (typeof name !== 'string' || !name.trim() || !projectId) {
      return res.status(400).json({
        message: 'name et id_projet (entier positif) sont obligatoires'
      });
    }

    const result = await pool.query(
      `INSERT INTO module_ (name, id_project)
       VALUES ($1, $2)
       RETURNING *`,
      [name.trim(), projectId]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur lors de la création du module'
    });
  }
});

// PATCH /api/modules/:id => Modifier un module
app.patch('/api/modules/:id', async (req, res) => {
  try {
    const moduleId = parsePositiveInteger(req.params.id);
    const { name } = req.body;

    if (!moduleId || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'id et name sont obligatoires' });
    }

    const result = await pool.query(
      `UPDATE module_ SET name = $1 WHERE id_module = $2 RETURNING *`,
      [name.trim(), moduleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Module introuvable' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la modification du module' });
  }
});

// DELETE /api/modules/:id => Supprimer un module et ses tâches
app.delete('/api/modules/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const moduleId = parsePositiveInteger(req.params.id);
    if (!moduleId) {
      return res.status(400).json({ message: 'id doit être un entier positif' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      'SELECT id_module FROM module_ WHERE id_module = $1',
      [moduleId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Module introuvable' });
    }

    await client.query('DELETE FROM task WHERE id_module = $1', [moduleId]);
    await client.query('DELETE FROM module_ WHERE id_module = $1', [moduleId]);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression du module' });
  } finally {
    client.release();
  }
});

// ======= TASK ==========
// GET /api/tasks  => List Task
app.get('/api/tasks', async (req, res) => {
  try {
    const moduleId = parsePositiveInteger(req.query.id_module);

    if (!moduleId) {
      return res.status(400).json({ message: 'id_module doit être un entier positif' });
    }

    const result = await pool.query(
      `SELECT * FROM task WHERE id_module = $1`,
      [moduleId]
    );

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des tâches'
    });
  }
});
// POST /api/tasks  => New Task
app.post('/api/tasks', async (req, res) => {
  try {
    const { name, description, id_module } = req.body;
    const moduleId = parsePositiveInteger(id_module);

    if (typeof name !== 'string' || !name.trim() || !moduleId) {
      return res.status(400).json({
        message: 'name et id_module (entier positif) sont obligatoires'
      });
    }

    const result = await pool.query(
      `INSERT INTO task (name, description, finished, id_module)
       VALUES ($1, $2, false, $3)
       RETURNING *`,
      [name.trim(), description ?? null, moduleId]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erreur lors de la création de la tâche'
    });
  }
});

// PATCH /api/tasks/:id => Modifier une tâche
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parsePositiveInteger(req.params.id);
    const { name, description, finished } = req.body;

    if (!taskId || (name === undefined && description === undefined && finished === undefined) || (name !== undefined && (typeof name !== 'string' || !name.trim())) || (finished !== undefined && typeof finished !== 'boolean')) {
      return res.status(400).json({ message: 'La tâche doit contenir au moins une donnée valide' });
    }

    const result = await pool.query(
      `UPDATE task
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           finished = COALESCE($3, finished),
           finished_at = CASE WHEN COALESCE($3, finished) THEN COALESCE(finished_at, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE id_task = $4
       RETURNING *`,
      [name?.trim() || null, description ?? null, finished ?? null, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la modification de la tâche' });
  }
});

// DELETE /api/tasks/:id => Supprimer une tâche
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parsePositiveInteger(req.params.id);
    if (!taskId) {
      return res.status(400).json({ message: 'id doit être un entier positif' });
    }

    const result = await pool.query('DELETE FROM task WHERE id_task = $1 RETURNING id_task', [taskId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la tâche' });
  }
});


// Prod
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend prêt sur le port ${PORT} `);
});

// Local
// app.listen(4000, () => console.log('Backend prêt sur http://localhost:4000 '));