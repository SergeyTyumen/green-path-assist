"""
ParkConstructionCRM - Python Flask версия
Копия оригинального React проекта с сохранением дизайна
"""
import os
import sqlite3
import json
import hashlib
import secrets
from functools import wraps
from datetime import datetime

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from services.db_services import get_dashboard_data

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))

@app.template_filter('format_date')
def _jinja2_filter_format_date(date_str):
    if not date_str:
        return ""
    try:
        # Попробуем разобрать дату, если это строка
        if isinstance(date_str, str):
            # Учитываем возможный формат с временем
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return dt.strftime('%d.%m.%Y')
        # Если это уже объект datetime
        return date_str.strftime('%d.%m.%Y')
    except (ValueError, TypeError):
        return date_str # Возвращаем как есть, если не можем отформатировать

# Конфигурация базы данных
DATABASE = 'crm.db'

def get_db_connection():
    """Подключение к базе данных SQLite"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Инициализация базы данных с таблицами"""
    conn = get_db_connection()
    
    # Создание таблицы поставщиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            email TEXT,
            entity_type TEXT NOT NULL,
            contact_person TEXT,
            status TEXT CHECK(status IN ('active', 'on-hold', 'inactive')) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы категорий поставщиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS supplier_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        )
    ''')
    
    # Создание таблицы тегов поставщиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS supplier_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            tag_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        )
    ''')
    
    # Создание таблицы телефонов поставщиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS supplier_phones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            number TEXT NOT NULL,
            type TEXT CHECK(type IN ('mobile', 'landline')) NOT NULL DEFAULT 'mobile',
            messenger TEXT CHECK(messenger IN ('whatsapp', 'telegram', 'viber', 'none', '')) NOT NULL DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        )
    ''')
    
    # Создание таблицы заказов
    conn.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
            amount REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        )
    ''')
    
    # Создание таблицы отзывов о поставщиках
    conn.execute('''
        CREATE TABLE IF NOT EXISTS supplier_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            order_id INTEGER,
            rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
            comment TEXT,
            author_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
            FOREIGN KEY (order_id) REFERENCES orders (id)
        )
    ''')
    
    # Создание таблицы подрядчиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS contractors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            phone TEXT,
            description TEXT,
            verified BOOLEAN NOT NULL DEFAULT 0,
            experience_years INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы специализаций подрядчиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS contractor_specializations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            specialization TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contractor_id) REFERENCES contractors (id)
        )
    ''')
    
    # Создание таблицы проектов подрядчиков
    conn.execute('''
        CREATE TABLE IF NOT EXISTS contractor_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT CHECK(status IN ('in_progress', 'completed', 'cancelled')) NOT NULL DEFAULT 'in_progress',
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contractor_id) REFERENCES contractors (id)
        )
    ''')
    
    # Создание таблицы отзывов о подрядчиках
    conn.execute('''
        CREATE TABLE IF NOT EXISTS contractor_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            project_id INTEGER,
            rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
            comment TEXT,
            author_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contractor_id) REFERENCES contractors (id),
            FOREIGN KEY (project_id) REFERENCES contractor_projects (id)
        )
    ''')
    
    # Создание таблицы смет
    conn.execute('''
        CREATE TABLE IF NOT EXISTS estimates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            client_id INTEGER,
            status TEXT CHECK(status IN ('draft', 'sent', 'approved', 'rejected')) NOT NULL DEFAULT 'draft',
            valid_until DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    ''')
    
    # Создание таблицы элементов сметы
    conn.execute('''
        CREATE TABLE IF NOT EXISTS estimate_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estimate_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            name TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 1,
            unit TEXT NOT NULL DEFAULT 'шт',
            price REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (estimate_id) REFERENCES estimates (id)
        )
    ''')
    
    # Создание таблицы услуг
    conn.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы услуг клиента
    conn.execute('''
        CREATE TABLE IF NOT EXISTS client_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            service_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id),
            FOREIGN KEY (service_code) REFERENCES services (code)
        )
    ''')
    
    # Вставка базовых услуг
    services = [
        ('landscape-design', 'Ландшафтный дизайн'),
        ('auto-irrigation', 'Автополив'),
        ('lawn', 'Газон'),
        ('planting', 'Посадка растений'),
        ('hardscape', 'Мощение'),
        ('maintenance', 'Обслуживание')
    ]
    
    for code, name in services:
        try:
            conn.execute('INSERT INTO services (code, name) VALUES (?, ?)', (code, name))
        except sqlite3.IntegrityError:
            # Пропускаем, если услуга уже существует
            pass
    
    # Создание таблицы пользователей
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы смет
    conn.execute('''
        CREATE TABLE IF NOT EXISTS estimates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT CHECK(status IN ('draft', 'sent', 'approved', 'rejected')) NOT NULL DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    ''')
    
    # Создание таблицы коммерческих предложений
    conn.execute('''
        CREATE TABLE IF NOT EXISTS proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            estimate_id INTEGER,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT CHECK(status IN ('draft', 'sent', 'approved', 'rejected')) NOT NULL DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id),
            FOREIGN KEY (estimate_id) REFERENCES estimates (id)
        )
    ''')
    
    # Создание таблицы задач
    conn.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            client_id INTEGER,
            category TEXT CHECK(category IN ('call', 'estimate', 'proposal', 'other')) NOT NULL DEFAULT 'other',
            priority TEXT CHECK(priority IN ('high', 'medium', 'low')) NOT NULL DEFAULT 'medium',
            status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
            due_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    ''')
    
    # Создание таблицы клиентов
    conn.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            project_description TEXT,
            budget REAL,
            project_area REAL,
            last_contact DATE,
            next_action TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы стадий
    conn.execute('''
        CREATE TABLE IF NOT EXISTS client_stages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            stage_name TEXT NOT NULL,
            stage_order INTEGER NOT NULL,
            completed BOOLEAN DEFAULT 0,
            completed_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    ''')
    
    # Создание таблицы комментариев
    conn.execute('''
        CREATE TABLE IF NOT EXISTS client_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            comment_type TEXT DEFAULT 'note',
            author_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Список стадий (копия из оригинального проекта)
DEFAULT_STAGES = [
    'Первый звонок',
    'Назначен замер', 
    'Готовим смету',
    'Выставили КП',
    'Вносятся правки',
    'Вышли на договор',
    'Договор подписан',
    'Объект в работе',
    'Завершен'
]

@app.route('/')
@login_required
def dashboard():
    """Главная страница - дашборд"""
    dashboard_data = get_dashboard_data()
    return render_template('dashboard.html', **dashboard_data)

@app.route('/clients')
@login_required
def clients():
    """Страница клиентов и заявок"""
    conn = get_db_connection()
    search = request.args.get('search', '').lower()
    status = request.args.get('status', 'all')
    
    # Базовый запрос для получения клиентов с информацией о стадиях
    query = '''
        SELECT 
            c.*,
            COUNT(cs.id) as total_stages,
            SUM(CASE WHEN cs.completed = 1 THEN 1 ELSE 0 END) as completed_stages,
            MAX(CASE WHEN cs.completed = 0 THEN cs.stage_name END) as current_stage,
            MAX(CASE WHEN cs.completed = 0 THEN cs.updated_at END) as current_stage_date,
            cc.content as last_comment,
            cc.created_at as last_comment_date
        FROM clients c
        LEFT JOIN client_stages cs ON c.id = cs.client_id
        LEFT JOIN (
            SELECT client_id, content, created_at,
                   ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at DESC) as rn
            FROM client_comments
        ) cc ON c.id = cc.client_id AND cc.rn = 1
        WHERE 1=1
    '''
    
    params = []
    
    # Добавляем поиск по имени, телефону или email
    if search:
        query += '''
            AND (
                LOWER(c.name) LIKE ? OR 
                c.phone LIKE ? OR 
                LOWER(c.email) LIKE ?
            )
        '''
        search_param = f'%{search}%'
        params.extend([search_param, search_param, search_param])
    
    # Группировка и сортировка
    query += '''
        GROUP BY c.id
        ORDER BY c.created_at DESC
    '''
    
    clients_data = conn.execute(query, params).fetchall()
    
    # Преобразуем результаты в список словарей с дополнительной информацией
    clients = []
    for client in clients_data:
        # Определяем статус на основе прогресса
        progress = client['completed_stages'] / client['total_stages'] if client['total_stages'] > 0 else 0
        client_status = 'new'
        if progress == 1:
            client_status = 'completed'
        elif progress > 0.7:
            client_status = 'in-progress'
        elif progress > 0.3:
            client_status = 'proposal-sent'
        elif progress > 0:
            client_status = 'call-scheduled'
        
        # Пропускаем клиента, если не соответствует фильтру по статусу
        if status != 'all' and client_status != status:
            continue
        
        # Классы и метки для статусов
        status_classes = {
            'new': 'bg-status-new text-white',
            'call-scheduled': 'bg-status-call-scheduled text-white',
            'proposal-sent': 'bg-status-proposal-sent text-white',
            'in-progress': 'bg-status-in-progress text-white',
            'completed': 'bg-status-completed text-white'
        }
        
        status_labels = {
            'new': 'Новый',
            'call-scheduled': 'Созвон',
            'proposal-sent': 'КП отправлено',
            'in-progress': 'В работе',
            'completed': 'Завершен'
        }
        
        # Получаем услуги клиента
        services = [row['service_code'] for row in conn.execute('''
            SELECT service_code 
            FROM client_services 
            WHERE client_id = ?
        ''', (client['id'],)).fetchall()]
        
        clients.append({
            'id': client['id'],
            'name': client['name'],
            'phone': client['phone'],
            'email': client['email'],
            'address': client['address'],
            'budget': client['budget'],
            'project_area': client['project_area'],
            'last_contact': client['last_contact'],
            'next_action': client['next_action'],
            'status': client_status,
            'status_class': status_classes[client_status],
            'status_label': status_labels[client_status],
            'services': services,
            'current_stage': client['current_stage'],
            'current_stage_date': client['current_stage_date'],
            'completed_stages': client['completed_stages'],
            'total_stages': client['total_stages'],
            'last_comment': client['last_comment'],
            'last_comment_date': client['last_comment_date']
        })
    
    # Словарь с метками для услуг
    service_labels = {
        'landscape-design': 'Ландшафтный дизайн',
        'auto-irrigation': 'Автополив',
        'lawn': 'Газон',
        'planting': 'Посадка растений',
        'hardscape': 'Мощение',
        'maintenance': 'Обслуживание'
    }
    
    conn.close()
    
    return render_template('clients.html', 
                         clients=clients,
                         service_labels=service_labels)

@app.route('/client/<int:client_id>')
@login_required
def client_detail(client_id):
    """Детальная страница клиента"""
    conn = get_db_connection()
    
    # Получение данных клиента
    client = conn.execute('SELECT * FROM clients WHERE id = ?', (client_id,)).fetchone()
    if not client:
        return redirect(url_for('clients'))
    
    # Получение стадий
    stages_data = conn.execute('''
        SELECT * FROM client_stages 
        WHERE client_id = ? 
        ORDER BY stage_order
    ''', (client_id,)).fetchall()
    
    # Получение комментариев
    comments = conn.execute('''
        SELECT * FROM client_comments 
        WHERE client_id = ? 
        ORDER BY created_at DESC
    ''', (client_id,)).fetchall()
    
    # Получение услуг клиента
    services = [row['service_code'] for row in conn.execute('''
        SELECT service_code 
        FROM client_services 
        WHERE client_id = ?
    ''', (client_id,)).fetchall()]
    
    # Словарь с метками для услуг
    service_labels = {
        'landscape-design': 'Ландшафтный дизайн',
        'auto-irrigation': 'Автополив',
        'lawn': 'Газон',
        'planting': 'Посадка растений',
        'hardscape': 'Мощение',
        'maintenance': 'Обслуживание'
    }
    
    # Определяем статус на основе прогресса
    total_stages = len(stages_data)
    completed_stages = len([s for s in stages_data if s['completed']])
    progress = completed_stages / total_stages if total_stages > 0 else 0
    
    status = 'new'
    if progress == 1:
        status = 'completed'
    elif progress > 0.7:
        status = 'in-progress'
    elif progress > 0.3:
        status = 'proposal-sent'
    elif progress > 0:
        status = 'call-scheduled'
    
    status_classes = {
        'new': 'bg-status-new text-white',
        'call-scheduled': 'bg-status-call-scheduled text-white',
        'proposal-sent': 'bg-status-proposal-sent text-white',
        'in-progress': 'bg-status-in-progress text-white',
        'completed': 'bg-status-completed text-white'
    }
    
    status_labels = {
        'new': 'Новый',
        'call-scheduled': 'Созвон',
        'proposal-sent': 'КП отправлено',
        'in-progress': 'В работе',
        'completed': 'Завершен'
    }
    
    # Находим текущую стадию
    current_stage_index = next((i for i, s in enumerate(stages_data) if not s['completed']), -1)
    
    # Преобразуем стадии в список словарей с дополнительной информацией
    stages = []
    for i, stage in enumerate(stages_data):
        stages.append({
            'id': stage['id'],
            'stage_name': stage['stage_name'],
            'stage_order': stage['stage_order'],
            'completed': stage['completed'],
            'completed_date': stage['completed_date'],
            'is_current': i == current_stage_index
        })
    
    # Преобразуем клиента в словарь с дополнительной информацией
    client_dict = dict(client)
    client_dict.update({
        'status': status,
        'status_class': status_classes[status],
        'status_label': status_labels[status],
        'services': services
    })
    
    conn.close()
    
    return render_template('client_detail.html', 
                         client=client_dict,
                         stages=stages,
                         comments=comments,
                         service_labels=service_labels)

@app.route('/client/<int:client_id>/stage/<int:stage_id>/toggle', methods=['POST'])
@login_required
def stage_toggle(client_id, stage_id):
    """Переключение статуса стадии"""
    conn = get_db_connection()
    
    # Получаем текущий статус стадии
    stage = conn.execute('''
        SELECT completed 
        FROM client_stages 
        WHERE id = ? AND client_id = ?
    ''', (stage_id, client_id)).fetchone()
    
    if stage:
        # Переключаем статус
        new_status = not stage['completed']
        completed_date = datetime.now() if new_status else None
        
        conn.execute('''
            UPDATE client_stages 
            SET completed = ?, 
                completed_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND client_id = ?
        ''', (new_status, completed_date, stage_id, client_id))
        
        conn.commit()
    
    conn.close()
    return redirect(url_for('client_detail', client_id=client_id))

@app.route('/client/<int:client_id>/comment', methods=['POST'])
@login_required
def comment_add(client_id):
    """Добавление комментария"""
    content = request.form.get('content')
    comment_type = request.form.get('comment_type', 'note')
    
    if not content:
        flash('Комментарий не может быть пустым', 'error')
        return redirect(url_for('client_detail', client_id=client_id))
    
    conn = get_db_connection()
    
    try:
        conn.execute('''
            INSERT INTO client_comments (
                client_id, content, comment_type, author_name
            ) VALUES (?, ?, ?, ?)
        ''', (
            client_id,
            content,
            comment_type,
            session.get('user_email', 'Пользователь')
        ))
        conn.commit()
        flash('Комментарий добавлен', 'success')
    except Exception as e:
        flash('Ошибка при добавлении комментария', 'error')
    finally:
        conn.close()
    
    return redirect(url_for('client_detail', client_id=client_id))

@app.route('/client/<int:client_id>/edit', methods=['GET', 'POST'])
@login_required
def client_edit(client_id):
    """Редактирование клиента"""
    conn = get_db_connection()
    
    if request.method == 'POST':
        # Получаем данные из формы
        name = request.form.get('name')
        phone = request.form.get('phone')
        email = request.form.get('email')
        address = request.form.get('address')
        budget = request.form.get('budget')
        project_area = request.form.get('project_area')
        project_description = request.form.get('project_description')
        services = request.form.getlist('services')
        
        try:
            # Обновляем основные данные клиента
            conn.execute('''
                UPDATE clients 
                SET name = ?,
                    phone = ?,
                    email = ?,
                    address = ?,
                    budget = ?,
                    project_area = ?,
                    project_description = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                name, phone, email, address, 
                float(budget) if budget else None,
                float(project_area) if project_area else None,
                project_description, client_id
            ))
            
            # Обновляем услуги клиента
            conn.execute('DELETE FROM client_services WHERE client_id = ?', (client_id,))
            for service in services:
                conn.execute('''
                    INSERT INTO client_services (client_id, service_code)
                    VALUES (?, ?)
                ''', (client_id, service))
            
            conn.commit()
            flash('Данные клиента обновлены', 'success')
            return redirect(url_for('client_detail', client_id=client_id))
            
        except Exception as e:
            flash('Ошибка при обновлении данных клиента', 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('client_edit', client_id=client_id))
    
    # GET запрос - показываем форму редактирования
    client = conn.execute('SELECT * FROM clients WHERE id = ?', (client_id,)).fetchone()
    if not client:
        conn.close()
        return redirect(url_for('clients'))
    
    # Получаем текущие услуги клиента
    services = [row['service_code'] for row in conn.execute('''
        SELECT service_code 
        FROM client_services 
        WHERE client_id = ?
    ''', (client_id,)).fetchall()]
    
    # Получаем список всех доступных услуг
    all_services = conn.execute('SELECT code, name FROM services').fetchall()
    
    conn.close()
    
    return render_template('client_edit.html',
                         client=client,
                         selected_services=services,
                         all_services=all_services)

@app.route('/voice-assistant')
@login_required
def voice_assistant():
    """Страница голосового помощника"""
    return render_template('voice_assistant.html')

@app.route('/estimates')
@login_required
def estimates():
    """Страница смет"""
    conn = get_db_connection()
    search = request.args.get('search', '').lower()
    
    # Базовый запрос для получения смет
    query = '''
        SELECT 
            e.*,
            c.name as client_name,
            COUNT(ei.id) as items_count,
            COALESCE(SUM(ei.quantity * ei.price), 0) as total_amount
        FROM estimates e
        LEFT JOIN clients c ON e.client_id = c.id
        LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
        WHERE 1=1
    '''
    
    params = []
    
    # Добавляем поиск
    if search:
        query += '''
            AND (
                LOWER(c.name) LIKE ? OR
                LOWER(e.title) LIKE ? OR
                LOWER(e.id) LIKE ?
            )
        '''
        search_param = f'%{search}%'
        params.extend([search_param, search_param, search_param])
    
    # Группировка и сортировка
    query += '''
        GROUP BY e.id
        ORDER BY e.created_at DESC
    '''
    
    estimates_data = conn.execute(query, params).fetchall()
    
    # Преобразуем результаты в список словарей с дополнительной информацией
    estimates = []
    for estimate in estimates_data:
        # Классы и метки для статусов
        status_classes = {
            'draft': 'bg-gray-100 text-gray-700',
            'sent': 'bg-blue-100 text-blue-700',
            'approved': 'bg-green-100 text-green-700',
            'rejected': 'bg-red-100 text-red-700'
        }
        
        status_labels = {
            'draft': 'Черновик',
            'sent': 'Отправлена',
            'approved': 'Утверждена',
            'rejected': 'Отклонена'
        }
        
        # Получаем элементы сметы
        items = conn.execute('''
            SELECT * FROM estimate_items 
            WHERE estimate_id = ?
            ORDER BY position
        ''', (estimate['id'],)).fetchall()
        
        estimates.append({
            'id': estimate['id'],
            'title': estimate['title'],
            'client_id': estimate['client_id'],
            'client_name': estimate['client_name'] or 'Без клиента',
            'status': estimate['status'],
            'status_class': status_classes[estimate['status']],
            'status_label': status_labels[estimate['status']],
            'created_at': estimate['created_at'],
            'valid_until': estimate['valid_until'],
            'total_amount': estimate['total_amount'],
            'items': items
        })
    
    conn.close()
    
    return render_template('estimates.html', estimates=estimates)

@app.route('/estimate/new', methods=['GET', 'POST'])
@login_required
def estimate_new():
    """Создание новой сметы"""
    if request.method == 'POST':
        title = request.form.get('title')
        client_id = request.form.get('client_id')
        valid_until = request.form.get('valid_until')
        
        if not title:
            flash('Название сметы обязательно', 'error')
            return redirect(url_for('estimate_new'))
        
        conn = get_db_connection()
        
        try:
            cursor = conn.execute('''
                INSERT INTO estimates (
                    title, client_id, valid_until, status
                ) VALUES (?, ?, ?, 'draft')
            ''', (title, client_id, valid_until))
            
            estimate_id = cursor.lastrowid
            
            # Добавляем элементы сметы
            items = json.loads(request.form.get('items', '[]'))
            for i, item in enumerate(items):
                conn.execute('''
                    INSERT INTO estimate_items (
                        estimate_id, position, name, quantity, unit, price
                    ) VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    estimate_id,
                    i + 1,
                    item['name'],
                    item['quantity'],
                    item['unit'],
                    item['price']
                ))
            
            conn.commit()
            flash('Смета создана', 'success')
            return redirect(url_for('estimate_view', estimate_id=estimate_id))
            
        except Exception as e:
            flash('Ошибка при создании сметы', 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('estimate_new'))
    
    # GET запрос - показываем форму создания
    conn = get_db_connection()
    clients = conn.execute('SELECT id, name FROM clients ORDER BY name').fetchall()
    conn.close()
    
    return render_template('estimate_form.html',
                         clients=clients,
                         estimate=None,
                         items=[])

@app.route('/estimate/<int:estimate_id>')
@login_required
def estimate_view(estimate_id):
    """Просмотр сметы"""
    conn = get_db_connection()
    
    # Получаем данные сметы
    estimate = conn.execute('''
        SELECT e.*, c.name as client_name
        FROM estimates e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.id = ?
    ''', (estimate_id,)).fetchone()
    
    if not estimate:
        conn.close()
        return redirect(url_for('estimates'))
    
    # Получаем элементы сметы
    items = conn.execute('''
        SELECT * FROM estimate_items 
        WHERE estimate_id = ?
        ORDER BY position
    ''', (estimate_id,)).fetchall()
    
    # Считаем общую сумму
    total = sum(item['quantity'] * item['price'] for item in items)
    
    conn.close()
    
    return render_template('estimate_view.html',
                         estimate=estimate,
                         items=items,
                         total=total)

@app.route('/estimate/<int:estimate_id>/edit', methods=['GET', 'POST'])
@login_required
def estimate_edit(estimate_id):
    """Редактирование сметы"""
    conn = get_db_connection()
    
    if request.method == 'POST':
        title = request.form.get('title')
        client_id = request.form.get('client_id') if request.form.get('client_id') else None
        valid_until = request.form.get('valid_until') if request.form.get('valid_until') else None
        status = request.form.get('status', 'draft')
        
        if not title:
            flash('Название сметы обязательно', 'error')
            return redirect(url_for('estimate_edit', estimate_id=estimate_id))
        
        try:
            # Обновляем основные данные сметы
            conn.execute('''
                UPDATE estimates 
                SET title = ?,
                    client_id = ?,
                    valid_until = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (title, client_id, valid_until, status, estimate_id))
            
            # Обновляем элементы сметы
            conn.execute('DELETE FROM estimate_items WHERE estimate_id = ?', (estimate_id,))
            
            items_str = request.form.get('items', '[]')
            if items_str:
                items = json.loads(items_str)
                for i, item in enumerate(items):
                    conn.execute('''
                        INSERT INTO estimate_items (
                            estimate_id, position, name, quantity, unit, price
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        estimate_id,
                        i + 1,
                        item.get('name'),
                        item.get('quantity'),
                        item.get('unit'),
                        item.get('price')
                    ))
            
            conn.commit()
            flash('Смета обновлена', 'success')
            return redirect(url_for('estimate_view', estimate_id=estimate_id))
            
        except Exception as e:
            flash('Ошибка при обновлении сметы: ' + str(e), 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('estimate_edit', estimate_id=estimate_id))
    
    # GET запрос - показываем форму редактирования
    estimate = conn.execute('''
        SELECT e.*, c.name as client_name
        FROM estimates e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.id = ?
    ''', (estimate_id,)).fetchone()
    
    if not estimate:
        conn.close()
        return redirect(url_for('estimates'))
    
    # Получаем элементы сметы
    items = conn.execute('''
        SELECT * FROM estimate_items 
        WHERE estimate_id = ?
        ORDER BY position
    ''', (estimate_id,)).fetchall()
    
    # Получаем список клиентов
    clients = conn.execute('SELECT id, name FROM clients ORDER BY name').fetchall()
    
    conn.close()
    
    return render_template('estimate_form.html',
                         estimate=estimate,
                         items=items,
                         clients=clients)

@app.route('/estimate/<int:estimate_id>/copy', methods=['POST'])
@login_required
def estimate_copy(estimate_id):
    """Копирование сметы"""
    conn = get_db_connection()
    
    # Получаем данные исходной сметы
    estimate = conn.execute('SELECT * FROM estimates WHERE id = ?', (estimate_id,)).fetchone()
    if not estimate:
        conn.close()
        return redirect(url_for('estimates'))
    
    try:
        # Создаем новую смету
        cursor = conn.execute('''
            INSERT INTO estimates (
                title, client_id, valid_until, status
            ) VALUES (?, ?, ?, 'draft')
        ''', (
            f'Копия - {estimate["title"]}',
            estimate['client_id'],
            estimate['valid_until']
        ))
        
        new_estimate_id = cursor.lastrowid
        
        # Копируем элементы сметы
        items = conn.execute('''
            SELECT * FROM estimate_items 
            WHERE estimate_id = ?
            ORDER BY position
        ''', (estimate_id,)).fetchall()
        
        for item in items:
            conn.execute('''
                INSERT INTO estimate_items (
                    estimate_id, position, name, quantity, unit, price
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                new_estimate_id,
                item['position'],
                item['name'],
                item['quantity'],
                item['unit'],
                item['price']
            ))
        
        conn.commit()
        flash('Смета скопирована', 'success')
        return redirect(url_for('estimate_view', estimate_id=new_estimate_id))
        
    except Exception as e:
        flash('Ошибка при копировании сметы', 'error')
        conn.rollback()
    finally:
        conn.close()
        
    return redirect(url_for('estimates'))

@app.route('/estimate/<int:estimate_id>/delete', methods=['POST'])
@login_required
def estimate_delete(estimate_id):
    """Удаление сметы"""
    conn = get_db_connection()
    
    try:
        # Удаляем элементы сметы
        conn.execute('DELETE FROM estimate_items WHERE estimate_id = ?', (estimate_id,))
        # Удаляем смету
        conn.execute('DELETE FROM estimates WHERE id = ?', (estimate_id,))
        
        conn.commit()
        flash('Смета удалена', 'success')
    except Exception as e:
        flash('Ошибка при удалении сметы', 'error')
        conn.rollback()
    finally:
        conn.close()
    
    return redirect(url_for('estimates'))

@app.route('/contractors')
@login_required
def contractors():
    """Страница подрядчиков"""
    conn = get_db_connection()
    search = request.args.get('search', '').lower()
    
    # Базовый запрос для получения подрядчиков
    query = '''
        SELECT 
            c.*,
            GROUP_CONCAT(cs.specialization) as specializations,
            COUNT(DISTINCT cp.id) as completed_projects_count,
            ROUND(AVG(CAST(cr.rating AS FLOAT)), 1) as avg_rating
        FROM contractors c
        LEFT JOIN contractor_specializations cs ON c.id = cs.contractor_id
        LEFT JOIN contractor_projects cp ON c.id = cp.contractor_id AND cp.status = 'completed'
        LEFT JOIN contractor_ratings cr ON c.id = cr.contractor_id
        WHERE 1=1
    '''
    
    params = []
    
    # Добавляем поиск
    if search:
        query += '''
            AND (
                LOWER(c.company_name) LIKE ? OR
                LOWER(c.description) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM contractor_specializations cs2 
                    WHERE cs2.contractor_id = c.id 
                    AND LOWER(cs2.specialization) LIKE ?
                )
            )
        '''
        search_param = f'%{search}%'
        params.extend([search_param, search_param, search_param])
    
    # Группировка и сортировка
    query += '''
        GROUP BY c.id
        ORDER BY c.verified DESC, c.created_at DESC
    '''
    
    contractors_data = conn.execute(query, params).fetchall()
    
    # Преобразуем результаты в список словарей с дополнительной информацией
    contractors = []
    for contractor in contractors_data:
        # Получаем специализации
        specializations = (contractor['specializations'] or '').split(',')
        if specializations == ['']:
            specializations = []
        
        contractors.append({
            'id': contractor['id'],
            'company_name': contractor['company_name'],
            'phone': contractor['phone'],
            'description': contractor['description'],
            'verified': contractor['verified'],
            'experience_years': contractor['experience_years'],
            'rating': contractor['avg_rating'],
            'completed_projects': contractor['completed_projects_count'],
            'specialization': specializations
        })
    
    conn.close()
    
    return render_template('contractors.html', contractors=contractors)

@app.route('/contractor/new', methods=['GET', 'POST'])
@login_required
def contractor_new():
    """Создание нового подрядчика"""
    if request.method == 'POST':
        company_name = request.form.get('company_name')
        phone = request.form.get('phone')
        description = request.form.get('description')
        experience_years = request.form.get('experience_years')
        specializations = request.form.getlist('specializations')
        
        if not company_name:
            flash('Название компании обязательно', 'error')
            return redirect(url_for('contractor_new'))
        
        conn = get_db_connection()
        
        try:
            cursor = conn.execute('''
                INSERT INTO contractors (
                    company_name, phone, description, experience_years
                ) VALUES (?, ?, ?, ?)
            ''', (
                company_name,
                phone,
                description,
                int(experience_years) if experience_years else None
            ))
            
            contractor_id = cursor.lastrowid
            
            # Добавляем специализации
            for spec in specializations:
                conn.execute('''
                    INSERT INTO contractor_specializations (
                        contractor_id, specialization
                    ) VALUES (?, ?)
                ''', (contractor_id, spec))
            
            conn.commit()
            flash('Подрядчик добавлен', 'success')
            return redirect(url_for('contractor_view', contractor_id=contractor_id))
            
        except Exception as e:
            flash(f'Ошибка при добавлении подрядчика: {e}', 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('contractor_new'))
    
    # GET запрос - показываем форму создания
    return render_template('contractor_form.html',
                         contractor=None)

@app.route('/contractor/<int:contractor_id>')
@login_required
def contractor_view(contractor_id):
    """Просмотр подрядчика"""
    conn = get_db_connection()
    
    # Получаем данные подрядчика
    contractor = conn.execute('''
        SELECT 
            c.*,
            GROUP_CONCAT(cs.specialization) as specializations,
            COUNT(DISTINCT cp.id) as completed_projects_count,
            ROUND(AVG(CAST(cr.rating AS FLOAT)), 1) as avg_rating
        FROM contractors c
        LEFT JOIN contractor_specializations cs ON c.id = cs.contractor_id
        LEFT JOIN contractor_projects cp ON c.id = cp.contractor_id AND cp.status = 'completed'
        LEFT JOIN contractor_ratings cr ON c.id = cr.contractor_id
        WHERE c.id = ?
        GROUP BY c.id
    ''', (contractor_id,)).fetchone()
    
    if not contractor:
        conn.close()
        return redirect(url_for('contractors'))
    
    # Получаем специализации
    specializations = (contractor['specializations'] or '').split(',')
    if specializations == ['']:
        specializations = []
    
    # Получаем проекты
    projects = conn.execute('''
        SELECT * FROM contractor_projects 
        WHERE contractor_id = ?
        ORDER BY created_at DESC
    ''', (contractor_id,)).fetchall()
    
    # Получаем отзывы
    ratings = conn.execute('''
        SELECT * FROM contractor_ratings 
        WHERE contractor_id = ?
        ORDER BY created_at DESC
    ''', (contractor_id,)).fetchall()
    
    conn.close()
    
    return render_template('contractor_view.html',
                         contractor={
                             'id': contractor['id'],
                             'company_name': contractor['company_name'],
                             'phone': contractor['phone'],
                             'description': contractor['description'],
                             'verified': contractor['verified'],
                             'experience_years': contractor['experience_years'],
                             'rating': contractor['avg_rating'],
                             'completed_projects': contractor['completed_projects_count'],
                             'specialization': specializations
                         },
                         projects=projects,
                         ratings=ratings)

@app.route('/contractor/<int:contractor_id>/edit', methods=['GET', 'POST'])
@login_required
def contractor_edit(contractor_id):
    """Редактирование подрядчика"""
    conn = get_db_connection()
    
    if request.method == 'POST':
        company_name = request.form.get('company_name')
        phone = request.form.get('phone')
        description = request.form.get('description')
        experience_years = request.form.get('experience_years')
        specializations = request.form.getlist('specializations')
        verified = 'verified' in request.form
        
        if not company_name:
            flash('Название компании обязательно', 'error')
            return redirect(url_for('contractor_edit', contractor_id=contractor_id))
        
        try:
            # Обновляем основные данные подрядчика
            conn.execute('''
                UPDATE contractors 
                SET company_name = ?,
                    phone = ?,
                    description = ?,
                    experience_years = ?,
                    verified = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                company_name,
                phone,
                description,
                int(experience_years) if experience_years else None,
                verified,
                contractor_id
            ))
            
            # Обновляем специализации
            conn.execute('DELETE FROM contractor_specializations WHERE contractor_id = ?', (contractor_id,))
            for spec in specializations:
                conn.execute('''
                    INSERT INTO contractor_specializations (
                        contractor_id, specialization
                    ) VALUES (?, ?)
                ''', (contractor_id, spec))
            
            conn.commit()
            flash('Данные подрядчика обновлены', 'success')
            return redirect(url_for('contractor_view', contractor_id=contractor_id))
            
        except Exception as e:
            flash(f'Ошибка при обновлении данных подрядчика: {e}', 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('contractor_edit', contractor_id=contractor_id))
    
    # GET запрос - показываем форму редактирования
    contractor = conn.execute('SELECT * FROM contractors WHERE id = ?', (contractor_id,)).fetchone()
    if not contractor:
        conn.close()
        return redirect(url_for('contractors'))
    
    # Получаем специализации
    specializations = [row['specialization'] for row in conn.execute('''
        SELECT specialization 
        FROM contractor_specializations 
        WHERE contractor_id = ?
    ''', (contractor_id,)).fetchall()]
    
    conn.close()
    
    return render_template('contractor_form.html',
                         contractor=contractor,
                         specializations=specializations)

@app.route('/suppliers')
@login_required
def suppliers():
    """Страница поставщиков"""
    conn = get_db_connection()
    search = request.args.get('search', '').lower()
    
    # Базовый запрос для получения поставщиков
    query = '''
        SELECT 
            s.*,
            GROUP_CONCAT(sc.category) as categories,
            GROUP_CONCAT(st.tag_name) as tags,
            COUNT(DISTINCT o.id) as orders_count,
            ROUND(AVG(CAST(sr.rating AS FLOAT)), 1) as avg_rating
        FROM suppliers s
        LEFT JOIN supplier_categories sc ON s.id = sc.supplier_id
        LEFT JOIN supplier_tags st ON s.id = st.supplier_id
        LEFT JOIN orders o ON s.id = o.supplier_id AND o.status = 'completed'
        LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id
        WHERE 1=1
    '''
    
    params = []
    
    # Добавляем поиск
    if search:
        query += '''
            AND (
                LOWER(s.name) LIKE ? OR
                LOWER(s.location) LIKE ? OR
                EXISTS (
                    SELECT 1 FROM supplier_categories sc2 
                    WHERE sc2.supplier_id = s.id 
                    AND LOWER(sc2.category) LIKE ?
                )
            )
        '''
        search_param = f'%{search}%'
        params.extend([search_param, search_param, search_param])
    
    # Группировка и сортировка
    query += '''
        GROUP BY s.id
        ORDER BY s.status = 'active' DESC, s.created_at DESC
    '''
    
    suppliers_data = conn.execute(query, params).fetchall()
    
    # Преобразуем результаты в список словарей с дополнительной информацией
    suppliers = []
    for supplier in suppliers_data:
        # Получаем категории
        categories = (supplier['categories'] or '').split(',')
        if categories == ['']:
            categories = []
        
        # Получаем теги
        tags = []
        tag_names = (supplier['tags'] or '').split(',')
        if tag_names != ['']:
            tag_colors = {
                'Собственное производство': 'bg-green-500',
                'Дилерская скидка': 'bg-blue-500',
                'Удобный склад': 'bg-purple-500',
                'Есть отсрочка': 'bg-orange-500',
                'Быстрая доставка': 'bg-red-500',
                'Эксклюзивный поставщик': 'bg-indigo-500'
            }
            for tag_name in tag_names:
                tags.append({
                    'name': tag_name,
                    'color': tag_colors.get(tag_name, 'bg-gray-500')
                })
        
        # Получаем телефоны
        phones = []
        phones_data = conn.execute('''
            SELECT * FROM supplier_phones 
            WHERE supplier_id = ?
            ORDER BY type DESC
        ''', (supplier['id'],)).fetchall()
        for phone in phones_data:
            phones.append({
                'number': phone['number'],
                'type': phone['type'],
                'messenger': phone['messenger']
            })
        
        # Классы и метки для статусов
        status_classes = {
            'active': 'bg-green-100 text-green-700',
            'on-hold': 'bg-yellow-100 text-yellow-700',
            'inactive': 'bg-gray-100 text-gray-700'
        }
        
        status_labels = {
            'active': 'Активен',
            'on-hold': 'Приостановлен',
            'inactive': 'Неактивен'
        }
        
        suppliers.append({
            'id': supplier['id'],
            'name': supplier['name'],
            'categories': categories,
            'location': supplier['location'],
            'email': supplier['email'],
            'status': supplier['status'],
            'status_class': status_classes[supplier['status']],
            'status_label': status_labels[supplier['status']],
            'rating': supplier['avg_rating'],
            'orders_count': supplier['orders_count'],
            'entity_type': supplier['entity_type'],
            'phones': phones,
            'contact_person': supplier['contact_person'],
            'tags': tags,
            'created_at': supplier['created_at'],
            'updated_at': supplier['updated_at']
        })
    
    conn.close()
    
    return render_template('suppliers.html', suppliers=suppliers)

@app.route('/supplier/new', methods=['GET', 'POST'])
@login_required
def supplier_new():
    """Создание нового поставщика"""
    if request.method == 'POST':
        name = request.form.get('name')
        location = request.form.get('location')
        email = request.form.get('email')
        entity_type = request.form.get('entity_type')
        contact_person = request.form.get('contact_person')
        categories = request.form.getlist('categories')
        tags = request.form.getlist('tags')
        phones = json.loads(request.form.get('phones', '[]'))
        
        if not name:
            flash('Название компании обязательно', 'error')
            return redirect(url_for('supplier_new'))
        
        conn = get_db_connection()
        
        try:
            cursor = conn.execute('''
                INSERT INTO suppliers (
                    name, location, email, entity_type, contact_person, status
                ) VALUES (?, ?, ?, ?, ?, 'active')
            ''', (
                name,
                location,
                email,
                entity_type,
                contact_person
            ))
            
            supplier_id = cursor.lastrowid
            
            # Добавляем категории
            for category in categories:
                conn.execute('''
                    INSERT INTO supplier_categories (
                        supplier_id, category
                    ) VALUES (?, ?)
                ''', (supplier_id, category))
            
            # Добавляем теги
            for tag in tags:
                conn.execute('''
                    INSERT INTO supplier_tags (
                        supplier_id, tag_name
                    ) VALUES (?, ?)
                ''', (supplier_id, tag))
            
            # Добавляем телефоны
            for phone in phones:
                conn.execute('''
                    INSERT INTO supplier_phones (
                        supplier_id, number, type, messenger
                    ) VALUES (?, ?, ?, ?)
                ''', (
                    supplier_id,
                    phone['number'],
                    phone['type'],
                    phone.get('messenger', '')
                ))
            
            conn.commit()
            flash('Поставщик добавлен', 'success')
            return redirect(url_for('supplier_view', supplier_id=supplier_id))
            
        except Exception as e:
            flash('Ошибка при добавлении поставщика', 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('supplier_new'))
    
    # GET запрос - показываем форму создания
    return render_template('supplier_form.html',
                         supplier=None,
                         categories=[],
                         tags=[],
                         phones=[])

@app.route('/supplier/<int:supplier_id>')
@login_required
def supplier_view(supplier_id):
    """Просмотр поставщика"""
    conn = get_db_connection()
    
    # Получаем данные поставщика
    supplier = conn.execute('''
        SELECT 
            s.*,
            GROUP_CONCAT(sc.category) as categories,
            GROUP_CONCAT(st.tag_name) as tags,
            COUNT(DISTINCT o.id) as orders_count,
            ROUND(AVG(CAST(sr.rating AS FLOAT)), 1) as avg_rating
        FROM suppliers s
        LEFT JOIN supplier_categories sc ON s.id = sc.supplier_id
        LEFT JOIN supplier_tags st ON s.id = st.supplier_id
        LEFT JOIN orders o ON s.id = o.supplier_id AND o.status = 'completed'
        LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id
        WHERE s.id = ?
        GROUP BY s.id
    ''', (supplier_id,)).fetchone()
    
    if not supplier:
        conn.close()
        return redirect(url_for('suppliers'))
    
    # Получаем категории
    categories = (supplier['categories'] or '').split(',')
    if categories == ['']:
        categories = []
    
    # Получаем теги
    tags = []
    tag_names = (supplier['tags'] or '').split(',')
    if tag_names != ['']:
        tag_colors = {
            'Собственное производство': 'bg-green-500',
            'Дилерская скидка': 'bg-blue-500',
            'Удобный склад': 'bg-purple-500',
            'Есть отсрочка': 'bg-orange-500',
            'Быстрая доставка': 'bg-red-500',
            'Эксклюзивный поставщик': 'bg-indigo-500'
        }
        for tag_name in tag_names:
            tags.append({
                'name': tag_name,
                'color': tag_colors.get(tag_name, 'bg-gray-500')
            })
    
    # Получаем телефоны
    phones = []
    phones_data = conn.execute('''
        SELECT * FROM supplier_phones 
        WHERE supplier_id = ?
        ORDER BY type DESC
    ''', (supplier_id,)).fetchall()
    for phone in phones_data:
        phones.append({
            'number': phone['number'],
            'type': phone['type'],
            'messenger': phone['messenger']
        })
    
    # Получаем заказы
    orders = conn.execute('''
        SELECT * FROM orders 
        WHERE supplier_id = ?
        ORDER BY created_at DESC
    ''', (supplier_id,)).fetchall()
    
    # Получаем отзывы
    ratings = conn.execute('''
        SELECT * FROM supplier_ratings 
        WHERE supplier_id = ?
        ORDER BY created_at DESC
    ''', (supplier_id,)).fetchall()
    
    conn.close()
    
    return render_template('supplier_view.html',
                         supplier={
                             'id': supplier['id'],
                             'name': supplier['name'],
                             'categories': categories,
                             'location': supplier['location'],
                             'email': supplier['email'],
                             'status': supplier['status'],
                             'rating': supplier['avg_rating'],
                             'orders_count': supplier['orders_count'],
                             'entity_type': supplier['entity_type'],
                             'phones': phones,
                             'contact_person': supplier['contact_person'],
                             'tags': tags,
                             'created_at': supplier['created_at'],
                             'updated_at': supplier['updated_at']
                         },
                         orders=orders,
                         ratings=ratings)

@app.route('/supplier/<int:supplier_id>/edit', methods=['GET', 'POST'])
@login_required
def supplier_edit(supplier_id):
    """Редактирование поставщика"""
    conn = get_db_connection()
    
    if request.method == 'POST':
        name = request.form.get('name')
        location = request.form.get('location')
        email = request.form.get('email')
        entity_type = request.form.get('entity_type')
        contact_person = request.form.get('contact_person')
        status = request.form.get('status')
        categories = request.form.getlist('categories')
        tags = request.form.getlist('tags')
        phones = json.loads(request.form.get('phones', '[]'))
        
        if not name:
            flash('Название компании обязательно', 'error')
            return redirect(url_for('supplier_edit', supplier_id=supplier_id))
        
        try:
            # Обновляем основные данные поставщика
            conn.execute('''
                UPDATE suppliers 
                SET name = ?,
                    location = ?,
                    email = ?,
                    entity_type = ?,
                    contact_person = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                name,
                location,
                email,
                entity_type,
                contact_person,
                status,
                supplier_id
            ))
            
            # Обновляем категории
            conn.execute('DELETE FROM supplier_categories WHERE supplier_id = ?', (supplier_id,))
            for category in categories:
                conn.execute('''
                    INSERT INTO supplier_categories (
                        supplier_id, category
                    ) VALUES (?, ?)
                ''', (supplier_id, category))
            
            # Обновляем теги
            conn.execute('DELETE FROM supplier_tags WHERE supplier_id = ?', (supplier_id,))
            for tag in tags:
                conn.execute('''
                    INSERT INTO supplier_tags (
                        supplier_id, tag_name
                    ) VALUES (?, ?)
                ''', (supplier_id, tag))
            
            # Обновляем телефоны
            conn.execute('DELETE FROM supplier_phones WHERE supplier_id = ?', (supplier_id,))
            for phone in phones:
                conn.execute('''
                    INSERT INTO supplier_phones (
                        supplier_id, number, type, messenger
                    ) VALUES (?, ?, ?, ?)
                ''', (
                    supplier_id,
                    phone.get('number'),
                    phone.get('type'),
                    phone.get('messenger', '')
                ))
            
            conn.commit()
            flash('Данные поставщика обновлены', 'success')
            return redirect(url_for('supplier_view', supplier_id=supplier_id))
            
        except Exception as e:
            flash(f'Ошибка при обновлении данных поставщика: {e}', 'error')
            conn.rollback()
        finally:
            conn.close()
            
        return redirect(url_for('supplier_edit', supplier_id=supplier_id))
    
    # GET запрос - показываем форму редактирования
    supplier = conn.execute('SELECT * FROM suppliers WHERE id = ?', (supplier_id,)).fetchone()
    if not supplier:
        conn.close()
        return redirect(url_for('suppliers'))
    
    # Получаем категории
    categories = [row['category'] for row in conn.execute('''
        SELECT category 
        FROM supplier_categories 
        WHERE supplier_id = ?
    ''', (supplier_id,)).fetchall()]
    
    # Получаем теги
    tags = [row['tag_name'] for row in conn.execute('''
        SELECT tag_name 
        FROM supplier_tags 
        WHERE supplier_id = ?
    ''', (supplier_id,)).fetchall()]
    
    # Получаем телефоны
    phones = []
    phones_data = conn.execute('''
        SELECT * FROM supplier_phones 
        WHERE supplier_id = ?
        ORDER BY type DESC
    ''', (supplier_id,)).fetchall()
    for phone in phones_data:
        phones.append({
            'number': phone['number'],
            'type': phone['type'],
            'messenger': phone['messenger']
        })
    
    conn.close()
    
    return render_template('supplier_form.html',
                         supplier=supplier,
                         categories=categories,
                         tags=tags,
                         phones=phones)

@app.route('/tasks')
@login_required
def tasks():
    """Страница задач"""
    conn = get_db_connection()
    tasks_data = conn.execute('''
        SELECT t.*, c.name as client_name 
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        ORDER BY t.due_date IS NULL, t.due_date ASC, t.priority DESC
    ''').fetchall()
    conn.close()

    tasks = {
        'pending': [dict(t) for t in tasks_data if t['status'] == 'pending'],
        'in_progress': [dict(t) for t in tasks_data if t['status'] == 'in_progress'],
        'completed': [dict(t) for t in tasks_data if t['status'] == 'completed'],
    }
    
    return render_template('tasks.html', tasks=tasks)


@app.route('/task/<int:task_id>/edit', methods=['GET', 'POST'])
@login_required
def task_edit(task_id):
    """Создание и редактирование задачи"""
    conn = get_db_connection()
    
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        client_id = request.form.get('client_id') if request.form.get('client_id') else None
        due_date = request.form.get('due_date') if request.form.get('due_date') else None
        status = request.form.get('status', 'pending')
        priority = request.form.get('priority', 'medium')

        if not title:
            flash('Название задачи обязательно', 'error')
            return redirect(url_for('task_edit', task_id=task_id))

        try:
            if task_id == 0: # Создание новой задачи
                conn.execute('''
                    INSERT INTO tasks (title, description, client_id, due_date, status, priority)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (title, description, client_id, due_date, status, priority))
                flash('Задача создана', 'success')
            else: # Обновление существующей
                conn.execute('''
                    UPDATE tasks SET
                        title = ?, description = ?, client_id = ?, due_date = ?, 
                        status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (title, description, client_id, due_date, status, priority, task_id))
                flash('Задача обновлена', 'success')
            
            conn.commit()
            return redirect(url_for('tasks'))
        except Exception as e:
            flash(f'Ошибка при сохранении задачи: {e}', 'error')
            conn.rollback()
        finally:
            conn.close()
        
        return redirect(url_for('task_edit', task_id=task_id))

    # GET-запрос
    task = None
    if task_id != 0:
        task = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        if not task:
            flash('Задача не найдена', 'error')
            return redirect(url_for('tasks'))

    clients = conn.execute('SELECT id, name FROM clients ORDER BY name').fetchall()
    conn.close()
    
    return render_template('task_form.html', task=task, clients=clients)

@app.route('/task/<int:task_id>/delete', methods=['POST'])
@login_required
def task_delete(task_id):
    """Удаление задачи"""
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        flash('Задача удалена', 'success')
    except Exception as e:
        flash(f'Ошибка при удалении задачи: {e}', 'error')
    finally:
        conn.close()
    return redirect(url_for('tasks'))


@app.route('/proposals')
@login_required
def proposals():
    return "Страница в разработке"

@app.route('/nomenclature')
@login_required
def nomenclature():
    return "Страница в разработке"

@app.route('/archive')
@login_required
def archive():
    return "Страница в разработке"

@app.route('/ai-assistants')
@login_required
def ai_assistants():
    return "Страница в разработке"

@app.route('/voice-chat')
@login_required
def voice_chat():
    return "Страница в разработке"

@app.route('/voice-settings')
@login_required
def voice_settings():
    return "Страница в разработке"


@app.route('/settings')
@login_required
def settings():
    """Страница настроек"""
    return render_template('settings.html')

# API эндпоинты
@app.route('/api/clients', methods=['POST'])
@login_required
def api_create_client():
    """API для создания нового клиента"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    # Создание клиента
    cursor = conn.execute('''
        INSERT INTO clients (name, phone, email, address, project_description, 
                           budget, project_area, last_contact, next_action, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('name'),
        data.get('phone'),
        data.get('email'),
        data.get('address'),
        data.get('project_description'),
        data.get('budget'),
        data.get('project_area'),
        data.get('last_contact'),
        data.get('next_action'),
        data.get('notes')
    ))
    
    client_id = cursor.lastrowid
    
    # Создание стадий по умолчанию
    for i, stage_name in enumerate(DEFAULT_STAGES, 1):
        conn.execute('''
            INSERT INTO client_stages (client_id, stage_name, stage_order)
            VALUES (?, ?, ?)
        ''', (client_id, stage_name, i))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'client_id': client_id})

@app.route('/api/clients/<int:client_id>/stages/<int:stage_id>', methods=['PUT'])
@login_required
def api_update_stage(client_id, stage_id):
    """API для обновления стадии"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    completed = data.get('completed', False)
    completed_date = datetime.now() if completed else None
    
    conn.execute('''
        UPDATE client_stages 
        SET completed = ?, completed_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND client_id = ?
    ''', (completed, completed_date, stage_id, client_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/clients/<int:client_id>/comments', methods=['POST'])
@login_required
def api_create_comment(client_id):
    """API для создания комментария"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    conn.execute('''
        INSERT INTO client_comments (client_id, content, comment_type, author_name)
        VALUES (?, ?, ?, ?)
    ''', (
        client_id,
        data.get('content'),
        data.get('comment_type', 'note'),
        data.get('author_name', 'Пользователь')
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/auth')
def auth():
    """Страница авторизации"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('auth.html')

@app.route('/auth/signin', methods=['POST'])
def auth_signin():
    """Обработка входа"""
    email = request.form.get('email')
    password = request.form.get('password')
    
    if not email or not password:
        flash('Пожалуйста, заполните все поля', 'error')
        return redirect(url_for('auth'))
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    
    if user and user['password_hash'] == hashlib.sha256(password.encode()).hexdigest():
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        return redirect(url_for('dashboard'))
    
    flash('Неверный email или пароль', 'error')
    return redirect(url_for('auth'))

@app.route('/auth/signup', methods=['POST'])
def auth_signup():
    """Обработка регистрации"""
    email = request.form.get('email')
    password = request.form.get('password')
    full_name = request.form.get('full_name')
    
    if not email or not password or not full_name:
        flash('Пожалуйста, заполните все поля', 'error')
        return redirect(url_for('auth'))
    
    if len(password) < 6:
        flash('Пароль должен содержать минимум 6 символов', 'error')
        return redirect(url_for('auth'))
    
    conn = get_db_connection()
    
    # Проверяем, не существует ли уже пользователь с таким email
    existing_user = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing_user:
        conn.close()
        flash('Пользователь с таким email уже существует', 'error')
        return redirect(url_for('auth'))
    
    # Создаем нового пользователя
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    try:
        conn.execute('''
            INSERT INTO users (email, password_hash, full_name)
            VALUES (?, ?, ?)
        ''', (email, password_hash, full_name))
        conn.commit()
        flash('Регистрация успешна! Теперь вы можете войти', 'success')
    except Exception as e:
        flash('Произошла ошибка при регистрации', 'error')
    finally:
        conn.close()
    
    return redirect(url_for('auth'))

@app.route('/auth/logout', methods=['POST'])
def logout():
    """Выход из системы"""
    session.clear()
    return redirect(url_for('auth'))

if __name__ == '__main__':
    # Инициализация базы данных при запуске
    init_db()
    
    # Запуск приложения
    app.run(debug=True, host='0.0.0.0', port=5000)