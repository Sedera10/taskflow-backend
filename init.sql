-- 1. Créer un projet
INSERT INTO project (name, description)
VALUES (
    'Application TodoList',
    'Projet d''étude pour la gestion des tâches'
);

-- 2. Créer un module rattaché au projet
INSERT INTO module_ (name, id_project)
VALUES (
    'Développement Backend',
    1
);

-- 3. Créer deux tâches rattachées au module
INSERT INTO task (name, description, id_module)
VALUES
(
    'Créer l''API REST',
    'Développer les endpoints avec Node.js et Express',
    1
),
(
    'Connecter PostgreSQL',
    'Configurer la connexion entre Node.js et PostgreSQL',
    1
);