-- =====================================================================
-- "Classics" — kleine generieke oefendatabase voor algemene SQL-modus
-- Inspiratie: Chinook / Northwind, maar minimaal en didactisch
-- =====================================================================
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    price DOUBLE NOT NULL,
    stock INTEGER NOT NULL
);

CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    salary DOUBLE NOT NULL,
    manager_id INTEGER REFERENCES employees(id),
    hired_at VARCHAR(255) NOT NULL
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    employee_id INTEGER REFERENCES employees(id),
    order_date VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL  -- 'placed','shipped','cancelled'
);

CREATE TABLE order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DOUBLE NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

INSERT INTO categories VALUES (1,'Electronics'),(2,'Books'),(3,'Clothing'),(4,'Home');

INSERT INTO products VALUES
 (1,'Laptop',1,1200.00,15),
 (2,'Phone',1,800.00,30),
 (3,'Headphones',1,150.00,50),
 (4,'Novel',2,15.00,200),
 (5,'Cookbook',2,25.00,80),
 (6,'T-Shirt',3,20.00,120),
 (7,'Jeans',3,55.00,60),
 (8,'Lamp',4,40.00,40),
 (9,'Chair',4,90.00,20),
 (10,'Keyboard',1,75.00,35);

INSERT INTO customers VALUES
 (1,'Alice Janssens','Ghent','BE','alice@ex.com','2023-01-15'),
 (2,'Bob Peeters','Antwerp','BE','bob@ex.com','2023-02-20'),
 (3,'Carla Smith','London','UK','carla@ex.com','2023-03-10'),
 (4,'David Lee','New York','US','david@ex.com','2023-04-05'),
 (5,'Emma Dubois','Paris','FR','emma@ex.com','2023-05-12'),
 (6,'Felix Mertens','Ghent','BE',NULL,'2024-01-08'),
 (7,'Gina Romano','Rome','IT','gina@ex.com','2024-02-14'),
 (8,'Henk de Vries','Amsterdam','NL','henk@ex.com','2024-03-22');

INSERT INTO employees VALUES
 (1,'Sophie Hendricks','CEO',9500.00,NULL,'2018-06-01'),
 (2,'Marc Vermeulen','Sales Manager',5500.00,1,'2019-09-15'),
 (3,'Lisa Tan','Sales Rep',3200.00,2,'2021-03-10'),
 (4,'Tom Baker','Sales Rep',3100.00,2,'2022-07-01'),
 (5,'Nora Khan','Support',2800.00,1,'2023-02-18'),
 (6,'Pieter Goor','Sales Rep',2900.00,2,'2024-01-09');

INSERT INTO orders VALUES
 (1,1,3,'2024-01-10','shipped'),
 (2,2,3,'2024-01-15','shipped'),
 (3,1,4,'2024-02-02','shipped'),
 (4,3,4,'2024-02-18','cancelled'),
 (5,4,3,'2024-03-05','shipped'),
 (6,5,6,'2024-03-20','placed'),
 (7,2,4,'2024-04-01','shipped'),
 (8,6,6,'2024-04-15','shipped'),
 (9,7,3,'2024-05-02','placed'),
 (10,8,6,'2024-05-12','shipped'),
 (11,1,3,'2024-06-01','shipped'),
 (12,4,4,'2024-06-22','shipped');

INSERT INTO order_items VALUES
 (1,1,1,1200.00),(1,3,2,150.00),
 (2,2,1,800.00),
 (3,4,3,15.00),(3,5,1,25.00),
 (4,9,1,90.00),
 (5,1,1,1200.00),(5,10,2,75.00),
 (6,6,3,20.00),(6,7,1,55.00),
 (7,2,1,800.00),(7,3,1,150.00),
 (8,8,2,40.00),
 (9,4,5,15.00),
 (10,9,1,90.00),(10,8,1,40.00),
 (11,10,1,75.00),
 (12,1,1,1200.00),(12,3,1,150.00),(12,6,2,20.00);
