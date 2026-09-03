CREATE DATABASE taskflow;
\c taskflow

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