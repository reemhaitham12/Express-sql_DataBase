const mysql2 = require("mysql2");
const express = require("express");
const app = express();
const PORT = 3000;
const DataConnection = mysql2.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "assign7",
});
DataConnection.connect((err) => {
  if (err) {
    console.error("Fail connection database");
  } else {
    console.log("connection Database stablish");
  }
});
app.use(express.json());
// Part 2 A. URL: POST /DB/create-tables
app.post("/DB/create-tables", (req, res, next) => {
  DataConnection.execute(
    `
        CREATE TABLE IF NOT EXISTS users (
      u_id INT AUTO_INCREMENT PRIMARY KEY,
      u_firstName VARCHAR(50) NOT NULL,
      u_lastName VARCHAR(50) NOT NULL,
      phone VARCHAR(15) NOT NULL,
      u_email VARCHAR(100) NOT NULL UNIQUE,
      role VARCHAR(20) NOT NULL,
      u_password VARCHAR(255) NOT NULL
    )
        `,
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "fail to execute required query", err });
      }
    }
  );
  DataConnection.execute(
    `
            CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      stock INT DEFAULT 0,
      isDeleted BOOLEAN DEFAULT FALSE,
      price DOUBLE NOT NULL
    )
            `,
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "fail to execute required query", err });
      }
    }
  );

  return res.status(200).json({ message: "Tables created successfully." });
});

// B.1 URL: POST /user/signup
app.post("/user/signup", (req, res, next) => {
  const { firstName, lastName, password, email, phone, role } = req.body;
  console.log({ firstName, lastName, password, email, phone, role });
  DataConnection.execute(
    `SELECT u_email FROM users WHERE u_email=?`,
    [email],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute required query", err });
      } else if (data.length > 0) {
        return res
          .status(409)
          .json({ message: "Email already exists", email: data[0].u_email });
      } else {
        DataConnection.execute(
          `INSERT INTO users (u_firstName,u_lastName,u_password,u_email,phone,role) VALUES (?,?,?,?,?,?)`,
          [firstName, lastName, password, email, phone, role],
          (err, data) => {
            if (err || !data.affectedRows) {
              return res
                .status(500)
                .json({ message: "Fail to execute required query", err });
            } else {
              return res
                .status(201)
                .json({ message: "User added successfully." });
            }
          }
        );
      }
      console.log(data);
    }
  );
});

// B.2 URL: POST /user/login
app.post("/user/login", (req, res, next) => {
  const { email, password } = req.body;
  console.log({ email, password });
  DataConnection.execute(
    `SELECT u_email,u_password FROM users WHERE u_email=? AND u_password=?`,
    [email, password],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute this Query", err });
      }
      // if the data -> NO user Found
      if (data.length === 0) {
        return res.status(404).json({
          message: "Invalid credentials ( email and password mismatch )",
        });
      }
      return res
        .status(200)
        .json({ message: "Done Login Successfully ", data });
    }
  );
});

// B.3 URL: POST /user/alter-table
app.post("/user/alter-table", (req, res, next) => {
  const { id } = req.body;
  DataConnection.execute(
    `SELECT role FROM users WHERE u_id=? `,
    [id],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute this Query", err });
      }
      // role != admin
      if (data.length === 0 || data[0].role !== "admin") {
        return res.status(403).json({ message: "You don't have access " });
      }
      // check the column exists
      DataConnection.execute(
        `SHOW COLUMNS FROM users LIKE 'createdAt'`,
        (err, data) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Fail to execute this Query", err });
          }
          if (data.length === 0) {
            // add column if column not exists
            // role="admin"
            DataConnection.execute(
              `ALTER TABLE users ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
              (err, data) => {
                if (err) {
                  return res
                    .status(500)
                    .json({ message: "Fail to execute this Query", err });
                }
                return res
                  .status(200)
                  .json({ message: "Done created added successfully", data });
              }
            );
          } else {
            return res
              .status(200)
              .json({ message: " Done column 'createdAt' already exists" });
          }
        }
      );
    }
  );
});

// B.4 URL: POST /user/truncate-table
app.post("/user/truncate-table", (req, res, next) => {
  const { id } = req.body;
  DataConnection.execute(
    `SELECT role FROM users WHERE u_id=? `,
    [id],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute this Query", err });
      }
      // role != admin
      if (data.length === 0 || data[0].role !== "admin") {
        return res.status(403).json({ message: "You don't have access " });
      }
      // check the column exists
      DataConnection.execute(`TRUNCATE TABLE products`, (err, data) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Fail to execute this Query", err });
        }
        return res.status(200).json({ message: "done truncated successfully" });
      });
    }
  );
});

// C.1 URL: POST /products
app.post("/products", (req, res, next) => {
  const { name, price } = req.body;
  // console.log({name,price});
  DataConnection.execute(
    `INSERT INTO products (name,price) VALUES (?,?)`,
    [name, price],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute required query", err });
      } else {
        return res.status(200).json({ message: "Products added" });
      }
    }
  );
});

// C.2 URL: PATCH /products/soft-delete/:id
app.patch("/soft-delete/:id", (req, res, next) => {
  const { id } = req.params.id;
  const { userId } = req.body;
  DataConnection.execute(
    `SELECT role FROM users WHERE u_id = ?`,
    [userId],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute required query", err });
      }
      if (data.length === 0 || data[0].role !== "admin") {
        return res.status(403).json({ message: "You don't have access" });
      }
      DataConnection.execute(
        `UPDATE products SET isDeleted = 1 WHERE id = ?`,
        [id],
        (err, data) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Fail to execute required query", err });
          }
          // not find the product
          if (data.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found" });
          }
          return res
            .status(200)
            .json({ message: "product soft-deleted successfully" });
        }
      );
    }
  );
});

// C.3 URL: DELETE /products/:id
app.delete("/products/:id", (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;
  DataConnection.execute(
    `SELECT role FROM users WHERE u_id = ?`,
    [userId],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Fail to execute required query", err });
      }
      // Ensure the user has 'admin' role
      if (data.length === 0 || data[0].role !== "admin") {
        return res.status(403).json({ message: "You don't have access" });
      }
      // Delete the product by ID
      DataConnection.execute(
        `DELETE FROM products WHERE id = ?`,
        [id],
        (err, data) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Fail to execute required query", err });
          }
          // Check if the product was deleted
          if (data.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found" });
          }
          return res
            .status(200)
            .json({ message: "Product deleted successfully" });
        }
      );
    }
  );
});

// C.4 URL: GET /products/search (for example => /products/search?name=phone)
app.get("/products/search", (req, res, next) => {
  const { name } = req.query;
  if (!name) {
    return res
      .status(400)
      .json({ message: "Product name is required for search" });
  }
  DataConnection.execute(
    `SELECT * FROM products WHERE name LIKE ?`,
    [`%${name}%`],
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to execute the query", err });
      }
      if (data.length === 0) {
        return res.status(404).json({ message: "No products found" });
      }
      return res.status(200).json(data);
    }
  );
});

// C.5 URL: GET /products/in (for example => /products/in?ids=1,3)
app.get("/products/in", (req, res, next) => {
  const { ids } = req.query;
  if (!ids) {
    return res.status(400).json({ message: "IDs are required" });
  }
  const idsArray = ids.split(",").map(Number);
  if (idsArray.some((id) => isNaN(id))) {
    return res.status(400).json({ message: "Invalid IDs format" });
  }
  const query = `SELECT id, name, price FROM products WHERE id IN (${idsArray.join(
    ","
  )}) AND isDeleted = 0`;
  DataConnection.execute(query, (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to execute the query", err });
    }
    if (data.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }
    return res.status(200).json(data);
  });
});

// C.6 URL: GET /products/all
app.get("/products/all", (req, res, next) => {
  DataConnection.execute(
    `SELECT id, name AS productName, price AS cost FROM products WHERE isDeleted = 0`,
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to execute the query", err });
      }
      if (data.length === 0) {
        return res.status(404).json({ message: "No products found" });
      }
      return res.status(200).json(data);
    }
  );
});

// C.7 URL: GET /products/products-with-users
app.get("/products/products-with-users", (req, res, next) => {
  DataConnection.execute(
    `SELECT 
    products.name AS productName, 
    users.u_email AS userEmail
    FROM user_products
    JOIN products ON user_products.product_id = products.id
    JOIN users ON user_products.u_id = users.u_id
    WHERE products.isDeleted = 0;`,
    (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to execute the query", err });
      }
      if (data.length === 0) {
        return res.status(404).json({ message: "No products found" });
      }
      return res.status(200).json(data);
    }
  );
});

// C.8 URL: GET /products/max-price
app.get("/products/max-price", (req, res, next) => {
  DataConnection.execute(`SELECT MAX(price) AS maxPrice FROM products WHERE isDeleted = 0`, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Failed to execute the query", err });
    }
    if (data.length === 0 || data[0].maxPrice === null) {
      return res.status(404).json({ message: "No products found or no prices available" });
    }
    return res.status(200).json({ maxPrice: data[0].maxPrice });
  });
});




// C.9 URL: GET /products/top-expensive
app.get("/products/top-expensive", (req, res, next) => {
  DataConnection.execute(`SELECT name, price FROM products WHERE isDeleted = 0 ORDER BY price DESC LIMIT 5`, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Failed to execute the query", err });
    }
    if (data.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }
    return res.status(200).json(data);
  });
});


app.listen(PORT, () => {
  console.log("Server is running ", PORT);
});
