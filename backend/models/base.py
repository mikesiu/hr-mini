from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config.settings import (
    USE_MYSQL, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, 
    MYSQL_DATABASE, MYSQL_CHARSET, DB_PATH
)

# Database Configuration with fallback to SQLite
if USE_MYSQL:
    # MySQL Database Configuration
    DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset={MYSQL_CHARSET}"
    
    engine = create_engine(
        DATABASE_URL,
        future=True,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,    # Recycle connections every 5 minutes
        pool_size=10,        # Maximum number of connections to maintain
        max_overflow=20,     # Maximum number of connections to allow beyond pool_size
        pool_timeout=30,     # Timeout for getting a connection from the pool
        connect_args={
            "connect_timeout": 10,  # MySQL connection timeout in seconds
        }
    )
    
    @event.listens_for(engine, "connect")
    def set_mysql_settings(dbapi_connection, connection_record):
        """Set MySQL-specific connection settings"""
        cursor = dbapi_connection.cursor()
        cursor.execute("SET sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'")
        cursor.close()
else:
    # SQLite Database Configuration (fallback)
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    
    engine = create_engine(
        DATABASE_URL,
        future=True,
        pool_pre_ping=True,  # Verify connections before use
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
