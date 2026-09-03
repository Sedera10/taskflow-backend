CREATE TABLE project (
    id_project SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE module_ (
    id_module SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_project INTEGER NOT NULL,
    FOREIGN KEY (id_project) REFERENCES project(id_project)
);

CREATE TABLE task (
    id_task SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    finished BOOLEAN NOT NULL DEFAULT FALSE,
    finished_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_module INTEGER NOT NULL,
    FOREIGN KEY (id_module) REFERENCES module_(id_module)
);



CREATE VIEW module_progress AS
SELECT
    m.id_module,
    m.name AS module_name,
    m.id_project,
    m.created_at,
    COUNT(t.id_task) AS total_tasks,
    COUNT(t.id_task) FILTER (WHERE t.finished = TRUE) AS completed_tasks,
    ROUND(
        COALESCE(
            COUNT(t.id_task) FILTER (WHERE t.finished = TRUE) * 100.0
            / NULLIF(COUNT(t.id_task), 0),
            0
        ),
        2
    ) AS progress_percent
FROM module_ m
LEFT JOIN task t
    ON t.id_module = m.id_module
GROUP BY
    m.id_module,
    m.name,
    m.id_project,
    m.created_at;


-- Detail avec avancement d'un module
CREATE VIEW project_progress AS
SELECT
    p.id_project,
    p.name AS project_name,
    p.description,
    p.created_at,
    COUNT(mp.id_module) AS total_modules,
    ROUND(
        COALESCE(AVG(mp.progress_percent), 0),
        2
    ) AS progress_percent
FROM project p
LEFT JOIN module_progress mp
    ON mp.id_project = p.id_project
GROUP BY
    p.id_project,
    p.name,
    p.description,
    p.created_at;