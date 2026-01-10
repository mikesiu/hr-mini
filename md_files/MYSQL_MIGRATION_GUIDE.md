# MySQL Migration Guide for HR Mini Application

This guide provides step-by-step instructions for migrating the HR Mini application from SQLite to MySQL.

## Prerequisites

1. **MySQL Server**: Install MySQL 8.0 or later
2. **Python Dependencies**: Install the updated requirements
3. **Backup**: Ensure you have a backup of your current SQLite database

## Installation Steps

### 1. Install MySQL Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up MySQL Database

1. **Install MySQL Server** (if not already installed)
2. **Create Database and User**:

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE hr_mini CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_password' with a secure password)
CREATE USER 'hr_user'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON hr_mini.* TO 'hr_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure Environment Variables

Create a `.env` file in your project root or set environment variables:

```bash
# Database Configuration
HR_DB_TYPE=mysql

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=hr_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=hr_mini
MYSQL_CHARSET=utf8mb4
```

## Migration Process

### Step 1: Export Data from SQLite

```bash
python scripts/export_sqlite_data.py
```

This will create export files in `backups/mysql_export/`:
- `complete_export_YYYYMMDD_HHMMSS.json` - Complete export
- `metadata.json` - Export metadata
- Individual table files (e.g., `employees.json`, `companies.json`)

### Step 2: Import Data to MySQL

```bash
python scripts/import_to_mysql.py
```

This will:
- Create the MySQL database if it doesn't exist
- Create all necessary tables
- Import all data from the export files

### Step 3: Validate Migration

```bash
python scripts/validate_migration.py
```

This will verify:
- Record counts match
- Foreign key relationships are intact
- Data integrity is maintained

## Switching Between Databases

### To Use MySQL
```bash
set HR_DB_TYPE=mysql
python app.py
```

### To Use SQLite (fallback)
```bash
set HR_DB_TYPE=sqlite
python app.py
```

## Configuration Details

### Database URL Format

- **SQLite**: `sqlite:///C:\hr-mini\hr.db`
- **MySQL**: `mysql+pymysql://hr_user:password@localhost:3306/hr_mini?charset=utf8mb4`

### Connection Settings

**SQLite**:
- Uses WAL mode for better concurrency
- Foreign keys enabled
- Thread-safe connections

**MySQL**:
- Connection pooling enabled
- Pre-ping for connection verification
- 5-minute connection recycling
- Strict SQL mode for data integrity

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check MySQL server is running
   - Verify host, port, and credentials
   - Ensure firewall allows MySQL connections

2. **Authentication Failed**
   - Verify username and password
   - Check user privileges
   - Ensure user can connect from your host

3. **Character Encoding Issues**
   - Ensure MySQL database uses utf8mb4
   - Check connection charset setting
   - Verify data was exported with proper encoding

4. **Foreign Key Constraint Errors**
   - Check import order (tables are imported in dependency order)
   - Verify all referenced records exist
   - Check for data inconsistencies

### Validation Failures

If validation fails:

1. **Check Record Counts**: Compare SQLite vs MySQL counts
2. **Verify Foreign Keys**: Look for orphaned records
3. **Check Data Integrity**: Look for missing required fields
4. **Review Error Messages**: Check console output for specific errors

### Rollback Plan

If migration fails:

1. **Keep SQLite as Primary**: Set `HR_DB_TYPE=sqlite`
2. **Fix Issues**: Address any problems found
3. **Re-run Migration**: Start from export step again
4. **Validate**: Ensure everything works before switching

## Performance Considerations

### MySQL Optimizations

1. **Indexes**: Ensure proper indexes on foreign keys and frequently queried columns
2. **Connection Pooling**: Already configured for optimal performance
3. **Query Optimization**: Monitor slow queries and optimize as needed

### Monitoring

- Use `scripts/validate_migration.py` regularly to check data integrity
- Monitor MySQL slow query log
- Check connection pool usage

## Security Notes

1. **Password Security**: Use strong passwords for MySQL user
2. **Network Security**: Consider SSL connections for production
3. **Access Control**: Limit database user privileges to minimum required
4. **Backup Strategy**: Implement regular MySQL backups

## Production Deployment

For production deployment:

1. **Use Environment Variables**: Never hardcode credentials
2. **SSL Connections**: Enable SSL for database connections
3. **Regular Backups**: Implement automated backup strategy
4. **Monitoring**: Set up database monitoring and alerting
5. **Load Testing**: Test with production-like data volumes

## Support

If you encounter issues:

1. Check this guide first
2. Review error messages carefully
3. Validate your configuration
4. Test with a small dataset first
5. Keep SQLite as backup until migration is fully validated
