from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import os
import re

app = FastAPI(title="Podology CRM API")

DB_FILE = "database.db"

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Tabela 1: Administradores
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS administradores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nome_completo TEXT NOT NULL DEFAULT ''
    )
    """)
    
    # Check if nome_completo exists (migration for existing DB)
    cursor.execute("PRAGMA table_info(administradores)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'nome_completo' not in columns:
        cursor.execute("ALTER TABLE administradores ADD COLUMN nome_completo TEXT NOT NULL DEFAULT ''")

    # Tabela 2: Clientes (unificada)
    # If the user has the old 'clientes' table, we might need to recreate it to support the new schema
    # For simplicity in this dev stage, if 'telefone' is missing, we drop and recreate
    cursor.execute("PRAGMA table_info(clientes)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if not columns or 'telefone' not in columns:
        cursor.execute("DROP TABLE IF EXISTS atendimentos") # Old table
        cursor.execute("DROP TABLE IF EXISTS clientes")
        cursor.execute("""
        CREATE TABLE clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            telefone TEXT NOT NULL,
            email TEXT,
            anamnese TEXT,
            data_agendamento TEXT NOT NULL,
            data_hora_consulta TEXT NOT NULL,
            FOREIGN KEY (admin_id) REFERENCES administradores (id)
        )
        """)
    
    conn.commit()
    conn.close()

# Initialize DB when script runs
init_db()

# --- Pydantic Models ---
class AdminRegister(BaseModel):
    login: str
    senha: str
    nome_completo: str

class AdminLogin(BaseModel):
    login: str
    senha: str

class ClienteCreate(BaseModel):
    admin_id: int
    nome: str
    telefone: str
    email: str
    anamnese: str
    data_agendamento: str
    data_hora_consulta: str

# --- API Endpoints ---

@app.post("/api/auth/register")
def register_admin(admin: AdminRegister):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO administradores (login, senha, nome_completo) VALUES (?, ?, ?)", (admin.login, admin.senha, admin.nome_completo))
        conn.commit()
        admin_id = cursor.lastrowid
        return {"id": admin_id, "login": admin.login, "nome_completo": admin.nome_completo}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Este login já está sendo usado.")
    finally:
        conn.close()

@app.post("/api/auth/login")
def login_admin(admin: AdminLogin):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, login, nome_completo FROM administradores WHERE login = ? AND senha = ?", (admin.login, admin.senha))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {"id": user[0], "login": user[1], "nome_completo": user[2]}
    raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")

@app.post("/api/clientes")
def create_cliente(cliente: ClienteCreate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    telefone = re.sub(r'\D', '', cliente.telefone)
    if len(telefone) <= 9 and len(telefone) > 0:
        telefone = "11" + telefone

    cursor.execute(
        "INSERT INTO clientes (admin_id, nome, telefone, email, anamnese, data_agendamento, data_hora_consulta) VALUES (?, ?, ?, ?, ?, ?, ?)", 
        (cliente.admin_id, cliente.nome, telefone, cliente.email, cliente.anamnese, cliente.data_agendamento, cliente.data_hora_consulta)
    )
    conn.commit()
    cliente_id = cursor.lastrowid
    conn.close()
    return {"id": cliente_id, "admin_id": cliente.admin_id, "nome": cliente.nome}

@app.get("/api/clientes/lookup")
def lookup_cliente(admin_id: int, telefone: str):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    tel_num = re.sub(r'\D', '', telefone)
    if len(tel_num) <= 9 and len(tel_num) > 0:
        tel_num = "11" + tel_num

    cursor.execute("""
        SELECT nome, email, anamnese, telefone
        FROM clientes
        WHERE admin_id = ?
        ORDER BY data_hora_consulta DESC
    """, (admin_id,))
    rows = cursor.fetchall()
    conn.close()
    
    for row in rows:
        db_tel = re.sub(r'\D', '', row['telefone'])
        if len(db_tel) <= 9 and len(db_tel) > 0:
            db_tel = "11" + db_tel
            
        if db_tel == tel_num:
            return {
                "nome": row["nome"],
                "email": row["email"],
                "anamnese": row["anamnese"]
            }
            
    return {}

@app.get("/api/clientes")
def get_clientes(admin_id: int):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clientes WHERE admin_id = ? ORDER BY id DESC", (admin_id,))
    clientes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return clientes

@app.get("/api/clientes/resumo")
def get_clientes_resumo(admin_id: int):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Groups by name and phone (assumed unique-ish for a person)
    # Gets the last consultation date and counts total consultations
    query = """
    SELECT 
        nome, telefone, email, anamnese,
        MAX(data_hora_consulta) as data_ultima_consulta,
        COUNT(*) as total_consultas
    FROM clientes
    WHERE admin_id = ?
    GROUP BY nome, telefone
    ORDER BY data_ultima_consulta DESC
    """
    cursor.execute(query, (admin_id,))
    resumo = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return resumo

@app.delete("/api/clientes/{cliente_id}")
def delete_cliente(cliente_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))
    conn.commit()
    conn.close()
    return {"message": "Cliente removido com sucesso."}

@app.delete("/api/clientes/telefone/{telefone}")
def delete_cliente_all(telefone: str, admin_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clientes WHERE telefone = ? AND admin_id = ?", (telefone, admin_id))
    conn.commit()
    conn.close()
    return {"message": "Todos os registros do cliente foram removidos com sucesso."}

# --- Serve Static Files ---
# Mount the "public" directory to serve the index.html and dashboard.html
app.mount("/", StaticFiles(directory="public", html=True), name="public")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
